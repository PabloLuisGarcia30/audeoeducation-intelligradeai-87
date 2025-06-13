import { supabase } from "@/integrations/supabase/client";
import { EnhancedActionLogger } from "./enhancedActionLogger";
import { CacheLoggingService, CacheLogEvent } from "./cacheLoggingService";

export interface StudentCacheEvent extends CacheLogEvent {
  student_id?: string;
  session_type?: 'practice' | 'class_session' | 'trailblazer' | 'exam';
}

export class EnhancedCacheLoggingService extends CacheLoggingService {
  private static studentCacheEvents: StudentCacheEvent[] = [];

  /**
   * Log cache event with student context
   */
  static logStudentCacheEvent(
    eventType: 'hit' | 'miss' | 'store' | 'invalidate',
    cacheKey: string,
    studentId?: string,
    sessionType?: 'practice' | 'class_session' | 'trailblazer' | 'exam',
    additionalData: Partial<StudentCacheEvent> = {}
  ): void {
    const event: StudentCacheEvent = {
      event_type: eventType,
      cache_key: cacheKey,
      student_id: studentId,
      session_type: sessionType,
      ...additionalData
    };

    // Store in memory
    this.studentCacheEvents.push(event);
    
    // Keep memory usage manageable
    if (this.studentCacheEvents.length > 1000) {
      this.studentCacheEvents = this.studentCacheEvents.slice(-1000);
    }

    // Log to parent service
    super.logCacheEvent(eventType, cacheKey, additionalData);

    // Log to enhanced action logger if student context available
    if (studentId) {
      EnhancedActionLogger.logAction({
        student_id: studentId,
        action_type: `cache_${eventType}`,
        context_summary: {
          cache_key: cacheKey,
          response_type: event.response_type,
          processing_time_ms: event.processing_time_ms,
          cost_saving_estimate: event.cost_saving_estimate,
          skill_tags: event.skill_tags
        },
        session_type: sessionType
      }).catch(error => {
        console.warn('Failed to log cache event to action logger:', error);
      });
    }

    // Enhanced console logging
    const studentInfo = studentId ? ` (student: ${studentId})` : '';
    const sessionInfo = sessionType ? ` [${sessionType}]` : '';
    const skillInfo = event.skill_tags ? ` (skills: ${event.skill_tags.join(', ')})` : '';
    const costInfo = event.cost_saving_estimate ? ` saved: $${event.cost_saving_estimate.toFixed(4)}` : '';
    
    console.log(`📋 Student Cache ${eventType}: ${cacheKey}${studentInfo}${sessionInfo}${skillInfo}${costInfo}`);
  }

  /**
   * Log practice exercise cache events
   */
  static logPracticeCacheEvent(
    eventType: 'hit' | 'miss' | 'store' | 'invalidate',
    cacheKey: string,
    studentId: string,
    additionalData: Partial<StudentCacheEvent> = {}
  ): void {
    this.logStudentCacheEvent(eventType, cacheKey, studentId, 'practice', additionalData);
  }

  /**
   * Log class session cache events
   */
  static logClassSessionCacheEvent(
    eventType: 'hit' | 'miss' | 'store' | 'invalidate',
    cacheKey: string,
    studentId: string,
    additionalData: Partial<StudentCacheEvent> = {}
  ): void {
    this.logStudentCacheEvent(eventType, cacheKey, studentId, 'class_session', additionalData);
  }

  /**
   * Log trailblazer cache events
   */
  static logTrailblazerCacheEvent(
    eventType: 'hit' | 'miss' | 'store' | 'invalidate',
    cacheKey: string,
    studentId: string,
    additionalData: Partial<StudentCacheEvent> = {}
  ): void {
    this.logStudentCacheEvent(eventType, cacheKey, studentId, 'trailblazer', additionalData);
  }

  /**
   * Get student cache analytics
   */
  static getStudentCacheAnalytics(studentId: string): {
    totalEvents: number;
    hitRate: number;
    costSavings: number;
    eventsByType: Record<string, number>;
    performanceBySkill: Record<string, { hits: number; misses: number; hitRate: number }>;
  } {
    const studentEvents = this.studentCacheEvents.filter(
      event => event.student_id === studentId
    );

    if (studentEvents.length === 0) {
      return {
        totalEvents: 0,
        hitRate: 0,
        costSavings: 0,
        eventsByType: {},
        performanceBySkill: {}
      };
    }

    const hits = studentEvents.filter(e => e.event_type === 'hit').length;
    const misses = studentEvents.filter(e => e.event_type === 'miss').length;
    const hitRate = (hits + misses) > 0 ? hits / (hits + misses) : 0;
    
    const costSavings = studentEvents
      .filter(e => e.cost_saving_estimate)
      .reduce((sum, e) => sum + (e.cost_saving_estimate || 0), 0);

    const eventsByType: Record<string, number> = {};
    const skillPerformance: Record<string, { hits: number; misses: number }> = {};

    studentEvents.forEach(event => {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
      
      if (event.skill_tags) {
        event.skill_tags.forEach(skill => {
          if (!skillPerformance[skill]) {
            skillPerformance[skill] = { hits: 0, misses: 0 };
          }
          if (event.event_type === 'hit') {
            skillPerformance[skill].hits++;
          } else if (event.event_type === 'miss') {
            skillPerformance[skill].misses++;
          }
        });
      }
    });

    const performanceBySkill: Record<string, { hits: number; misses: number; hitRate: number }> = {};
    Object.entries(skillPerformance).forEach(([skill, stats]) => {
      const total = stats.hits + stats.misses;
      performanceBySkill[skill] = {
        ...stats,
        hitRate: total > 0 ? stats.hits / total : 0
      };
    });

    return {
      totalEvents: studentEvents.length,
      hitRate,
      costSavings,
      eventsByType,
      performanceBySkill
    };
  }

  /**
   * Get cache analytics for teacher dashboard
   */
  static getTeacherCacheAnalytics(studentIds: string[]): {
    totalStudentEvents: number;
    overallHitRate: number;
    totalCostSavings: number;
    topPerformingStudents: Array<{ studentId: string; hitRate: number; events: number }>;
    skillCachePerformance: Record<string, { hits: number; misses: number; hitRate: number }>;
  } {
    const relevantEvents = this.studentCacheEvents.filter(
      event => event.student_id && studentIds.includes(event.student_id)
    );

    if (relevantEvents.length === 0) {
      return {
        totalStudentEvents: 0,
        overallHitRate: 0,
        totalCostSavings: 0,
        topPerformingStudents: [],
        skillCachePerformance: {}
      };
    }

    const hits = relevantEvents.filter(e => e.event_type === 'hit').length;
    const misses = relevantEvents.filter(e => e.event_type === 'miss').length;
    const overallHitRate = (hits + misses) > 0 ? hits / (hits + misses) : 0;
    
    const totalCostSavings = relevantEvents
      .filter(e => e.cost_saving_estimate)
      .reduce((sum, e) => sum + (e.cost_saving_estimate || 0), 0);

    // Calculate per-student performance
    const studentPerformance: Record<string, { hits: number; misses: number; events: number }> = {};
    relevantEvents.forEach(event => {
      if (event.student_id) {
        if (!studentPerformance[event.student_id]) {
          studentPerformance[event.student_id] = { hits: 0, misses: 0, events: 0 };
        }
        studentPerformance[event.student_id].events++;
        if (event.event_type === 'hit') {
          studentPerformance[event.student_id].hits++;
        } else if (event.event_type === 'miss') {
          studentPerformance[event.student_id].misses++;
        }
      }
    });

    const topPerformingStudents = Object.entries(studentPerformance)
      .map(([studentId, stats]) => ({
        studentId,
        hitRate: (stats.hits + stats.misses) > 0 ? stats.hits / (stats.hits + stats.misses) : 0,
        events: stats.events
      }))
      .sort((a, b) => b.hitRate - a.hitRate)
      .slice(0, 10);

    // Calculate skill performance
    const skillPerformance: Record<string, { hits: number; misses: number }> = {};
    relevantEvents.forEach(event => {
      if (event.skill_tags) {
        event.skill_tags.forEach(skill => {
          if (!skillPerformance[skill]) {
            skillPerformance[skill] = { hits: 0, misses: 0 };
          }
          if (event.event_type === 'hit') {
            skillPerformance[skill].hits++;
          } else if (event.event_type === 'miss') {
            skillPerformance[skill].misses++;
          }
        });
      }
    });

    const skillCachePerformance: Record<string, { hits: number; misses: number; hitRate: number }> = {};
    Object.entries(skillPerformance).forEach(([skill, stats]) => {
      const total = stats.hits + stats.misses;
      skillCachePerformance[skill] = {
        ...stats,
        hitRate: total > 0 ? stats.hits / total : 0
      };
    });

    return {
      totalStudentEvents: relevantEvents.length,
      overallHitRate,
      totalCostSavings,
      topPerformingStudents,
      skillCachePerformance
    };
  }
}
