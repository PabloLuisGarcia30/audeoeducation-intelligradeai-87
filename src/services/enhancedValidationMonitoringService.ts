import { supabase } from "@/integrations/supabase/client";
import { EnhancedActionLogger } from "./enhancedActionLogger";

export interface ValidationEvent {
  operation_type: string;
  student_id?: string;
  validation_time_ms: number;
  success_rate: number;
  error_details?: string;
  context_data?: Record<string, any>;
}

export class EnhancedValidationMonitoringService {
  private static validationEvents: ValidationEvent[] = [];

  /**
   * Log validation event with student context
   */
  static logValidationEvent(event: ValidationEvent): void {
    // Store in memory for immediate access
    this.validationEvents.push({
      ...event,
      timestamp: Date.now()
    } as any);

    // Log to enhanced action logger if student context available
    if (event.student_id) {
      EnhancedActionLogger.logAction({
        student_id: event.student_id,
        action_type: `validation_${event.operation_type}`,
        context_summary: {
          validation_time_ms: event.validation_time_ms,
          success_rate: event.success_rate,
          operation_type: event.operation_type,
          error_details: event.error_details
        }
      }).catch(error => {
        console.warn('Failed to log validation event to action logger:', error);
      });
    }

    // Keep memory manageable
    if (this.validationEvents.length > 1000) {
      this.validationEvents = this.validationEvents.slice(-1000);
    }

    console.log(`🔍 Validation event logged: ${event.operation_type} (${event.validation_time_ms}ms)`);
  }

  /**
   * Log practice exercise validation
   */
  static logPracticeValidation(
    studentId: string,
    validationTimeMs: number,
    successRate: number,
    errorDetails?: string
  ): void {
    this.logValidationEvent({
      operation_type: 'practice_exercise_validation',
      student_id: studentId,
      validation_time_ms: validationTimeMs,
      success_rate: successRate,
      error_details: errorDetails
    });
  }

  /**
   * Log grading validation
   */
  static logGradingValidation(
    studentId: string,
    validationTimeMs: number,
    successRate: number,
    gradingMethod: string,
    errorDetails?: string
  ): void {
    this.logValidationEvent({
      operation_type: 'grading_validation',
      student_id: studentId,
      validation_time_ms: validationTimeMs,
      success_rate: successRate,
      error_details: errorDetails,
      context_data: { grading_method: gradingMethod }
    });
  }

  /**
   * Log misconception detection validation
   */
  static logMisconceptionValidation(
    studentId: string,
    validationTimeMs: number,
    successRate: number,
    misconceptionsDetected: number
  ): void {
    this.logValidationEvent({
      operation_type: 'misconception_validation',
      student_id: studentId,
      validation_time_ms: validationTimeMs,
      success_rate: successRate,
      context_data: { misconceptions_detected: misconceptionsDetected }
    });
  }

  /**
   * Get validation statistics for a student
   */
  static getStudentValidationStats(studentId: string): {
    totalValidations: number;
    averageTime: number;
    averageSuccessRate: number;
  } {
    const studentEvents = this.validationEvents.filter(
      event => event.student_id === studentId
    );

    if (studentEvents.length === 0) {
      return { totalValidations: 0, averageTime: 0, averageSuccessRate: 0 };
    }

    const totalTime = studentEvents.reduce((sum, event) => sum + event.validation_time_ms, 0);
    const totalSuccessRate = studentEvents.reduce((sum, event) => sum + event.success_rate, 0);

    return {
      totalValidations: studentEvents.length,
      averageTime: totalTime / studentEvents.length,
      averageSuccessRate: totalSuccessRate / studentEvents.length
    };
  }

  /**
   * Get validation analytics for teacher dashboard
   */
  static getValidationAnalytics(): {
    totalValidations: number;
    averageValidationTime: number;
    operationBreakdown: Record<string, number>;
    recentFailures: ValidationEvent[];
  } {
    const totalValidations = this.validationEvents.length;
    
    if (totalValidations === 0) {
      return {
        totalValidations: 0,
        averageValidationTime: 0,
        operationBreakdown: {},
        recentFailures: []
      };
    }

    const totalTime = this.validationEvents.reduce((sum, event) => sum + event.validation_time_ms, 0);
    const operationBreakdown: Record<string, number> = {};
    
    this.validationEvents.forEach(event => {
      operationBreakdown[event.operation_type] = (operationBreakdown[event.operation_type] || 0) + 1;
    });

    const recentFailures = this.validationEvents
      .filter(event => event.success_rate < 0.8)
      .slice(-10); // Last 10 failures

    return {
      totalValidations,
      averageValidationTime: totalTime / totalValidations,
      operationBreakdown,
      recentFailures
    };
  }
}
