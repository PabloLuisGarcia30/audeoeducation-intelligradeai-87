import { supabase } from '@/integrations/supabase/client';
import { SmartAnswerGradingService, type GradingResult } from './smartAnswerGradingService';
import { MistakePatternService } from './mistakePatternService';
import { updateExerciseStatus } from './classSessionService';
import { trailblazerService } from './trailblazerService';

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
    misconceptionId?: string; // FIXED: Added misconceptionId property
  };
}

export interface ExerciseSubmissionResult {
  totalScore: number;
  totalPossible: number;
  percentageScore: number;
  totalCorrect?: number; // ✅ Added this property to fix the build error
  questionResults: QuestionResult[];
  overallFeedback: string;
  completedAt: Date;
  trailblazerMisconceptions?: string[]; // NEW: List of misconception IDs recorded
}

export class PracticeExerciseGradingService {
  /**
   * Grade a complete practice exercise submission with enhanced tracking and Trailblazer integration
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
    trailblazerSessionId?: string // Trailblazer session ID for integration
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
      const totalCorrect = questionResults.filter(q => q.isCorrect).length;

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
        totalCorrect, // ✅ Now properly included in interface
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
    gradingResult: GradingResult
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
    enhancedMetadata?: {
      subject?: string;
      grade?: string;
      exerciseType?: string;
      skillsTargeted?: string[];
    },
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

    // Add misconception insights
    if (misconceptionCount > 0) {
      feedback += ` Our analysis identified ${misconceptionCount} specific learning patterns that we can help you address.`;
    }

    // Add Trailblazer session context
    if (trailblazerSessionId) {
      feedback += " Your learning progress and any areas for improvement have been recorded in your learning session for personalized recommendations.";
    }

    // Add subject-specific encouragement
    if (enhancedMetadata?.subject) {
      feedback += ` Keep practicing ${enhancedMetadata.subject} - every attempt helps you learn!`;
    }

    return feedback;
  }

  /**
   * NEW: Grade an exercise submission specifically for Trailblazer sessions
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
      trailblazerSessionId
    );
  }
}
