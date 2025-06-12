
import { supabase } from "@/integrations/supabase/client";

export interface ActiveClass {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  teacher_id?: string;  // UUID for database relationships
  display_teacher_id?: string;  // Human-readable ID for display
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
  year?: string;
  major?: string;
  gpa?: number;
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

export interface ContentSkill {
  id: string;
  skill_name: string;
  skill_description: string;
  topic: string;
  subject: string;
  grade: string;
  created_at: string;
  updated_at: string;
}

// Get all active classes with proper teacher information
export async function getAllActiveClasses(): Promise<ActiveClass[]> {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select(`
        *,
        profiles!inner(teacher_id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map the data to include both UUID and display teacher ID
    const classesWithTeacherInfo = data?.map(cls => ({
      ...cls,
      display_teacher_id: cls.profiles?.teacher_id || 'Unknown',
      teacher: cls.profiles?.full_name || cls.teacher || 'Unknown Teacher'
    })) || [];

    return classesWithTeacherInfo;
  } catch (error) {
    console.error('Error fetching active classes:', error);
    throw error;
  }
}

// Create active class using authenticated user's UUID
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
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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
      .select(`
        *,
        profiles!inner(teacher_id, full_name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      display_teacher_id: data.profiles?.teacher_id || 'Unknown',
      teacher: data.profiles?.full_name || data.teacher || 'Unknown Teacher'
    };
  } catch (error) {
    console.error('Error creating active class:', error);
    throw error;
  }
}

// Update active class (ensure only owner can update)
export async function updateActiveClass(classId: string, updates: Partial<ActiveClass>): Promise<ActiveClass> {
  try {
    // Verify ownership before update
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('active_classes')
      .update(updates)
      .eq('id', classId)
      .eq('teacher_id', user.id) // Ensure only owner can update
      .select(`
        *,
        profiles!inner(teacher_id, full_name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      display_teacher_id: data.profiles?.teacher_id || 'Unknown',
      teacher: data.profiles?.full_name || data.teacher || 'Unknown Teacher'
    };
  } catch (error) {
    console.error('Error updating active class:', error);
    throw error;
  }
}

// Delete active class (ensure only owner can delete)
export async function deleteActiveClass(classId: string): Promise<void> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId)
      .eq('teacher_id', user.id); // Ensure only owner can delete

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting active class:', error);
    throw error;
  }
}

// Delete class only (preserve historical data)
export async function deleteActiveClassOnly(classId: string): Promise<void> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId)
      .eq('teacher_id', user.id); // Ensure only owner can delete

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting class only:', error);
    throw error;
  }
}

// Get class deletion info
export async function getClassDeletionInfo(classId: string): Promise<{
  examCount: number;
  answerKeyCount: number;
  testResultCount: number;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Verify ownership first
    const { data: classData, error: classError } = await supabase
      .from('active_classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', user.id)
      .single();

    if (classError || !classData) {
      throw new Error('Class not found or access denied');
    }

    const [examCount, answerKeyCount, testResultCount] = await Promise.all([
      supabase.from('exams').select('id', { count: 'exact' }).eq('class_id', classId),
      supabase.from('answer_keys').select('id', { count: 'exact' }).eq('exam_id', classId),
      supabase.from('test_results').select('id', { count: 'exact' }).eq('class_id', classId)
    ]);

    return {
      examCount: examCount.count || 0,
      answerKeyCount: answerKeyCount.count || 0,
      testResultCount: testResultCount.count || 0
    };
  } catch (error) {
    console.error('Error getting class deletion info:', error);
    throw error;
  }
}

// Get all active students
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

// Get subject skills by subject and grade
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

// Get content skills by subject and grade
export async function getContentSkillsBySubjectAndGrade(subject: string, grade: string): Promise<ContentSkill[]> {
  try {
    const { data, error } = await supabase
      .from('content_skills')
      .select('*')
      .eq('subject', subject)
      .eq('grade', grade)
      .order('skill_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching content skills:', error);
    throw error;
  }
}

// Link class to subject skills
export async function linkClassToSubjectSkills(classId: string, skillIds: string[]): Promise<void> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Verify class ownership
    const { data: classData, error: classError } = await supabase
      .from('active_classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', user.id)
      .single();

    if (classError || !classData) {
      throw new Error('Class not found or access denied');
    }

    const skillLinks = skillIds.map(skillId => ({
      class_id: classId,
      subject_skill_id: skillId
    }));

    const { error } = await supabase
      .from('class_subject_skills')
      .insert(skillLinks);

    if (error) throw error;
  } catch (error) {
    console.error('Error linking class to subject skills:', error);
    throw error;
  }
}

// Link class to content skills
export async function linkClassToContentSkills(classId: string, skillIds: string[]): Promise<void> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Verify class ownership
    const { data: classData, error: classError } = await supabase
      .from('active_classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', user.id)
      .single();

    if (classError || !classData) {
      throw new Error('Class not found or access denied');
    }

    const skillLinks = skillIds.map(skillId => ({
      class_id: classId,
      content_skill_id: skillId
    }));

    const { error } = await supabase
      .from('class_content_skills')
      .insert(skillLinks);

    if (error) throw error;
  } catch (error) {
    console.error('Error linking class to content skills:', error);
    throw error;
  }
}
