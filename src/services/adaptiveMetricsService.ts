
import { supabase } from "@/integrations/supabase/client";

export interface AdaptiveMetrics {
  student_id: string;
  metric_type: 'engagement' | 'mastery_time' | 'difficulty_accuracy' | 'retention_rate' | 'recommendation_effectiveness';
  metric_value: number;
  skill_context?: string;
  session_context?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface LearningEfficiencyMetrics {
  averageMasteryTime: number;
  engagementTrend: 'improving' | 'declining' | 'stable';
  difficultyPredictionAccuracy: number;
  retentionRate: number;
  recommendationSuccessRate: number;
}

export class AdaptiveMetricsService {
  /**
   * Track a specific adaptive learning metric
   */
  static async trackMetric(metric: Omit<AdaptiveMetrics, 'timestamp'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('adaptive_learning_metrics')
        .insert({
          ...metric,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Error tracking adaptive metric:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in trackMetric:', error);
      return false;
    }
  }

  /**
   * Track student engagement during AI coach interactions
   */
  static async trackEngagement(
    studentId: string,
    sessionDuration: number,
    messageCount: number,
    helpRequests: number
  ): Promise<void> {
    const engagementScore = this.calculateEngagementScore(sessionDuration, messageCount, helpRequests);
    
    await this.trackMetric({
      student_id: studentId,
      metric_type: 'engagement',
      metric_value: engagementScore,
      metadata: {
        session_duration_minutes: sessionDuration,
        message_count: messageCount,
        help_requests: helpRequests
      }
    });
  }

  /**
   * Track time to skill mastery
   */
  static async trackMasteryTime(
    studentId: string,
    skillName: string,
    startScore: number,
    targetScore: number,
    actualTimeMinutes: number
  ): Promise<void> {
    await this.trackMetric({
      student_id: studentId,
      metric_type: 'mastery_time',
      metric_value: actualTimeMinutes,
      skill_context: skillName,
      metadata: {
        start_score: startScore,
        target_score: targetScore,
        improvement: targetScore - startScore
      }
    });
  }

  /**
   * Track difficulty prediction accuracy
   */
  static async trackDifficultyAccuracy(
    studentId: string,
    predictedDifficulty: string,
    actualPerformance: number,
    skillContext: string
  ): Promise<void> {
    const accuracy = this.calculateDifficultyAccuracy(predictedDifficulty, actualPerformance);
    
    await this.trackMetric({
      student_id: studentId,
      metric_type: 'difficulty_accuracy',
      metric_value: accuracy,
      skill_context: skillContext,
      metadata: {
        predicted_difficulty: predictedDifficulty,
        actual_performance: actualPerformance
      }
    });
  }

  /**
   * Track recommendation effectiveness
   */
  static async trackRecommendationEffectiveness(
    studentId: string,
    recommendationType: string,
    wasFollowed: boolean,
    outcomeScore?: number
  ): Promise<void> {
    const effectiveness = wasFollowed ? (outcomeScore || 1) : 0;
    
    await this.trackMetric({
      student_id: studentId,
      metric_type: 'recommendation_effectiveness',
      metric_value: effectiveness,
      metadata: {
        recommendation_type: recommendationType,
        was_followed: wasFollowed,
        outcome_score: outcomeScore
      }
    });
  }

  /**
   * Get learning efficiency metrics for a student
   */
  static async getLearningEfficiencyMetrics(
    studentId: string,
    daysBack: number = 30
  ): Promise<LearningEfficiencyMetrics> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - daysBack);

      const { data: metrics, error } = await supabase
        .from('adaptive_learning_metrics')
        .select('*')
        .eq('student_id', studentId)
        .gte('timestamp', since.toISOString());

      if (error) {
        console.error('Error fetching learning metrics:', error);
        return this.getDefaultMetrics();
      }

      return this.calculateEfficiencyMetrics(metrics || []);
    } catch (error) {
      console.error('Error in getLearningEfficiencyMetrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Calculate engagement score based on session data
   */
  private static calculateEngagementScore(
    sessionDuration: number,
    messageCount: number,
    helpRequests: number
  ): number {
    // Normalize factors (0-1 scale)
    const durationScore = Math.min(sessionDuration / 30, 1); // Optimal around 30 minutes
    const activityScore = Math.min(messageCount / 10, 1); // Optimal around 10 messages
    const initiativeScore = Math.max(1 - (helpRequests / messageCount), 0); // Lower help ratio = higher initiative

    // Weighted average
    return (durationScore * 0.3 + activityScore * 0.4 + initiativeScore * 0.3);
  }

  /**
   * Calculate difficulty prediction accuracy
   */
  private static calculateDifficultyAccuracy(
    predictedDifficulty: string,
    actualPerformance: number
  ): number {
    const expectedPerformance = {
      'easy': 0.9,
      'medium': 0.7,
      'hard': 0.5,
      'adaptive': 0.75
    }[predictedDifficulty] || 0.7;

    const difference = Math.abs(expectedPerformance - actualPerformance);
    return Math.max(0, 1 - (difference * 2)); // Accuracy decreases with prediction error
  }

  /**
   * Calculate comprehensive efficiency metrics
   */
  private static calculateEfficiencyMetrics(metrics: any[]): LearningEfficiencyMetrics {
    const masteryMetrics = metrics.filter(m => m.metric_type === 'mastery_time');
    const engagementMetrics = metrics.filter(m => m.metric_type === 'engagement');
    const difficultyMetrics = metrics.filter(m => m.metric_type === 'difficulty_accuracy');
    const recommendationMetrics = metrics.filter(m => m.metric_type === 'recommendation_effectiveness');

    return {
      averageMasteryTime: masteryMetrics.length > 0 
        ? masteryMetrics.reduce((sum, m) => sum + m.metric_value, 0) / masteryMetrics.length
        : 0,
      
      engagementTrend: this.calculateTrend(engagementMetrics),
      
      difficultyPredictionAccuracy: difficultyMetrics.length > 0
        ? difficultyMetrics.reduce((sum, m) => sum + m.metric_value, 0) / difficultyMetrics.length
        : 0,
      
      retentionRate: 0.8, // Placeholder - would need retention tracking
      
      recommendationSuccessRate: recommendationMetrics.length > 0
        ? recommendationMetrics.reduce((sum, m) => sum + m.metric_value, 0) / recommendationMetrics.length
        : 0
    };
  }

  /**
   * Calculate trend direction from time series data
   */
  private static calculateTrend(metrics: any[]): 'improving' | 'declining' | 'stable' {
    if (metrics.length < 2) return 'stable';

    const sorted = metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const recent = sorted.slice(-5); // Last 5 data points
    
    if (recent.length < 2) return 'stable';

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.metric_value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.metric_value, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Get default metrics when data is unavailable
   */
  private static getDefaultMetrics(): LearningEfficiencyMetrics {
    return {
      averageMasteryTime: 0,
      engagementTrend: 'stable',
      difficultyPredictionAccuracy: 0,
      retentionRate: 0,
      recommendationSuccessRate: 0
    };
  }
}
