
import { PracticeExerciseGradingService, type PracticeExerciseAnswer, type ExerciseSubmissionResult } from './practiceExerciseGradingService';
import { MisconceptionLoggingService } from './misconceptionLoggingService';
import { EnhancedPracticeAnswerKeyService } from './enhancedPracticeAnswerKeyService';

export class EnhancedPracticeExerciseGradingService extends PracticeExerciseGradingService {
  /**
   * Grade exercise submission with enhanced misconception tracking using unified system
   */
  static async gradeExerciseWithMisconceptionTracking(
    answers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    exerciseId: string,
    studentId: string,
    skillName?: string,
    enhancedMetadata?: {
      subject?: string;
      grade?: string;
      exerciseType?: string;
      skillsTargeted?: string[];
    },
    trailblazerSessionId?: string
  ): Promise<ExerciseSubmissionResult & { misconceptionsLogged: number }> {
    
    // Get the enhanced answer key with misconception data
    const answerKey = await EnhancedPracticeAnswerKeyService.getEnhancedAnswerKey(exerciseId);
    let misconceptionsLogged = 0;

    // Use the unified grading system via parent class
    const result = await this.gradeExerciseSubmission(
      answers,
      exerciseTitle,
      undefined,
      skillName,
      enhancedMetadata,
      trailblazerSessionId,
      trailblazerSessionId ? 'trailblazer' : 'practice_exercise',
      studentId
    );

    // Log misconceptions for incorrect MCQ answers using existing service
    if (answerKey?.questions) {
      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        const question = answerKey.questions.find(q => q.id === answer.questionId);
        
        if (question && 
            question.type === 'multiple-choice' && 
            question.choiceMisconceptions &&
            answer.studentAnswer !== question.correctAnswer) {
          
          try {
            await MisconceptionLoggingService.logMCQMisconception({
              studentId,
              questionId: answer.questionId,
              selectedOption: this.getOptionLabel(answer.studentAnswer, question.options || []),
              exerciseId,
              practiceSessionId: trailblazerSessionId
            });
            misconceptionsLogged++;
          } catch (error) {
            console.error(`Failed to log misconception for question ${answer.questionId}:`, error);
          }
        }
      }
    }

    console.log(`🎯 Enhanced exercise grading completed with ${misconceptionsLogged} misconceptions logged`);

    return {
      ...result,
      misconceptionsLogged
    };
  }

  /**
   * Helper method to get option label (A, B, C, D) from student answer
   */
  private static getOptionLabel(studentAnswer: string, options: string[]): string {
    const index = options.indexOf(studentAnswer);
    return index >= 0 ? String.fromCharCode(65 + index) : 'A'; // Default to A if not found
  }

  /**
   * Get misconception feedback for a specific question and answer
   */
  static async getMisconceptionFeedback(
    exerciseId: string,
    questionId: string,
    selectedAnswer: string
  ): Promise<any> {
    try {
      const answerKey = await EnhancedPracticeAnswerKeyService.getEnhancedAnswerKey(exerciseId);
      
      if (!answerKey?.questions) {
        return null;
      }

      const question = answerKey.questions.find(q => q.id === questionId);
      if (!question || !question.choiceMisconceptions) {
        return null;
      }

      // Find the option label for the selected answer
      const optionIndex = question.options?.indexOf(selectedAnswer);
      if (optionIndex === undefined || optionIndex < 0) {
        return null;
      }

      const optionLabel = String.fromCharCode(65 + optionIndex);
      const misconceptionData = question.choiceMisconceptions[optionLabel];

      if (misconceptionData && !misconceptionData.correct) {
        return {
          misconceptionCategory: misconceptionData.misconceptionCategory,
          misconceptionSubtype: misconceptionData.misconceptionSubtype,
          description: misconceptionData.description,
          confidence: misconceptionData.confidence
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting misconception feedback:', error);
      return null;
    }
  }
}
