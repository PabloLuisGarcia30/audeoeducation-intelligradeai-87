
import { AdaptiveLearningService, AdaptiveLearningProfile, LearningTrajectoryEvent } from './adaptiveLearningService';

export interface AdaptiveCoachContext {
  studentId: string;
  studentName: string;
  skill_name: string;
  skill_type: 'content' | 'subject';
  current_performance?: number;
  current_confidence?: number;
  session_duration_minutes?: number;
  conversation_id: string;
  message_history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export interface AdaptiveResponse {
  response: string;
  explanation_style: string;
  difficulty_level: string;
  scaffolding_applied: string[];
  learning_event?: LearningTrajectoryEvent;
  recommendations?: Array<{
    type: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export class AdaptiveAICoachService {
  /**
   * Generate adaptive AI response based on student's learning profile and context
   */
  static async generateAdaptiveResponse(
    originalResponse: string,
    context: AdaptiveCoachContext
  ): Promise<AdaptiveResponse> {
    try {
      // Get student's adaptive learning profile
      const profile = await AdaptiveLearningService.getOrCreateProfile(context.studentId);
      if (!profile) {
        return {
          response: originalResponse,
          explanation_style: 'mixed',
          difficulty_level: 'medium',
          scaffolding_applied: []
        };
      }

      // Analyze conversation context
      const conversationAnalysis = this.analyzeConversation(context.message_history);
      
      // Detect if student is struggling or excelling
      const learningState = this.detectLearningState(conversationAnalysis, profile);
      
      // Adapt the response based on profile and state
      const adaptedResponse = await this.adaptResponse(
        originalResponse,
        profile,
        learningState,
        context
      );

      // Log learning event if significant
      let learningEvent: LearningTrajectoryEvent | undefined;
      if (learningState.event_type !== 'neutral') {
        learningEvent = {
          student_id: context.studentId,
          event_type: learningState.event_type as any,
          skill_name: context.skill_name,
          skill_type: context.skill_type,
          difficulty_level: adaptedResponse.difficulty_level as any,
          confidence_after: context.current_confidence,
          performance_after: context.current_performance,
          successful_explanation_type: adaptedResponse.explanation_style,
          behavioral_signals: {
            conversation_length: context.message_history.length,
            help_requests: conversationAnalysis.help_requests,
            confusion_indicators: conversationAnalysis.confusion_indicators
          }
        };

        await AdaptiveLearningService.logLearningEvent(learningEvent);
      }

      // Generate recommendations if needed
      const recommendations = await this.generateContextualRecommendations(
        context,
        profile,
        learningState
      );

      // Update conversation analytics
      await this.updateConversationMetrics(context, conversationAnalysis);

      return {
        ...adaptedResponse,
        learning_event: learningEvent,
        recommendations
      };
    } catch (error) {
      console.error('Error generating adaptive response:', error);
      return {
        response: originalResponse,
        explanation_style: 'mixed',
        difficulty_level: 'medium',
        scaffolding_applied: []
      };
    }
  }

  /**
   * Analyze conversation for learning indicators
   */
  private static analyzeConversation(messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>): {
    confusion_indicators: number;
    breakthrough_indicators: number;
    help_requests: number;
    topic_changes: number;
    engagement_level: 'low' | 'medium' | 'high';
  } {
    const userMessages = messageHistory.filter(msg => msg.role === 'user');
    
    let confusionIndicators = 0;
    let breakthroughIndicators = 0;
    let helpRequests = 0;
    let topicChanges = 0;

    const confusionPhrases = [
      'i don\'t understand', 'confused', 'what do you mean', 'can you explain',
      'i\'m lost', 'not sure', 'unclear', 'what', 'huh'
    ];

    const breakthroughPhrases = [
      'oh i see', 'got it', 'makes sense', 'i understand now', 'ah okay',
      'that helps', 'clear now', 'i get it'
    ];

    const helpPhrases = [
      'help', 'can you', 'show me', 'explain', 'how do i', 'what should i'
    ];

    userMessages.forEach((message, index) => {
      const content = message.content.toLowerCase();
      
      // Check for confusion indicators
      if (confusionPhrases.some(phrase => content.includes(phrase))) {
        confusionIndicators++;
      }

      // Check for breakthrough indicators
      if (breakthroughPhrases.some(phrase => content.includes(phrase))) {
        breakthroughIndicators++;
      }

      // Check for help requests
      if (helpPhrases.some(phrase => content.includes(phrase))) {
        helpRequests++;
      }

      // Check for topic changes (rough heuristic)
      if (index > 0 && message.content.length > 10) {
        const prevMessage = userMessages[index - 1].content;
        if (this.calculateMessageSimilarity(content, prevMessage.toLowerCase()) < 0.3) {
          topicChanges++;
        }
      }
    });

    // Calculate engagement level
    const messageCount = userMessages.length;
    const avgMessageLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / messageCount;
    
    let engagementLevel: 'low' | 'medium' | 'high' = 'medium';
    if (messageCount < 3 || avgMessageLength < 20) {
      engagementLevel = 'low';
    } else if (messageCount > 8 && avgMessageLength > 50) {
      engagementLevel = 'high';
    }

    return {
      confusion_indicators: confusionIndicators,
      breakthrough_indicators: breakthroughIndicators,
      help_requests: helpRequests,
      topic_changes: topicChanges,
      engagement_level: engagementLevel
    };
  }

  /**
   * Detect current learning state
   */
  private static detectLearningState(
    conversationAnalysis: any,
    profile: AdaptiveLearningProfile
  ): {
    event_type: 'breakthrough' | 'struggle' | 'plateau' | 'confusion' | 'mastery' | 'neutral';
    confidence: number;
    recommended_action: string;
  } {
    const { confusion_indicators, breakthrough_indicators, help_requests, engagement_level } = conversationAnalysis;

    // Detect breakthrough
    if (breakthrough_indicators > 0 && confusion_indicators === 0) {
      return {
        event_type: 'breakthrough',
        confidence: 0.8,
        recommended_action: 'encourage_and_advance'
      };
    }

    // Detect confusion/struggle
    if (confusion_indicators >= 2 || (confusion_indicators > 0 && help_requests >= 2)) {
      return {
        event_type: confusion_indicators >= 3 ? 'struggle' : 'confusion',
        confidence: 0.7,
        recommended_action: 'provide_scaffolding'
      };
    }

    // Detect plateau (low engagement, no confusion or breakthrough)
    if (engagement_level === 'low' && confusion_indicators === 0 && breakthrough_indicators === 0) {
      return {
        event_type: 'plateau',
        confidence: 0.6,
        recommended_action: 'increase_engagement'
      };
    }

    return {
      event_type: 'neutral',
      confidence: 0.5,
      recommended_action: 'continue_current_approach'
    };
  }

  /**
   * Adapt response based on profile and learning state
   */
  private static async adaptResponse(
    originalResponse: string,
    profile: AdaptiveLearningProfile,
    learningState: any,
    context: AdaptiveCoachContext
  ): Promise<{
    response: string;
    explanation_style: string;
    difficulty_level: string;
    scaffolding_applied: string[];
  }> {
    let adaptedResponse = originalResponse;
    let explanationStyle = profile.preferred_explanation_style;
    let difficultyLevel = 'medium';
    const scaffoldingApplied: string[] = [];

    // Adapt based on learning state
    switch (learningState.recommended_action) {
      case 'provide_scaffolding':
        if (profile.scaffolding_preferences.hints) {
          adaptedResponse = this.addHints(adaptedResponse);
          scaffoldingApplied.push('hints');
        }
        if (profile.scaffolding_preferences.examples) {
          adaptedResponse = this.addExamples(adaptedResponse);
          scaffoldingApplied.push('examples');
        }
        if (profile.scaffolding_preferences.step_by_step) {
          adaptedResponse = this.makeStepByStep(adaptedResponse);
          scaffoldingApplied.push('step_by_step');
        }
        difficultyLevel = 'easy';
        break;

      case 'encourage_and_advance':
        adaptedResponse = this.addEncouragement(adaptedResponse);
        difficultyLevel = 'hard';
        scaffoldingApplied.push('encouragement');
        break;

      case 'increase_engagement':
        adaptedResponse = this.makeMoreEngaging(adaptedResponse);
        explanationStyle = this.getAlternativeStyle(profile.preferred_explanation_style);
        scaffoldingApplied.push('engagement_boost');
        break;
    }

    // Adapt explanation style based on profile
    adaptedResponse = this.adaptExplanationStyle(adaptedResponse, explanationStyle);

    return {
      response: adaptedResponse,
      explanation_style: explanationStyle,
      difficulty_level: difficultyLevel,
      scaffolding_applied: scaffoldingApplied
    };
  }

  /**
   * Add hints to response
   */
  private static addHints(response: string): string {
    return response + "\n\n💡 **Hint:** Try breaking this down into smaller steps, and remember that practice makes progress!";
  }

  /**
   * Add examples to response
   */
  private static addExamples(response: string): string {
    return response + "\n\n📝 **Example:** Let me show you a similar problem and how to approach it step by step.";
  }

  /**
   * Make response step-by-step
   */
  private static makeStepByStep(response: string): string {
    // This is a simplified version - in practice, you'd use more sophisticated parsing
    const sentences = response.split('. ');
    if (sentences.length > 1) {
      return sentences.map((sentence, index) => `**Step ${index + 1}:** ${sentence.trim()}`).join('\n\n');
    }
    return response;
  }

  /**
   * Add encouragement to response
   */
  private static addEncouragement(response: string): string {
    const encouragements = [
      "Great job understanding that! 🌟",
      "You're making excellent progress! 💪",
      "That's exactly right! Keep it up! 🎉",
      "Fantastic thinking! 🧠✨"
    ];
    const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    return `${encouragement}\n\n${response}`;
  }

  /**
   * Make response more engaging
   */
  private static makeMoreEngaging(response: string): string {
    return `🚀 Let's make this more interesting!\n\n${response}\n\n🤔 What do you think would happen if we tried a different approach?`;
  }

  /**
   * Adapt explanation style
   */
  private static adaptExplanationStyle(response: string, style: string): string {
    // This is a simplified version - in practice, you'd use more sophisticated adaptation
    switch (style) {
      case 'visual':
        return `${response}\n\n🎨 *Try visualizing this concept as a diagram or picture in your mind.*`;
      case 'step-by-step':
        return this.makeStepByStep(response);
      case 'conceptual':
        return `${response}\n\n🧩 *Think about the bigger picture - how does this connect to what you already know?*`;
      default:
        return response;
    }
  }

  /**
   * Get alternative explanation style
   */
  private static getAlternativeStyle(currentStyle: string): 'visual' | 'textual' | 'step-by-step' | 'conceptual' | 'mixed' {
    const styles: ('visual' | 'textual' | 'step-by-step' | 'conceptual')[] = ['visual', 'textual', 'step-by-step', 'conceptual'];
    const alternatives = styles.filter(style => style !== currentStyle);
    return alternatives[Math.floor(Math.random() * alternatives.length)] || 'mixed';
  }

  /**
   * Generate contextual recommendations
   */
  private static async generateContextualRecommendations(
    context: AdaptiveCoachContext,
    profile: AdaptiveLearningProfile,
    learningState: any
  ): Promise<Array<{
    type: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>> {
    const recommendations: Array<{
      type: string;
      message: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    // Check session duration
    if (context.session_duration_minutes && context.session_duration_minutes > profile.fatigue_threshold_minutes) {
      recommendations.push({
        type: 'break_suggestion',
        message: 'Consider taking a 5-10 minute break to help maintain focus and retention.',
        priority: 'high'
      });
    }

    // Check learning state
    if (learningState.event_type === 'struggle') {
      recommendations.push({
        type: 'scaffolding',
        message: 'Try breaking down the problem into smaller, more manageable pieces.',
        priority: 'high'
      });
    } else if (learningState.event_type === 'breakthrough') {
      recommendations.push({
        type: 'advancement',
        message: 'Great progress! Ready to try a more challenging problem?',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Update conversation metrics
   */
  private static async updateConversationMetrics(
    context: AdaptiveCoachContext,
    analysis: any
  ): Promise<void> {
    try {
      await AdaptiveLearningService.updateConversationAnalytics({
        student_id: context.studentId,
        conversation_id: context.conversation_id,
        total_messages: context.message_history.length,
        student_messages: context.message_history.filter(msg => msg.role === 'user').length,
        ai_responses: context.message_history.filter(msg => msg.role === 'assistant').length,
        confusion_indicators: analysis.confusion_indicators,
        breakthrough_indicators: analysis.breakthrough_indicators,
        help_requests: analysis.help_requests,
        topic_changes: analysis.topic_changes,
        skills_practiced: [context.skill_name],
        concepts_clarified: [],
        misconceptions_addressed: [],
        difficulty_adjustments_made: 0,
        explanation_styles_used: ['adaptive'],
        learning_objectives_achieved: analysis.breakthrough_indicators > 0
      });
    } catch (error) {
      console.error('Error updating conversation metrics:', error);
    }
  }

  /**
   * Calculate message similarity (simple implementation)
   */
  private static calculateMessageSimilarity(message1: string, message2: string): number {
    const words1 = message1.split(' ');
    const words2 = message2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word)).length;
    const totalUniqueWords = new Set([...words1, ...words2]).size;
    return totalUniqueWords > 0 ? commonWords / totalUniqueWords : 0;
  }
}
