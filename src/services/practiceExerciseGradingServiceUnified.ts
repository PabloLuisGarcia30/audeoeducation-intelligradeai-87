
import { gradeBatchUnified } from './grading/UnifiedBatchGradingService';
import { QuestionInput, GradedAnswer } from './grading/types';
import type { PracticeExerciseAnswer, ExerciseSubmissionResult } from './practiceExerciseGradingService';

export interface PracticeExerciseGradingResult extends ExerciseSubmissionResult {
  misconceptionsLogged: number;
  unifiedGradingUsed: boolean;
  cacheHits: number;
  processingTime: number;
}

/**
 * Unified practice exercise grading service using the new batch grading system
 */
export class PracticeExerciseGradingServiceUnified {
  
  /**
   * Grade practice exercise using unified batch grading system
   */
  static async gradeExerciseSubmission(
    answers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    exerciseId?: string,
    skillName?: string,
    enhancedMetadata?: {
      subject?: string;
      grade?: string;
      exerciseType?: string;
      skillsTargeted?: string[];
    },
    trailblazerSessionId?: string
  ): Promise<PracticeExerciseGradingResult> {
    
    const startTime = Date.now();
    console.log(`🎯 Starting unified grading for exercise: ${exerciseTitle}`);

    // Convert PracticeExerciseAnswer to QuestionInput format
    const questions: QuestionInput[] = answers.map((answer, index) => ({
      id: answer.questionId || `q${index + 1}`,
      prompt: answer.studentAnswer || `Question ${index + 1}`, // Use studentAnswer as prompt for now
      studentAnswer: answer.studentAnswer || '',
      skillTags: enhancedMetadata?.skillsTargeted || [skillName || 'general'],
      correctAnswer: answer.correctAnswer || '',
      pointsPossible: answer.points || 1,
      questionType: answer.questionType || 'multiple-choice',
      metadata: {
        exerciseId,
        exerciseTitle,
        trailblazerSessionId,
        enhancedMetadata
      }
    }));

    // Use unified batch grading
    const gradingResult = await gradeBatchUnified(questions);
    
    // Calculate exercise metrics
    const totalCorrect = gradingResult.results.filter(r => r.isCorrect).length;
    const totalPointsEarned = gradingResult.results.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
    const totalPointsPossible = gradingResult.results.reduce((sum, r) => sum + (r.pointsPossible || 1), 0);
    const percentageScore = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;

    // Calculate cache hits (from cached results)
    const cacheHits = gradingResult.results.filter(r => r.qualityFlags?.cacheHit).length;
    
    // Count misconceptions detected
    const misconceptionsLogged = gradingResult.results.filter(r => r.misconceptionDetected).length;

    const processingTime = Date.now() - startTime;

    console.log(`✅ Unified grading complete: ${totalCorrect}/${answers.length} correct, ${percentageScore.toFixed(1)}% score, ${cacheHits} cache hits`);

    return {
      correctAnswers: totalCorrect,
      percentageScore,
      totalPointsEarned,
      totalPointsPossible,
      gradingResults: gradingResult.results,
      processingTime: gradingResult.metadata?.processingTime || processingTime,
      averageConfidence: gradingResult.metadata?.averageConfidence || 0,
      misconceptionsLogged,
      unifiedGradingUsed: true,
      cacheHits,
      exerciseMetadata: {
        exerciseId,
        exerciseTitle,
        skillName,
        enhancedMetadata,
        trailblazerSessionId,
        gradingMethod: 'unified_batch',
        fallbackUsed: gradingResult.metadata?.fallbackUsed || false
      }
    };
  }

  /**
   * Grade single question using unified system (for real-time feedback)
   */
  static async gradeSingleQuestion(
    questionData: {
      questionId: string;
      questionText: string;
      studentAnswer: string;
      correctAnswer: string;
      skillTags: string[];
      points?: number;
    }
  ): Promise<GradedAnswer> {
    
    const question: QuestionInput = {
      id: questionData.questionId,
      prompt: questionData.questionText,
      studentAnswer: questionData.studentAnswer,
      skillTags: questionData.skillTags,
      correctAnswer: questionData.correctAnswer,
      pointsPossible: questionData.points || 1,
      questionType: 'single-question'
    };

    const result = await gradeBatchUnified([question]);
    return result.results[0];
  }

  /**
   * Get grading performance metrics
   */
  static async getGradingMetrics(): Promise<{
    totalRequests: number;
    cacheHitRate: number;
    averageProcessingTime: number;
    distilbertUsage: number;
    openaiUsage: number;
  }> {
    // This would integrate with cache stats and performance monitoring
    // For now, return mock data structure
    return {
      totalRequests: 0,
      cacheHitRate: 0,
      averageProcessingTime: 0,
      distilbertUsage: 0,
      openaiUsage: 0
    };
  }
}
