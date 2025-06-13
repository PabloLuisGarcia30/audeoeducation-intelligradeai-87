
import { supabase } from "@/integrations/supabase/client";

export interface AdaptiveLearningProfile {
  id: string;
  student_id: string;
  learning_velocity: number;
  confidence_trend: 'improving' | 'declining' | 'stable';
  engagement_score: number;
  preferred_explanation_style: 'visual' | 'textual' | 'step-by-step' | 'conceptual' | 'mixed';
  learning_modality: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
  optimal_session_length_minutes: number;
  optimal_difficulty_progression: 'rapid' | 'gradual' | 'plateau';
  fatigue_threshold_minutes: number;
  cognitive_load_tolerance: 'low' | 'medium' | 'high';
  help_seeking_frequency: 'rare' | 'moderate' | 'frequent';
  mistake_recovery_style: 'quick' | 'reflective' | 'methodical';
  zone_of_proximal_development: {
    lower_bound: number;
    upper_bound: number;
  };
  scaffolding_preferences: {
    hints: boolean;
    examples: boolean;
    step_by_step: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface LearningTrajectoryEvent {
  id?: string;
  student_id: string;
  session_id?: string;
  event_type: 'breakthrough' | 'struggle' | 'plateau' | 'confusion' | 'mastery';
  skill_name: string;
  skill_type: 'content' | 'subject';
  difficulty_level: 'easy' | 'medium' | 'hard' | 'adaptive';
  confidence_before?: number;
  confidence_after?: number;
  performance_before?: number;
  performance_after?: number;
  time_to_resolution_seconds?: number;
  help_requests_count?: number;
  explanation_attempts_count?: number;
  successful_explanation_type?: string;
  question_context?: Record<string, any>;
  behavioral_signals?: Record<string, any>;
  intervention_triggered?: boolean;
  created_at?: string;
}

export interface ConversationAnalytics {
  id?: string;
  student_id: string;
  conversation_id: string;
  total_messages: number;
  student_messages: number;
  ai_responses: number;
  confusion_indicators: number;
  breakthrough_indicators: number;
  help_requests: number;
  topic_changes: number;
  skills_practiced: string[];
  concepts_clarified: string[];
  misconceptions_addressed: string[];
  difficulty_adjustments_made: number;
  session_duration_minutes?: number;
  explanation_styles_used: string[];
  student_satisfaction_score?: number;
  learning_objectives_achieved: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdaptiveRecommendation {
  id?: string;
  student_id: string;
  recommendation_type: 'difficulty_adjustment' | 'explanation_style' | 'scaffolding' | 'break_suggestion';
  trigger_event: string;
  skill_context: string;
  current_performance?: number;
  current_confidence?: number;
  recommendation_data: Record<string, any>;
  rationale: string;
  confidence_score: number;
  was_implemented?: boolean;
  implementation_timestamp?: string;
  effectiveness_score?: number;
  student_response?: 'positive' | 'negative' | 'neutral';
  created_at?: string;
}

export class AdaptiveLearningService {
  /**
   * Get or create adaptive learning profile for a student
   */
  static async getOrCreateProfile(studentId: string): Promise<AdaptiveLearningProfile | null> {
    try {
      // Try to get existing profile
      const { data: existingProfile, error: selectError } = await supabase
        .from('adaptive_learning_profiles')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (!selectError && existingProfile) {
        return this.transformDatabaseProfile(existingProfile);
      }

      // Create new profile if doesn't exist
      const { data: newProfile, error: insertError } = await supabase
        .from('adaptive_learning_profiles')
        .insert({
          student_id: studentId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating adaptive learning profile:', insertError);
        return null;
      }

      return this.transformDatabaseProfile(newProfile);
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error);
      return null;
    }
  }

  /**
   * Transform database profile to typed interface
   */
  private static transformDatabaseProfile(dbProfile: any): AdaptiveLearningProfile {
    return {
      ...dbProfile,
      confidence_trend: dbProfile.confidence_trend as 'improving' | 'declining' | 'stable',
      preferred_explanation_style: dbProfile.preferred_explanation_style as 'visual' | 'textual' | 'step-by-step' | 'conceptual' | 'mixed',
      learning_modality: dbProfile.learning_modality as 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed',
      optimal_difficulty_progression: dbProfile.optimal_difficulty_progression as 'rapid' | 'gradual' | 'plateau',
      cognitive_load_tolerance: dbProfile.cognitive_load_tolerance as 'low' | 'medium' | 'high',
      help_seeking_frequency: dbProfile.help_seeking_frequency as 'rare' | 'moderate' | 'frequent',
      mistake_recovery_style: dbProfile.mistake_recovery_style as 'quick' | 'reflective' | 'methodical',
      zone_of_proximal_development: typeof dbProfile.zone_of_proximal_development === 'string' 
        ? JSON.parse(dbProfile.zone_of_proximal_development)
        : dbProfile.zone_of_proximal_development,
      scaffolding_preferences: typeof dbProfile.scaffolding_preferences === 'string'
        ? JSON.parse(dbProfile.scaffolding_preferences)
        : dbProfile.scaffolding_preferences
    };
  }

  /**
   * Transform database event to typed interface
   */
  private static transformDatabaseEvent(dbEvent: any): LearningTrajectoryEvent {
    return {
      ...dbEvent,
      event_type: dbEvent.event_type as 'breakthrough' | 'struggle' | 'plateau' | 'confusion' | 'mastery',
      skill_type: dbEvent.skill_type as 'content' | 'subject',
      difficulty_level: dbEvent.difficulty_level as 'easy' | 'medium' | 'hard' | 'adaptive'
    };
  }

  /**
   * Transform database recommendation to typed interface
   */
  private static transformDatabaseRecommendation(dbRec: any): AdaptiveRecommendation {
    return {
      ...dbRec,
      recommendation_type: dbRec.recommendation_type as 'difficulty_adjustment' | 'explanation_style' | 'scaffolding' | 'break_suggestion',
      student_response: dbRec.student_response as 'positive' | 'negative' | 'neutral' | undefined
    };
  }

  /**
   * Update adaptive learning profile
   */
  static async updateProfile(studentId: string, updates: Partial<AdaptiveLearningProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('adaptive_learning_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      if (error) {
        console.error('Error updating adaptive learning profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return false;
    }
  }

  /**
   * Log a learning trajectory event
   */
  static async logLearningEvent(event: LearningTrajectoryEvent): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('learning_trajectory_events')
        .insert(event)
        .select('id')
        .single();

      if (error) {
        console.error('Error logging learning event:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in logLearningEvent:', error);
      return null;
    }
  }

  /**
   * Get recent learning trajectory events for a student
   */
  static async getRecentEvents(studentId: string, limit: number = 10): Promise<LearningTrajectoryEvent[]> {
    try {
      const { data, error } = await supabase
        .from('learning_trajectory_events')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent events:', error);
        return [];
      }

      return (data || []).map(event => this.transformDatabaseEvent(event));
    } catch (error) {
      console.error('Error in getRecentEvents:', error);
      return [];
    }
  }

  /**
   * Update conversation analytics
   */
  static async updateConversationAnalytics(analytics: ConversationAnalytics): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversation_analytics')
        .upsert(analytics);

      if (error) {
        console.error('Error updating conversation analytics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateConversationAnalytics:', error);
      return false;
    }
  }

  /**
   * Create adaptive recommendation
   */
  static async createRecommendation(recommendation: AdaptiveRecommendation): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('adaptive_recommendations_log')
        .insert(recommendation)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating recommendation:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in createRecommendation:', error);
      return null;
    }
  }

  /**
   * Get pending recommendations for a student
   */
  static async getPendingRecommendations(studentId: string): Promise<AdaptiveRecommendation[]> {
    try {
      const { data, error } = await supabase
        .from('adaptive_recommendations_log')
        .select('*')
        .eq('student_id', studentId)
        .eq('was_implemented', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending recommendations:', error);
        return [];
      }

      return (data || []).map(rec => this.transformDatabaseRecommendation(rec));
    } catch (error) {
      console.error('Error in getPendingRecommendations:', error);
      return [];
    }
  }

  /**
   * Analyze student performance and recommend adaptations
   */
  static async analyzeAndRecommend(studentId: string, currentContext: {
    skill_name: string;
    skill_type: 'content' | 'subject';
    current_performance: number;
    current_confidence: number;
    session_duration_minutes: number;
    recent_interactions: string[];
  }): Promise<AdaptiveRecommendation[]> {
    try {
      const profile = await this.getOrCreateProfile(studentId);
      if (!profile) return [];

      const recentEvents = await this.getRecentEvents(studentId, 5);
      const recommendations: AdaptiveRecommendation[] = [];

      // Analyze performance patterns
      const performanceHistory = recentEvents
        .filter(event => event.skill_name === currentContext.skill_name)
        .map(event => event.performance_after)
        .filter(score => score !== null && score !== undefined) as number[];

      // Check if difficulty adjustment is needed
      if (currentContext.current_performance > profile.zone_of_proximal_development.upper_bound) {
        recommendations.push({
          student_id: studentId,
          recommendation_type: 'difficulty_adjustment',
          trigger_event: 'performance_above_zpd',
          skill_context: currentContext.skill_name,
          current_performance: currentContext.current_performance,
          current_confidence: currentContext.current_confidence,
          recommendation_data: {
            action: 'increase_difficulty',
            suggested_level: 'hard',
            reasoning: 'Student performing above zone of proximal development'
          },
          rationale: 'Student is performing above their optimal challenge zone and may benefit from increased difficulty',
          confidence_score: 0.8
        });
      } else if (currentContext.current_performance < profile.zone_of_proximal_development.lower_bound) {
        recommendations.push({
          student_id: studentId,
          recommendation_type: 'difficulty_adjustment',
          trigger_event: 'performance_below_zpd',
          skill_context: currentContext.skill_name,
          current_performance: currentContext.current_performance,
          current_confidence: currentContext.current_confidence,
          recommendation_data: {
            action: 'decrease_difficulty',
            suggested_level: 'easy',
            reasoning: 'Student performing below zone of proximal development'
          },
          rationale: 'Student is struggling and may benefit from easier content or additional scaffolding',
          confidence_score: 0.85
        });
      }

      // Check if explanation style change is needed
      const confusionEvents = recentEvents.filter(event => event.event_type === 'confusion');
      if (confusionEvents.length >= 2) {
        const alternativeStyle = this.getAlternativeExplanationStyle(profile.preferred_explanation_style);
        recommendations.push({
          student_id: studentId,
          recommendation_type: 'explanation_style',
          trigger_event: 'repeated_confusion',
          skill_context: currentContext.skill_name,
          current_performance: currentContext.current_performance,
          current_confidence: currentContext.current_confidence,
          recommendation_data: {
            current_style: profile.preferred_explanation_style,
            suggested_style: alternativeStyle,
            reasoning: 'Student showing repeated confusion with current explanation style'
          },
          rationale: `Student may benefit from switching to ${alternativeStyle} explanations`,
          confidence_score: 0.7
        });
      }

      // Check if break is needed
      if (currentContext.session_duration_minutes > profile.fatigue_threshold_minutes) {
        recommendations.push({
          student_id: studentId,
          recommendation_type: 'break_suggestion',
          trigger_event: 'fatigue_threshold_exceeded',
          skill_context: currentContext.skill_name,
          current_performance: currentContext.current_performance,
          current_confidence: currentContext.current_confidence,
          recommendation_data: {
            suggested_break_duration: 10,
            reasoning: 'Session duration exceeds student fatigue threshold'
          },
          rationale: 'Student may be experiencing fatigue and could benefit from a short break',
          confidence_score: 0.9
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error in analyzeAndRecommend:', error);
      return [];
    }
  }

  /**
   * Get alternative explanation style
   */
  private static getAlternativeExplanationStyle(currentStyle: string): string {
    const styles = ['visual', 'textual', 'step-by-step', 'conceptual'];
    const alternatives = styles.filter(style => style !== currentStyle);
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  /**
   * Update learning velocity based on performance change
   */
  static async updateLearningVelocity(studentId: string, performanceChange: number): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_learning_velocity', {
        p_student_id: studentId,
        p_performance_change: performanceChange
      });

      if (error) {
        console.error('Error updating learning velocity:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateLearningVelocity:', error);
      return false;
    }
  }

  /**
   * Detect learning patterns from recent events
   */
  static async detectLearningPatterns(studentId: string): Promise<{
    predominant_pattern: string;
    confidence: number;
    recommendations: string[];
  }> {
    try {
      const events = await this.getRecentEvents(studentId, 20);
      
      // Analyze event patterns
      const eventTypes = events.map(event => event.event_type);
      const eventCounts = eventTypes.reduce((counts, type) => {
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const predominantType = Object.entries(eventCounts)
        .sort(([,a], [,b]) => b - a)[0];

      const pattern = predominantType ? predominantType[0] : 'stable';
      const confidence = predominantType ? predominantType[1] / events.length : 0;

      const recommendations = this.generatePatternRecommendations(pattern, confidence);

      return {
        predominant_pattern: pattern,
        confidence,
        recommendations
      };
    } catch (error) {
      console.error('Error detecting learning patterns:', error);
      return {
        predominant_pattern: 'unknown',
        confidence: 0,
        recommendations: []
      };
    }
  }

  /**
   * Generate recommendations based on learning patterns
   */
  private static generatePatternRecommendations(pattern: string, confidence: number): string[] {
    const recommendations: string[] = [];

    if (pattern === 'struggle' && confidence > 0.3) {
      recommendations.push('Consider providing additional scaffolding');
      recommendations.push('Reduce cognitive load with simpler examples');
      recommendations.push('Offer more frequent encouragement');
    } else if (pattern === 'breakthrough' && confidence > 0.3) {
      recommendations.push('Increase challenge level to maintain engagement');
      recommendations.push('Introduce advanced concepts');
      recommendations.push('Encourage exploration of related topics');
    } else if (pattern === 'plateau' && confidence > 0.3) {
      recommendations.push('Vary explanation styles to reignite interest');
      recommendations.push('Introduce real-world applications');
      recommendations.push('Consider peer collaboration opportunities');
    }

    return recommendations;
  }
}
