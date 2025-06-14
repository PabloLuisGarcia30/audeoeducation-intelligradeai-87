import { supabase } from "@/integrations/supabase/client";
import { ProgressAnalyticsService, StudentProgressAnalytics } from "@/services/progressAnalyticsService";
import { UnifiedStudentResultsService, UnifiedPerformanceData, UnifiedMisconceptionAnalysis } from "@/services/unifiedStudentResultsService";
import { shouldUseDevAuth } from "@/config/devConfig";

export interface StudentGoal {
  id: string;
  student_id: string;
  goal_title: string;
  goal_description: string;
  goal_type: 'skill_mastery' | 'misconception_resolution' | 'learning_velocity' | 'consistency' | 'time_based';
  target_value: number;
  current_value: number;
  target_skill_name?: string;
  target_misconception_id?: string;
  is_ai_suggested: boolean;
  ai_confidence_score: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'expired';
  progress_percentage: number;
  milestones: GoalMilestone[];
  context_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface GoalMilestone {
  value: number;
  title: string;
  description: string;
  achieved?: boolean;
}

export interface GoalAchievement {
  id: string;
  student_id: string;
  goal_id: string;
  achievement_type: 'milestone' | 'goal_completion' | 'streak';
  achievement_title: string;
  achievement_description?: string;
  value_achieved?: number;
  progress_snapshot: Record<string, any>;
  celebration_shown: boolean;
  achieved_at: string;
  created_at: string;
}

export interface AIGoalRecommendation {
  goal_type: StudentGoal['goal_type'];
  goal_title: string;
  goal_description: string;
  target_value: number;
  target_skill_name?: string;
  target_misconception_id?: string;
  difficulty_level: StudentGoal['difficulty_level'];
  target_date: string;
  ai_confidence_score: number;
  reasoning: string;
  milestones: GoalMilestone[];
  context_data: Record<string, any>;
}

export interface GoalAnalytics {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  avg_completion_time_days: number;
  most_successful_goal_type: string;
  current_streaks: Record<string, any>;
}

export class SmartGoalService {
  /**
   * Generate AI-powered goal recommendations for a student
   */
  static async generateGoalRecommendations(studentId: string): Promise<AIGoalRecommendation[]> {
    try {
      console.log('🤖 Generating AI goal recommendations for student:', studentId);
      
      // Get student's performance analytics
      const progressAnalytics = await ProgressAnalyticsService.getStudentProgressAnalytics(studentId, 30);
      const performanceData = await UnifiedStudentResultsService.getStudentPerformance(studentId, 30);
      const misconceptionData = await UnifiedStudentResultsService.getStudentMisconceptions(studentId, 30);

      // Generate recommendations using Edge Function
      const { data, error } = await supabase.functions.invoke('generate-smart-goal-recommendations', {
        body: {
          student_id: studentId,
          progress_analytics: progressAnalytics,
          performance_data: performanceData,
          misconception_data: misconceptionData
        }
      });

      if (error) {
        console.error('❌ Error generating goal recommendations:', error);
        return this.getFallbackRecommendations(progressAnalytics, performanceData, misconceptionData);
      }

      // Log the recommendations for effectiveness tracking
      await this.logGoalRecommendations(studentId, data.recommendations, {
        progress_analytics: progressAnalytics,
        performance_data: performanceData,
        misconception_data: misconceptionData
      }, data.reasoning);

      console.log('✅ Generated AI recommendations:', data.recommendations.length);
      return data.recommendations;
    } catch (error) {
      console.error('❌ Failed to generate goal recommendations:', error);
      throw error;
    }
  }

  /**
   * Create a goal from an AI recommendation
   */
  static async createGoalFromRecommendation(studentId: string, recommendation: AIGoalRecommendation): Promise<StudentGoal> {
    console.log('🎯 Creating goal from AI recommendation:', recommendation.goal_title);
    
    const goalData: Partial<StudentGoal> = {
      goal_title: recommendation.goal_title,
      goal_description: recommendation.goal_description,
      goal_type: recommendation.goal_type,
      target_value: recommendation.target_value,
      target_skill_name: recommendation.target_skill_name,
      target_misconception_id: recommendation.target_misconception_id,
      is_ai_suggested: true,
      ai_confidence_score: recommendation.ai_confidence_score,
      difficulty_level: recommendation.difficulty_level,
      target_date: recommendation.target_date,
      milestones: recommendation.milestones,
      context_data: recommendation.context_data
    };

    return await this.createGoal(studentId, goalData);
  }

  /**
   * Create a new goal for a student - Enhanced with better authentication handling
   */
  static async createGoal(studentId: string, goalData: Partial<StudentGoal>): Promise<StudentGoal> {
    console.log('🎯 Creating goal for student:', studentId);
    console.log('📝 Goal data:', goalData);
    console.log('🔧 Dev auth active:', shouldUseDevAuth());
    
    // Ensure required fields are present
    if (!goalData.goal_title || !goalData.goal_description) {
      throw new Error('Goal title and description are required');
    }

    // Validate student ID format
    if (!studentId || typeof studentId !== 'string') {
      throw new Error('Valid student ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('student_goals')
        .insert({
          student_id: studentId,
          goal_title: goalData.goal_title,
          goal_description: goalData.goal_description,
          goal_type: goalData.goal_type || 'skill_mastery',
          target_value: goalData.target_value || 100,
          current_value: goalData.current_value || 0,
          target_skill_name: goalData.target_skill_name,
          target_misconception_id: goalData.target_misconception_id,
          is_ai_suggested: goalData.is_ai_suggested || false,
          ai_confidence_score: goalData.ai_confidence_score || 0,
          difficulty_level: goalData.difficulty_level || 'medium',
          target_date: goalData.target_date,
          status: goalData.status || 'active',
          progress_percentage: goalData.progress_percentage || 0,
          milestones: JSON.stringify(goalData.milestones || []),
          context_data: JSON.stringify(goalData.context_data || {})
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error creating goal:', error);
        
        // Enhanced error logging for debugging
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          studentId,
          devAuthActive: shouldUseDevAuth(),
          goalTitle: goalData.goal_title
        });

        // Provide more specific error context
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          const enhancedError = new Error(
            `Row-level security policy violation. Student ID: ${studentId}. ` +
            `This may indicate an authentication issue${shouldUseDevAuth() ? ' in dev mode' : ''}.`
          );
          enhancedError.name = 'RLSPolicyError';
          throw enhancedError;
        }

        // Re-throw with enhanced context
        const enhancedError = new Error(`Database error: ${error.message}`);
        enhancedError.name = 'DatabaseError';
        throw enhancedError;
      }

      console.log('✅ Created goal successfully:', data.goal_title);
      return this.transformGoalData(data);
    } catch (error) {
      console.error('❌ Failed to create goal:', error);
      throw error;
    }
  }

  /**
   * Get all goals for a student - Enhanced with better error handling
   */
  static async getStudentGoals(studentId: string): Promise<StudentGoal[]> {
    try {
      console.log('📊 Fetching goals for student:', studentId);
      
      const { data, error } = await supabase
        .from('student_goals')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching student goals:', error);
        
        // Enhanced error logging
        console.error('Fetch error details:', {
          code: error.code,
          message: error.message,
          studentId,
          devAuthActive: shouldUseDevAuth()
        });

        // In dev mode, return empty array for RLS errors
        if (shouldUseDevAuth() && error.code === '42501') {
          console.log('🔧 Dev mode: RLS error detected, returning empty goals array');
          return [];
        }

        throw error;
      }

      console.log('✅ Fetched goals successfully:', data?.length || 0);
      return (data || []).map(goal => this.transformGoalData(goal));
    } catch (error) {
      console.error('❌ Failed to fetch student goals:', error);
      
      // In dev mode, gracefully handle errors
      if (shouldUseDevAuth()) {
        console.log('🔧 Dev mode: Returning empty goals array due to error');
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Get goal achievements for a student (alias for consistency)
   */
  static async getStudentAchievements(studentId: string): Promise<GoalAchievement[]> {
    return this.getGoalAchievements(studentId);
  }

  /**
   * Update goal progress
   */
  static async updateGoalProgress(goalId: string, currentValue: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_goals')
        .update({ current_value: currentValue })
        .eq('id', goalId);

      if (error) {
        console.error('Error updating goal progress:', error);
        return;
      }

      // Check for achievements
      await supabase.rpc('detect_goal_achievements', {
        p_student_id: await this.getStudentIdFromGoal(goalId),
        p_goal_id: goalId
      });

      console.log(`✅ Updated goal progress: ${goalId} -> ${currentValue}`);
    } catch (error) {
      console.error('Failed to update goal progress:', error);
    }
  }

  /**
   * Get goal achievements for a student
   */
  static async getGoalAchievements(studentId: string): Promise<GoalAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('goal_achievements')
        .select('*')
        .eq('student_id', studentId)
        .order('achieved_at', { ascending: false });

      if (error) {
        console.error('Error fetching goal achievements:', error);
        return [];
      }

      return (data || []).map(achievement => ({
        ...achievement,
        achievement_type: achievement.achievement_type as 'milestone' | 'goal_completion' | 'streak',
        progress_snapshot: typeof achievement.progress_snapshot === 'string' 
          ? JSON.parse(achievement.progress_snapshot) 
          : achievement.progress_snapshot || {}
      }));
    } catch (error) {
      console.error('Failed to fetch goal achievements:', error);
      return [];
    }
  }

  /**
   * Get goal analytics for a student
   */
  static async getGoalAnalytics(studentId: string): Promise<GoalAnalytics | null> {
    try {
      const { data, error } = await supabase.rpc('get_student_goal_analytics', {
        p_student_id: studentId
      });

      if (error) {
        console.error('Error fetching goal analytics:', error);
        return null;
      }

      const result = data[0];
      if (!result) return null;

      return {
        ...result,
        current_streaks: typeof result.current_streaks === 'string' 
          ? JSON.parse(result.current_streaks) 
          : result.current_streaks || {}
      };
    } catch (error) {
      console.error('Failed to fetch goal analytics:', error);
      return null;
    }
  }

  /**
   * Update goal status
   */
  static async updateGoalStatus(goalId: string, status: StudentGoal['status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_goals')
        .update({ status })
        .eq('id', goalId);

      if (error) {
        console.error('Error updating goal status:', error);
        return;
      }

      console.log(`✅ Updated goal status: ${goalId} -> ${status}`);
    } catch (error) {
      console.error('Failed to update goal status:', error);
    }
  }

  /**
   * Mark achievement celebration as shown
   */
  static async markAchievementShown(achievementId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('goal_achievements')
        .update({ celebration_shown: true })
        .eq('id', achievementId);

      if (error) {
        console.error('Error marking achievement as shown:', error);
      }
    } catch (error) {
      console.error('Failed to mark achievement as shown:', error);
    }
  }

  // Private helper methods
  private static transformGoalData(data: any): StudentGoal {
    return {
      ...data,
      milestones: typeof data.milestones === 'string' ? JSON.parse(data.milestones) : data.milestones || [],
      context_data: typeof data.context_data === 'string' ? JSON.parse(data.context_data) : data.context_data || {}
    };
  }

  private static async getStudentIdFromGoal(goalId: string): Promise<string> {
    const { data } = await supabase
      .from('student_goals')
      .select('student_id')
      .eq('id', goalId)
      .single();
    
    return data?.student_id || '';
  }

  private static async logGoalRecommendations(
    studentId: string, 
    recommendations: AIGoalRecommendation[], 
    performanceData: any, 
    reasoning: string
  ): Promise<void> {
    try {
      await supabase
        .from('goal_recommendations_log')
        .insert({
          student_id: studentId,
          recommended_goals: JSON.stringify(recommendations),
          student_performance_data: JSON.stringify(performanceData),
          recommendation_reasoning: reasoning
        });
    } catch (error) {
      console.error('Failed to log goal recommendations:', error);
    }
  }

  private static getFallbackRecommendations(
    progressAnalytics: StudentProgressAnalytics[],
    performanceData: UnifiedPerformanceData[],
    misconceptionData: UnifiedMisconceptionAnalysis[]
  ): AIGoalRecommendation[] {
    const recommendations: AIGoalRecommendation[] = [];

    // Skill mastery goal for lowest performing skill
    if (progressAnalytics.length > 0) {
      const lowestSkill = progressAnalytics.sort((a, b) => a.avg_accuracy - b.avg_accuracy)[0];
      const targetAccuracy = Math.min(90, lowestSkill.avg_accuracy + 15);
      
      recommendations.push({
        goal_type: 'skill_mastery',
        goal_title: `Improve ${lowestSkill.skill_name}`,
        goal_description: `Achieve ${targetAccuracy}% accuracy in ${lowestSkill.skill_name}`,
        target_value: targetAccuracy,
        target_skill_name: lowestSkill.skill_name,
        difficulty_level: 'medium',
        target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ai_confidence_score: 0.8,
        reasoning: `Based on current ${lowestSkill.avg_accuracy}% accuracy, this goal provides a realistic improvement target.`,
        milestones: [
          { value: targetAccuracy * 0.5, title: 'Halfway There!', description: 'You\'re making great progress!' },
          { value: targetAccuracy * 0.8, title: 'Almost Done!', description: 'You\'re so close to your goal!' }
        ],
        context_data: { current_accuracy: lowestSkill.avg_accuracy }
      });
    }

    // Consistency goal
    if (performanceData.length > 2) {
      recommendations.push({
        goal_type: 'consistency',
        goal_title: 'Build Learning Consistency',
        goal_description: 'Complete practice sessions for 7 consecutive days',
        target_value: 7,
        difficulty_level: 'medium',
        target_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ai_confidence_score: 0.9,
        reasoning: 'Consistent practice is key to improving performance across all skills.',
        milestones: [
          { value: 3, title: 'Building Momentum!', description: '3 days in a row - great start!' },
          { value: 5, title: 'Strong Streak!', description: '5 days strong - you\'re doing amazing!' }
        ],
        context_data: { focus: 'daily_practice' }
      });
    }

    return recommendations;
  }
}
