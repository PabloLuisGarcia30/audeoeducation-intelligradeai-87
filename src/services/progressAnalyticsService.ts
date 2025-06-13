
import { supabase } from "@/integrations/supabase/client";

export interface ProgressMetric {
  id: string;
  student_id: string;
  skill_name: string;
  skill_type: 'content' | 'subject';
  session_type: 'class_session' | 'trailblazer' | 'home_learner' | 'practice';
  session_id?: string;
  accuracy: number;
  confidence_score: number;
  time_spent_seconds: number;
  attempts_count: number;
  misconception_detected: boolean;
  misconception_subtype_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentProgressAnalytics {
  skill_name: string;
  skill_type: string;
  avg_accuracy: number;
  avg_confidence: number;
  total_attempts: number;
  total_time_spent: number;
  latest_accuracy: number;
  improvement_trend: number;
  session_types: string[];
}

export interface ClassProgressAnalytics {
  student_id: string;
  student_name: string;
  skill_name: string;
  skill_type: string;
  accuracy: number;
  confidence_score: number;
  attempts_count: number;
  misconceptions_count: number;
  last_practiced_at: string;
}

export class ProgressAnalyticsService {
  /**
   * Record a progress metric
   */
  static async recordProgressMetric(metric: Omit<ProgressMetric, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('progress_metrics')
        .insert(metric);

      if (error) {
        console.error('Error recording progress metric:', error);
        throw error;
      }

      console.log(`✅ Recorded progress metric: ${metric.skill_name} (${metric.accuracy}% accuracy)`);
    } catch (error) {
      console.error('Failed to record progress metric:', error);
      throw error;
    }
  }

  /**
   * Get student progress analytics
   */
  static async getStudentProgressAnalytics(studentId: string, days: number = 30): Promise<StudentProgressAnalytics[]> {
    try {
      const { data, error } = await supabase.rpc('get_student_progress_analytics', {
        p_student_id: studentId,
        p_days: days
      });

      if (error) {
        console.error('Error fetching student progress analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch student progress analytics:', error);
      return [];
    }
  }

  /**
   * Get class progress analytics
   */
  static async getClassProgressAnalytics(classId: string, days: number = 30): Promise<ClassProgressAnalytics[]> {
    try {
      const { data, error } = await supabase.rpc('get_class_progress_analytics', {
        p_class_id: classId,
        p_days: days
      });

      if (error) {
        console.error('Error fetching class progress analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch class progress analytics:', error);
      return [];
    }
  }

  /**
   * Get progress metrics for a student
   */
  static async getStudentProgressMetrics(studentId: string, limit: number = 100): Promise<ProgressMetric[]> {
    try {
      const { data, error } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching progress metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch progress metrics:', error);
      return [];
    }
  }

  /**
   * Batch record multiple progress metrics
   */
  static async batchRecordProgressMetrics(metrics: Omit<ProgressMetric, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('progress_metrics')
        .insert(metrics);

      if (error) {
        console.error('Error batch recording progress metrics:', error);
        throw error;
      }

      console.log(`✅ Batch recorded ${metrics.length} progress metrics`);
    } catch (error) {
      console.error('Failed to batch record progress metrics:', error);
      throw error;
    }
  }
}
