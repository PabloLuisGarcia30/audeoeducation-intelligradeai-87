import { supabase } from "@/integrations/supabase/client";
import { skillClassificationService } from './skillClassification/SkillClassificationService';

export interface PracticeExerciseResult {
  exerciseId: string;
  studentId: string;
  skillName: string;
  skillType: 'content' | 'subject';
  score: number;
  questionsAnswered: number;
  totalQuestions: number;
  classId: string;
}

export class PracticeExerciseResultsService {
  /**
   * Save practice exercise results and update skill scores
   */
  static async savePracticeExerciseResults(result: PracticeExerciseResult): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('💾 Saving practice exercise results:', result);

      // Calculate points based on score and total questions
      const pointsEarned = Math.round((result.score / 100) * result.totalQuestions);
      const pointsPossible = result.totalQuestions;

      // 1. Create a test result record for this practice exercise
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .insert({
          student_id: result.studentId, // Legacy compatibility
          authenticated_student_id: result.studentId, // New auth-based column
          exam_id: `practice_exercise_${result.exerciseId}`,
          class_id: result.classId,
          overall_score: result.score,
          total_points_earned: pointsEarned,
          total_points_possible: pointsPossible,
          ai_feedback: `Practice exercise completed for ${result.skillName}`
        })
        .select('id')
        .single();

      if (testError) {
        console.error('❌ Error creating test result:', testError);
        throw new Error(`Failed to create test result: ${testError.message}`);
      }

      console.log('✅ Test result created:', testResult.id);

      // 2. Save the skill score to the appropriate table
      const skillTable = result.skillType === 'content' ? 'content_skill_scores' : 'subject_skill_scores';
      
      const { error: skillError } = await supabase
        .from(skillTable)
        .insert({
          test_result_id: testResult.id,
          practice_exercise_id: result.exerciseId,
          skill_name: result.skillName,
          score: result.score,
          points_earned: pointsEarned,
          points_possible: pointsPossible,
          student_id: result.studentId, // Legacy compatibility
          authenticated_student_id: result.studentId // New auth-based column
        });

      if (skillError) {
        console.error('❌ Error saving skill score:', skillError);
        throw new Error(`Failed to save skill score: ${skillError.message}`);
      }

      console.log(`✅ ${result.skillType} skill score saved for ${result.skillName}: ${result.score}%`);

      // 3. Update practice analytics
      await this.updatePracticeAnalytics(result.studentId, result.skillName, result.score);

      return { success: true };
    } catch (error) {
      console.error('❌ Error saving practice exercise results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update practice analytics for the student
   */
  private static async updatePracticeAnalytics(
    studentId: string,
    skillName: string,
    score: number
  ): Promise<void> {
    try {
      console.log('📊 Updating practice analytics for:', { studentId, skillName, score });

      // Get existing analytics
      const { data: existing, error: fetchError } = await supabase
        .from('student_practice_analytics')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_name', skillName)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching practice analytics:', fetchError);
        return;
      }

      if (existing) {
        // Update existing analytics
        const newBestScore = Math.max(existing.best_score || 0, score);
        const newTotalSessions = existing.total_practice_sessions + 1;
        const newAverageScore = ((existing.average_score || 0) * existing.total_practice_sessions + score) / newTotalSessions;

        const { error: updateError } = await supabase
          .from('student_practice_analytics')
          .update({
            best_score: newBestScore,
            average_score: newAverageScore,
            total_practice_sessions: newTotalSessions,
            last_practiced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating practice analytics:', updateError);
        } else {
          console.log('✅ Practice analytics updated successfully');
        }
      } else {
        // Create new analytics record
        const { error: insertError } = await supabase
          .from('student_practice_analytics')
          .insert({
            student_id: studentId,
            skill_name: skillName,
            best_score: score,
            average_score: score,
            total_practice_sessions: 1,
            last_practiced_at: new Date().toISOString(),
            streak_count: 1,
            improvement_rate: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating practice analytics:', insertError);
        } else {
          console.log('✅ Practice analytics created successfully');
        }
      }
    } catch (error) {
      console.error('❌ Error updating practice analytics:', error);
    }
  }

  /**
   * Determine skill type using centralized classification service
   */
  static async determineSkillType(studentId: string, skillName: string, exerciseData?: any): Promise<'content' | 'subject'> {
    try {
      return await skillClassificationService.classifySkill({
        skillName,
        studentId,
        exerciseData
      });
    } catch (error) {
      console.error('Error determining skill type:', error);
      return 'content'; // Default fallback
    }
  }
}
