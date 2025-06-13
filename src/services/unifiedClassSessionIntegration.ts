
import { UnifiedStudentResultsService, UnifiedStudentResult, UnifiedStudentMisconception } from "./unifiedStudentResultsService";
import { EnhancedMisconceptionLoggingService } from "./enhancedMisconceptionLoggingService";

export class UnifiedClassSessionIntegration {
  /**
   * Process and record class session exercise completion
   */
  static async recordClassSessionCompletion(
    sessionId: string,
    studentId: string,
    skillName: string,
    skillType: 'content' | 'subject',
    score: number,
    pointsEarned: number,
    pointsPossible: number,
    exerciseData: Record<string, any>
  ): Promise<void> {
    try {
      // Record in unified results
      const result: UnifiedStudentResult = {
        student_id: studentId,
        session_type: 'class_session',
        session_id: sessionId,
        skill_name: skillName,
        skill_type: skillType,
        score: score,
        points_earned: pointsEarned,
        points_possible: pointsPossible,
        exercise_data: exerciseData
      };

      await UnifiedStudentResultsService.recordSkillResult(result);

      // Continue existing class session processing
      console.log(`📚 Integrated class session result for ${skillName}: ${score}`);
    } catch (error) {
      console.error('Failed to integrate class session completion:', error);
      // Don't throw - allow existing processing to continue
    }
  }

  /**
   * Process and record class session misconceptions
   */
  static async recordClassSessionMisconception(
    sessionId: string,
    studentId: string,
    skillName: string,
    misconceptionType: string,
    misconceptionCategory: string,
    severity: 'low' | 'medium' | 'high',
    questionId?: string,
    studentAnswer?: string,
    correctAnswer?: string,
    contextData?: Record<string, any>
  ): Promise<void> {
    try {
      // Record in unified misconceptions
      const misconception: UnifiedStudentMisconception = {
        student_id: studentId,
        session_type: 'class_session',
        session_id: sessionId,
        skill_name: skillName,
        misconception_type: misconceptionType,
        misconception_category: misconceptionCategory,
        severity: severity,
        question_id: questionId,
        student_answer: studentAnswer,
        correct_answer: correctAnswer,
        context_data: contextData
      };

      await UnifiedStudentResultsService.recordMisconception(misconception);

      // Also continue with existing enhanced misconception logging
      await EnhancedMisconceptionLoggingService.logClassSessionMisconception(
        studentId,
        misconceptionType,
        skillName,
        severity,
        questionId,
        contextData
      );

      console.log(`🧠 Integrated class session misconception: ${misconceptionType}`);
    } catch (error) {
      console.error('Failed to integrate class session misconception:', error);
      // Don't throw - allow existing processing to continue
    }
  }

  /**
   * Batch process multiple student results from a class session
   */
  static async batchProcessClassSession(
    sessionId: string,
    studentResults: Array<{
      studentId: string;
      skillName: string;
      skillType: 'content' | 'subject';
      score: number;
      pointsEarned: number;
      pointsPossible: number;
      exerciseData: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      const unifiedResults: UnifiedStudentResult[] = studentResults.map(result => ({
        student_id: result.studentId,
        session_type: 'class_session' as const,
        session_id: sessionId,
        skill_name: result.skillName,
        skill_type: result.skillType,
        score: result.score,
        points_earned: result.pointsEarned,
        points_possible: result.pointsPossible,
        exercise_data: result.exerciseData
      }));

      await UnifiedStudentResultsService.batchRecordSkillResults(unifiedResults);
      console.log(`📚 Batch integrated ${studentResults.length} class session results`);
    } catch (error) {
      console.error('Failed to batch process class session:', error);
    }
  }
}
