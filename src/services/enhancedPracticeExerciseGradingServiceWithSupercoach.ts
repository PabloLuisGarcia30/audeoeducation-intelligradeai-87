
import { EnhancedPracticeExerciseGradingService } from './enhancedPracticeExerciseGradingService';
import { SupercoachService } from './supercoachService';
import type { PracticeExerciseAnswer, ExerciseSubmissionResult } from './practiceExerciseGradingService';
import type { BehaviorSignals } from './supercoachService';

export class EnhancedPracticeExerciseGradingServiceWithSupercoach extends EnhancedPracticeExerciseGradingService {
  /**
   * Grade exercise with integrated Supercoach predictive detection
   */
  static async gradeExerciseWithSupercoach(
    answers: PracticeExerciseAnswer[],
    exerciseTitle: string,
    exerciseId: string,
    studentId: string,
    behaviorData?: { [questionId: string]: BehaviorSignals },
    skillName?: string,
    enhancedMetadata?: {
      subject?: string;
      grade?: string;
      exerciseType?: string;
      skillsTargeted?: string[];
    },
    trailblazerSessionId?: string
  ): Promise<ExerciseSubmissionResult & { 
    misconceptionsLogged: number;
    predictiveAlerts: number;
    supercoachRecommendations: any[];
  }> {
    
    // Grade the exercise using the parent class method
    const result = await this.gradeExerciseWithMisconceptionTracking(
      answers,
      exerciseTitle,
      exerciseId,
      studentId,
      skillName,
      enhancedMetadata,
      trailblazerSessionId
    );

    let predictiveAlerts = 0;
    const supercoachRecommendations: any[] = [];

    // Run predictive analysis for each question if behavior data is available
    if (behaviorData) {
      for (const answer of answers) {
        const questionBehavior = behaviorData[answer.questionId];
        if (questionBehavior) {
          try {
            const prediction = await SupercoachService.detectPredictiveMisconception(
              studentId,
              answer.questionId,
              questionBehavior,
              {
                question_context: `Exercise: ${exerciseTitle}`,
                student_answer: answer.studentAnswer,
                exercise_type: enhancedMetadata?.exerciseType || 'practice',
                subject: enhancedMetadata?.subject
              },
              exerciseId,
              undefined // No exam_id for practice exercises
            );

            if (prediction?.predicted) {
              predictiveAlerts++;
              
              if (prediction.riskLevel === 'high' && prediction.misconceptionSubtypeId) {
                supercoachRecommendations.push({
                  questionId: answer.questionId,
                  misconceptionSubtypeId: prediction.misconceptionSubtypeId,
                  riskLevel: prediction.riskLevel,
                  confidence: prediction.confidence,
                  reasoning: prediction.reasoning,
                  suggestedIntervention: prediction.suggestedIntervention
                });
              }
            }
          } catch (error) {
            console.error(`Failed to run predictive analysis for question ${answer.questionId}:`, error);
          }
        }
      }
    }

    console.log(`🎯 Exercise grading with Supercoach completed: ${result.misconceptionsLogged} misconceptions, ${predictiveAlerts} predictive alerts`);

    return {
      ...result,
      predictiveAlerts,
      supercoachRecommendations
    };
  }

  /**
   * Generate comprehensive post-exercise recommendations
   */
  static async generatePostExerciseRecommendations(
    studentId: string,
    exerciseResults: ExerciseSubmissionResult,
    supercoachRecommendations: any[]
  ): Promise<{
    shouldGenerateMiniLesson: boolean;
    recommendedMisconceptions: string[];
    interventionSuggestions: string[];
  }> {
    try {
      // Analyze performance and recommendations
      const lowScoreThreshold = 60;
      // Fix: Use the correct property name from ExerciseSubmissionResult
      const hasLowScore = exerciseResults.score < lowScoreThreshold;
      const hasHighRiskAlerts = supercoachRecommendations.some(rec => rec.riskLevel === 'high');
      
      const shouldGenerateMiniLesson = hasLowScore || hasHighRiskAlerts;
      
      const recommendedMisconceptions = supercoachRecommendations
        .filter(rec => rec.riskLevel === 'high')
        .map(rec => rec.misconceptionSubtypeId)
        .slice(0, 3); // Limit to top 3

      const interventionSuggestions = supercoachRecommendations
        .map(rec => rec.suggestedIntervention)
        .filter(Boolean)
        .slice(0, 3);

      return {
        shouldGenerateMiniLesson,
        recommendedMisconceptions,
        interventionSuggestions
      };
    } catch (error) {
      console.error('Error generating post-exercise recommendations:', error);
      return {
        shouldGenerateMiniLesson: false,
        recommendedMisconceptions: [],
        interventionSuggestions: []
      };
    }
  }
}
