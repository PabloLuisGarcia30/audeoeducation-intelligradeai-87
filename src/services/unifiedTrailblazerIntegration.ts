
import { UnifiedStudentResultsService, UnifiedStudentResult, UnifiedStudentMisconception } from "./unifiedStudentResultsService";
import { EnhancedMisconceptionLoggingService } from "./enhancedMisconceptionLoggingService";

export class UnifiedTrailblazerIntegration {
  /**
   * Process and record trailblazer session completion
   */
  static async recordTrailblazerCompletion(
    userId: string,
    concept: string,
    scoreChange: number,
    timeSpent: number,
    exerciseData: Record<string, any>
  ): Promise<void> {
    try {
      // Calculate final score and points
      const finalScore = Math.max(0, Math.min(100, scoreChange));
      const pointsEarned = Math.round((finalScore / 100) * 10); // Scale to 10 points max
      const pointsPossible = 10;

      // Record in unified results
      const result: UnifiedStudentResult = {
        student_id: userId,
        session_type: 'trailblazer',
        skill_name: concept,
        skill_type: 'content', // Trailblazer typically works with content skills
        score: finalScore,
        points_earned: pointsEarned,
        points_possible: pointsPossible,
        exercise_data: {
          time_spent_minutes: timeSpent,
          score_change: scoreChange,
          ...exerciseData
        }
      };

      await UnifiedStudentResultsService.recordSkillResult(result);
      console.log(`🏔️ Integrated trailblazer result for ${concept}: ${finalScore}`);
    } catch (error) {
      console.error('Failed to integrate trailblazer completion:', error);
      // Don't throw - allow existing processing to continue
    }
  }

  /**
   * Process and record trailblazer misconceptions
   */
  static async recordTrailblazerMisconception(
    userId: string,
    concept: string,
    misconceptionType: string,
    severity: 'low' | 'medium' | 'high',
    contextData?: Record<string, any>
  ): Promise<void> {
    try {
      // Record in unified misconceptions
      const misconception: UnifiedStudentMisconception = {
        student_id: userId,
        session_type: 'trailblazer',
        skill_name: concept,
        misconception_type: misconceptionType,
        misconception_category: 'trailblazer_learning',
        severity: severity,
        context_data: contextData
      };

      await UnifiedStudentResultsService.recordMisconception(misconception);

      // Also continue with existing enhanced misconception logging
      await EnhancedMisconceptionLoggingService.logTrailblazerMisconception(
        userId,
        misconceptionType,
        concept,
        severity,
        undefined, // session ID
        contextData
      );

      console.log(`🧠 Integrated trailblazer misconception: ${misconceptionType}`);
    } catch (error) {
      console.error('Failed to integrate trailblazer misconception:', error);
      // Don't throw - allow existing processing to continue
    }
  }

  /**
   * Record trailblazer goal achievement
   */
  static async recordGoalAchievement(
    userId: string,
    concept: string,
    targetScore: number,
    achievedScore: number,
    goalData: Record<string, any>
  ): Promise<void> {
    try {
      const result: UnifiedStudentResult = {
        student_id: userId,
        session_type: 'trailblazer',
        skill_name: concept,
        skill_type: 'content',
        score: achievedScore,
        points_earned: achievedScore >= targetScore ? 10 : Math.round((achievedScore / targetScore) * 10),
        points_possible: 10,
        exercise_data: {
          goal_type: 'achievement',
          target_score: targetScore,
          achieved_score: achievedScore,
          goal_met: achievedScore >= targetScore,
          ...goalData
        }
      };

      await UnifiedStudentResultsService.recordSkillResult(result);
      console.log(`🎯 Integrated trailblazer goal for ${concept}: ${achievedScore}/${targetScore}`);
    } catch (error) {
      console.error('Failed to integrate trailblazer goal achievement:', error);
    }
  }
}
