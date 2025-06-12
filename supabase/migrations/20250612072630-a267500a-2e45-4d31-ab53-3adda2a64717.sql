
-- Phase 1: Database Schema Enhancements

-- Add class context to trailblazer_sessions table
ALTER TABLE trailblazer_sessions 
ADD COLUMN class_id uuid REFERENCES active_classes(id),
ADD COLUMN subject text,
ADD COLUMN grade text;

-- Add RLS policies to allow teachers to view their students' Trailblazer data
CREATE POLICY "Teachers can view their students' trailblazer sessions" 
ON trailblazer_sessions 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = auth.uid() 
    AND sp.authenticated_user_id = trailblazer_sessions.user_id
  )
);

CREATE POLICY "Teachers can view their students' streaks" 
ON user_streaks 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = auth.uid() 
    AND sp.authenticated_user_id = user_streaks.user_id
  )
);

CREATE POLICY "Teachers can view their students' concept mastery" 
ON user_concept_mastery 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = auth.uid() 
    AND sp.authenticated_user_id = user_concept_mastery.user_id
  )
);

CREATE POLICY "Teachers can view their students' achievements" 
ON trailblazer_achievements 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = auth.uid() 
    AND sp.authenticated_user_id = trailblazer_achievements.user_id
  )
);

-- Create function to get enrolled classes for a student
CREATE OR REPLACE FUNCTION get_student_enrolled_classes(student_user_id uuid)
RETURNS TABLE(
  class_id uuid,
  class_name text,
  subject text,
  grade text,
  teacher_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    ac.id as class_id,
    ac.name as class_name,
    ac.subject,
    ac.grade,
    ac.teacher as teacher_name
  FROM active_classes ac
  JOIN class_enrollments ce ON ac.id = ce.class_id
  JOIN student_profiles sp ON ce.student_profile_id = sp.id
  WHERE sp.authenticated_user_id = student_user_id
  AND ce.is_active = true;
$$;

-- Create function to get teacher's students' Trailblazer progress
CREATE OR REPLACE FUNCTION get_teacher_students_trailblazer_progress(teacher_user_id uuid)
RETURNS TABLE(
  student_id uuid,
  student_name text,
  current_streak_days integer,
  total_sessions integer,
  avg_mastery_score numeric,
  last_session_date date,
  class_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    sp.authenticated_user_id as student_id,
    sp.student_name,
    COALESCE(us.current_streak_days, 0) as current_streak_days,
    COALESCE(us.total_sessions, 0) as total_sessions,
    COALESCE(AVG(ucm.mastery_score), 0) as avg_mastery_score,
    us.last_session_date,
    ac.name as class_name
  FROM active_classes ac
  JOIN class_enrollments ce ON ac.id = ce.class_id
  JOIN student_profiles sp ON ce.student_profile_id = sp.id
  LEFT JOIN user_streaks us ON sp.authenticated_user_id = us.user_id
  LEFT JOIN user_concept_mastery ucm ON sp.authenticated_user_id = ucm.user_id
  WHERE ac.teacher_id = teacher_user_id
  AND ce.is_active = true
  GROUP BY sp.authenticated_user_id, sp.student_name, us.current_streak_days, 
           us.total_sessions, us.last_session_date, ac.name;
$$;

-- Create function to get class-specific concepts for session recommendations
CREATE OR REPLACE FUNCTION get_class_concepts_for_session(p_class_id uuid)
RETURNS TABLE(
  concept_name text,
  subject text,
  grade text,
  skill_names text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  WITH class_skills AS (
    SELECT DISTINCT cs.skill_name, ac.subject, ac.grade
    FROM class_content_skills ccs
    JOIN content_skills cs ON ccs.content_skill_id = cs.id
    JOIN active_classes ac ON ccs.class_id = ac.id
    WHERE ccs.class_id = p_class_id
    
    UNION
    
    SELECT DISTINCT ss.skill_name, ac.subject, ac.grade
    FROM class_subject_skills css
    JOIN subject_skills ss ON css.subject_skill_id = ss.id
    JOIN active_classes ac ON css.class_id = ac.id
    WHERE css.class_id = p_class_id
  )
  SELECT 
    COALESCE(ci.concept_name, cs.skill_name) as concept_name,
    cs.subject,
    cs.grade,
    array_agg(DISTINCT cs.skill_name) as skill_names
  FROM class_skills cs
  LEFT JOIN concept_index ci ON ci.subject = cs.subject 
    AND ci.grade = cs.grade 
    AND cs.skill_name = ANY(ci.related_skills)
  GROUP BY COALESCE(ci.concept_name, cs.skill_name), cs.subject, cs.grade;
$$;
