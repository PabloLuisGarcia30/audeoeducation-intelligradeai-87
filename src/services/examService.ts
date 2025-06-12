import { supabase } from "@/integrations/supabase/client";
import { calculateClassDuration } from "@/utils/classDurationUtils";

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

export interface ActiveClassWithDuration extends ActiveClass {
  duration?: {
    totalMinutes: number;
    shortFormat: string;
    formattedDuration: string;
  };
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
  student_id: string;
  exam_id: string;
  class_id: string;
  overall_score: number;
  total_points_earned: number;
  total_points_possible: number;
  ai_feedback?: string;
  detailed_analysis?: string;
  created_at: string;
  active_student_id?: string;
  authenticated_student_id?: string;
}

export interface SkillScore {
  id: string;
  student_id?: string;
  authenticated_student_id?: string;
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
  test_result_id?: string;
  practice_exercise_id?: string;
  created_at: string;
}

export interface StoredExam {
  id: string;
  exam_id: string;
  title: string;
  description?: string;
  class_id?: string;
  class_name?: string;
  time_limit?: number;
  total_points?: number;
  created_at: string;
  updated_at: string;
}

export interface ExamData {
  title: string;
  description?: string;
  questions: any[];
  time_limit?: number;
  class_id?: string;
  class_name?: string;
  examId?: string; // Add examId to the interface
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

export async function getActiveStudentById(studentId: string): Promise<ActiveStudent | null> {
  try {
    const { data, error } = await supabase
      .from('active_students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching active student:', error);
    throw error;
  }
}

export async function createActiveStudent(studentData: {
  name: string;
  email?: string;
  year?: string;
}): Promise<ActiveStudent> {
  try {
    const { data, error } = await supabase
      .from('active_students')
      .insert({
        name: studentData.name,
        email: studentData.email,
        year: studentData.year,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating active student:', error);
    throw error;
  }
}

export async function getActiveClassById(classId: string): Promise<ActiveClass | null> {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching active class:', error);
    throw error;
  }
}

export async function getActiveClassByIdWithDuration(classId: string): Promise<ActiveClassWithDuration | null> {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) throw error;
    
    if (data) {
      // Calculate duration using the utility function
      const durationInfo = calculateClassDuration(data.class_time, data.end_time);
      
      return { 
        ...data, 
        duration: durationInfo ? {
          totalMinutes: durationInfo.totalMinutes,
          shortFormat: durationInfo.shortFormat,
          formattedDuration: durationInfo.formattedDuration
        } : undefined
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching active class with duration:', error);
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

export async function getLinkedContentSkillsForClass(classId: string): Promise<ContentSkill[]> {
  try {
    const { data, error } = await supabase
      .from('class_content_skills')
      .select(`
        content_skills (
          id,
          skill_name,
          skill_description,
          topic,
          subject,
          grade,
          created_at,
          updated_at
        )
      `)
      .eq('class_id', classId);

    if (error) throw error;
    return data?.map(item => item.content_skills).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching linked content skills:', error);
    throw error;
  }
}

export async function getLinkedSubjectSkillsForClass(classId: string): Promise<SubjectSkill[]> {
  try {
    const { data, error } = await supabase
      .from('class_subject_skills')
      .select(`
        subject_skills (
          id,
          skill_name,
          skill_description,
          subject,
          grade,
          created_at,
          updated_at
        )
      `)
      .eq('class_id', classId);

    if (error) throw error;
    return data?.map(item => item.subject_skills).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching linked subject skills:', error);
    throw error;
  }
}

export async function linkClassToContentSkills(classId: string, skillIds: string[]): Promise<void> {
  try {
    // First delete existing links
    await supabase
      .from('class_content_skills')
      .delete()
      .eq('class_id', classId);

    // Then create new links
    const links = skillIds.map(skillId => ({
      class_id: classId,
      content_skill_id: skillId
    }));

    const { error } = await supabase
      .from('class_content_skills')
      .insert(links);

    if (error) throw error;
  } catch (error) {
    console.error('Error linking class to content skills:', error);
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

export async function autoLinkMathClassToGrade10Skills(): Promise<void> {
  try {
    // This is a placeholder function - implementation would depend on specific requirements
    console.log('Auto-linking math class to Grade 10 skills');
  } catch (error) {
    console.error('Error auto-linking math class:', error);
    throw error;
  }
}

export async function autoLinkGeographyClassToGrade11Skills(): Promise<void> {
  try {
    // This is a placeholder function - implementation would depend on specific requirements
    console.log('Auto-linking geography class to Grade 11 skills');
  } catch (error) {
    console.error('Error auto-linking geography class:', error);
    throw error;
  }
}

export async function getStudentTestResults(studentId: string): Promise<TestResult[]> {
  try {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .or(`student_id.eq.${studentId},authenticated_student_id.eq.${studentId},active_student_id.eq.${studentId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student test results:', error);
    throw error;
  }
}

export async function getStudentContentSkillScores(studentId: string): Promise<SkillScore[]> {
  try {
    const { data, error } = await supabase
      .from('content_skill_scores')
      .select('*')
      .or(`student_id.eq.${studentId},authenticated_student_id.eq.${studentId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student content skill scores:', error);
    throw error;
  }
}

export async function getStudentSubjectSkillScores(studentId: string): Promise<SkillScore[]> {
  try {
    const { data, error } = await supabase
      .from('subject_skill_scores')
      .select('*')
      .or(`student_id.eq.${studentId},authenticated_student_id.eq.${studentId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student subject skill scores:', error);
    throw error;
  }
}

export async function getStudentEnrolledClasses(studentId: string): Promise<ActiveClass[]> {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .contains('students', [studentId]);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student enrolled classes:', error);
    throw error;
  }
}

export async function getExamByExamId(examId: string): Promise<StoredExam | null> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching exam:', error);
    throw error;
  }
}

export async function saveExamToDatabase(examData: ExamData, skills: ContentSkill[]): Promise<string> {
  try {
    // Generate a unique exam ID if not provided
    const examId = examData.examId || `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data, error } = await supabase
      .from('exams')
      .insert({
        exam_id: examId,
        title: examData.title,
        description: examData.description,
        class_id: examData.class_id,
        class_name: examData.class_name,
        time_limit: examData.time_limit,
        total_points: examData.questions?.length || 0
      })
      .select()
      .single();

    if (error) throw error;
    return examId;
  } catch (error) {
    console.error('Error saving exam to database:', error);
    throw error;
  }
}
