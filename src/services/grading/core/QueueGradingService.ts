
import { GradingQueueService, type GradingJob } from '../../gradingQueueService';
import type { 
  UnifiedQuestionContext, 
  GradingContext, 
  UnifiedGradingResult,
  BatchGradingRequest,
  BatchGradingResult 
} from '../types/UnifiedGradingTypes';

export class QueueGradingService {
  private static activeJobs = new Map<string, () => void>(); // For cleanup subscriptions

  /**
   * Submit a single question for grading via queue
   */
  static async gradeQuestionAsync(
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<{ jobId: string; message: string }> {
    console.log(`🎯 Queueing single question: Q${question.questionNumber}`);
    
    try {
      const result = await GradingQueueService.submitGradingJob(
        [question],
        {
          method: 'openai_single',
          configuration: context.configuration,
          context: context
        },
        {
          studentId: context.studentId,
          priority: context.configuration?.queue?.priority || context.configuration?.priority || 'normal'
        }
      );

      return result;
      
    } catch (error) {
      console.error('Failed to queue single question:', error);
      throw error;
    }
  }

  /**
   * Submit a batch of questions for grading via queue
   */
  static async gradeBatchAsync(
    request: BatchGradingRequest
  ): Promise<{ jobId: string; message: string }> {
    console.log(`🎯 Queueing batch: ${request.questions.length} questions`);
    
    try {
      const result = await GradingQueueService.submitGradingJob(
        request.questions,
        {
          method: 'openai_batch',
          configuration: request.context.configuration,
          context: request.context
        },
        {
          studentId: request.context.studentId,
          priority: request.priority || 'normal'
        }
      );

      return result;
      
    } catch (error) {
      console.error('Failed to queue batch:', error);
      throw error;
    }
  }

  /**
   * Wait for a job to complete and return results
   */
  static async waitForJobCompletion(
    jobId: string,
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<UnifiedGradingResult[]> {
    console.log(`⏳ Waiting for job ${jobId} to complete (timeout: ${timeoutMs}ms)`);
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Set timeout
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Subscribe to job updates
      const unsubscribe = GradingQueueService.subscribeToJobUpdates(jobId, (job) => {
        console.log(`📦 Job ${jobId} status: ${job.status}`);
        
        if (job.status === 'completed') {
          cleanup();
          
          // Convert result to expected format
          const results = this.convertQueueResultToGradingResults(job.result_payload);
          resolve(results);
          
        } else if (job.status === 'failed') {
          cleanup();
          reject(new Error(`Job ${jobId} failed: ${job.error_message}`));
        }
      });

      const cleanup = () => {
        clearTimeout(timeout);
        unsubscribe();
        this.activeJobs.delete(jobId);
      };

      // Store cleanup function
      this.activeJobs.set(jobId, cleanup);

      // Check if job is already completed
      GradingQueueService.getJobStatus(jobId).then((job) => {
        if (!job) {
          cleanup();
          reject(new Error(`Job ${jobId} not found`));
          return;
        }

        if (job.status === 'completed') {
          cleanup();
          const results = this.convertQueueResultToGradingResults(job.result_payload);
          resolve(results);
        } else if (job.status === 'failed') {
          cleanup();
          reject(new Error(`Job ${jobId} failed: ${job.error_message}`));
        }
      }).catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string): Promise<GradingJob | null> {
    return GradingQueueService.getJobStatus(jobId);
  }

  /**
   * Subscribe to job updates
   */
  static subscribeToJob(
    jobId: string,
    onUpdate: (job: GradingJob) => void
  ): () => void {
    return GradingQueueService.subscribeToJobUpdates(jobId, onUpdate);
  }

  /**
   * Cancel active subscriptions
   */
  static cleanup(): void {
    console.log(`🧹 Cleaning up ${this.activeJobs.size} active job subscriptions`);
    
    this.activeJobs.forEach((cleanup) => cleanup());
    this.activeJobs.clear();
  }

  /**
   * Convert queue result format to UnifiedGradingResult format
   */
  private static convertQueueResultToGradingResults(
    queueResult: any
  ): UnifiedGradingResult[] {
    if (!queueResult?.results) {
      return [];
    }

    return queueResult.results.map((result: any) => ({
      questionNumber: result.questionNumber || 1,
      isCorrect: result.isCorrect || false,
      score: result.score || 0,
      maxScore: 100,
      feedback: result.feedback || '',
      explanation: result.feedback || '',
      gradingMethod: 'queue_openai',
      confidence: 0.95,
      processingTime: queueResult.metadata?.processingTime || 0,
      metadata: {
        model: queueResult.metadata?.model || 'gpt-4o-mini',
        gradedAt: result.gradedAt || new Date().toISOString(),
        jobProcessed: true
      }
    }));
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    return GradingQueueService.getQueueStats();
  }
}
