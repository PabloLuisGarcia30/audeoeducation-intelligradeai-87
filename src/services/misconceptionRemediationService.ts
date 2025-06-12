
import { supabase } from "@/integrations/supabase/client";
import { MisconceptionTaxonomyService, MisconceptionAnalysisResult } from "./misconceptionTaxonomyService";

export interface RemediationStrategy {
  id: string;
  name: string;
  description: string;
  targetMisconceptionTypes: string[];
  effectiveness: number;
  implementationSteps: string[];
  resources: string[];
  duration: string;
}

export interface PersonalizedRemediation {
  studentId: string;
  misconceptionSubtypeId: string;
  recommendedStrategies: RemediationStrategy[];
  customizedContent: {
    exercises: any[];
    explanations: string[];
    visualAids: string[];
  };
  progressTracking: {
    milestones: string[];
    assessmentPoints: string[];
  };
}

export interface RemediationSession {
  id: string;
  studentId: string;
  misconceptionSubtypeId: string;
  strategyUsed: string;
  startTime: Date;
  endTime?: Date;
  successful: boolean;
  studentEngagement: number;
  notes: string;
}

export class MisconceptionRemediationService {
  // Core remediation strategies mapped to misconception types
  private static readonly REMEDIATION_STRATEGIES: RemediationStrategy[] = [
    {
      id: 'step_by_step_practice',
      name: 'Step-by-Step Practice',
      description: 'Guided practice breaking down complex procedures into manageable steps',
      targetMisconceptionTypes: ['Step Omission', 'Step Order Error', 'Partial Completion'],
      effectiveness: 0.85,
      implementationSteps: [
        'Identify all required steps in the procedure',
        'Practice each step individually',
        'Combine steps gradually',
        'Provide immediate feedback on each step'
      ],
      resources: ['Step-by-step checklists', 'Interactive tutorials', 'Video demonstrations'],
      duration: '15-20 minutes'
    },
    {
      id: 'conceptual_exploration',
      name: 'Conceptual Exploration',
      description: 'Deep dive into underlying concepts through guided discovery',
      targetMisconceptionTypes: ['False Assumption', 'Causal Misunderstanding', 'Model Misuse'],
      effectiveness: 0.78,
      implementationSteps: [
        'Explore the core concept through examples',
        'Compare correct and incorrect applications',
        'Build conceptual models',
        'Test understanding with varied scenarios'
      ],
      resources: ['Concept maps', 'Interactive simulations', 'Real-world examples'],
      duration: '20-30 minutes'
    },
    {
      id: 'visual_symbol_training',
      name: 'Visual Symbol Training',
      description: 'Visual and kinesthetic approach to learning mathematical symbols and operations',
      targetMisconceptionTypes: ['Symbol Confusion', 'Flawed Memorized Routine'],
      effectiveness: 0.82,
      implementationSteps: [
        'Color-code different symbols',
        'Use physical manipulatives',
        'Practice symbol recognition',
        'Connect symbols to meanings'
      ],
      resources: ['Color-coded materials', 'Physical manipulatives', 'Symbol flashcards'],
      duration: '10-15 minutes'
    },
    {
      id: 'reading_comprehension_focus',
      name: 'Reading Comprehension Focus',
      description: 'Targeted practice on understanding question requirements and key terms',
      targetMisconceptionTypes: ['Keyword Confusion', 'Task Misread', 'Literal Interpretation'],
      effectiveness: 0.75,
      implementationSteps: [
        'Highlight key instruction words',
        'Practice paraphrasing questions',
        'Identify question types',
        'Practice with similar question formats'
      ],
      resources: ['Highlighted question templates', 'Question type guides', 'Paraphrasing practice'],
      duration: '15-25 minutes'
    },
    {
      id: 'structured_communication',
      name: 'Structured Communication',
      description: 'Frameworks and templates for clear mathematical communication',
      targetMisconceptionTypes: ['Vocabulary Mismatch', 'Poor Organization', 'Communication Breakdown'],
      effectiveness: 0.73,
      implementationSteps: [
        'Provide sentence starters',
        'Use graphic organizers',
        'Practice mathematical vocabulary',
        'Model clear explanations'
      ],
      resources: ['Sentence starter templates', 'Graphic organizers', 'Vocabulary cards'],
      duration: '20-25 minutes'
    },
    {
      id: 'strategic_problem_solving',
      name: 'Strategic Problem Solving',
      description: 'Teaching systematic approaches to problem selection and execution',
      targetMisconceptionTypes: ['Guess-and-Check Default', 'Overkill Strategy', 'Misapplied Prior Knowledge'],
      effectiveness: 0.80,
      implementationSteps: [
        'Identify problem types',
        'Learn strategy selection criteria',
        'Practice with decision trees',
        'Reflect on strategy effectiveness'
      ],
      resources: ['Problem type guides', 'Strategy decision trees', 'Reflection templates'],
      duration: '25-35 minutes'
    },
    {
      id: 'metacognitive_coaching',
      name: 'Metacognitive Coaching',
      description: 'Building self-awareness and self-regulation in learning',
      targetMisconceptionTypes: ['Overconfidence in Error', 'Ignores Feedback', 'Abandons Question Midway'],
      effectiveness: 0.70,
      implementationSteps: [
        'Practice self-assessment',
        'Learn to identify confidence levels',
        'Develop feedback processing skills',
        'Build persistence strategies'
      ],
      resources: ['Self-assessment rubrics', 'Confidence scales', 'Persistence strategies'],
      duration: '20-30 minutes'
    },
    {
      id: 'motivational_support',
      name: 'Motivational Support',
      description: 'Addressing emotional and motivational barriers to learning',
      targetMisconceptionTypes: ['Frustration Spike', 'Avoidance Patterns', 'Disengagement'],
      effectiveness: 0.65,
      implementationSteps: [
        'Acknowledge emotional response',
        'Break tasks into smaller parts',
        'Celebrate small wins',
        'Provide choice and autonomy'
      ],
      resources: ['Motivation tracking sheets', 'Choice boards', 'Achievement badges'],
      duration: '15-20 minutes'
    }
  ];

  // Get recommended strategies for a specific misconception
  static getRecommendedStrategies(misconceptionSubtypeName: string): RemediationStrategy[] {
    return this.REMEDIATION_STRATEGIES.filter(strategy =>
      strategy.targetMisconceptionTypes.includes(misconceptionSubtypeName)
    ).sort((a, b) => b.effectiveness - a.effectiveness);
  }

  // Generate personalized remediation plan
  static async generatePersonalizedRemediation(
    studentId: string,
    misconceptionSubtypeId: string,
    misconceptionAnalysis: MisconceptionAnalysisResult
  ): Promise<PersonalizedRemediation> {
    // Get recommended strategies
    const recommendedStrategies = this.getRecommendedStrategies(misconceptionAnalysis.subtypeName);
    
    // Get student's past intervention data to personalize
    const { data: pastInterventions } = await supabase
      .from('misconception_feedback_sessions')
      .select(`
        feedback_type,
        success,
        intervention_data,
        student_misconception:student_misconceptions!inner(
          misconception_subtype_id
        )
      `)
      .eq('student_misconception.student_id', studentId);

    // Adjust strategy recommendations based on past effectiveness
    const adjustedStrategies = recommendedStrategies.map(strategy => {
      const pastUses = pastInterventions?.filter(
        intervention => intervention.feedback_type === strategy.id
      ) || [];
      
      if (pastUses.length > 0) {
        const successRate = pastUses.filter(use => use.success).length / pastUses.length;
        return {
          ...strategy,
          effectiveness: (strategy.effectiveness + successRate) / 2
        };
      }
      
      return strategy;
    }).sort((a, b) => b.effectiveness - a.effectiveness);

    // Generate customized content based on misconception type
    const customizedContent = this.generateCustomizedContent(misconceptionAnalysis);
    
    // Create progress tracking plan
    const progressTracking = this.createProgressTrackingPlan(misconceptionAnalysis);

    return {
      studentId,
      misconceptionSubtypeId,
      recommendedStrategies: adjustedStrategies,
      customizedContent,
      progressTracking
    };
  }

  // Generate customized content for the specific misconception
  private static generateCustomizedContent(analysis: MisconceptionAnalysisResult): {
    exercises: any[];
    explanations: string[];
    visualAids: string[];
  } {
    const exercises: any[] = [];
    const explanations: string[] = [];
    const visualAids: string[] = [];

    // Customize based on misconception category
    switch (analysis.categoryName) {
      case 'Procedural Errors':
        exercises.push({
          type: 'step_practice',
          title: `${analysis.subtypeName} Practice`,
          description: 'Practice the correct procedure step by step'
        });
        explanations.push(`For ${analysis.subtypeName}: ${analysis.reasoning}`);
        visualAids.push('step_by_step_diagram');
        break;

      case 'Conceptual Errors':
        exercises.push({
          type: 'concept_exploration',
          title: `Understanding ${analysis.subtypeName}`,
          description: 'Explore the concept through guided examples'
        });
        explanations.push(`Conceptual clarification: ${analysis.reasoning}`);
        visualAids.push('concept_map', 'comparison_chart');
        break;

      case 'Interpretive Errors':
        exercises.push({
          type: 'reading_practice',
          title: `Reading Comprehension for ${analysis.subtypeName}`,
          description: 'Practice understanding question requirements'
        });
        explanations.push(`Reading strategy: ${analysis.reasoning}`);
        visualAids.push('question_breakdown', 'keyword_highlighter');
        break;

      case 'Expression Errors':
        exercises.push({
          type: 'communication_practice',
          title: `Clear Communication Practice`,
          description: 'Practice explaining your thinking clearly'
        });
        explanations.push(`Communication tip: ${analysis.reasoning}`);
        visualAids.push('explanation_template', 'vocabulary_guide');
        break;

      case 'Strategic Errors':
        exercises.push({
          type: 'strategy_selection',
          title: `Strategy Selection Practice`,
          description: 'Practice choosing the right approach'
        });
        explanations.push(`Strategy guidance: ${analysis.reasoning}`);
        visualAids.push('strategy_decision_tree', 'problem_type_guide');
        break;

      case 'Meta-Cognitive Errors':
        exercises.push({
          type: 'self_reflection',
          title: `Self-Assessment Practice`,
          description: 'Practice monitoring your own understanding'
        });
        explanations.push(`Metacognitive strategy: ${analysis.reasoning}`);
        visualAids.push('confidence_scale', 'self_check_rubric');
        break;
    }

    return { exercises, explanations, visualAids };
  }

  // Create progress tracking plan
  private static createProgressTrackingPlan(analysis: MisconceptionAnalysisResult): {
    milestones: string[];
    assessmentPoints: string[];
  } {
    const milestones = [
      `Recognize when ${analysis.subtypeName} might occur`,
      `Apply correct approach in guided practice`,
      `Demonstrate understanding in independent practice`,
      `Transfer learning to new contexts`
    ];

    const assessmentPoints = [
      'Initial diagnostic assessment',
      'Mid-intervention check-in',
      'Final mastery demonstration',
      'Transfer task completion'
    ];

    return { milestones, assessmentPoints };
  }

  // Conduct a remediation session
  static async conductRemediationSession(
    studentId: string,
    misconceptionSubtypeId: string,
    strategyId: string,
    customParameters: any = {}
  ): Promise<string> {
    // Record the start of the session
    const { data: sessionData, error } = await supabase
      .from('misconception_feedback_sessions')
      .insert({
        student_misconception_id: misconceptionSubtypeId, // This should be the actual misconception record ID
        feedback_type: strategyId,
        success: false, // Will be updated when session completes
        intervention_data: customParameters
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting remediation session:', error);
      throw error;
    }

    return sessionData.id;
  }

  // Complete a remediation session
  static async completeRemediationSession(
    sessionId: string,
    successful: boolean,
    studentEngagement: number,
    notes: string
  ): Promise<void> {
    const { error } = await supabase
      .from('misconception_feedback_sessions')
      .update({
        success: successful,
        notes: notes,
        intervention_data: {
          engagement_score: studentEngagement,
          completion_time: new Date().toISOString()
        }
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error completing remediation session:', error);
      throw error;
    }
  }

  // Get remediation effectiveness data
  static async getRemediationEffectiveness(
    strategyId?: string,
    misconceptionType?: string
  ): Promise<{
    strategy: string;
    totalSessions: number;
    successRate: number;
    averageEngagement: number;
    improvementTrend: number;
  }[]> {
    let query = supabase
      .from('misconception_feedback_sessions')
      .select(`
        feedback_type,
        success,
        intervention_data
      `);

    if (strategyId) {
      query = query.eq('feedback_type', strategyId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching remediation effectiveness:', error);
      return [];
    }

    if (!sessions) return [];

    // Group by strategy
    const strategyGroups = new Map<string, any[]>();
    sessions.forEach(session => {
      const strategy = session.feedback_type;
      if (!strategyGroups.has(strategy)) {
        strategyGroups.set(strategy, []);
      }
      strategyGroups.get(strategy)!.push(session);
    });

    // Calculate effectiveness metrics
    return Array.from(strategyGroups.entries()).map(([strategy, strategySessions]) => {
      const totalSessions = strategySessions.length;
      const successfulSessions = strategySessions.filter(s => s.success).length;
      const successRate = totalSessions > 0 ? successfulSessions / totalSessions : 0;
      
      const engagementScores = strategySessions
        .map(s => s.intervention_data?.engagement_score)
        .filter(score => typeof score === 'number');
      const averageEngagement = engagementScores.length > 0 
        ? engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length 
        : 0;

      return {
        strategy,
        totalSessions,
        successRate,
        averageEngagement,
        improvementTrend: 0 // Would calculate based on temporal data
      };
    });
  }

  // Get personalized intervention recommendations
  static async getPersonalizedInterventions(studentId: string): Promise<{
    urgentInterventions: string[];
    suggestedActivities: any[];
    affectiveSupport: string[];
  }> {
    // Get student's recent misconceptions
    const recentMisconceptions = await MisconceptionTaxonomyService.getStudentMisconceptions(studentId);
    
    // Get persistence logs
    const persistenceLogs = await MisconceptionTaxonomyService.getStudentPersistenceLogs(studentId);
    
    // Identify urgent interventions (persistent misconceptions)
    const urgentInterventions = persistenceLogs
      .filter(log => !log.resolved && log.total_occurrences >= 3)
      .map(log => log.subtype.subtype_name)
      .slice(0, 3);

    // Generate suggested activities
    const suggestedActivities = recentMisconceptions
      .slice(0, 5)
      .map(misconception => {
        const strategies = this.getRecommendedStrategies(misconception.subtype.subtype_name);
        return {
          misconceptionName: misconception.subtype.subtype_name,
          recommendedStrategy: strategies[0]?.name || 'General Practice',
          estimatedDuration: strategies[0]?.duration || '15-20 minutes',
          difficulty: misconception.confidence_score > 0.8 ? 'High' : 'Medium'
        };
      });

    // Check for affective support needs
    const { data: affectiveFlags } = await supabase
      .from('affective_response_flags')
      .select('flag_type, intensity_score')
      .eq('student_id', studentId)
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const affectiveSupport: string[] = [];
    if (affectiveFlags?.some(f => f.flag_type === 'frustration_spike')) {
      affectiveSupport.push('Consider shorter practice sessions to reduce frustration');
    }
    if (affectiveFlags?.some(f => f.flag_type === 'avoidance_patterns')) {
      affectiveSupport.push('Use motivational strategies and choice-based activities');
    }
    if (affectiveFlags?.some(f => f.flag_type === 'disengagement')) {
      affectiveSupport.push('Implement gamification and immediate positive feedback');
    }

    return {
      urgentInterventions,
      suggestedActivities,
      affectiveSupport
    };
  }
}
