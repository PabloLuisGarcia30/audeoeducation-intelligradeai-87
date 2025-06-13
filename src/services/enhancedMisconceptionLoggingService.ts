import { supabase } from "@/integrations/supabase/client";
import { EnhancedActionLogger } from "./enhancedActionLogger";

export interface MisconceptionEvent {
  student_id: string;
  misconception_type: string;
  skill_name: string;
  severity: 'low' | 'medium' | 'high';
  context_data?: Record<string, any>;
  session_type?: 'practice' | 'class_session' | 'trailblazer' | 'exam';
  exercise_id?: string;
}

export class EnhancedMisconceptionLoggingService {
  private static misconceptionEvents: MisconceptionEvent[] = [];

  /**
   * Log misconception with enhanced action correlation
   */
  static async logMisconception(event: MisconceptionEvent): Promise<void> {
    try {
      // Store in memory for immediate access
      this.misconceptionEvents.push({
        ...event,
        timestamp: Date.now()
      } as any);

      // Log to enhanced action logger
      await EnhancedActionLogger.logAction({
        student_id: event.student_id,
        action_type: 'misconception_detected',
        reference_table: event.exercise_id ? 'mistake_patterns' : undefined,
        reference_id: event.exercise_id,
        context_summary: {
          misconception_type: event.misconception_type,
          skill_name: event.skill_name,
          severity: event.severity,
          ...event.context_data
        },
        session_type: event.session_type
      });

      // Keep memory manageable
      if (this.misconceptionEvents.length > 1000) {
        this.misconceptionEvents = this.misconceptionEvents.slice(-1000);
      }

      console.log(`🧠 Misconception logged: ${event.misconception_type} for ${event.skill_name} (${event.severity})`);
    } catch (error) {
      console.warn('Failed to log misconception:', error);
    }
  }

  /**
   * Log practice exercise misconception
   */
  static async logPracticeMisconception(
    studentId: string,
    misconceptionType: string,
    skillName: string,
    severity: 'low' | 'medium' | 'high',
    exerciseId?: string,
    contextData?: Record<string, any>
  ): Promise<void> {
    await this.logMisconception({
      student_id: studentId,
      misconception_type: misconceptionType,
      skill_name: skillName,
      severity,
      session_type: 'practice',
      exercise_id: exerciseId,
      context_data: contextData
    });
  }

  /**
   * Log class session misconception
   */
  static async logClassSessionMisconception(
    studentId: string,
    misconceptionType: string,
    skillName: string,
    severity: 'low' | 'medium' | 'high',
    exerciseId?: string,
    contextData?: Record<string, any>
  ): Promise<void> {
    await this.logMisconception({
      student_id: studentId,
      misconception_type: misconceptionType,
      skill_name: skillName,
      severity,
      session_type: 'class_session',
      exercise_id: exerciseId,
      context_data: contextData
    });
  }

  /**
   * Log trailblazer misconception
   */
  static async logTrailblazerMisconception(
    studentId: string,
    misconceptionType: string,
    skillName: string,
    severity: 'low' | 'medium' | 'high',
    sessionId?: string,
    contextData?: Record<string, any>
  ): Promise<void> {
    await this.logMisconception({
      student_id: studentId,
      misconception_type: misconceptionType,
      skill_name: skillName,
      severity,
      session_type: 'trailblazer',
      exercise_id: sessionId,
      context_data: contextData
    });
  }

  /**
   * Get misconception patterns for a student
   */
  static getStudentMisconceptionPatterns(studentId: string): {
    totalMisconceptions: number;
    byType: Record<string, number>;
    bySkill: Record<string, number>;
    bySeverity: Record<string, number>;
    recentTrends: MisconceptionEvent[];
  } {
    const studentEvents = this.misconceptionEvents.filter(
      event => event.student_id === studentId
    );

    const byType: Record<string, number> = {};
    const bySkill: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    studentEvents.forEach(event => {
      byType[event.misconception_type] = (byType[event.misconception_type] || 0) + 1;
      bySkill[event.skill_name] = (bySkill[event.skill_name] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    });

    return {
      totalMisconceptions: studentEvents.length,
      byType,
      bySkill,
      bySeverity,
      recentTrends: studentEvents.slice(-10) // Last 10 misconceptions
    };
  }

  /**
   * Get misconception analytics for teacher dashboard
   */
  static getMisconceptionAnalytics(studentIds: string[]): {
    totalMisconceptions: number;
    mostCommonTypes: Array<{ type: string; count: number }>;
    mostAffectedSkills: Array<{ skill: string; count: number }>;
    severityDistribution: Record<string, number>;
  } {
    const relevantEvents = this.misconceptionEvents.filter(
      event => studentIds.includes(event.student_id)
    );

    const typeCount: Record<string, number> = {};
    const skillCount: Record<string, number> = {};
    const severityCount: Record<string, number> = {};

    relevantEvents.forEach(event => {
      typeCount[event.misconception_type] = (typeCount[event.misconception_type] || 0) + 1;
      skillCount[event.skill_name] = (skillCount[event.skill_name] || 0) + 1;
      severityCount[event.severity] = (severityCount[event.severity] || 0) + 1;
    });

    const mostCommonTypes = Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostAffectedSkills = Object.entries(skillCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalMisconceptions: relevantEvents.length,
      mostCommonTypes,
      mostAffectedSkills,
      severityDistribution: severityCount
    };
  }
}
