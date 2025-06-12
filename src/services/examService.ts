
import { supabase } from "@/integrations/supabase/client";

export interface ActiveClass {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  teacher_id?: string;
  student_count: number;
  avg_gpa?: number;
  students: string[];
  day_of_week?: string[];
  class_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveStudent {
  id: string;
  name: string;
  email?: string;
  gpa?: number;
  major?: string;
  year?: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectSkill {
  id: string;
  skill_name: string;
  skill_description: string;
  subject: string;
  grade: string;
  created_at: string;
  updated_at: string;
}

export async function getAllActiveClasses(): Promise<ActiveClass[]> {
  try {
    // Always use authenticated user's UUID for security
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .eq('teacher_id', user.id) // Use authenticated UUID
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active classes:', error);
    throw error;
  }
}

export async function createActiveClass(classData: {
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  dayOfWeek?: string[];
  classTime?: string;
  endTime?: string;
}): Promise<ActiveClass> {
  try {
    // Always use authenticated user's UUID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('active_classes')
      .insert({
        name: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        teacher: classData.teacher,
        teacher_id: user.id, // Use authenticated UUID
        day_of_week: classData.dayOfWeek,
        class_time: classData.classTime,
        end_time: classData.endTime,
        student_count: 0,
        avg_gpa: 0,
        students: []
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating active class:', error);
    throw error;
  }
}

export async function updateActiveClass(classId: string, updates: Partial<ActiveClass>): Promise<ActiveClass> {
  try {
    // Verify user owns this class through RLS
    const { data, error } = await supabase
      .from('active_classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating active class:', error);
    throw error;
  }
}

export async function deleteActiveClass(classId: string): Promise<void> {
  try {
    // RLS will ensure user can only delete their own classes
    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting active class:', error);
    throw error;
  }
}

export async function deleteActiveClassOnly(classId: string): Promise<void> {
  try {
    // RLS will ensure user can only delete their own classes
    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting active class only:', error);
    throw error;
  }
}

export async function getClassDeletionInfo(classId: string): Promise<{
  examCount: number;
  answerKeyCount: number;
  testResultCount: number;
}> {
  try {
    // Get counts of related data
    const [examsResult, answerKeysResult, testResultsResult] = await Promise.all([
      supabase.from('exams').select('id', { count: 'exact' }).eq('class_id', classId),
      supabase.from('answer_keys').select('id', { count: 'exact' }),
      supabase.from('test_results').select('id', { count: 'exact' }).eq('class_id', classId)
    ]);

    return {
      examCount: examsResult.count || 0,
      answerKeyCount: answerKeysResult.count || 0,
      testResultCount: testResultsResult.count || 0
    };
  } catch (error) {
    console.error('Error getting class deletion info:', error);
    throw error;
  }
}

export async function getAllActiveStudents(): Promise<ActiveStudent[]> {
  try {
    const { data, error } = await supabase
      .from('active_students')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active students:', error);
    throw error;
  }
}

export async function getSubjectSkillsBySubjectAndGrade(subject: string, grade: string): Promise<SubjectSkill[]> {
  try {
    const { data, error } = await supabase
      .from('subject_skills')
      .select('*')
      .eq('subject', subject)
      .eq('grade', grade)
      .order('skill_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subject skills:', error);
    throw error;
  }
}

export async function linkClassToSubjectSkills(classId: string, skillIds: string[]): Promise<void> {
  try {
    const links = skillIds.map(skillId => ({
      class_id: classId,
      subject_skill_id: skillId
    }));

    const { error } = await supabase
      .from('class_subject_skills')
      .insert(links);

    if (error) throw error;
  } catch (error) {
    console.error('Error linking class to subject skills:', error);
    throw error;
  }
}
