
import { supabase } from '@/integrations/supabase/client';
import { 
  FileData, 
  submitFileProcessingJob, 
  getFileJobStatus, 
  subscribeToFileJobUpdates,
  getFileJobQueueStats 
} from '@/lib/fileProcessor';

export interface FileJobData {
  files: FileData[];
  options?: any;
}

export interface FileJob {
  id: string;
  user_id?: string;
  file_group_data: FileJobData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retry_count: number;
  max_retries: number;
  result_json?: any;
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export class FileJobService {
  private static jobListeners: Map<string, () => void> = new Map();

  /**
   * Type guard to validate FileJobData structure
   */
  private static isValidFileJobData(data: any): data is FileJobData {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.files) &&
      data.files.every((file: any) => 
        file &&
        typeof file === 'object' &&
        typeof file.name === 'string' &&
        typeof file.size === 'number' &&
        typeof file.type === 'string' &&
        typeof file.lastModified === 'number'
      )
    );
  }

  /**
   * Safely cast database result to FileJobData
   */
  private static castToFileJobData(data: any): FileJobData {
    if (this.isValidFileJobData(data)) {
      return data;
    }
    
    // Fallback with empty structure if data is invalid
    console.warn('Invalid file job data structure, using fallback:', data);
    return {
      files: [],
      options: data || {}
    };
  }

  /**
   * Create a new file processing job
   */
  static async createFileJob(
    files: File[],
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      userId?: string;
    } = {}
  ): Promise<{ jobId: string; message: string }> {
    // Convert File objects to FileData
    const filesData: FileData[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }));

    return submitFileProcessingJob(filesData, options);
  }

  /**
   * Get job status by ID
   */
  static async getJobStatus(jobId: string): Promise<FileJob | null> {
    const result = await getFileJobStatus(jobId);
    if (!result) return null;
    
    // Safely cast the database result to our FileJob type
    return {
      ...result,
      file_group_data: this.castToFileJobData(result.file_group_data)
    } as FileJob;
  }

  /**
   * Subscribe to job updates
   */
  static subscribeToJob(jobId: string, callback: (job: FileJob) => void): () => void {
    const wrappedCallback = (job: any) => {
      // Safely cast the database result to our FileJob type
      const typedJob: FileJob = {
        ...job,
        file_group_data: this.castToFileJobData(job.file_group_data)
      };
      callback(typedJob);
    };
    
    const unsubscribe = subscribeToFileJobUpdates(jobId, wrappedCallback);
    this.jobListeners.set(jobId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribe from job updates
   */
  static unsubscribeFromJob(jobId: string): void {
    const unsubscribe = this.jobListeners.get(jobId);
    if (unsubscribe) {
      unsubscribe();
      this.jobListeners.delete(jobId);
    }
  }

  /**
   * Get user's jobs with pagination
   */
  static async getUserJobs(
    userId?: string,
    options: {
      status?: 'pending' | 'processing' | 'completed' | 'failed';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<FileJob[]> {
    try {
      let query = supabase
        .from('file_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Safely cast the database results to our FileJob type
      return (data || []).map(item => ({
        ...item,
        file_group_data: this.castToFileJobData(item.file_group_data)
      })) as FileJob[];
      
    } catch (error) {
      console.error('Error getting user file jobs:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('file_jobs')
        .update({ 
          status: 'failed',
          error_message: 'Cancelled by user',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'pending'); // Only cancel pending jobs

      if (error) {
        throw error;
      }

      return true;
      
    } catch (error) {
      console.error(`Error cancelling file job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Retry a failed job
   */
  static async retryJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('file_jobs')
        .update({ 
          status: 'pending',
          error_message: null,
          started_at: null,
          completed_at: null,
          retry_count: 0
        })
        .eq('id', jobId)
        .eq('status', 'failed');

      if (error) {
        throw error;
      }

      return true;
      
    } catch (error) {
      console.error(`Error retrying file job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    return getFileJobQueueStats();
  }

  /**
   * Cleanup subscriptions
   */
  static cleanup(): void {
    console.log(`🧹 Cleaning up ${this.jobListeners.size} file job subscriptions`);
    
    this.jobListeners.forEach((unsubscribe) => unsubscribe());
    this.jobListeners.clear();
  }
}
