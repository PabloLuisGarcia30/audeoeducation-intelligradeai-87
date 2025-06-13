
import { supabase } from '@/integrations/supabase/client';

export interface GradingJob {
  id: string;
  user_id: string;
  payload: {
    questions: any[];
    examId?: string;
    studentId?: string;
    config?: any;
  };
  result_payload?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  max_retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  job_type: string;
  error_message?: string;
  processing_time_ms?: number;
}

export interface QueueStats {
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs_today: number;
  failed_jobs_today: number;
  avg_processing_time_ms: number;
}

export class GradingQueueService {
  /**
   * Submit a grading job to the queue
   */
  static async submitGradingJob(
    questions: any[],
    config: any = {},
    options: {
      examId?: string;
      studentId?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    } = {}
  ): Promise<{ jobId: string; message: string }> {
    try {
      console.log(`📝 Submitting grading job: ${questions.length} questions`);
      
      const { data, error } = await supabase
        .from('grading_jobs')
        .insert({
          payload: {
            questions,
            examId: options.examId,
            studentId: options.studentId,
            config
          },
          priority: options.priority || 'normal',
          job_type: 'grading'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to submit grading job:', error);
        throw new Error(`Failed to submit grading job: ${error.message}`);
      }

      console.log(`✅ Grading job submitted: ${data.id}`);
      
      return {
        jobId: data.id,
        message: 'Grading job submitted successfully. Results will be available shortly.'
      };
      
    } catch (error) {
      console.error('Error submitting grading job:', error);
      throw error;
    }
  }

  /**
   * Get job status by ID
   */
  static async getJobStatus(jobId: string): Promise<GradingJob | null> {
    try {
      const { data, error } = await supabase
        .from('grading_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job not found
        }
        throw error;
      }

      return data as GradingJob;
      
    } catch (error) {
      console.error(`Error getting job status for ${jobId}:`, error);
      throw error;
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
  ): Promise<GradingJob[]> {
    try {
      let query = supabase
        .from('grading_jobs')
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

      return data as GradingJob[];
      
    } catch (error) {
      console.error('Error getting user jobs:', error);
      throw error;
    }
  }

  /**
   * Subscribe to job updates using Supabase realtime
   */
  static subscribeToJobUpdates(
    jobId: string,
    callback: (job: GradingJob) => void
  ): () => void {
    console.log(`🔔 Subscribing to updates for job ${jobId}`);
    
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'grading_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log(`📦 Job update received for ${jobId}:`, payload.new);
          callback(payload.new as GradingJob);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      console.log(`🔕 Unsubscribing from job ${jobId}`);
      supabase.removeChannel(channel);
    };
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<QueueStats> {
    try {
      const { data, error } = await supabase.rpc('get_grading_queue_stats');
      
      if (error) {
        throw error;
      }

      return data[0] as QueueStats;
      
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('grading_jobs')
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
      console.error(`Error cancelling job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Retry a failed job
   */
  static async retryJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('grading_jobs')
        .update({ 
          status: 'pending',
          error_message: null,
          started_at: null,
          completed_at: null
        })
        .eq('id', jobId)
        .eq('status', 'failed');

      if (error) {
        throw error;
      }

      return true;
      
    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Trigger the queue worker manually
   */
  static async triggerWorker(): Promise<any> {
    try {
      console.log('🚀 Triggering queue worker manually');
      
      const { data, error } = await supabase.functions.invoke('grading-queue-worker');
      
      if (error) {
        throw error;
      }

      console.log('✅ Worker triggered successfully:', data);
      return data;
      
    } catch (error) {
      console.error('Error triggering worker:', error);
      throw error;
    }
  }
}
