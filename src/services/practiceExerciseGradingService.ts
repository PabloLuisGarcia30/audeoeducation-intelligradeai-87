import { supabase } from '@/integrations/supabase/client';
import { SmartAnswerGradingService, type GradingResult } from './smartAnswerGradingService';
import { MistakePatternService } from './mistakePatternService';
import { updateExerciseStatus } from './classSessionService';
import { trailblazerService } from './trailblazerService';
import { UnifiedGradingService } from './grading/core/UnifiedGradingService';
import { PracticeExerciseAdapter } from './grading/adapters/PracticeExerciseAdapter';
import type { SessionType } from './grading/types/UnifiedGradingTypes';

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

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
  gradingMethod: 'exact_match' | 'flexible_match' | 'ai_graded';
  confidence: number;
  misconceptionAnalysis?: {
    categoryName?: string;
    subtypeName?: string;
    confidence?: number;
    reasoning?: string;
    misconceptionId?: string;
  };
}

export interface ExerciseSubmissionResult {
  totalScore: number;
  totalPossible: number;
  percentageScore: number;
  questionResults: QuestionResult[];
  overallFeedback: string;
  completedAt: Date;
  trailblazerMisconceptions?: string[];
}

export class PracticeExerciseGradingService {
  /**
   * Grade a complete practice exercise submission using the unified grading system
   */
  static async gradeExerciseSubmission(
    answers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    studentExerciseId?: string,
    skillName?: string,
    enhancedMetadata?: {
      subject?: string;
      grade?: string;
      exerciseType?: string;
      skillsTargeted?: string[];
    },
    trailblazerSessionId?: string,
    sessionType: SessionType = 'practice_exercise',
    studentId?: string,
    classId?: string
  ): Promise<ExerciseSubmissionResult> {
    try {
      console.log(`🎯 Unified grading: "${exerciseTitle}" with ${answers.length} questions`);
      if (trailblazerSessionId) {
        console.log(`🧠 Trailblazer session integration: ${trailblazerSessionId}`);
      }

      // Convert legacy format to unified format
      const unifiedQuestions = PracticeExerciseAdapter.convertToUnifiedQuestions(
        answers,
        exerciseTitle,
        studentId,
        {
          sessionType,
          sessionId: trailblazerSessionId || studentExerciseId || 'practice',
          classId,
          exerciseId: studentExerciseId,
          subject: enhancedMetadata?.subject,
          grade: enhancedMetadata?.grade
        }
      );

      // Create grading context
      const gradingContext = PracticeExerciseAdapter.createGradingContext(
        sessionType,
        trailblazerSessionId || studentExerciseId || 'practice',
        studentId,
        'student', // Default name
        studentExerciseId,
        classId,
        enhancedMetadata?.subject,
        enhancedMetadata?.grade,
        trailblazerSessionId
      );

      // Use unified grading system for batch processing
      const batchRequest = {
        questions: unifiedQuestions,
        context: gradingContext,
        priority: 'normal' as const
      };

      const batchResult = await UnifiedGradingService.gradeBatch(batchRequest);
      
      // Convert back to legacy format for backward compatibility
      const legacyResult = PracticeExerciseAdapter.convertToLegacyResults(
        batchResult.results,
        exerciseTitle
      );

      // Continue with legacy misconception tracking for now
      await this.recordLegacyMistakePatterns(
        batchResult.results,
        answers,
        exerciseTitle,
        studentExerciseId,
        skillName,
        enhancedMetadata
      );

      // Handle trailblazer misconceptions
      if (trailblazerSessionId) {
        await this.recordTrailblazerMisconceptions(
          batchResult.results,
          trailblazerSessionId
        );
      }

      // Update exercise status if we have a student exercise ID
      if (studentExerciseId) {
        await updateExerciseStatus(studentExerciseId, 'completed', legacyResult.percentageScore);
      }

      console.log(`✅ Unified grading completed: ${legacyResult.totalScore}/${legacyResult.totalPossible} points (${legacyResult.percentageScore.toFixed(1)}%)`);

      return legacyResult;

    } catch (error) {
      console.error('❌ Critical error in unified exercise grading:', error);
      
      // Fallback to legacy grading if unified system fails
      console.log('🔄 Falling back to legacy grading system...');
      return this.legacyGradeExerciseSubmission(
        answers,
        exerciseTitle,
        studentExerciseId,
        skillName,
        enhancedMetadata,
        trailblazerSessionId
      );
    }
  }

  /**
   * Record mistake patterns using existing legacy system for backward compatibility
   */
  private static async recordLegacyMistakePatterns(
    unifiedResults: any[],
    originalAnswers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    studentExerciseId?: string,
    skillName?: string,
    enhancedMetadata?: any
  ): Promise<void> {
    if (!studentExerciseId) return;

    for (let i = 0; i < unifiedResults.length; i++) {
      const result = unifiedResults[i];
      const originalAnswer = originalAnswers[i];

      if (!result || !originalAnswer) continue;

      const mistakeData = {
        studentExerciseId,
        questionId: result.questionId,
        questionNumber: i + 1,
        questionType: originalAnswer.questionType,
        studentAnswer: originalAnswer.studentAnswer,
        correctAnswer: originalAnswer.correctAnswer,
        isCorrect: result.isCorrect,
        skillTargeted: skillName || 'Unknown',
        mistakeType: result.isCorrect ? undefined : this.determineMistakeType(originalAnswer, result),
        confidenceScore: result.confidence,
        gradingMethod: result.gradingMethod,
        feedbackGiven: result.feedback,
        questionContext: `Question ${i + 1} from exercise: ${exerciseTitle}`,
        subject: enhancedMetadata?.subject,
        grade: enhancedMetadata?.grade,
        misconceptionCategory: result.misconceptionAnalysis?.categoryName,
        conceptMissedDescription: result.misconceptionAnalysis?.subtypeName
      };

      try {
        await MistakePatternService.recordMistakePattern(mistakeData);
      } catch (error) {
        console.warn(`Failed to record mistake pattern for question ${i + 1}:`, error);
      }
    }
  }

  /**
   * Record trailblazer misconceptions from unified results
   */
  private static async recordTrailblazerMisconceptions(
    unifiedResults: any[],
    trailblazerSessionId: string
  ): Promise<void> {
    for (let i = 0; i < unifiedResults.length; i++) {
      const result = unifiedResults[i];
      
      if (!result.isCorrect && result.misconceptionAnalysis?.misconceptionId) {
        try {
          await trailblazerService.recordSessionMisconception(
            trailblazerSessionId,
            result.misconceptionAnalysis.misconceptionId,
            i + 1
          );
        } catch (error) {
          console.warn(`Failed to record trailblazer misconception for question ${i + 1}:`, error);
        }
      }
    }
  }

  /**
   * Legacy grading fallback method (original implementation)
   */
  private static async legacyGradeExerciseSubmission(
    answers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    studentExerciseId?: string,
    skillName?: string,
    enhancedMetadata?: any,
    trailblazerSessionId?: string
  ): Promise<ExerciseSubmissionResult> {
    try {
      console.log(`🎯 Grading exercise submission: "${exerciseTitle}" with ${answers.length} questions`);
      if (trailblazerSessionId) {
        console.log(`🧠 Trailblazer session integration enabled: ${trailblazerSessionId}`);
      }

      const questionResults: QuestionResult[] = [];
      const trailblazerMisconceptions: string[] = [];
      let totalScore = 0;
      let totalPossible = 0;

      // Grade each question
      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        totalPossible += answer.points;

        console.log(`📝 Grading question ${i + 1}: ${answer.questionType}`);

        try {
          let gradingResult: GradingResult;

          if (answer.questionType === 'multiple-choice') {
            gradingResult = this.gradeMultipleChoice(answer);
          } else if (answer.questionType === 'true-false') {
            gradingResult = this.gradeTrueFalse(answer);
          } else if (answer.questionType === 'short-answer' || answer.questionType === 'essay') {
            gradingResult = await SmartAnswerGradingService.gradeShortAnswer(
              answer.studentAnswer,
              answer.correctAnswer,
              `Question ${i + 1}`,
              answer.questionId,
              enhancedMetadata?.subject,
              answer.questionType
            );
          } else {
            gradingResult = {
              isCorrect: false,
              score: 0,
              confidence: 0,
              feedback: 'Unsupported question type',
              method: 'exact_match'
            };
          }

          const pointsEarned = Math.round(gradingResult.score * answer.points);
          totalScore += pointsEarned;

          const questionResult: QuestionResult = {
            questionId: answer.questionId,
            isCorrect: gradingResult.isCorrect,
            pointsEarned,
            pointsPossible: answer.points,
            feedback: gradingResult.feedback || 'Answer processed',
            gradingMethod: gradingResult.method,
            confidence: gradingResult.confidence,
            misconceptionAnalysis: gradingResult.misconceptionAnalysis
          };

          questionResults.push(questionResult);

          // Record mistake pattern with enhanced tracking and Trailblazer context
          if (studentExerciseId) {
            const mistakeData = {
              studentExerciseId,
              questionId: answer.questionId,
              questionNumber: i + 1,
              questionType: answer.questionType,
              studentAnswer: answer.studentAnswer,
              correctAnswer: answer.correctAnswer,
              isCorrect: gradingResult.isCorrect,
              skillTargeted: skillName || 'Unknown',
              mistakeType: gradingResult.isCorrect ? undefined : this.determineMistakeType(answer, gradingResult),
              confidenceScore: gradingResult.confidence,
              gradingMethod: gradingResult.method,
              feedbackGiven: gradingResult.feedback,
              questionContext: `Question ${i + 1} from exercise: ${exerciseTitle}`,
              subject: enhancedMetadata?.subject,
              grade: enhancedMetadata?.grade,
              misconceptionCategory: gradingResult.misconceptionAnalysis?.categoryName,
              conceptMissedDescription: gradingResult.misconceptionAnalysis?.subtypeName
            };

            await MistakePatternService.recordMistakePattern(mistakeData);
          }

          // NEW: Record misconception in Trailblazer session if applicable
          // For now, we'll use a placeholder misconception ID based on the analysis
          if (trailblazerSessionId && !gradingResult.isCorrect && gradingResult.misconceptionAnalysis) {
            try {
              // Generate a unique misconception identifier based on the analysis
              const misconceptionId = `${gradingResult.misconceptionAnalysis.categoryName || 'unknown'}_${gradingResult.misconceptionAnalysis.subtypeName || 'general'}_${Date.now()}`;
              
              await trailblazerService.recordSessionMisconception(
                trailblazerSessionId,
                misconceptionId,
                i + 1 // question sequence
              );
              
              trailblazerMisconceptions.push(misconceptionId);
              
              // Update the question result with the generated misconception ID
              if (questionResult.misconceptionAnalysis) {
                questionResult.misconceptionAnalysis = {
                  ...questionResult.misconceptionAnalysis,
                  misconceptionId: misconceptionId
                };
              }
              
              console.log(`🧠 Recorded misconception ${misconceptionId} for Trailblazer session ${trailblazerSessionId}`);
            } catch (error) {
              console.error('Error recording Trailblazer misconception:', error);
            }
          }

          console.log(`✅ Question ${i + 1} graded: ${gradingResult.isCorrect ? 'Correct' : 'Incorrect'} (${pointsEarned}/${answer.points} points)`);
          
        } catch (error) {
          console.error(`❌ Error grading question ${i + 1}:`, error);
          
          const questionResult: QuestionResult = {
            questionId: answer.questionId,
            isCorrect: false,
            pointsEarned: 0,
            pointsPossible: answer.points,
            feedback: 'Error occurred during grading',
            gradingMethod: 'exact_match',
            confidence: 0
          };
          
          questionResults.push(questionResult);
        }
      }

      const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;

      // Update exercise status if we have a student exercise ID
      if (studentExerciseId) {
        await updateExerciseStatus(studentExerciseId, 'completed', percentageScore);
      }

      // Generate overall feedback with Trailblazer context
      const overallFeedback = this.generateOverallFeedback(
        questionResults, 
        percentageScore, 
        enhancedMetadata,
        trailblazerSessionId
      );

      console.log(`🎯 Exercise grading completed: ${totalScore}/${totalPossible} points (${percentageScore.toFixed(1)}%)`);
      if (trailblazerSessionId && trailblazerMisconceptions.length > 0) {
        console.log(`🧠 Recorded ${trailblazerMisconceptions.length} misconceptions in Trailblazer session: ${trailblazerSessionId}`);
      }

      return {
        totalScore,
        totalPossible,
        percentageScore,
        questionResults,
        overallFeedback,
        completedAt: new Date(),
        trailblazerMisconceptions: trailblazerMisconceptions.length > 0 ? trailblazerMisconceptions : undefined
      };

    } catch (error) {
      console.error('❌ Critical error in exercise grading:', error);
      throw error;
    }
  }

  /**
   * Grade a multiple-choice question
   */
  private static gradeMultipleChoice(answer: PracticeExerciseAnswer): GradingResult {
    const isCorrect = answer.studentAnswer === answer.correctAnswer;
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      confidence: 0.95,
      feedback: isCorrect ? 'Correct!' : 'Incorrect. Please review the correct answer.',
      method: 'exact_match'
    };
  }

  /**
   * Grade a true-false question
   */
  private static gradeTrueFalse(answer: PracticeExerciseAnswer): GradingResult {
    const isCorrect = answer.studentAnswer === answer.correctAnswer;
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      confidence: 0.9,
      feedback: isCorrect ? 'Correct!' : 'Incorrect. Review the material to understand why.',
      method: 'exact_match'
    };
  }

  /**
   * Determine mistake type based on question and grading result
   */
  private static determineMistakeType(
    answer: PracticeExerciseAnswer,
    gradingResult: any
  ): string {
    if (gradingResult.misconceptionAnalysis?.categoryName) {
      return gradingResult.misconceptionAnalysis.categoryName;
    }

    switch (answer.questionType) {
      case 'multiple-choice':
        return 'wrong_option_selected';
      case 'true-false':
        return 'incorrect_true_false';
      case 'short-answer':
      case 'essay':
        return 'incorrect_short_answer';
      default:
        return 'unknown_error';
    }
  }

  /**
   * Generate overall feedback with enhanced context and Trailblazer integration
   */
  private static generateOverallFeedback(
    questionResults: QuestionResult[], 
    percentageScore: number,
    enhancedMetadata?: any,
    trailblazerSessionId?: string
  ): string {
    const correctCount = questionResults.filter(q => q.isCorrect).length;
    const totalCount = questionResults.length;
    const misconceptionCount = questionResults.filter(q => q.misconceptionAnalysis).length;

    let feedback = `You answered ${correctCount} out of ${totalCount} questions correctly (${percentageScore.toFixed(1)}%). `;

    if (percentageScore >= 90) {
      feedback += "Excellent work! You've demonstrated strong mastery of these concepts.";
    } else if (percentageScore >= 70) {
      feedback += "Good job! You're showing solid understanding with room for some improvement.";
    } else if (percentageScore >= 50) {
      feedback += "You're making progress, but there are some areas that need more practice.";
    } else {
      feedback += "This material needs more review. Don't worry - targeted practice will help you improve.";
    }

    if (misconceptionCount > 0) {
      feedback += ` Our analysis identified ${misconceptionCount} specific learning patterns that we can help you address.`;
    }

    if (trailblazerSessionId) {
      feedback += " Your learning progress and any areas for improvement have been recorded in your learning session for personalized recommendations.";
    }

    if (enhancedMetadata?.subject) {
      feedback += ` Keep practicing ${enhancedMetadata.subject} - every attempt helps you learn!`;
    }

    return feedback;
  }

  /**
   * NEW: Grade an exercise submission specifically for Trailblazer sessions using unified system
   * This is a convenience method that automatically handles Trailblazer integration
   */
  static async gradeTrailblazerExercise(
    answers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    trailblazerSessionId: string,
    skillName: string,
    subject?: string,
    grade?: string
  ): Promise<ExerciseSubmissionResult> {
    return this.gradeExerciseSubmission(
      answers,
      exerciseTitle,
      undefined, // No student exercise ID for Trailblazer
      skillName,
      {
        subject,
        grade,
        exerciseType: 'trailblazer_practice',
        skillsTargeted: [skillName]
      },
      trailblazerSessionId,
      'trailblazer'
    );
  }

  /**
   * Grade an exercise submission for class sessions using unified system
   */
  static async gradeClassExercise(
    answers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    classSessionId: string,
    studentId: string,
    classId: string,
    skillName: string,
    subject?: string,
    grade?: string
  ): Promise<ExerciseSubmissionResult> {
    return this.gradeExerciseSubmission(
      answers,
      exerciseTitle,
      undefined,
      skillName,
      {
        subject,
        grade,
        exerciseType: 'class_session',
        skillsTargeted: [skillName]
      },
      classSessionId,
      'class_session',
      studentId,
      classId
    );
  }
}
