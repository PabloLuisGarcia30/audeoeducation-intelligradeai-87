
import { supabase } from "@/integrations/supabase/client";

export interface ActionLogEntry {
  student_id: string;
  action_type: string;
  reference_table?: string;
  reference_id?: string;
  context_summary?: Record<string, any>;
  session_type?: 'practice' | 'class_session' | 'trailblazer' | 'exam';
}

export class EnhancedActionLogger {
  /**
   * Log student action with reference to existing detailed data
   */
  static async logAction(entry: ActionLogEntry): Promise<void> {
    try {
      console.log(`📝 Logging student action: ${entry.action_type} for student ${entry.student_id}`);
      
      const { error } = await supabase
        .from('student_action_logs')
        .insert({
          student_id: entry.student_id,
          action_type: entry.action_type,
          reference_table: entry.reference_table,
          reference_id: entry.reference_id,
          context_summary: entry.context_summary || {},
          session_type: entry.session_type
        });

      if (error) {
        console.warn('Failed to log student action:', error);
        // Don't throw - logging failures shouldn't break functionality
      } else {
        console.log(`✅ Student action logged successfully: ${entry.action_type}`);
      }
    } catch (error) {
      console.warn('Error logging student action:', error);
      // Silent fail to not disrupt existing functionality
    }
  }

  /**
   * Log practice exercise actions
   */
  static async logPracticeAction(
    studentId: string,
    actionType: 'practice_started' | 'practice_completed' | 'practice_abandoned',
    exerciseId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      student_id: studentId,
      action_type: actionType,
      reference_table: exerciseId ? 'student_practice_sessions' : undefined,
      reference_id: exerciseId,
      context_summary: context,
      session_type: 'practice'
    });
  }

  /**
   * Log class session actions
   */
  static async logClassSessionAction(
    studentId: string,
    actionType: 'session_joined' | 'exercise_started' | 'exercise_completed' | 'session_left',
    exerciseId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      student_id: studentId,
      action_type: actionType,
      reference_table: exerciseId ? 'student_exercises' : undefined,
      reference_id: exerciseId,
      context_summary: context,
      session_type: 'class_session'
    });
  }

  /**
   * Log trailblazer session actions
   */
  static async logTrailblazerAction(
    studentId: string,
    actionType: 'trailblazer_started' | 'trailblazer_completed' | 'concept_mastered',
    sessionId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      student_id: studentId,
      action_type: actionType,
      reference_table: sessionId ? 'user_streaks' : undefined,
      reference_id: sessionId,
      context_summary: context,
      session_type: 'trailblazer'
    });
  }

  /**
   * Log exam/test actions
   */
  static async logExamAction(
    studentId: string,
    actionType: 'exam_started' | 'exam_submitted' | 'exam_graded',
    examId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      student_id: studentId,
      action_type: actionType,
      reference_table: examId ? 'test_results' : undefined,
      reference_id: examId,
      context_summary: context,
      session_type: 'exam'
    });
  }

  /**
   * Get student activity summary for teachers
   */
  static async getStudentActivitySummary(studentId: string, days: number = 30): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('student_action_logs')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching student activity summary:', error);
      return [];
    }
  }

  /**
   * Get activity analytics for teacher dashboard
   */
  static async getActivityAnalytics(teacherStudentIds: string[], days: number = 7): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsBySession: Record<string, number>;
    activeStudents: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('student_action_logs')
        .select('action_type, session_type, student_id')
        .in('student_id', teacherStudentIds)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const actions = data || [];
      const actionsByType: Record<string, number> = {};
      const actionsBySession: Record<string, number> = {};
      const uniqueStudents = new Set();

      actions.forEach(action => {
        actionsByType[action.action_type] = (actionsByType[action.action_type] || 0) + 1;
        if (action.session_type) {
          actionsBySession[action.session_type] = (actionsBySession[action.session_type] || 0) + 1;
        }
        uniqueStudents.add(action.student_id);
      });

      return {
        totalActions: actions.length,
        actionsByType,
        actionsBySession,
        activeStudents: uniqueStudents.size
      };
    } catch (error) {
      console.error('Error fetching activity analytics:', error);
      return {
        totalActions: 0,
        actionsByType: {},
        actionsBySession: {},
        activeStudents: 0
      };
    }
  }
}
