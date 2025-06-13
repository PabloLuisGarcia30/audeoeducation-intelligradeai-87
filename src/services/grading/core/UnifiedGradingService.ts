import type { 
  UnifiedQuestionContext, 
  GradingContext, 
  UnifiedGradingResult,
  BatchGradingRequest,
  BatchGradingResult,
  GradingConfiguration 
} from '../types/UnifiedGradingTypes';
import { GradingRouter } from './GradingRouter';
import { BatchManager } from './BatchManager';
import { LocalGradingProcessor } from './LocalGradingProcessor';
import { OpenAIGradingProcessor } from './OpenAIGradingProcessor';
import { ResultProcessor } from './ResultProcessor';
import { CacheManager } from './CacheManager';

export class UnifiedGradingService {
  private static batchManager = new BatchManager();
  private static localProcessor = new LocalGradingProcessor();
  private static openaiProcessor = new OpenAIGradingProcessor();
  private static resultProcessor = new ResultProcessor();
  private static cacheManager = new CacheManager();

  /**
   * Grade a single question through the unified pipeline
   */
  static async gradeQuestion(
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<UnifiedGradingResult> {
    const startTime = Date.now();
    console.log(`🎯 Unified grading: Q${question.questionNumber} for ${context.studentName || 'student'}`);

    try {
      // Check cache first if enabled
      if (context.configuration.caching?.enabled) {
        const cached = await this.cacheManager.getCachedResult(question, context);
        if (cached) {
          console.log(`📋 Cache hit for Q${question.questionNumber}`);
          return this.resultProcessor.enhanceResult(cached, Date.now() - startTime);
        }
      }

      // Get routing decision
      const routingDecision = GradingRouter.routeQuestion(question, context);
      console.log(`🧭 Routing Q${question.questionNumber} to ${routingDecision.method} (${routingDecision.reasoning})`);

      // Process based on routing decision
      let result: UnifiedGradingResult;

      switch (routingDecision.method) {
        case 'exact_match':
        case 'flexible_match':
          result = await this.localProcessor.processBasic(question, routingDecision.method);
          break;

        case 'distilbert_local':
          result = await this.localProcessor.processWithDistilBERT(question, context);
          break;

        case 'openai_single':
          result = await this.openaiProcessor.processSingle(question, context);
          break;

        case 'openai_batch':
          // For single questions routed to batch, create a mini-batch
          const batchRequest: BatchGradingRequest = {
            questions: [question],
            context,
            priority: 'normal'
          };
          const batchResult = await this.gradeBatch(batchRequest);
          result = batchResult.results[0];
          break;

        default:
          throw new Error(`Unsupported grading method: ${routingDecision.method}`);
      }

      // Process and enhance result
      const finalResult = await this.resultProcessor.processResult(result, question, context);

      // Cache result if enabled
      if (context.configuration.caching?.enabled) {
        await this.cacheManager.setCachedResult(question, context, finalResult);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Q${question.questionNumber} graded: ${finalResult.isCorrect ? 'Correct' : 'Incorrect'} (${processingTime}ms, ${routingDecision.method})`);

      return finalResult;

    } catch (error) {
      console.error(`❌ Error grading Q${question.questionNumber}:`, error);
      
      // Return fallback result
      return this.resultProcessor.createFallbackResult(
        question, 
        context, 
        error instanceof Error ? error.message : 'Unknown error',
        Date.now() - startTime
      );
    }
  }

  /**
   * Grade multiple questions as a batch
   */
  static async gradeBatch(request: BatchGradingRequest): Promise<BatchGradingResult> {
    const startTime = Date.now();
    console.log(`🎯 Unified batch grading: ${request.questions.length} questions`);

    try {
      // Get routing decision for the batch
      const routingDecision = GradingRouter.routeBatch(request.questions, request.context);
      
      // Process through batch manager
      const batchResult = await this.batchManager.processBatch(
        request,
        routingDecision,
        {
          localProcessor: this.localProcessor,
          openaiProcessor: this.openaiProcessor,
          resultProcessor: this.resultProcessor,
          cacheManager: this.cacheManager
        }
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ Batch completed: ${batchResult.results.length} questions in ${processingTime}ms`);

      return batchResult;

    } catch (error) {
      console.error('❌ Batch grading error:', error);
      throw error;
    }
  }

  /**
   * Create default grading configuration
   */
  static createDefaultConfiguration(): GradingConfiguration {
    return {
      batchProcessing: {
        enabled: true,
        maxBatchSize: 5,
        timeout: 30000,
        priority: 'normal'
      },
      caching: {
        enabled: true,
        ttl: 3600000, // 1 hour
        skillAware: true
      },
      thresholds: {
        distilbertConfidence: 0.75,
        openaiEscalation: 0.85,
        complexityThreshold: 0.7
      },
      misconceptionAnalysis: {
        enabled: true,
        categories: ['procedural', 'conceptual', 'interpretive']
      }
    };
  }

  /**
   * Get grading statistics and health metrics
   */
  static async getGradingStats(): Promise<any> {
    return {
      cache: await this.cacheManager.getStats(),
      batch: this.batchManager.getStats(),
      local: this.localProcessor.getStats(),
      openai: this.openaiProcessor.getStats()
    };
  }
}
