import { supabase } from "@/integrations/supabase/client";

export interface ClassSession {
  id: string;
  class_id: string;
  lesson_plan_id?: string;
  teacher_id: string;
  session_name: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentExercise {
  id: string;
  class_session_id: string;
  student_id: string;
  student_name: string;
  skill_name: string;
  skill_score: number;
  exercise_data: any;
  status: 'available' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface SessionMonitoringData {
  id: string;
  class_session_id: string;
  student_id: string;
  student_name: string;
  skill_name: string;
  original_skill_score: number;
  status: 'available' | 'in_progress' | 'completed';
  exercise_score?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  session_name: string;
  teacher_id: string;
  class_id: string;
  is_active: boolean;
  lesson_plan_id?: string;
  class_name?: string;
  subject?: string;
  grade?: string;
}

export async function createClassSession(sessionData: {
  class_id: string;
  lesson_plan_id?: string;
  teacher_id: string;
  session_name: string;
}): Promise<ClassSession> {
  try {
    // Always use the authenticated user's ID, ignore any passed teacher_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('class_sessions')
      .insert({
        class_id: sessionData.class_id,
        lesson_plan_id: sessionData.lesson_plan_id,
        teacher_id: user.id, // Use authenticated user ID
        session_name: sessionData.session_name
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClassSession;
  } catch (error) {
    console.error('Error creating class session:', error);
    throw error;
  }
}

export async function endClassSession(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('class_sessions')
      .update({
        ended_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error ending class session:', error);
    throw error;
  }
}

export async function getActiveClassSessions(): Promise<ClassSession[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('teacher_id', user.id) // Use authenticated user ID
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClassSession[];
  } catch (error) {
    console.error('Error fetching active class sessions:', error);
    throw error;
  }
}

export async function createStudentExercises(exercises: {
  class_session_id: string;
  student_id: string;
  student_name: string;
  skill_name: string;
  skill_score: number;
  exercise_data: any;
}[]): Promise<StudentExercise[]> {
  try {
    const { data, error } = await supabase
      .from('student_exercises')
      .insert(exercises)
      .select();

    if (error) throw error;
    return data as StudentExercise[];
  } catch (error) {
    console.error('Error creating student exercises:', error);
    throw error;
  }
}

export async function getStudentExercises(studentId: string): Promise<StudentExercise[]> {
  try {
    const { data, error } = await supabase
      .from('student_exercises')
      .select(`
        *,
        class_sessions!inner(
          id,
          is_active,
          class_id,
          session_name,
          teacher_id,
          lesson_plan_id,
          started_at,
          lesson_plans!inner(
            id,
            class_name,
            teacher_name,
            subject,
            grade,
            scheduled_date,
            scheduled_time,
            status
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('class_sessions.is_active', true)
      .not('class_sessions.lesson_plan_id', 'is', null) // Only exercises from lesson plan sessions
      .eq('class_sessions.lesson_plans.status', 'active'); // Only from active lesson plans

    if (error) throw error;
    
    // Transform the data to include lesson plan information
    const transformedData = data?.map(exercise => ({
      ...exercise,
      lesson_plan_info: exercise.class_sessions?.lesson_plans,
      session_info: {
        session_name: exercise.class_sessions?.session_name,
        started_at: exercise.class_sessions?.started_at,
        teacher_id: exercise.class_sessions?.teacher_id
      }
    })) || [];

    return transformedData as StudentExercise[];
  } catch (error) {
    console.error('Error fetching student exercises from lesson plan sessions:', error);
    throw error;
  }
}

export async function updateExerciseStatus(
  exerciseId: string, 
  status: 'in_progress' | 'completed',
  score?: number,
  timingData?: { questionTimings?: Array<{ questionId: string; timeSpent: number }> }
): Promise<void> {
  try {
    const updates: any = { status };
    
    if (status === 'in_progress' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }
    
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      if (score !== undefined) {
        updates.score = score;
      }
    }

    const { error } = await supabase
      .from('student_exercises')
      .update(updates)
      .eq('id', exerciseId);

    if (error) throw error;

    console.log(`✅ Exercise ${exerciseId} status updated to ${status}${score ? ` with score ${score}%` : ''} (enhanced tracking enabled)`);
    
  } catch (error) {
    console.error('Error updating exercise status:', error);
    throw error;
  }
}

export async function getSessionMonitoringData(sessionId?: string): Promise<SessionMonitoringData[]> {
  try {
    const { data, error } = await supabase.rpc('get_session_monitoring_data', {
      session_id: sessionId || null
    });

    if (error) throw error;
    return data as SessionMonitoringData[];
  } catch (error) {
    console.error('Error fetching session monitoring data:', error);
    throw error;
  }
}

export async function getAllActiveSessionsMonitoringData(): Promise<SessionMonitoringData[]> {
  try {
    const { data, error } = await supabase.rpc('get_session_monitoring_data');
    if (error) throw error;
    return data as SessionMonitoringData[];
  } catch (error) {
    console.error('Error fetching all session monitoring data:', error);
    throw error;
  }
}

// Helper function to get user's display teacher ID for UI purposes
export async function getUserDisplayTeacherId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('get_user_display_teacher_id', {
      user_uuid: user.id
    });

    if (error) {
      console.error('Error fetching display teacher ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserDisplayTeacherId:', error);
    return null;
  }
}
