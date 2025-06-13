import { supabase } from "@/integrations/supabase/client";
import { ProgressAnalyticsService } from "@/services/progressAnalyticsService";

export interface UnifiedStudentResult {
  id?: string;
  student_id: string;
  session_type: 'class_session' | 'trailblazer' | 'home_learner' | 'practice';
  session_id?: string;
  skill_name: string;
  skill_type: 'content' | 'subject';
  score: number;
  points_earned: number;
  points_possible: number;
  exercise_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface UnifiedStudentMisconception {
  id?: string;
  student_id: string;
  session_type: 'class_session' | 'trailblazer' | 'home_learner' | 'practice';
  session_id?: string;
  skill_name: string;
  misconception_type: string;
  misconception_category?: string;
  severity: 'low' | 'medium' | 'high';
  confidence_score?: number;
  question_id?: string;
  student_answer?: string;
  correct_answer?: string;
  context_data?: Record<string, any>;
  resolved?: boolean;
  persistence_count?: number;
  detected_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UnifiedPerformanceData {
  skill_name: string;
  skill_type: string;
  avg_score: number;
  total_attempts: number;
  best_score: number;
  latest_score: number;
  session_types: string[];
  last_practiced_at: string;
}

export interface UnifiedMisconceptionAnalysis {
  skill_name: string;
  misconception_type: string;
  misconception_category: string;
  total_occurrences: number;
  avg_persistence: number;
  severity_distribution: Record<string, number>;
  session_types: string[];
  resolved_count: number;
  active_count: number;
  latest_detection: string;
}

export class UnifiedStudentResultsService {
  /**
   * Record a skill score result with automatic progress metrics tracking
   */
  static async recordSkillResult(result: UnifiedStudentResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('unified_student_results')
        .insert(result);

      if (error) {
        console.error('Error recording unified skill result:', error);
        throw error;
      }

      // Automatically record progress metric
      await ProgressAnalyticsService.recordProgressMetric({
        student_id: result.student_id,
        skill_name: result.skill_name,
        skill_type: result.skill_type as 'content' | 'subject',
        session_type: result.session_type as 'class_session' | 'trailblazer' | 'home_learner' | 'practice',
        session_id: result.session_id,
        accuracy: result.score,
        confidence_score: result.score, // Using score as confidence for now
        time_spent_seconds: 0, // Would need to be tracked separately
        attempts_count: 1,
        misconception_detected: false
      });

      console.log(`✅ Recorded ${result.session_type} skill result with progress tracking: ${result.skill_name} (${result.score})`);
    } catch (error) {
      console.error('Failed to record unified skill result:', error);
      throw error;
    }
  }

  /**
   * Record a misconception with automatic progress metrics tracking
   */
  static async recordMisconception(misconception: UnifiedStudentMisconception): Promise<void> {
    try {
      const { error } = await supabase
        .from('unified_student_misconceptions')
        .insert(misconception);

      if (error) {
        console.error('Error recording unified misconception:', error);
        throw error;
      }

      // Record progress metric for misconception
      await ProgressAnalyticsService.recordProgressMetric({
        student_id: misconception.student_id,
        skill_name: misconception.skill_name,
        skill_type: 'content', // Default to content for misconceptions
        session_type: misconception.session_type as 'class_session' | 'trailblazer' | 'home_learner' | 'practice',
        session_id: misconception.session_id,
        accuracy: 0, // Misconceptions indicate 0% accuracy for this attempt
        confidence_score: misconception.confidence_score || 0,
        time_spent_seconds: 0,
        attempts_count: 1,
        misconception_detected: true,
        misconception_subtype_id: misconception.id
      });

      console.log(`🧠 Recorded ${misconception.session_type} misconception with progress tracking: ${misconception.misconception_type}`);
    } catch (error) {
      console.error('Failed to record unified misconception:', error);
      throw error;
    }
  }

  /**
   * Get unified performance data for a student
   */
  static async getStudentPerformance(studentId: string, days: number = 30): Promise<UnifiedPerformanceData[]> {
    try {
      const { data, error } = await supabase.rpc('get_unified_student_performance', {
        p_student_id: studentId,
        p_days: days
      });

      if (error) {
        console.error('Error fetching unified student performance:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch unified student performance:', error);
      return [];
    }
  }

  /**
   * Get unified misconception analysis for a student
   */
  static async getStudentMisconceptions(studentId: string, days: number = 30): Promise<UnifiedMisconceptionAnalysis[]> {
    try {
      const { data, error } = await supabase.rpc('get_unified_misconception_analysis', {
        p_student_id: studentId,
        p_days: days
      });

      if (error) {
        console.error('Error fetching unified misconception analysis:', error);
        return [];
      }

      // Transform the data to ensure proper typing
      return (data || []).map((item: any): UnifiedMisconceptionAnalysis => ({
        skill_name: item.skill_name,
        misconception_type: item.misconception_type,
        misconception_category: item.misconception_category,
        total_occurrences: item.total_occurrences,
        avg_persistence: item.avg_persistence,
        severity_distribution: typeof item.severity_distribution === 'string' 
          ? JSON.parse(item.severity_distribution) 
          : item.severity_distribution,
        session_types: item.session_types,
        resolved_count: item.resolved_count,
        active_count: item.active_count,
        latest_detection: item.latest_detection
      }));
    } catch (error) {
      console.error('Failed to fetch unified misconception analysis:', error);
      return [];
    }
  }

  /**
   * Batch record multiple skill results (for class sessions)
   */
  static async batchRecordSkillResults(results: UnifiedStudentResult[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('unified_student_results')
        .insert(results);

      if (error) {
        console.error('Error batch recording skill results:', error);
        throw error;
      }

      console.log(`✅ Batch recorded ${results.length} skill results`);
    } catch (error) {
      console.error('Failed to batch record skill results:', error);
      throw error;
    }
  }

  /**
   * Batch record multiple misconceptions (for class sessions)
   */
  static async batchRecordMisconceptions(misconceptions: UnifiedStudentMisconception[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('unified_student_misconceptions')
        .insert(misconceptions);

      if (error) {
        console.error('Error batch recording misconceptions:', error);
        throw error;
      }

      console.log(`🧠 Batch recorded ${misconceptions.length} misconceptions`);
    } catch (error) {
      console.error('Failed to batch record misconceptions:', error);
      throw error;
    }
  }

  /**
   * Mark misconceptions as resolved
   */
  static async resolveMisconceptions(studentId: string, misconceptionIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('unified_student_misconceptions')
        .update({ resolved: true, updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .in('id', misconceptionIds);

      if (error) {
        console.error('Error resolving misconceptions:', error);
        throw error;
      }

      console.log(`✅ Resolved ${misconceptionIds.length} misconceptions for student ${studentId}`);
    } catch (error) {
      console.error('Failed to resolve misconceptions:', error);
      throw error;
    }
  }

  /**
   * Get session type breakdown for a student
   */
  static async getSessionTypeBreakdown(studentId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('unified_student_results')
        .select('session_type')
        .eq('student_id', studentId);

      if (error || !data) {
        return {};
      }

      const breakdown: Record<string, number> = {};
      data.forEach(result => {
        breakdown[result.session_type] = (breakdown[result.session_type] || 0) + 1;
      });

      return breakdown;
    } catch (error) {
      console.error('Failed to get session type breakdown:', error);
      return {};
    }
  }
}
