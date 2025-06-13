
import { supabase } from '@/integrations/supabase/client';
import { GradingQueueService } from './gradingQueueService';

export interface EnhancedBatchJob {
  id: string;
  files: File[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  results: any[];
  errors: string[];
  estimatedTimeRemaining?: number;
  processingMetrics?: {
    filesPerSecond: number;
    averageFileSize: number;
    totalProcessingTime: number;
    batchOptimizationUsed: boolean;
  };
}

export interface EnhancedProcessingQueue {
  activeJobs: EnhancedBatchJob[];
  pendingJobs: EnhancedBatchJob[];
  completedJobs: EnhancedBatchJob[];
  stats: {
    maxWorkers: number;
    activeWorkers: number;
    queueDepth: number;
    totalJobsProcessed: number;
    currentThroughput: number;
    successRate: number;
    averageProcessingTime: number;
  };
  autoScaling: {
    enabled: boolean;
    minConcurrency: number;
    maxConcurrency: number;
    currentConcurrency: number;
    lastScalingAction: number;
  };
}

export class EnhancedBatchProcessingService {
  private static jobListeners: Map<string, (job: EnhancedBatchJob) => void> = new Map();

  /**
   * Create a batch job using the database-backed queue
   */
  static async createBatchJob(files: File[], priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): Promise<string> {
    console.log(`🎯 Creating database-backed batch job with ${files.length} files (priority: ${priority})`);
    
    try {
      // Convert files to a serializable format for the database
      const filesData = files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }));

      // Submit job to database queue with proper payload structure
      const result = await GradingQueueService.submitGradingJob(
        filesData, // Pass filesData as the questions parameter
        {
          batchProcessing: true,
          filesData: filesData,
          method: 'batch_file_processing'
        },
        {
          priority: priority
        }
      );

      console.log(`✅ Database batch job created: ${result.jobId}`);
      return result.jobId;
      
    } catch (error) {
      console.error('Failed to create database batch job:', error);
      throw error;
    }
  }

  /**
   * Get job status from database
   */
  static async getJob(jobId: string): Promise<EnhancedBatchJob | null> {
    try {
      const job = await GradingQueueService.getJobStatus(jobId);
      if (!job) return null;

      // Convert database job to EnhancedBatchJob format
      const filesData = job.payload?.filesData || [];
      
      return {
        id: job.id,
        files: filesData,
        status: job.status as any,
        priority: job.priority as any,
        createdAt: new Date(job.created_at).getTime(),
        startedAt: job.started_at ? new Date(job.started_at).getTime() : undefined,
        completedAt: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
        progress: this.calculateProgress(job),
        results: job.result_payload?.results || [],
        errors: job.error_message ? [job.error_message] : [],
        estimatedTimeRemaining: this.calculateEstimatedTime(job),
        processingMetrics: {
          filesPerSecond: 0,
          averageFileSize: 0,
          totalProcessingTime: job.processing_time_ms || 0,
          batchOptimizationUsed: true
        }
      };
    } catch (error) {
      console.error(`Error getting job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Subscribe to job updates using Supabase realtime
   */
  static subscribeToJob(jobId: string, callback: (job: EnhancedBatchJob) => void): void {
    console.log(`🔔 Subscribing to database job updates: ${jobId}`);
    
    // Store callback for this job
    this.jobListeners.set(jobId, callback);

    // Subscribe to realtime updates
    const unsubscribe = GradingQueueService.subscribeToJobUpdates(jobId, async (dbJob) => {
      const enhancedJob = await this.convertDbJobToEnhanced(dbJob);
      if (enhancedJob) {
        callback(enhancedJob);
      }
    });

    // Store unsubscribe function in the callback
    (callback as any).unsubscribe = unsubscribe;
  }

  static unsubscribeFromJob(jobId: string): void {
    const callback = this.jobListeners.get(jobId);
    if (callback && (callback as any).unsubscribe) {
      (callback as any).unsubscribe();
    }
    this.jobListeners.delete(jobId);
  }

  /**
   * Get queue status from database
   */
  static async getQueueStatus(): Promise<EnhancedProcessingQueue> {
    try {
      const stats = await GradingQueueService.getQueueStats();
      
      return {
        activeJobs: [], // These will be populated by individual job queries
        pendingJobs: [],
        completedJobs: [],
        stats: {
          maxWorkers: 12,
          activeWorkers: stats.processing_jobs,
          queueDepth: stats.pending_jobs,
          totalJobsProcessed: stats.completed_jobs_today + stats.failed_jobs_today,
          currentThroughput: stats.completed_jobs_today,
          successRate: stats.completed_jobs_today / Math.max(1, stats.completed_jobs_today + stats.failed_jobs_today),
          averageProcessingTime: stats.avg_processing_time_ms || 0
        },
        autoScaling: {
          enabled: true,
          minConcurrency: 4,
          maxConcurrency: 16,
          currentConcurrency: Math.max(4, stats.processing_jobs),
          lastScalingAction: Date.now()
        }
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return this.getDefaultQueueStatus();
    }
  }

  /**
   * Pause job (mark as paused in database)
   */
  static async pauseJob(jobId: string): Promise<boolean> {
    try {
      // Note: This would require adding pause functionality to the database
      // For now, we'll log the intent
      console.log(`⏸️ Pause requested for job ${jobId} (not yet implemented in database)`);
      return false;
    } catch (error) {
      console.error(`Error pausing job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Resume job
   */
  static async resumeJob(jobId: string): Promise<boolean> {
    try {
      return await GradingQueueService.retryJob(jobId);
    } catch (error) {
      console.error(`Error resuming job ${jobId}:`, error);
      return false;
    }
  }

  // Helper methods
  private static async convertDbJobToEnhanced(dbJob: any): Promise<EnhancedBatchJob | null> {
    try {
      const filesData = dbJob.payload?.filesData || [];
      
      return {
        id: dbJob.id,
        files: filesData,
        status: dbJob.status as any,
        priority: dbJob.priority as any,
        createdAt: new Date(dbJob.created_at).getTime(),
        startedAt: dbJob.started_at ? new Date(dbJob.started_at).getTime() : undefined,
        completedAt: dbJob.completed_at ? new Date(dbJob.completed_at).getTime() : undefined,
        progress: this.calculateProgress(dbJob),
        results: dbJob.result_payload?.results || [],
        errors: dbJob.error_message ? [dbJob.error_message] : [],
        estimatedTimeRemaining: this.calculateEstimatedTime(dbJob),
        processingMetrics: {
          filesPerSecond: 0,
          averageFileSize: 0,
          totalProcessingTime: dbJob.processing_time_ms || 0,
          batchOptimizationUsed: true
        }
      };
    } catch (error) {
      console.error('Error converting database job:', error);
      return null;
    }
  }

  private static calculateProgress(dbJob: any): number {
    if (dbJob.status === 'completed') return 100;
    if (dbJob.status === 'failed') return 0;
    if (dbJob.status === 'processing') {
      // Check if we have progress data in result_payload
      if (dbJob.result_payload?.progress) {
        return dbJob.result_payload.progress;
      }
      return 50; // Default estimate
    }
    return 0;
  }

  private static calculateEstimatedTime(dbJob: any): number {
    if (dbJob.status === 'completed' || dbJob.status === 'failed') return 0;
    if (dbJob.status === 'processing' && dbJob.started_at) {
      const elapsed = Date.now() - new Date(dbJob.started_at).getTime();
      return Math.max(0, 30000 - elapsed); // Estimate 30 seconds total
    }
    return 30000; // Default estimate
  }

  private static getDefaultQueueStatus(): EnhancedProcessingQueue {
    return {
      activeJobs: [],
      pendingJobs: [],
      completedJobs: [],
      stats: {
        maxWorkers: 12,
        activeWorkers: 0,
        queueDepth: 0,
        totalJobsProcessed: 0,
        currentThroughput: 0,
        successRate: 95,
        averageProcessingTime: 2000
      },
      autoScaling: {
        enabled: true,
        minConcurrency: 4,
        maxConcurrency: 16,
        currentConcurrency: 8,
        lastScalingAction: Date.now()
      }
    };
  }

  // Cleanup resources
  static cleanup(): void {
    console.log(`🧹 Cleaning up ${this.jobListeners.size} job subscriptions`);
    
    this.jobListeners.forEach((callback, jobId) => {
      if ((callback as any).unsubscribe) {
        (callback as any).unsubscribe();
      }
    });
    this.jobListeners.clear();
  }

  // Legacy methods for backward compatibility
  static loadQueueState(): void {
    console.log('📂 Loading queue state from database (no local storage needed)');
  }

  static updateAutoScalingConfig(config: any): void {
    console.log('⚙️ Auto-scaling config update (handled by database queue)');
  }
}

export const enhancedBatchService = EnhancedBatchProcessingService;
