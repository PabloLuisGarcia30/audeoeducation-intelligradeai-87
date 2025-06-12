import { SmartAnswerGradingService, type GradingResult, type AnswerPattern } from './smartAnswerGradingService';
import { MistakePatternService } from './mistakePatternService';
import { QuestionTimingService } from './questionTimingService';
import { ConceptMissedService, type ConceptMissedAnalysis } from './conceptMissedService';
import { EnhancedMisconceptionIntegrationService } from './enhancedMisconceptionIntegrationService';

export interface PracticeExerciseAnswer {
  questionId: string;
  studentAnswer: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  correctAnswer: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  options?: string[];
  points: number;
}

export interface ExerciseGradingResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
  gradingMethod: 'exact_match' | 'flexible_match' | 'ai_graded';
  confidence: number;
}

export interface ExerciseSubmissionResult {
  totalScore: number;
  totalPossible: number;
  percentageScore: number;
  questionResults: ExerciseGradingResult[];
  overallFeedback: string;
  completedAt: Date;
}

export class PracticeExerciseGradingService {
  
  /**
   * Grade a complete practice exercise submission with enhanced misconception tracking
   */
  static async gradeExerciseSubmission(
    answers: PracticeExerciseAnswer[],
    exerciseTitle?: string,
    studentExerciseId?: string,
    skillName?: string,
    exerciseMetadata?: any
  ): Promise<ExerciseSubmissionResult> {
    console.log('🎯 Grading practice exercise submission with', answers.length, 'answers');
    
    const questionResults: ExerciseGradingResult[] = [];
    let totalScore = 0;
    let totalPossible = 0;
    
    // Grade each question and record enhanced patterns
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const questionNumber = i + 1;
      
      const result = await this.gradeExerciseQuestion(answer);
      questionResults.push(result);
      totalScore += result.pointsEarned;
      totalPossible += result.pointsPossible;
      
      // Enhanced misconception analysis - ONLY for short-answer and essay questions
      if (studentExerciseId && skillName && !result.isCorrect) {
        await this.processIncorrectAnswer(
          answer,
          questionNumber,
          studentExerciseId,
          skillName,
          exerciseMetadata,
          result
        );
      }
    }
    
    const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    const overallFeedback = this.generateOverallFeedback(percentageScore, questionResults);
    
    console.log(`✅ Exercise graded: ${totalScore}/${totalPossible} (${percentageScore.toFixed(1)}%)`);
    
    return {
      totalScore,
      totalPossible,
      percentageScore,
      questionResults,
      overallFeedback,
      completedAt: new Date()
    };
  }

  /**
   * Process incorrect answers with enhanced misconception analysis
   * Only runs for short-answer and essay questions
   */
  private static async processIncorrectAnswer(
    answer: PracticeExerciseAnswer,
    questionNumber: number,
    studentExerciseId: string,
    skillName: string,
    exerciseMetadata: any,
    gradingResult: ExerciseGradingResult
  ) {
    const shouldAnalyzeMisconceptions = this.shouldAnalyzeMisconceptions(answer.questionType);
    
    console.log(`🧠 Question ${questionNumber} (${answer.questionType}): Misconception analysis ${shouldAnalyzeMisconceptions ? 'ENABLED' : 'SKIPPED'}`);
    
    if (shouldAnalyzeMisconceptions) {
      // Use enhanced misconception integration service
      try {
        const misconceptionAnalysis = await EnhancedMisconceptionIntegrationService.analyzeMisconceptionWithTaxonomy(
          exerciseMetadata?.subject || 'General',
          answer.questionType,
          answer.studentAnswer,
          answer.correctAnswer,
          `Question: ${answer.questionId}`,
          answer.options
        );

        console.log('🎯 Enhanced misconception analysis result:', misconceptionAnalysis);

        // Record the enhanced misconception if found
        if (misconceptionAnalysis) {
          await EnhancedMisconceptionIntegrationService.recordEnhancedMisconception(
            studentExerciseId, // Using as student ID for now
            answer.questionId,
            skillName, // Using as skill ID for now
            studentExerciseId, // Using as exam ID for now
            exerciseMetadata?.subject || 'General',
            answer.questionType,
            answer.studentAnswer,
            answer.correctAnswer,
            `Question: ${answer.questionId}`,
            answer.options
          );
        }

        // Also record in legacy mistake pattern system with enhanced data
        await MistakePatternService.recordMistakePattern({
          studentExerciseId,
          questionId: answer.questionId,
          questionNumber,
          questionType: answer.questionType,
          studentAnswer: answer.studentAnswer,
          correctAnswer: answer.correctAnswer,
          isCorrect: false,
          skillTargeted: skillName,
          mistakeType: this.getMistakeTypeFromMisconception(misconceptionAnalysis),
          confidenceScore: gradingResult.confidence,
          gradingMethod: gradingResult.gradingMethod,
          feedbackGiven: gradingResult.feedback,
          questionContext: `Question: ${answer.questionId}`,
          options: answer.options,
          subject: exerciseMetadata?.subject,
          grade: exerciseMetadata?.grade,
          // Enhanced fields from misconception analysis
          misconceptionCategory: misconceptionAnalysis?.categoryName,
          concept_missed_id: misconceptionAnalysis?.subtypeId,
          concept_missed_description: misconceptionAnalysis?.subtypeName
        });

      } catch (error) {
        console.error('❌ Enhanced misconception analysis failed:', error);
        
        // Fallback to legacy analysis
        await this.recordLegacyMistakePattern(
          answer,
          questionNumber,
          studentExerciseId,
          skillName,
          exerciseMetadata,
          gradingResult
        );
      }
    } else {
      // For multiple-choice and true-false, only record basic mistake pattern
      await this.recordLegacyMistakePattern(
        answer,
        questionNumber,
        studentExerciseId,
        skillName,
        exerciseMetadata,
        gradingResult
      );
    }
  }

  /**
   * Determine if misconception analysis should run based on question type
   */
  private static shouldAnalyzeMisconceptions(questionType: string): boolean {
    const analyzableTypes = ['short-answer', 'essay'];
    const shouldAnalyze = analyzableTypes.includes(questionType);
    
    if (!shouldAnalyze) {
      console.log(`📝 Skipping misconception analysis for ${questionType} - only analyzing: ${analyzableTypes.join(', ')}`);
    }
    
    return shouldAnalyze;
  }

  /**
   * Extract mistake type from misconception analysis
   */
  private static getMistakeTypeFromMisconception(misconceptionAnalysis: any): string | undefined {
    if (!misconceptionAnalysis) return undefined;
    
    // Map taxonomy categories to legacy mistake types
    const categoryMapping: Record<string, string> = {
      'Procedural Errors': 'procedural_error',
      'Conceptual Errors': 'conceptual_misunderstanding', 
      'Interpretive Errors': 'task_misread',
      'Expression Errors': 'communication_error',
      'Strategic Errors': 'wrong_approach',
      'Meta-Cognitive Errors': 'metacognitive_error'
    };
    
    return categoryMapping[misconceptionAnalysis.categoryName] || 'unclassified';
  }

  /**
   * Record legacy mistake pattern (fallback or for non-analyzable question types)
   */
  private static async recordLegacyMistakePattern(
    answer: PracticeExerciseAnswer,
    questionNumber: number,
    studentExerciseId: string,
    skillName: string,
    exerciseMetadata: any,
    gradingResult: ExerciseGradingResult
  ) {
    const mistakeType = MistakePatternService.analyzeMistakeType(
      answer.questionType,
      answer.studentAnswer,
      answer.correctAnswer,
      answer.options
    );

    // Legacy concept missed analysis for fallback
    let conceptMissedAnalysis: ConceptMissedAnalysis | null = null;
    if (answer.questionType === 'multiple-choice') {
      conceptMissedAnalysis = await ConceptMissedService.analyzeConceptMissed(
        `Question: ${answer.questionId}. Options: ${answer.options?.join(', ')}`,
        answer.studentAnswer,
        answer.correctAnswer,
        skillName,
        exerciseMetadata?.subject,
        exerciseMetadata?.grade
      );
    }

    await MistakePatternService.recordMistakePattern({
      studentExerciseId,
      questionId: answer.questionId,
      questionNumber,
      questionType: answer.questionType,
      studentAnswer: answer.studentAnswer,
      correctAnswer: answer.correctAnswer,
      isCorrect: false,
      skillTargeted: skillName,
      mistakeType: mistakeType || undefined,
      confidenceScore: gradingResult.confidence,
      gradingMethod: gradingResult.gradingMethod,
      feedbackGiven: gradingResult.feedback,
      questionContext: answer.questionType === 'multiple-choice' 
        ? `Question: ${answer.questionId}. Options: ${answer.options?.join(', ')}`
        : `Question: ${answer.questionId}`,
      options: answer.options,
      subject: exerciseMetadata?.subject,
      grade: exerciseMetadata?.grade,
      // Legacy concept missed data
      conceptMissedId: conceptMissedAnalysis?.conceptMissedId,
      conceptMissedDescription: conceptMissedAnalysis?.conceptMissedDescription
    });
  }
  
  /**
   * Grade a single question from a practice exercise
   */
  static async gradeExerciseQuestion(answer: PracticeExerciseAnswer): Promise<ExerciseGradingResult> {
    const {
      questionId,
      studentAnswer,
      questionType,
      correctAnswer,
      acceptableAnswers,
      keywords,
      options,
      points
    } = answer;
    
    let gradingResult: GradingResult;
    
    if (questionType === 'multiple-choice' || questionType === 'true-false') {
      // Simple exact match for multiple choice and true/false
      gradingResult = this.gradeExactMatch(studentAnswer, correctAnswer);
    } else if (questionType === 'short-answer') {
      // Use smart grading for short answers
      const answerPattern: AnswerPattern = {
        text: correctAnswer,
        acceptableVariations: acceptableAnswers || [],
        keywords: keywords || []
      };
      
      gradingResult = await SmartAnswerGradingService.gradeShortAnswer(
        studentAnswer,
        answerPattern,
        `Question ${questionId}`,
        questionId
      );
    } else {
      // Essay questions - use AI grading
      gradingResult = await SmartAnswerGradingService.gradeShortAnswer(
        studentAnswer,
        correctAnswer,
        `Essay question ${questionId}`,
        questionId
      );
    }
    
    const pointsEarned = Math.round(gradingResult.score * points * 100) / 100;
    const feedback = this.generateQuestionFeedback(gradingResult, questionType, pointsEarned, points);
    
    return {
      questionId,
      isCorrect: gradingResult.isCorrect,
      pointsEarned,
      pointsPossible: points,
      feedback,
      gradingMethod: gradingResult.method,
      confidence: gradingResult.confidence
    };
  }
  
  /**
   * Simple exact match grading for multiple choice and true/false
   */
  private static gradeExactMatch(studentAnswer: string, correctAnswer: string): GradingResult {
    const normalizedStudent = studentAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    const isCorrect = normalizedStudent === normalizedCorrect;
    
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      confidence: 1,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`,
      method: 'exact_match'
    };
  }
  
  /**
   * Generate feedback for individual questions
   */
  private static generateQuestionFeedback(
    gradingResult: GradingResult,
    questionType: string,
    pointsEarned: number,
    pointsPossible: number
  ): string {
    if (gradingResult.isCorrect) {
      return `Excellent! You earned ${pointsEarned}/${pointsPossible} points.`;
    }
    
    if (pointsEarned > 0) {
      return `Partially correct. You earned ${pointsEarned}/${pointsPossible} points. ${gradingResult.feedback || ''}`;
    }
    
    if (questionType === 'multiple-choice' || questionType === 'true-false') {
      return gradingResult.feedback || 'Incorrect answer.';
    }
    
    return `Your answer needs improvement. ${gradingResult.feedback || 'Please review the key concepts and try to include more specific details.'}`;
  }
  
  /**
   * Generate overall feedback for the exercise
   */
  private static generateOverallFeedback(
    percentageScore: number,
    questionResults: ExerciseGradingResult[]
  ): string {
    const correctCount = questionResults.filter(r => r.isCorrect).length;
    const totalCount = questionResults.length;
    const partialCreditCount = questionResults.filter(r => r.pointsEarned > 0 && !r.isCorrect).length;
    
    let feedback = `You answered ${correctCount} out of ${totalCount} questions correctly`;
    
    if (partialCreditCount > 0) {
      feedback += ` and earned partial credit on ${partialCreditCount} additional questions`;
    }
    
    feedback += `. `;
    
    if (percentageScore >= 90) {
      feedback += 'Outstanding work! You have excellent mastery of these concepts.';
    } else if (percentageScore >= 80) {
      feedback += 'Great job! You show strong understanding with room for minor improvements.';
    } else if (percentageScore >= 70) {
      feedback += 'Good work! Review the concepts you missed to strengthen your understanding.';
    } else if (percentageScore >= 60) {
      feedback += 'You\'re making progress! Focus on reviewing the key concepts and practice more.';
    } else {
      feedback += 'This topic needs more practice. Review the material and try some additional exercises.';
    }
    
    // Add specific suggestions based on question types
    const shortAnswerResults = questionResults.filter(r => r.gradingMethod === 'ai_graded' || r.gradingMethod === 'flexible_match');
    if (shortAnswerResults.length > 0) {
      const shortAnswerScore = shortAnswerResults.reduce((sum, r) => sum + r.pointsEarned, 0) / 
                              shortAnswerResults.reduce((sum, r) => sum + r.pointsPossible, 0) * 100;
      
      if (shortAnswerScore < 70) {
        feedback += ' For written responses, try to be more specific and include key terminology.';
      }
    }
    
    return feedback;
  }
  
  /**
   * Check if an answer shows understanding even if not perfect
   */
  static assessUnderstanding(
    studentAnswer: string,
    correctAnswer: string,
    keywords: string[] = []
  ): { showsUnderstanding: boolean; feedback: string } {
    const normalizedAnswer = studentAnswer.toLowerCase();
    const keywordMatches = keywords.filter(keyword => 
      normalizedAnswer.includes(keyword.toLowerCase())
    );
    
    const showsUnderstanding = keywordMatches.length >= Math.ceil(keywords.length * 0.5) || 
                              normalizedAnswer.length > 20; // Basic effort check
    
    let feedback = '';
    if (showsUnderstanding && keywordMatches.length > 0) {
      feedback = `You demonstrate understanding by including key concepts: ${keywordMatches.join(', ')}.`;
    } else if (normalizedAnswer.length > 10) {
      feedback = 'Your answer shows effort, but try to include more specific details and key terms.';
    } else {
      feedback = 'Your answer is too brief. Try to explain your thinking in more detail.';
    }
    
    return { showsUnderstanding, feedback };
  }
}
