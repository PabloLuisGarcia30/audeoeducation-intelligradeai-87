
import { supabase } from "@/integrations/supabase/client";
import { DEV_CONFIG, MOCK_USER_DATA } from "@/config/devConfig";

export interface PracticeExerciseResult {
  sessionId: string;
  finalScore: number;
  improvement: number;
  questionsAnswered: number;
  timeSpent: number;
  skillScoreUpdates: Array<{
    skillName: string;
    oldScore: number;
    newScore: number;
    improvement: number;
  }>;
}

export class PracticeExerciseService {
  // Complete a practice session and save results
  static async completePracticeSession(
    sessionId: string,
    finalScore: number,
    improvement: number,
    questionsAnswered: number = 4,
    timeSpent: number = 300 // 5 minutes default
  ): Promise<PracticeExerciseResult> {
    try {
      console.log('🎯 Completing practice session:', {
        sessionId,
        finalScore,
        improvement,
        questionsAnswered,
        timeSpent
      });

      // Update the practice session with completion data
      const { data: updatedSession, error: updateError } = await supabase
        .from('student_practice_sessions')
        .update({
          completed_at: new Date().toISOString(),
          final_score: finalScore,
          improvement_shown: improvement,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Error updating practice session:', updateError);
        throw new Error(`Failed to update practice session: ${updateError.message}`);
      }

      console.log('✅ Practice session updated successfully:', updatedSession);

      // Create skill score updates
      const skillScoreUpdates = [{
        skillName: updatedSession.skill_name,
        oldScore: updatedSession.current_skill_score,
        newScore: finalScore,
        improvement: improvement
      }];

      // Save new skill scores to content_skill_scores table with proper linking
      await this.saveSkillScoreUpdate(
        updatedSession.student_id,
        updatedSession.skill_name,
        finalScore,
        improvement,
        sessionId
      );

      return {
        sessionId,
        finalScore,
        improvement,
        questionsAnswered,
        timeSpent,
        skillScoreUpdates
      };
    } catch (error) {
      console.error('❌ Error completing practice session:', error);
      throw error;
    }
  }

  // Save skill score update to database
  static async saveSkillScoreUpdate(
    studentId: string,
    skillName: string,
    newScore: number,
    improvement: number,
    sessionId: string
  ): Promise<void> {
    try {
      // Check if we're working with Pablo Luis Garcia (our test case)
      const isPablo = studentId === 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26';
      
      console.log('💾 Saving skill score update:', {
        studentId,
        skillName,
        newScore,
        improvement,
        sessionId,
        isPablo
      });

      // Insert new content skill score record
      const { data: skillScore, error: skillError } = await supabase
        .from('content_skill_scores')
        .insert({
          student_id: studentId,
          skill_name: skillName,
          score: newScore,
          points_earned: Math.round(newScore),
          points_possible: 100,
          practice_exercise_id: sessionId,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (skillError) {
        console.error('❌ Error saving skill score:', skillError);
        throw new Error(`Failed to save skill score: ${skillError.message}`);
      }

      console.log('✅ Skill score saved successfully:', skillScore);

      // Update student practice analytics
      await this.updatePracticeAnalytics(studentId, skillName, newScore);

    } catch (error) {
      console.error('❌ Error saving skill score update:', error);
      throw error;
    }
  }

  // Update practice analytics for the student
  static async updatePracticeAnalytics(
    studentId: string,
    skillName: string,
    newScore: number
  ): Promise<void> {
    try {
      console.log('📊 Updating practice analytics for:', { studentId, skillName, newScore });

      // Get existing analytics or create new
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
        const newBestScore = Math.max(existing.best_score || 0, newScore);
        const newTotalSessions = existing.total_practice_sessions + 1;
        const newAverageScore = ((existing.average_score || 0) * existing.total_practice_sessions + newScore) / newTotalSessions;

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
            best_score: newScore,
            average_score: newScore,
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

  // Get student's current practice sessions
  static async getStudentPracticeSessions(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('student_practice_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching practice sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting practice sessions:', error);
      return [];
    }
  }

  // Get authenticated user with dev mode support
  static async getAuthenticatedUser() {
    if (DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
      // In dev mode, return Pablo's mock data
      const mockRole = DEV_CONFIG.DEFAULT_DEV_ROLE;
      return {
        user: {
          ...MOCK_USER_DATA[mockRole].user,
          // Use Pablo's student profile ID for proper linking
          id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26'
        },
        error: null
      };
    }

    // In production, require strict authentication
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  }

  // Create a new practice session
  static async createPracticeSession(
    studentId: string,
    studentName: string,
    skillName: string,
    classId: string,
    className: string,
    subject: string,
    grade: string,
    currentSkillScore: number,
    difficultyLevel: string = 'adaptive',
    questionCount: number = 4
  ): Promise<string> {
    try {
      console.log('🎯 Creating practice session:', {
        studentId,
        studentName,
        skillName,
        classId,
        className,
        subject,
        grade,
        currentSkillScore,
        difficultyLevel,
        questionCount
      });

      const { data: session, error } = await supabase
        .from('student_practice_sessions')
        .insert({
          student_id: studentId,
          student_name: studentName,
          skill_name: skillName,
          class_id: classId,
          class_name: className,
          subject: subject,
          grade: grade,
          current_skill_score: currentSkillScore,
          difficulty_level: difficultyLevel,
          question_count: questionCount,
          exercise_generated: false,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating practice session:', error);
        throw new Error(`Failed to create practice session: ${error.message}`);
      }

      console.log('✅ Practice session created successfully:', session.id);
      return session.id;
    } catch (error) {
      console.error('❌ Error creating practice session:', error);
      throw error;
    }
  }
}
