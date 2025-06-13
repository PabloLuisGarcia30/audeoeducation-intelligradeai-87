
import type { 
  BatchGradingRequest, 
  BatchGradingResult, 
  GradingRouterDecision,
  UnifiedGradingResult 
} from '../types/UnifiedGradingTypes';

interface ProcessorContext {
  localProcessor: any;
  openaiProcessor: any;
  resultProcessor: any;
  cacheManager: any;
}

export class BatchManager {
  private batchStats = {
    totalBatches: 0,
    totalQuestions: 0,
    totalProcessingTime: 0,
    successRate: 0,
    avgBatchSize: 0
  };

  async processBatch(
    request: BatchGradingRequest,
    routingDecision: GradingRouterDecision,
    processors: ProcessorContext
  ): Promise<BatchGradingResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    console.log(`🔄 Processing batch ${batchId}: ${request.questions.length} questions via ${routingDecision.method}`);

    try {
      let results: UnifiedGradingResult[];
      let cacheHits = 0;

      // Check cache for each question if enabled
      if (request.context.configuration.caching?.enabled) {
        const cachedResults = await Promise.all(
          request.questions.map(async (question) => {
            const cached = await processors.cacheManager.getCachedResult(question, request.context);
            if (cached) cacheHits++;
            return cached;
          })
        );

        // Filter out non-cached questions
        const nonCachedQuestions = request.questions.filter((_, index) => !cachedResults[index]);
        const nonCachedResults = cachedResults.filter(Boolean);

        if (nonCachedQuestions.length === 0) {
          // All results were cached
          results = nonCachedResults as UnifiedGradingResult[];
        } else {
          // Process non-cached questions
          const freshResults = await this.processNonCachedQuestions(
            nonCachedQuestions,
            request.context,
            routingDecision,
            processors
          );

          // Merge cached and fresh results in correct order
          results = this.mergeResults(request.questions, cachedResults, freshResults);
        }
      } else {
        // No caching, process all questions
        results = await this.processNonCachedQuestions(
          request.questions,
          request.context,
          routingDecision,
          processors
        );
      }

      // Calculate metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const successCount = results.filter(r => !r.qualityFlags?.fallbackUsed).length;
      const cacheHitRate = request.questions.length > 0 ? cacheHits / request.questions.length : 0;

      // Update stats
      this.updateBatchStats(request.questions.length, processingTime, successCount / results.length);

      const batchResult: BatchGradingResult = {
        batchId,
        results,
        totalProcessingTime: processingTime,
        totalCost: this.calculateTotalCost(results),
        batchSize: request.questions.length,
        successRate: successCount / results.length,
        fallbackUsed: results.some(r => r.qualityFlags?.fallbackUsed || false),
        cacheHitRate,
        processingMethod: routingDecision.method,
        metadata: {
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          processingPath: [routingDecision.method],
          errors: results.filter(r => r.qualityFlags?.fallbackUsed).map(r => r.reasoning)
        }
      };

      console.log(`✅ Batch ${batchId} completed: ${successCount}/${results.length} successful, ${cacheHitRate * 100}% cache hit rate`);

      return batchResult;

    } catch (error) {
      console.error(`❌ Batch ${batchId} failed:`, error);
      throw error;
    }
  }

  private async processNonCachedQuestions(
    questions: any[],
    context: any,
    routingDecision: GradingRouterDecision,
    processors: ProcessorContext
  ): Promise<UnifiedGradingResult[]> {
    switch (routingDecision.method) {
      case 'openai_batch':
        return await processors.openaiProcessor.processBatch(questions, context);
      
      case 'distilbert_local':
        return await Promise.all(
          questions.map(q => processors.localProcessor.processWithDistilBERT(q, context))
        );
      
      default:
        return await Promise.all(
          questions.map(q => processors.localProcessor.processBasic(q, routingDecision.method))
        );
    }
  }

  private mergeResults(
    originalQuestions: any[],
    cachedResults: (UnifiedGradingResult | null)[],
    freshResults: UnifiedGradingResult[]
  ): UnifiedGradingResult[] {
    const merged: UnifiedGradingResult[] = [];
    let freshIndex = 0;

    for (let i = 0; i < originalQuestions.length; i++) {
      if (cachedResults[i]) {
        merged.push(cachedResults[i]!);
      } else {
        merged.push(freshResults[freshIndex++]);
      }
    }

    return merged;
  }

  private calculateTotalCost(results: UnifiedGradingResult[]): number {
    return results.reduce((total, result) => {
      return total + (result.openAIUsage?.estimatedCost || 0);
    }, 0);
  }

  private updateBatchStats(batchSize: number, processingTime: number, successRate: number): void {
    this.batchStats.totalBatches++;
    this.batchStats.totalQuestions += batchSize;
    this.batchStats.totalProcessingTime += processingTime;
    this.batchStats.successRate = (this.batchStats.successRate + successRate) / 2;
    this.batchStats.avgBatchSize = this.batchStats.totalQuestions / this.batchStats.totalBatches;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return { ...this.batchStats };
  }
}
