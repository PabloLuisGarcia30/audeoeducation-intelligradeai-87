
import { useEffect } from 'react';
import { SmartGoalService } from '@/services/smartGoalService';
import { ProgressAnalyticsService } from '@/services/progressAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to automatically update goal progress when student practices
 * This should be used in practice components to sync goal progress
 */
export function useSmartGoalProgress() {
  const { user } = useAuth();

  const updateGoalProgress = async (skillName: string, newScore: number) => {
    if (!user?.id) return;

    try {
      // Get student's active goals
      const goals = await SmartGoalService.getStudentGoals(user.id);
      const relevantGoals = goals.filter(goal => 
        goal.status === 'active' && 
        (goal.target_skill_name === skillName || goal.goal_type === 'consistency')
      );

      // Update each relevant goal
      for (const goal of relevantGoals) {
        let newCurrentValue = goal.current_value;

        switch (goal.goal_type) {
          case 'skill_mastery':
            // Update with latest score if it's for this skill
            if (goal.target_skill_name === skillName) {
              newCurrentValue = newScore;
            }
            break;

          case 'consistency':
            // Increment practice count
            newCurrentValue = goal.current_value + 1;
            break;

          case 'learning_velocity':
            // Calculate improvement rate
            const previousScore = goal.context_data?.previous_score || 0;
            if (newScore > previousScore) {
              newCurrentValue = goal.current_value + (newScore - previousScore);
            }
            break;

          default:
            continue;
        }

        // Update the goal progress
        if (newCurrentValue !== goal.current_value) {
          await SmartGoalService.updateGoalProgress(goal.id, newCurrentValue);
        }
      }
    } catch (error) {
      console.error('Failed to update goal progress:', error);
    }
  };

  const recordPracticeSession = async (skillName: string, score: number, timeSpent: number) => {
    if (!user?.id) return;

    try {
      // Record in progress analytics (this will trigger goal updates)
      await ProgressAnalyticsService.recordProgressMetric({
        student_id: user.id,
        skill_name: skillName,
        skill_type: 'content',
        session_type: 'practice',
        accuracy: score,
        confidence_score: score,
        time_spent_seconds: timeSpent,
        attempts_count: 1,
        misconception_detected: false
      });

      // Update relevant goals
      await updateGoalProgress(skillName, score);
    } catch (error) {
      console.error('Failed to record practice session for goals:', error);
    }
  };

  return {
    updateGoalProgress,
    recordPracticeSession
  };
}
