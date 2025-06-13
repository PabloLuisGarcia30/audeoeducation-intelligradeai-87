
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
import { PersistenceManager } from './PersistenceManager';
import { QueueGradingService } from './QueueGradingService';

export class UnifiedGradingService {
  private static batchManager = new BatchManager();
  private static localProcessor = new LocalGradingProcessor();
  private static openaiProcessor = new OpenAIGradingProcessor();
  private static resultProcessor = new ResultProcessor();
  private static cacheManager = new CacheManager();
  private static persistenceManager = new PersistenceManager();

  /**
   * Grade a single question - can use queue or direct processing
   */
  static async gradeQuestion(
    question: UnifiedQuestionContext,
    context: GradingContext,
    useQueue: boolean = false
  ): Promise<UnifiedGradingResult | { jobId: string; message: string }> {
    const startTime = Date.now();
    console.log(`🎯 Unified grading: Q${question.questionNumber} for ${context.studentName || 'student'} (queue: ${useQueue})`);

    // If using queue for OpenAI processing
    if (useQueue) {
      const routingDecision = GradingRouter.routeQuestion(question, context);
      
      if (routingDecision.method.includes('openai')) {
        console.log(`📤 Using queue for OpenAI grading: ${routingDecision.method}`);
        return await QueueGradingService.gradeQuestionAsync(question, context);
      }
    }

    // Direct processing (existing logic)
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
          const batchResult = await this.gradeBatch(batchRequest, useQueue);
          
          if ('jobId' in batchResult) {
            return batchResult; // Return job info if queued
          }
          
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

      // Save to database if student ID is provided
      if (context.studentId) {
        try {
          await this.persistenceManager.saveResults([finalResult], context);
        } catch (error) {
          console.warn('Failed to persist grading result:', error);
          // Don't fail the grading process if persistence fails
        }
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
   * Grade multiple questions as a batch - can use queue or direct processing
   */
  static async gradeBatch(
    request: BatchGradingRequest,
    useQueue: boolean = false
  ): Promise<BatchGradingResult | { jobId: string; message: string }> {
    const startTime = Date.now();
    console.log(`🎯 Unified batch grading: ${request.questions.length} questions (queue: ${useQueue})`);

    try {
      // Get routing decision for the batch
      const routingDecision = GradingRouter.routeBatch(request.questions, request.context);
      
      // If using queue for OpenAI processing
      if (useQueue && routingDecision.method.includes('openai')) {
        console.log(`📤 Using queue for batch OpenAI grading: ${routingDecision.method}`);
        return await QueueGradingService.gradeBatchAsync(request);
      }

      // Direct processing (existing logic)
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

      // Save all results to database if student ID is provided
      if (request.context.studentId && batchResult.results.length > 0) {
        try {
          await this.persistenceManager.saveResults(batchResult.results, request.context);
          
          // Validate that results were saved correctly
          const validation = await this.persistenceManager.validateSavedResults(
            batchResult.results, 
            request.context
          );
          
          if (!validation.success) {
            console.warn('Batch result validation issues:', validation.errors);
          }
        } catch (error) {
          console.warn('Failed to persist batch results:', error);
          // Don't fail the grading process if persistence fails
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Batch completed: ${batchResult.results.length} questions in ${processingTime}ms`);

      return batchResult;

    } catch (error) {
      console.error('❌ Batch grading error:', error);
      throw error;
    }
  }

  /**
   * Wait for a queued job to complete
   */
  static async waitForQueuedJob(
    jobId: string,
    timeoutMs: number = 300000
  ): Promise<UnifiedGradingResult[]> {
    return await QueueGradingService.waitForJobCompletion(jobId, timeoutMs);
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string) {
    return await QueueGradingService.getJobStatus(jobId);
  }

  /**
   * Subscribe to job updates
   */
  static subscribeToJob(jobId: string, callback: (job: any) => void) {
    return QueueGradingService.subscribeToJob(jobId, callback);
  }

  /**
   * Create default grading configuration with queue options
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
      },
      queue: {
        enabled: true,
        priority: 'normal',
        useForOpenAI: true
      }
    };
  }

  static async getGradingStats(): Promise<any> {
    const [regularStats, queueStats] = await Promise.all([
      Promise.resolve({
        cache: await this.cacheManager.getStats(),
        batch: this.batchManager.getStats(),
        local: this.localProcessor.getStats(),
        openai: this.openaiProcessor.getStats()
      }),
      QueueGradingService.getQueueStats().catch(() => null)
    ]);

    return {
      ...regularStats,
      queue: queueStats
    };
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    QueueGradingService.cleanup();
  }
}
