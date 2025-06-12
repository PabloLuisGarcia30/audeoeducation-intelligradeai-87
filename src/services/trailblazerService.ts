import { supabase } from "@/integrations/supabase/client";

export interface TrailblazerSession {
  id: string;
  user_id: string;
  goal_type: string;
  focus_concept: string;
  duration_minutes: number;
  actual_duration_minutes?: number;
  score_improvement?: number;
  session_date: string;
  mistake_types_encountered: any;
  status: string;
  created_at: string;
  updated_at: string;
  class_id?: string;
  subject?: string;
  grade?: string;
}

export interface EnrolledClass {
  class_id: string;
  class_name: string;
  subject: string;
  grade: string;
  teacher_name: string;
}

export interface ClassConcept {
  concept_name: string;
  subject: string;
  grade: string;
  skill_names: string[];
}

export interface StudentTrailblazerProgress {
  student_id: string;
  student_name: string;
  current_streak_days: number;
  total_sessions: number;
  avg_mastery_score: number;
  last_session_date?: string;
  class_name: string;
}

export interface UserStreak {
  user_id: string;
  current_streak_days: number;
  longest_streak_days: number;
  last_session_date?: string;
  rescue_used_today: boolean;
  total_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface ConceptMastery {
  user_id: string;
  concept: string;
  mastery_score: number;
  time_spent_minutes: number;
  last_practiced_at: string;
  mistake_history: any;
  practice_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrailblazerAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description?: string;
  icon_name?: string;
  unlocked_at: string;
  metadata: any;
}

export const trailblazerService = {
  // Get user's current streak
  async getUserStreak(): Promise<UserStreak | null> {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user streak:', error);
      throw error;
    }
    
    return data || null;
  },

  // Get user's concept mastery data
  async getConceptMastery(): Promise<ConceptMastery[]> {
    const { data, error } = await supabase
      .from('user_concept_mastery')
      .select('*')
      .order('mastery_score', { ascending: false });

    if (error) {
      console.error('Error fetching concept mastery:', error);
      throw error;
    }

    return data || [];
  },

  // Get user's recent sessions
  async getRecentSessions(limit: number = 5): Promise<TrailblazerSession[]> {
    const { data, error } = await supabase
      .from('trailblazer_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent sessions:', error);
      throw error;
    }

    return data || [];
  },

  // Get user's achievements
  async getAchievements(): Promise<TrailblazerAchievement[]> {
    const { data, error } = await supabase
      .from('trailblazer_achievements')
      .select('*')
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }

    return data || [];
  },

  // Get student's enrolled classes for session options
  async getEnrolledClasses(): Promise<EnrolledClass[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('get_student_enrolled_classes', {
      student_user_id: user.id
    });

    if (error) {
      console.error('Error fetching enrolled classes:', error);
      throw error;
    }

    return data || [];
  },

  // Get class-specific concepts for session recommendations
  async getClassConcepts(classId: string): Promise<ClassConcept[]> {
    const { data, error } = await supabase.rpc('get_class_concepts_for_session', {
      p_class_id: classId
    });

    if (error) {
      console.error('Error fetching class concepts:', error);
      throw error;
    }

    return data || [];
  },

  // Start a new learning session with class context
  async startSession(
    goalType: string, 
    focusConcept: string, 
    durationMinutes: number,
    classId?: string,
    subject?: string,
    grade?: string
  ): Promise<TrailblazerSession> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('trailblazer_sessions')
      .insert({
        user_id: user.id,
        goal_type: goalType,
        focus_concept: focusConcept,
        duration_minutes: durationMinutes,
        class_id: classId,
        subject: subject,
        grade: grade,
        status: 'started'
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      throw error;
    }

    return data;
  },

  // Teacher methods for viewing student data
  async getTeacherStudentsProgress(): Promise<StudentTrailblazerProgress[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('get_teacher_students_trailblazer_progress', {
      teacher_user_id: user.id
    });

    if (error) {
      console.error('Error fetching teacher students progress:', error);
      throw error;
    }

    return data || [];
  },

  // Get specific student's Trailblazer data for teachers
  async getStudentTrailblazerData(studentId: string) {
    // Get student streak
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', studentId)
      .single();

    // Get student concepts
    const { data: concepts } = await supabase
      .from('user_concept_mastery')
      .select('*')
      .eq('user_id', studentId)
      .order('mastery_score', { ascending: false });

    // Get student sessions
    const { data: sessions } = await supabase
      .from('trailblazer_sessions')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get student achievements
    const { data: achievements } = await supabase
      .from('trailblazer_achievements')
      .select('*')
      .eq('user_id', studentId)
      .order('unlocked_at', { ascending: false });

    return {
      streak: streak || null,
      concepts: concepts || [],
      sessions: sessions || [],
      achievements: achievements || []
    };
  },

  // Complete a session
  async completeSession(sessionId: string, actualDuration: number, scoreImprovement?: number): Promise<void> {
    const { error } = await supabase
      .from('trailblazer_sessions')
      .update({
        status: 'completed',
        actual_duration_minutes: actualDuration,
        score_improvement: scoreImprovement
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error completing session:', error);
      throw error;
    }

    // Update user streak
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('update_user_streak', { p_user_id: user.id });
    }
  },

  // Initialize user data (create streak record if doesn't exist)
  async initializeUser(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if streak record exists
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    // Create streak record if it doesn't exist
    if (!streak) {
      const { error } = await supabase
        .from('user_streaks')
        .insert({
          user_id: user.id,
          current_streak_days: 0,
          longest_streak_days: 0,
          total_sessions: 0
        });

      if (error) {
        console.error('Error initializing user streak:', error);
        throw error;
      }
    }
  }
};
