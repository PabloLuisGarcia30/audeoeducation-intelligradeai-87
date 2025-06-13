import type { 
  UnifiedQuestionContext, 
  UnifiedGradingResult, 
  GradingContext 
} from '../types/UnifiedGradingTypes';
import { supabase } from '@/integrations/supabase/client';

export class PersistenceManager {
  async saveResults(
    results: UnifiedGradingResult[],
    context: GradingContext
  ): Promise<void> {
    try {
      await Promise.all([
        this.saveSkillScores(results, context),
        this.saveMisconceptionData(results, context)
      ]);
      
      console.log(`💾 Saved ${results.length} grading results to database`);
    } catch (error) {
      console.error('Failed to save grading results:', error);
      throw error;
    }
  }

  private async saveSkillScores(
    results: UnifiedGradingResult[],
    context: GradingContext
  ): Promise<void> {
    const contentSkillScores: any[] = [];
    const subjectSkillScores: any[] = [];

    for (const result of results) {
      for (const skill of result.skillMappings) {
        const scoreData = {
          student_id: context.studentId,
          authenticated_student_id: context.studentId,
          skill_name: skill.skillName,
          score: result.isCorrect ? 1 : 0,
          points_earned: result.isCorrect ? result.pointsPossible : 0,
          points_possible: result.pointsPossible,
          test_result_id: null // Will be set if test results are created
        };

        if (skill.skillType === 'content') {
          contentSkillScores.push(scoreData);
        } else if (skill.skillType === 'subject') {
          subjectSkillScores.push(scoreData);
        }
      }
    }

    // Save content skill scores
    if (contentSkillScores.length > 0) {
      const { error } = await supabase
        .from('content_skill_scores')
        .insert(contentSkillScores);
      
      if (error) {
        console.warn('Failed to save content skill scores:', error);
      }
    }

    // Save subject skill scores
    if (subjectSkillScores.length > 0) {
      const { error } = await supabase
        .from('subject_skill_scores')
        .insert(subjectSkillScores);
      
      if (error) {
        console.warn('Failed to save subject skill scores:', error);
      }
    }
  }

  private async saveMisconceptionData(
    results: UnifiedGradingResult[],
    context: GradingContext
  ): Promise<void> {
    for (const result of results) {
      if (result.misconceptionAnalysis && context.studentId) {
        try {
          // Import the existing misconception logging service
          const { MisconceptionLoggingService } = await import('../../misconceptionLoggingService');

          await MisconceptionLoggingService.logMCQMisconception({
            studentId: context.studentId,
            questionId: result.questionId,
            selectedOption: this.getOriginalStudentAnswer(result, context),
            misconceptionCategory: result.misconceptionAnalysis.categoryName || 'unknown',
            misconceptionSubtype: result.misconceptionAnalysis.subtypeName || 'unspecified',
            confidence: result.misconceptionAnalysis.confidence || 0.5,
            exerciseId: context.exerciseId,
            practiceSessionId: context.sessionId
          });

          console.log(`📝 Logged misconception for Q${result.questionNumber}: ${result.misconceptionAnalysis.categoryName}`);

        } catch (error) {
          console.warn(`Failed to log misconception for Q${result.questionNumber}:`, error);
        }
      }
    }
  }

  private getOriginalStudentAnswer(result: UnifiedGradingResult, context: GradingContext): string {
    // Try to get the original student answer from context if available
    // Otherwise fall back to extracting from reasoning or returning empty string
    return 'student_answer'; // This would need to be passed through the context
  }

  async validateSavedResults(
    results: UnifiedGradingResult[],
    context: GradingContext
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if skill scores were saved
      const skillQuestions = results.filter(r => r.skillMappings.length > 0);
      if (skillQuestions.length > 0) {
        const { data: skillScores, error: skillError } = await supabase
          .from('content_skill_scores')
          .select('skill_name')
          .eq('authenticated_student_id', context.studentId);

        if (skillError) {
          errors.push(`Skill scores validation failed: ${skillError.message}`);
        }
      }

      return {
        success: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}
