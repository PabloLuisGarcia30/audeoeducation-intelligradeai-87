
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedMistakePatternData {
  studentExerciseId: string;
  questionId: string;
  questionNumber: number;
  questionType?: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  skillTargeted: string;
  mistakeType?: string;
  confidenceScore?: number;
  gradingMethod?: 'exact_match' | 'flexible_match' | 'ai_graded';
  feedbackGiven?: string;
  
  // Enhanced fields
  misconceptionCategory?: string;
  errorSeverity?: 'minor' | 'moderate' | 'major' | 'fundamental';
  prerequisiteSkillsGap?: string[];
  errorPersistenceCount?: number;
  questionContext?: string;
  distractorAnalysis?: string;
  solutionPath?: string;
  cognitiveLoadIndicators?: Record<string, any>;
  learningObjectives?: string[];
  remediationSuggestions?: string;
  relatedConcepts?: string[];
  difficultyLevelAppropriate?: boolean;
  errorPatternId?: string;
  metacognitiveAwareness?: string;
  transferFailureIndicator?: boolean;
  instructionalSensitivityFlag?: boolean;
  gptAnalysisMetadata?: Record<string, any>;
  detailedConceptualError?: string;
  contextWhenErrorOccurred?: Record<string, any>;
}

export interface EnhancedMistakeAnalysis {
  skillName: string;
  misconceptionCategory: string;
  errorSeverity: string;
  errorCount: number;
  averagePersistence: number;
  commonPrerequisitesGaps: string[];
  remediationThemes: string[];
  cognitivePatterns: Record<string, number>;
}

export interface ErrorPatternDefinition {
  id: string;
  patternId: string;
  patternName: string;
  description: string;
  category: string;
  severityIndicators: Record<string, any>;
  remediationStrategies: string[];
  relatedPatterns: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CommonErrorPattern {
  errorPatternId: string;
  patternFrequency: number;
  averageSeverity: string;
  commonMisconceptions: string[];
  affectedSkills: string[];
  suggestedInterventions: string[];
}

export class EnhancedMistakePatternService {
  
  /**
   * Record an enhanced mistake pattern with detailed analysis
   */
  static async recordEnhancedMistakePattern(mistakeData: EnhancedMistakePatternData): Promise<string | null> {
    try {
      console.log(`🔍 Recording enhanced mistake pattern for question ${mistakeData.questionNumber}`);
      
      const { data, error } = await supabase
        .from('mistake_patterns')
        .insert({
          student_exercise_id: mistakeData.studentExerciseId,
          question_id: mistakeData.questionId,
          question_number: mistakeData.questionNumber,
          question_type: mistakeData.questionType,
          student_answer: mistakeData.studentAnswer,
          correct_answer: mistakeData.correctAnswer,
          is_correct: mistakeData.isCorrect,
          mistake_type: mistakeData.mistakeType,
          skill_targeted: mistakeData.skillTargeted,
          confidence_score: mistakeData.confidenceScore,
          grading_method: mistakeData.gradingMethod,
          feedback_given: mistakeData.feedbackGiven,
          
          // Enhanced fields
          misconception_category: mistakeData.misconceptionCategory,
          error_severity: mistakeData.errorSeverity,
          prerequisite_skills_gap: mistakeData.prerequisiteSkillsGap,
          error_persistence_count: mistakeData.errorPersistenceCount || 1,
          question_context: mistakeData.questionContext,
          distractor_analysis: mistakeData.distractorAnalysis,
          solution_path: mistakeData.solutionPath,
          cognitive_load_indicators: mistakeData.cognitiveLoadIndicators || {},
          learning_objectives: mistakeData.learningObjectives,
          remediation_suggestions: mistakeData.remediationSuggestions,
          related_concepts: mistakeData.relatedConcepts,
          difficulty_level_appropriate: mistakeData.difficultyLevelAppropriate,
          error_pattern_id: mistakeData.errorPatternId,
          metacognitive_awareness: mistakeData.metacognitiveAwareness,
          transfer_failure_indicator: mistakeData.transferFailureIndicator || false,
          instructional_sensitivity_flag: mistakeData.instructionalSensitivityFlag || false,
          gpt_analysis_metadata: mistakeData.gptAnalysisMetadata || {},
          detailed_conceptual_error: mistakeData.detailedConceptualError,
          context_when_error_occurred: mistakeData.contextWhenErrorOccurred || {}
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error recording enhanced mistake pattern:', error);
        return null;
      }

      console.log(`✅ Enhanced mistake pattern recorded: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Exception in recordEnhancedMistakePattern:', error);
      return null;
    }
  }

  /**
   * Analyze misconception category based on student answer and context
   */
  static analyzeMisconceptionCategory(
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[]
  ): string {
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    // Basic categorization logic - can be enhanced with ML/AI
    if (questionType === 'multiple-choice') {
      if (options && options.includes(studentAnswer)) {
        // Analyze which distractor was chosen
        const correctIndex = options.indexOf(correctAnswer);
        const studentIndex = options.indexOf(studentAnswer);
        
        if (Math.abs(correctIndex - studentIndex) === 1) {
          return 'adjacent_confusion';
        } else {
          return 'conceptual_misunderstanding';
        }
      }
      return 'procedural_error';
    }

    if (questionType === 'short-answer' || questionType === 'essay') {
      if (studentLower.length < correctLower.length * 0.3) {
        return 'incomplete_understanding';
      } else if (studentLower.includes('not') || studentLower.includes('opposite')) {
        return 'inverse_reasoning';
      } else if (this.containsMathematicalError(studentAnswer, correctAnswer)) {
        return 'algebraic_manipulation';
      } else {
        return 'conceptual_gap';
      }
    }

    return 'unclassified';
  }

  /**
   * Determine error severity based on various factors
   */
  static determineErrorSeverity(
    isCorrect: boolean,
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    timeSpent?: number,
    answerChanges?: number
  ): 'minor' | 'moderate' | 'major' | 'fundamental' {
    if (isCorrect) return 'minor';

    // Factor in answer complexity and changes
    const answerComplexity = studentAnswer.length / Math.max(correctAnswer.length, 1);
    const multipleChanges = (answerChanges || 0) > 2;
    const quickAnswer = timeSpent && timeSpent < 30; // Less than 30 seconds
    const longDeliberation = timeSpent && timeSpent > 300; // More than 5 minutes

    if (questionType === 'multiple-choice') {
      if (quickAnswer && !multipleChanges) return 'minor';
      if (longDeliberation && multipleChanges) return 'major';
      return 'moderate';
    }

    if (questionType === 'short-answer' || questionType === 'essay') {
      if (answerComplexity < 0.2) return 'fundamental'; // Very short answer to complex question
      if (answerComplexity > 0.8 && this.hasCorrectKeywords(studentAnswer, correctAnswer)) {
        return 'minor'; // Long answer with correct concepts
      }
      if (longDeliberation) return 'major';
      return 'moderate';
    }

    return 'moderate';
  }

  /**
   * Generate GPT analysis prompt for detailed mistake analysis
   */
  static generateGPTAnalysisPrompt(mistakeData: EnhancedMistakePatternData): string {
    return `Analyze this student mistake for detailed educational insights:

Question Context: ${mistakeData.questionContext || 'Not provided'}
Question Type: ${mistakeData.questionType}
Student Answer: "${mistakeData.studentAnswer}"
Correct Answer: "${mistakeData.correctAnswer}"
Skill Being Tested: ${mistakeData.skillTargeted}

Please provide:
1. Detailed conceptual error analysis
2. Specific misconception category
3. Prerequisites skills that may be missing
4. Remediation suggestions
5. Related concepts that should be reviewed
6. Whether this indicates a transfer failure
7. Metacognitive awareness indicators

Format as JSON with keys: detailedAnalysis, misconceptionCategory, prerequisiteGaps, remediation, relatedConcepts, transferFailure, metacognitiveAwareness`;
  }

  /**
   * Get enhanced mistake analysis for a student
   */
  static async getEnhancedMistakeAnalysis(
    studentId: string, 
    skillFilter?: string
  ): Promise<EnhancedMistakeAnalysis[]> {
    try {
      console.log(`📊 Fetching enhanced mistake analysis for student: ${studentId}`);
      
      const { data, error } = await supabase.rpc('get_enhanced_mistake_analysis', {
        student_uuid: studentId,
        skill_filter: skillFilter || null
      });

      if (error) {
        console.error('❌ Error fetching enhanced mistake analysis:', error);
        return [];
      }

      console.log(`✅ Retrieved ${data?.length || 0} enhanced mistake analyses`);
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getEnhancedMistakeAnalysis:', error);
      return [];
    }
  }

  /**
   * Identify common error patterns across students
   */
  static async identifyCommonErrorPatterns(skillName?: string): Promise<CommonErrorPattern[]> {
    try {
      const { data, error } = await supabase.rpc('identify_common_error_patterns', {
        skill_name_filter: skillName || null
      });

      if (error) {
        console.error('❌ Error identifying common error patterns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception in identifyCommonErrorPatterns:', error);
      return [];
    }
  }

  /**
   * Create or update error pattern definition
   */
  static async createErrorPatternDefinition(patternData: Omit<ErrorPatternDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('error_pattern_definitions')
        .insert({
          pattern_id: patternData.patternId,
          pattern_name: patternData.patternName,
          description: patternData.description,
          category: patternData.category,
          severity_indicators: patternData.severityIndicators,
          remediation_strategies: patternData.remediationStrategies,
          related_patterns: patternData.relatedPatterns
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating error pattern definition:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('❌ Exception in createErrorPatternDefinition:', error);
      return null;
    }
  }

  // Helper methods
  private static containsMathematicalError(studentAnswer: string, correctAnswer: string): boolean {
    const mathPattern = /[\d\+\-\*\/\=\(\)]/;
    return mathPattern.test(studentAnswer) && mathPattern.test(correctAnswer);
  }

  private static hasCorrectKeywords(studentAnswer: string, correctAnswer: string): boolean {
    const correctWords = correctAnswer.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const studentWords = studentAnswer.toLowerCase().split(/\s+/);
    const matches = correctWords.filter(word => studentWords.includes(word));
    return matches.length / correctWords.length > 0.3; // 30% keyword overlap
  }
}
