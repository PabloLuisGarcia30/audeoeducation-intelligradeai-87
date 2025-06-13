
import type { 
  UnifiedGradingResult, 
  UnifiedQuestionContext, 
  GradingContext,
  MisconceptionAnalysis 
} from '../types/UnifiedGradingTypes';

export class ResultProcessor {
  async processResult(
    result: UnifiedGradingResult,
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<UnifiedGradingResult> {
    // Enhance result with additional processing
    const enhancedResult = {
      ...result,
      feedback: this.generateFeedback(result, question, context),
      qualityFlags: {
        ...result.qualityFlags,
        confidenceAdjusted: this.shouldAdjustConfidence(result),
        reviewRequired: this.requiresReview(result)
      }
    };

    // Record misconception if detected and tracking is enabled
    if (context.configuration.misconceptionAnalysis?.enabled && 
        enhancedResult.misconceptionAnalysis) {
      await this.recordMisconception(enhancedResult, question, context);
    }

    return enhancedResult;
  }

  enhanceResult(result: UnifiedGradingResult, processingTime: number): UnifiedGradingResult {
    return {
      ...result,
      processingTimeMs: processingTime,
      qualityFlags: {
        ...result.qualityFlags,
        cacheHit: true
      }
    };
  }

  createFallbackResult(
    question: UnifiedQuestionContext,
    context: GradingContext,
    errorMessage: string,
    processingTime: number
  ): UnifiedGradingResult {
    return {
      questionId: question.questionId,
      questionNumber: question.questionNumber,
      isCorrect: false,
      pointsEarned: 0,
      pointsPossible: question.pointsPossible,
      confidence: 0.1,
      gradingMethod: 'exact_match',
      reasoning: `Fallback result due to error: ${errorMessage}`,
      feedback: 'Unable to grade this question automatically. Manual review required.',
      processingTimeMs: processingTime,
      skillMappings: question.skillContext || [],
      qualityFlags: {
        fallbackUsed: true,
        reviewRequired: true,
        confidenceAdjusted: true
      }
    };
  }

  private generateFeedback(
    result: UnifiedGradingResult,
    question: UnifiedQuestionContext,
    context: GradingContext
  ): string {
    if (result.feedback) {
      return result.feedback; // Use existing feedback if provided
    }

    if (result.isCorrect) {
      return 'Correct! Well done.';
    }

    let feedback = 'This answer is not correct. ';

    // Add specific feedback based on misconception analysis
    if (result.misconceptionAnalysis) {
      feedback += `This appears to be a ${result.misconceptionAnalysis.categoryName} error. `;
      if (result.misconceptionAnalysis.reasoning) {
        feedback += result.misconceptionAnalysis.reasoning;
      }
    } else {
      feedback += 'Please review the correct answer and try to understand the difference.';
    }

    return feedback;
  }

  private shouldAdjustConfidence(result: UnifiedGradingResult): boolean {
    return result.confidence < 0.7 || 
           result.qualityFlags?.fallbackUsed === true ||
           result.gradingMethod === 'exact_match' && !result.isCorrect;
  }

  private requiresReview(result: UnifiedGradingResult): boolean {
    return result.confidence < 0.5 || 
           result.qualityFlags?.fallbackUsed === true ||
           (result.misconceptionAnalysis?.confidence || 0) < 0.6;
  }

  private async recordMisconception(
    result: UnifiedGradingResult,
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<void> {
    try {
      if (!result.misconceptionAnalysis || !context.studentId) {
        return;
      }

      // Import the existing misconception logging service
      const { MisconceptionLoggingService } = await import('../../misconceptionLoggingService');

      await MisconceptionLoggingService.logMisconception({
        studentId: context.studentId,
        questionId: question.questionId,
        misconceptionCategory: result.misconceptionAnalysis.categoryName || 'Unknown',
        misconceptionSubtype: result.misconceptionAnalysis.subtypeName || 'General',
        confidence: result.misconceptionAnalysis.confidence || 0.5,
        context: {
          examId: context.examId,
          exerciseId: context.exerciseId,
          sessionId: context.sessionId,
          questionType: question.questionType,
          studentAnswer: question.studentAnswer,
          correctAnswer: question.correctAnswer
        }
      });

      console.log(`📝 Misconception recorded for Q${question.questionNumber}: ${result.misconceptionAnalysis.categoryName}`);

    } catch (error) {
      console.warn('Failed to record misconception:', error);
    }
  }
}
