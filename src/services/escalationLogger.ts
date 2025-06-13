
import { EscalationOutcomeService } from './escalationOutcomeService';
import type { EscalationOutcome } from '@/types/escalationOutcome';

/**
 * Centralized escalation logging utility
 * Provides convenient methods for different types of escalations
 */
export class EscalationLogger {
  /**
   * Log a skill ambiguity escalation
   */
  static async logSkillAmbiguity(data: {
    studentId?: string;
    examId?: string;
    questionId?: string;
    originalService: string;
    ambiguityDescription: string;
    selectedSolution: string;
    originalConfidence?: number;
    finalConfidence?: number;
    context?: Record<string, any>;
  }): Promise<string | null> {
    const outcome: EscalationOutcome = {
      student_id: data.studentId,
      exam_id: data.examId,
      question_id: data.questionId,
      escalation_type: 'skill_ambiguity',
      original_service: data.originalService,
      ambiguity_description: data.ambiguityDescription,
      selected_solution: data.selectedSolution,
      original_confidence: data.originalConfidence,
      final_confidence: data.finalConfidence,
      context: data.context || {}
    };

    return await EscalationOutcomeService.logEscalationOutcome(outcome);
  }

  /**
   * Log a fallback triggered escalation
   */
  static async logFallbackTriggered(data: {
    studentId?: string;
    examId?: string;
    sessionId?: string;
    originalService: string;
    ambiguityDescription: string;
    fallbackPath: string;
    originalConfidence?: number;
    processingTimeMs?: number;
    context?: Record<string, any>;
  }): Promise<string | null> {
    const outcome: EscalationOutcome = {
      student_id: data.studentId,
      exam_id: data.examId,
      session_id: data.sessionId,
      escalation_type: 'fallback_triggered',
      original_service: data.originalService,
      ambiguity_description: data.ambiguityDescription,
      selected_solution: `Fallback to ${data.fallbackPath}`,
      fallback_path: data.fallbackPath,
      original_confidence: data.originalConfidence,
      processing_time_ms: data.processingTimeMs,
      context: data.context || {}
    };

    return await EscalationOutcomeService.logEscalationOutcome(outcome);
  }

  /**
   * Log a model escalation (e.g., GPT-4 to GPT-4o-mini)
   */
  static async logModelEscalation(data: {
    studentId?: string;
    examId?: string;
    questionId?: string;
    originalService: string;
    ambiguityDescription: string;
    modelsUsed: string[];
    selectedSolution: string;
    processingTimeMs?: number;
    costImpact?: number;
    context?: Record<string, any>;
  }): Promise<string | null> {
    const outcome: EscalationOutcome = {
      student_id: data.studentId,
      exam_id: data.examId,
      question_id: data.questionId,
      escalation_type: 'model_escalation',
      original_service: data.originalService,
      ambiguity_description: data.ambiguityDescription,
      selected_solution: data.selectedSolution,
      models_used: data.modelsUsed,
      processing_time_ms: data.processingTimeMs,
      cost_impact: data.costImpact,
      context: data.context || {}
    };

    return await EscalationOutcomeService.logEscalationOutcome(outcome);
  }

  /**
   * Log a validation failure escalation
   */
  static async logValidationFailure(data: {
    studentId?: string;
    examId?: string;
    questionId?: string;
    originalService: string;
    ambiguityDescription: string;
    selectedSolution: string;
    fallbackPath?: string;
    context?: Record<string, any>;
  }): Promise<string | null> {
    const outcome: EscalationOutcome = {
      student_id: data.studentId,
      exam_id: data.examId,
      question_id: data.questionId,
      escalation_type: 'validation_failure',
      original_service: data.originalService,
      ambiguity_description: data.ambiguityDescription,
      selected_solution: data.selectedSolution,
      fallback_path: data.fallbackPath,
      context: data.context || {}
    };

    return await EscalationOutcomeService.logEscalationOutcome(outcome);
  }

  /**
   * Update an escalation with final results
   */
  static async updateEscalationResult(
    escalationId: string,
    success: boolean,
    qualityScore?: number,
    costImpact?: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return await EscalationOutcomeService.updateEscalationOutcome(escalationId, {
      success,
      quality_score: qualityScore,
      cost_impact: costImpact,
      metadata
    });
  }
}
