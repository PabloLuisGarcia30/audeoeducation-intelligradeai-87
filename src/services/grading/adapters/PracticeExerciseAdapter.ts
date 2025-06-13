
import type { 
  UnifiedQuestionContext, 
  GradingContext,
  LegacyPracticeExerciseAnswer,
  SessionType,
  GradingConfiguration
} from '../types/UnifiedGradingTypes';

export class PracticeExerciseAdapter {
  /**
   * Convert legacy PracticeExerciseAnswer format to UnifiedQuestionContext
   */
  static convertToUnifiedQuestions(
    answers: LegacyPracticeExerciseAnswer[],
    exerciseTitle: string,
    studentId?: string,
    sessionContext?: {
      sessionType: SessionType;
      sessionId: string;
      classId?: string;
      exerciseId?: string;
      subject?: string;
      grade?: string;
    }
  ): UnifiedQuestionContext[] {
    return answers.map((answer, index) => ({
      questionId: answer.questionId,
      questionNumber: index + 1,
      questionText: `Question ${index + 1} from ${exerciseTitle}`,
      questionType: answer.questionType as any,
      studentAnswer: answer.studentAnswer,
      correctAnswer: answer.correctAnswer,
      acceptableAnswers: answer.acceptableAnswers,
      pointsPossible: answer.points,
      options: answer.options,
      keywords: answer.keywords,
      skillContext: [], // Will be populated by skill mapping service
      examId: sessionContext?.exerciseId || exerciseTitle,
      studentId: studentId,
      subject: sessionContext?.subject,
      grade: sessionContext?.grade
    }));
  }

  /**
   * Create grading context for practice exercises
   */
  static createGradingContext(
    sessionType: SessionType,
    sessionId: string,
    studentId?: string,
    studentName?: string,
    exerciseId?: string,
    classId?: string,
    subject?: string,
    grade?: string,
    trailblazerSessionId?: string,
    customConfiguration?: Partial<GradingConfiguration>
  ): GradingContext {
    const defaultConfiguration: GradingConfiguration = {
      batchProcessing: {
        enabled: true,
        maxBatchSize: 5,
        timeout: 30000,
        priority: 'normal'
      },
      caching: {
        enabled: true,
        ttl: 3600000, // 1 hour
        skillAware: true
      },
      thresholds: {
        distilbertConfidence: 0.75,
        openaiEscalation: 0.85,
        complexityThreshold: 0.7
      },
      misconceptionAnalysis: {
        enabled: true,
        categories: ['procedural', 'conceptual', 'interpretive']
      },
      trailblazerIntegration: {
        enabled: sessionType === 'trailblazer',
        sessionId: trailblazerSessionId
      }
    };

    return {
      examId: exerciseId,
      studentId,
      studentName,
      exerciseId,
      sessionId,
      sessionType,
      classId,
      subject,
      grade,
      configuration: { ...defaultConfiguration, ...customConfiguration },
      sessionContext: {
        sessionType,
        sessionId,
        classId,
        trailblazerSessionId,
        practiceSessionId: sessionType === 'practice_exercise' ? sessionId : undefined
      }
    };
  }

  /**
   * Convert unified grading results back to legacy format for backward compatibility
   */
  static convertToLegacyResults(
    unifiedResults: any[],
    exerciseTitle: string
  ): any {
    const questionResults = unifiedResults.map(result => ({
      questionId: result.questionId,
      isCorrect: result.isCorrect,
      pointsEarned: result.pointsEarned,
      pointsPossible: result.pointsPossible,
      feedback: result.feedback || 'Answer processed',
      gradingMethod: result.gradingMethod,
      confidence: result.confidence,
      misconceptionAnalysis: result.misconceptionAnalysis
    }));

    const totalScore = unifiedResults.reduce((sum, r) => sum + r.pointsEarned, 0);
    const totalPossible = unifiedResults.reduce((sum, r) => sum + r.pointsPossible, 0);
    const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;

    return {
      totalScore,
      totalPossible,
      percentageScore,
      questionResults,
      overallFeedback: this.generateOverallFeedback(questionResults, percentageScore),
      completedAt: new Date(),
      trailblazerMisconceptions: unifiedResults
        .filter(r => r.misconceptionAnalysis?.misconceptionId)
        .map(r => r.misconceptionAnalysis.misconceptionId)
    };
  }

  private static generateOverallFeedback(
    questionResults: any[], 
    percentageScore: number
  ): string {
    const correctCount = questionResults.filter(q => q.isCorrect).length;
    const totalCount = questionResults.length;

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

    return feedback;
  }
}
