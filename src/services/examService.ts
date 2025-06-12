
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

export interface ActiveClassWithDuration extends ActiveClass {
  duration?: {
    shortFormat: string;
    longFormat: string;
  };
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

export interface TestResult {
  id: string;
  exam_id: string;
  student_id: string;
  class_id: string;
  overall_score: number;
  total_points_earned: number;
  total_points_possible: number;
  ai_feedback?: string;
  detailed_analysis?: string;
  created_at: string;
  authenticated_student_id?: string;
  active_student_id?: string;
}

export interface SkillScore {
  id: string;
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
  created_at: string;
  student_id?: string;
  authenticated_student_id?: string;
  test_result_id?: string;
  practice_exercise_id?: string;
}

export interface ExamData {
  exam_id: string;
  title: string;
  description?: string;
  time_limit?: number;
  total_points?: number;
  class_id?: string;
  class_name?: string;
}

export interface StoredExam {
  id: string;
  exam_id: string;
  title: string;
  description?: string;
  time_limit?: number;
  total_points?: number;
  class_id?: string;
  class_name?: string;
  created_at: string;
  updated_at: string;
}

// Role validation helper
async function validateUserRole(expectedRole: 'teacher' | 'student'): Promise<{ user: any; profile: any }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  if (profile.role !== expectedRole) {
    throw new Error(`Access denied: Expected ${expectedRole} role, but user has ${profile.role} role`);
  }

  return { user, profile };
}

// Get all active classes with proper teacher information and role validation
export async function getAllActiveClasses(): Promise<ActiveClass[]> {
  try {
    // Validate that the user is a teacher
    await validateUserRole('teacher');

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

// Create active class using authenticated user's UUID with role validation
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
    // Validate that the user is a teacher
    const { user } = await validateUserRole('teacher');

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

// Update active class (ensure only owner can update) with role validation
export async function updateActiveClass(classId: string, updates: Partial<ActiveClass>): Promise<ActiveClass> {
  try {
    // Verify ownership before update
    const { user } = await validateUserRole('teacher');

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

// Delete active class (ensure only owner can delete) with role validation
export async function deleteActiveClass(classId: string): Promise<void> {
  try {
    const { user } = await validateUserRole('teacher');

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

// Delete class only (preserve historical data) with role validation
export async function deleteActiveClassOnly(classId: string): Promise<void> {
  try {
    const { user } = await validateUserRole('teacher');

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

// Get class deletion info with role validation
export async function getClassDeletionInfo(classId: string): Promise<{
  examCount: number;
  answerKeyCount: number;
  testResultCount: number;
}> {
  try {
    const { user } = await validateUserRole('teacher');

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

// Get all active students (any authenticated user can access)
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

// Get active student by ID with role validation
export async function getActiveStudentById(studentId: string): Promise<ActiveStudent | null> {
  try {
    const { data, error } = await supabase
      .from('active_students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching active student:', error);
    throw error;
  }
}

// Create active student
export async function createActiveStudent(studentData: {
  name: string;
  email?: string;
  year?: string;
  major?: string;
  gpa?: number;
}): Promise<ActiveStudent> {
  try {
    const { data, error } = await supabase
      .from('active_students')
      .insert(studentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating active student:', error);
    throw error;
  }
}

// Get active class by ID with role validation for teachers
export async function getActiveClassById(classId: string): Promise<ActiveClass | null> {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select(`
        *,
        profiles!inner(teacher_id, full_name)
      `)
      .eq('id', classId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      display_teacher_id: data.profiles?.teacher_id || 'Unknown',
      teacher: data.profiles?.full_name || data.teacher || 'Unknown Teacher'
    };
  } catch (error) {
    console.error('Error fetching active class:', error);
    throw error;
  }
}

// Get active class by ID with duration
export async function getActiveClassByIdWithDuration(classId: string): Promise<ActiveClassWithDuration | null> {
  try {
    const baseClass = await getActiveClassById(classId);
    if (!baseClass) return null;

    // Calculate duration if both times are present
    let duration;
    if (baseClass.class_time && baseClass.end_time) {
      const start = new Date(`2024-01-01 ${baseClass.class_time}`);
      const end = new Date(`2024-01-01 ${baseClass.end_time}`);
      const diffMs = end.getTime() - start.getTime();
      const diffMins = diffMs / (1000 * 60);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      
      duration = {
        shortFormat: `${hours}h ${mins}m`,
        longFormat: `${hours} hours and ${mins} minutes`
      };
    }

    return { ...baseClass, duration };
  } catch (error) {
    console.error('Error fetching active class with duration:', error);
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

// Create content skill
export async function createContentSkill(skillData: {
  skill_name: string;
  skill_description: string;
  topic: string;
  subject: string;
  grade: string;
}): Promise<ContentSkill> {
  try {
    const { data, error } = await supabase
      .from('content_skills')
      .insert(skillData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating content skill:', error);
    throw error;
  }
}

// Link class to subject skills with role validation
export async function linkClassToSubjectSkills(classId: string, skillIds: string[]): Promise<void> {
  try {
    const { user } = await validateUserRole('teacher');

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

// Link class to content skills with role validation
export async function linkClassToContentSkills(classId: string, skillIds: string[]): Promise<void> {
  try {
    const { user } = await validateUserRole('teacher');

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

// Get linked content skills for class
export async function getLinkedContentSkillsForClass(classId: string): Promise<ContentSkill[]> {
  try {
    const { data, error } = await supabase
      .from('class_content_skills')
      .select(`
        content_skills (*)
      `)
      .eq('class_id', classId);

    if (error) throw error;
    return data?.map(item => item.content_skills).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching linked content skills:', error);
    throw error;
  }
}

// Get linked subject skills for class
export async function getLinkedSubjectSkillsForClass(classId: string): Promise<SubjectSkill[]> {
  try {
    const { data, error } = await supabase
      .from('class_subject_skills')
      .select(`
        subject_skills (*)
      `)
      .eq('class_id', classId);

    if (error) throw error;
    return data?.map(item => item.subject_skills).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching linked subject skills:', error);
    throw error;
  }
}

// Auto-link Math class to Grade 10 skills
export async function autoLinkMathClassToGrade10Skills(classId: string): Promise<void> {
  try {
    const skills = await getSubjectSkillsBySubjectAndGrade('Math', 'Grade 10');
    const skillIds = skills.map(skill => skill.id);
    if (skillIds.length > 0) {
      await linkClassToSubjectSkills(classId, skillIds);
    }
  } catch (error) {
    console.error('Error auto-linking Math Grade 10 skills:', error);
    throw error;
  }
}

// Auto-link Geography class to Grade 11 skills  
export async function autoLinkGeographyClassToGrade11Skills(classId: string): Promise<void> {
  try {
    const skills = await getSubjectSkillsBySubjectAndGrade('Geography', 'Grade 11');
    const skillIds = skills.map(skill => skill.id);
    if (skillIds.length > 0) {
      await linkClassToSubjectSkills(classId, skillIds);
    }
  } catch (error) {
    console.error('Error auto-linking Geography Grade 11 skills:', error);
    throw error;
  }
}

// Get student test results with role validation
export async function getStudentTestResults(studentId: string): Promise<TestResult[]> {
  try {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('authenticated_student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student test results:', error);
    throw error;
  }
}

// Get student content skill scores
export async function getStudentContentSkillScores(studentId: string): Promise<SkillScore[]> {
  try {
    const { data, error } = await supabase
      .from('content_skill_scores')
      .select('*')
      .eq('authenticated_student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student content skill scores:', error);
    throw error;
  }
}

// Get student subject skill scores
export async function getStudentSubjectSkillScores(studentId: string): Promise<SkillScore[]> {
  try {
    const { data, error } = await supabase
      .from('subject_skill_scores')
      .select('*')
      .eq('authenticated_student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student subject skill scores:', error);
    throw error;
  }
}

// Get student enrolled classes
export async function getStudentEnrolledClasses(studentId: string): Promise<ActiveClass[]> {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select(`
        *,
        profiles!inner(teacher_id, full_name)
      `)
      .contains('students', [studentId]);

    if (error) throw error;
    
    return data?.map(cls => ({
      ...cls,
      display_teacher_id: cls.profiles?.teacher_id || 'Unknown',
      teacher: cls.profiles?.full_name || cls.teacher || 'Unknown Teacher'
    })) || [];
  } catch (error) {
    console.error('Error fetching student enrolled classes:', error);
    throw error;
  }
}

// Get exam by exam ID
export async function getExamByExamId(examId: string): Promise<StoredExam | null> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching exam by exam ID:', error);
    throw error;
  }
}

// Save exam to database
export async function saveExamToDatabase(examData: ExamData): Promise<StoredExam> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .insert(examData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving exam to database:', error);
    throw error;
  }
}
