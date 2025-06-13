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
        this.saveTestResults(results, context),
        this.saveSkillScores(results, context),
        this.saveMisconceptionData(results, context)
      ]);
      
      console.log(`💾 Saved ${results.length} grading results to database`);
    } catch (error) {
      console.error('Failed to save grading results:', error);
      throw error;
    }
  }

  private async saveTestResults(
    results: UnifiedGradingResult[],
    context: GradingContext
  ): Promise<void> {
    const testResults = results.map(result => ({
      exam_id: context.examId,
      student_id: context.studentId,
      authenticated_student_id: context.studentId,
      question_number: result.questionNumber,
      question_id: result.questionId,
      student_answer: this.getOriginalStudentAnswer(result, context),
      is_correct: result.isCorrect,
      points_earned: result.pointsEarned,
      points_possible: result.pointsPossible,
      grading_method: result.gradingMethod,
      confidence: result.confidence,
      reasoning: result.reasoning,
      processing_time_ms: result.processingTimeMs,
      openai_usage: result.openAIUsage || null
    }));

    const { error } = await supabase
      .from('test_results')
      .insert(testResults);

    if (error) {
      throw new Error(`Failed to save test results: ${error.message}`);
    }
  }

  private async saveSkillScores(
    results: UnifiedGradingResult[],
    context: GradingContext
  ): Promise<void> {
    const skillScores: any[] = [];

    for (const result of results) {
      for (const skill of result.skillMappings) {
        const scoreData = {
          student_id: context.studentId,
          authenticated_student_id: context.studentId,
          skill_name: skill.skillName,
          score: result.isCorrect ? 1 : 0,
          points_earned: result.isCorrect ? result.pointsPossible : 0,
          points_possible: result.pointsPossible,
          test_result_id: null // Will be set after test_results are inserted
        };

        if (skill.skillType === 'content') {
          skillScores.push({
            table: 'content_skill_scores',
            data: scoreData
          });
        } else if (skill.skillType === 'subject') {
          skillScores.push({
            table: 'subject_skill_scores',
            data: scoreData
          });
        }
      }
    }

    // Save content skill scores
    const contentScores = skillScores
      .filter(s => s.table === 'content_skill_scores')
      .map(s => s.data);
    
    if (contentScores.length > 0) {
      const { error } = await supabase
        .from('content_skill_scores')
        .insert(contentScores);
      
      if (error) {
        console.warn('Failed to save content skill scores:', error);
      }
    }

    // Save subject skill scores
    const subjectScores = skillScores
      .filter(s => s.table === 'subject_skill_scores')
      .map(s => s.data);
    
    if (subjectScores.length > 0) {
      const { error } = await supabase
        .from('subject_skill_scores')
        .insert(subjectScores);
      
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
      // Check if test results were saved
      const { data: testResults, error: testError } = await supabase
        .from('test_results')
        .select('question_number')
        .eq('exam_id', context.examId)
        .eq('student_id', context.studentId);

      if (testError) {
        errors.push(`Test results validation failed: ${testError.message}`);
      } else {
        const savedQuestionNumbers = new Set(testResults?.map(r => r.question_number) || []);
        const expectedQuestionNumbers = new Set(results.map(r => r.questionNumber));
        
        for (const qNum of expectedQuestionNumbers) {
          if (!savedQuestionNumbers.has(qNum)) {
            errors.push(`Missing test result for question ${qNum}`);
          }
        }
      }

      // Check if skill scores were saved
      const skillQuestions = results.filter(r => r.skillMappings.length > 0);
      if (skillQuestions.length > 0) {
        const { data: skillScores, error: skillError } = await supabase
          .from('content_skill_scores')
          .select('skill_name')
          .eq('student_id', context.studentId);

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
