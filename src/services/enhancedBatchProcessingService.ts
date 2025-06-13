
import { supabase } from '@/integrations/supabase/client';
import { GradingQueueService } from './gradingQueueService';
import { FileJobService, type FileJob, type FileJobData } from './fileJobService';
import { FileData } from '@/lib/fileProcessor';

export interface EnhancedBatchJob {
  id: string;
  files: FileData[]; // Changed from File[] to FileData[]
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
   * Create a batch job using the new decoupled file processing system
   */
  static async createBatchJob(files: File[], priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): Promise<string> {
    console.log(`🎯 Creating decoupled batch job with ${files.length} files (priority: ${priority})`);
    
    try {
      // Use the new FileJobService instead of the grading queue
      const result = await FileJobService.createFileJob(files, { priority });

      console.log(`✅ Decoupled batch job created: ${result.jobId}`);
      return result.jobId;
      
    } catch (error) {
      console.error('Failed to create decoupled batch job:', error);
      throw error;
    }
  }

  /**
   * Get job status from the file jobs system
   */
  static async getJob(jobId: string): Promise<EnhancedBatchJob | null> {
    try {
      const fileJob = await FileJobService.getJobStatus(jobId);
      if (!fileJob) return null;

      return this.convertFileJobToEnhanced(fileJob);
    } catch (error) {
      console.error(`Error getting job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Subscribe to job updates using the file job service
   */
  static subscribeToJob(jobId: string, callback: (job: EnhancedBatchJob) => void): void {
    console.log(`🔔 Subscribing to decoupled job updates: ${jobId}`);
    
    // Store callback for this job
    this.jobListeners.set(jobId, callback);

    // Subscribe to file job updates
    const unsubscribe = FileJobService.subscribeToJob(jobId, async (fileJob: FileJob) => {
      const enhancedJob = this.convertFileJobToEnhanced(fileJob);
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
    FileJobService.unsubscribeFromJob(jobId);
  }

  /**
   * Get queue status from the file job system
   */
  static async getQueueStatus(): Promise<EnhancedProcessingQueue> {
    try {
      const stats = await FileJobService.getQueueStats();
      
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
   * Pause job (mark as failed with pause message)
   */
  static async pauseJob(jobId: string): Promise<boolean> {
    try {
      return await FileJobService.cancelJob(jobId);
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
      return await FileJobService.retryJob(jobId);
    } catch (error) {
      console.error(`Error resuming job ${jobId}:`, error);
      return false;
    }
  }

  // Helper methods
  private static convertFileJobToEnhanced(fileJob: FileJob): EnhancedBatchJob {
    const filesData = fileJob.file_group_data?.files || [];
    
    return {
      id: fileJob.id,
      files: filesData, // Now correctly typed as FileData[]
      status: fileJob.status as any,
      priority: fileJob.priority,
      createdAt: new Date(fileJob.created_at).getTime(),
      startedAt: fileJob.started_at ? new Date(fileJob.started_at).getTime() : undefined,
      completedAt: fileJob.completed_at ? new Date(fileJob.completed_at).getTime() : undefined,
      progress: this.calculateProgress(fileJob),
      results: fileJob.result_json?.results || [],
      errors: fileJob.error_message ? [fileJob.error_message] : [],
      estimatedTimeRemaining: this.calculateEstimatedTime(fileJob),
      processingMetrics: {
        filesPerSecond: 0,
        averageFileSize: this.calculateAverageFileSize(filesData),
        totalProcessingTime: fileJob.processing_time_ms || 0,
        batchOptimizationUsed: true
      }
    };
  }

  private static calculateProgress(fileJob: FileJob): number {
    if (fileJob.status === 'completed') return 100;
    if (fileJob.status === 'failed') return 0;
    if (fileJob.status === 'processing') {
      // Check if we have progress data in result_json
      if (fileJob.result_json?.progress) {
        return fileJob.result_json.progress;
      }
      return 50; // Default estimate for processing
    }
    return 0; // pending
  }

  private static calculateEstimatedTime(fileJob: FileJob): number {
    if (fileJob.status === 'completed' || fileJob.status === 'failed') return 0;
    if (fileJob.status === 'processing' && fileJob.started_at) {
      const elapsed = Date.now() - new Date(fileJob.started_at).getTime();
      const filesCount = fileJob.file_group_data?.files?.length || 1;
      const estimatedTotal = filesCount * 2000; // 2 seconds per file estimate
      return Math.max(0, estimatedTotal - elapsed);
    }
    const filesCount = fileJob.file_group_data?.files?.length || 1;
    return filesCount * 2000; // Default estimate
  }

  private static calculateAverageFileSize(filesData: any[]): number {
    if (!filesData || filesData.length === 0) return 0;
    const totalSize = filesData.reduce((sum, file) => sum + (file.size || 0), 0);
    return totalSize / filesData.length;
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
    FileJobService.cleanup();
  }

  // Legacy methods for backward compatibility
  static loadQueueState(): void {
    console.log('📂 Loading queue state from decoupled database system');
  }

  static updateAutoScalingConfig(config: any): void {
    console.log('⚙️ Auto-scaling config update (handled by decoupled file job system)');
  }
}

export const enhancedBatchService = EnhancedBatchProcessingService;
