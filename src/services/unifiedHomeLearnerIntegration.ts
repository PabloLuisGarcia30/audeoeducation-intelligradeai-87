
import { UnifiedStudentResultsService, UnifiedStudentResult, UnifiedStudentMisconception } from "./unifiedStudentResultsService";
import { EnhancedMisconceptionLoggingService } from "./enhancedMisconceptionLoggingService";

export class UnifiedHomeLearnerIntegration {
  /**
   * Process and record home learner practice exercise completion
   */
  static async recordPracticeCompletion(
    studentId: string,
    sessionId: string,
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
        session_type: 'home_learner',
        session_id: sessionId,
        skill_name: skillName,
        skill_type: skillType,
        score: score,
        points_earned: pointsEarned,
        points_possible: pointsPossible,
        exercise_data: exerciseData
      };

      await UnifiedStudentResultsService.recordSkillResult(result);
      console.log(`🏠 Integrated home learner result for ${skillName}: ${score}`);
    } catch (error) {
      console.error('Failed to integrate home learner completion:', error);
      // Don't throw - allow existing processing to continue
    }
  }

  /**
   * Process and record home learner misconceptions
   */
  static async recordPracticeMisconception(
    studentId: string,
    sessionId: string,
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
        session_type: 'home_learner',
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
      await EnhancedMisconceptionLoggingService.logPracticeMisconception(
        studentId,
        misconceptionType,
        skillName,
        severity,
        questionId,
        contextData
      );

      console.log(`🧠 Integrated home learner misconception: ${misconceptionType}`);
    } catch (error) {
      console.error('Failed to integrate home learner misconception:', error);
      // Don't throw - allow existing processing to continue
    }
  }

  /**
   * Record practice test results with multiple skills
   */
  static async recordPracticeTestResults(
    studentId: string,
    sessionId: string,
    skillResults: Array<{
      skillName: string;
      skillType: 'content' | 'subject';
      score: number;
      pointsEarned: number;
      pointsPossible: number;
    }>,
    testData: Record<string, any>
  ): Promise<void> {
    try {
      const unifiedResults: UnifiedStudentResult[] = skillResults.map(skill => ({
        student_id: studentId,
        session_type: 'home_learner' as const,
        session_id: sessionId,
        skill_name: skill.skillName,
        skill_type: skill.skillType,
        score: skill.score,
        points_earned: skill.pointsEarned,
        points_possible: skill.pointsPossible,
        exercise_data: {
          test_type: 'practice_test',
          ...testData
        }
      }));

      await UnifiedStudentResultsService.batchRecordSkillResults(unifiedResults);
      console.log(`🏠 Batch integrated ${skillResults.length} home learner test results`);
    } catch (error) {
      console.error('Failed to integrate practice test results:', error);
    }
  }
}
