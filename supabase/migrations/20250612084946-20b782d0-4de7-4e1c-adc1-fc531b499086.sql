
-- Step 1: Rename teacher_id column to display_teacher_id in profiles table
ALTER TABLE public.profiles 
RENAME COLUMN teacher_id TO display_teacher_id;

-- Step 2: Add comment to clarify the purpose of display_teacher_id
COMMENT ON COLUMN public.profiles.display_teacher_id IS 'Human-readable teacher ID like TCH001, used for display purposes only';

-- Step 3: Update the generate_teacher_id function to be more explicit about its purpose
CREATE OR REPLACE FUNCTION public.generate_display_teacher_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  next_number integer;
  teacher_id_result text;
BEGIN
  -- Get the next sequential number by counting existing display teacher IDs
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(display_teacher_id FROM 4) AS integer)), 0
  ) + 1
  INTO next_number
  FROM public.profiles 
  WHERE display_teacher_id IS NOT NULL 
  AND display_teacher_id ~ '^TCH[0-9]+$';
  
  -- Format as TCH001, TCH002, etc.
  teacher_id_result := 'TCH' || LPAD(next_number::text, 3, '0');
  
  RETURN teacher_id_result;
END;
$function$;

-- Step 4: Update the handle_new_user trigger function to use the renamed column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, display_teacher_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student') = 'teacher' 
      THEN generate_display_teacher_id()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$;

-- Step 5: Create a helper function to get user's display teacher ID
CREATE OR REPLACE FUNCTION public.get_user_display_teacher_id(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT display_teacher_id FROM public.profiles WHERE id = user_uuid;
$function$;

-- Step 6: Update RLS policies to use auth.uid() consistently
-- Update existing policies that might be using incorrect teacher_id references

-- For active_classes table - ensure teachers can only access their own classes
DROP POLICY IF EXISTS "Teachers can manage their classes" ON public.active_classes;
CREATE POLICY "Teachers can manage their classes" ON public.active_classes
  FOR ALL USING (teacher_id = auth.uid());

-- For class_sessions table - ensure teachers can only access their sessions
DROP POLICY IF EXISTS "Teachers can manage their sessions" ON public.class_sessions;
CREATE POLICY "Teachers can manage their sessions" ON public.class_sessions
  FOR ALL USING (teacher_id = auth.uid());

-- For lesson_plans table - ensure teachers can only access their lesson plans
DROP POLICY IF EXISTS "Teachers can manage their lesson plans" ON public.lesson_plans;
CREATE POLICY "Teachers can manage their lesson plans" ON public.lesson_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.active_classes ac 
      WHERE ac.id = lesson_plans.class_id 
      AND ac.teacher_id = auth.uid()
    )
  );

-- Enable RLS on tables that should have it but might not
ALTER TABLE public.active_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Step 7: Create a view for teacher profile information that includes both IDs
CREATE OR REPLACE VIEW public.teacher_profiles AS
SELECT 
  id as user_id,
  email,
  full_name,
  display_teacher_id,
  role,
  created_at,
  updated_at
FROM public.profiles
WHERE role = 'teacher';

-- Grant access to the view
GRANT SELECT ON public.teacher_profiles TO authenticated;

-- Step 8: Update the get_teacher_students_trailblazer_progress function to use auth.uid()
CREATE OR REPLACE FUNCTION public.get_teacher_students_trailblazer_progress(teacher_user_id uuid DEFAULT NULL)
RETURNS TABLE(student_id uuid, student_name text, current_streak_days integer, total_sessions integer, avg_mastery_score numeric, last_session_date date, class_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
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
  WHERE ac.teacher_id = COALESCE(teacher_user_id, auth.uid())
  AND ce.is_active = true
  GROUP BY sp.authenticated_user_id, sp.student_name, us.current_streak_days, 
           us.total_sessions, us.last_session_date, ac.name;
$function$;

-- Step 9: Update the get_session_monitoring_data function to use auth.uid() properly
CREATE OR REPLACE FUNCTION public.get_session_monitoring_data(session_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, class_session_id uuid, student_id uuid, student_name text, skill_name text, original_skill_score numeric, status text, exercise_score numeric, started_at timestamp with time zone, completed_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, session_name text, teacher_id uuid, class_id uuid, is_active boolean, lesson_plan_id uuid, class_name text, subject text, grade text)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT 
    se.id,
    se.class_session_id,
    se.student_id,
    se.student_name,
    se.skill_name,
    se.skill_score as original_skill_score,
    se.status,
    se.score as exercise_score,
    se.started_at,
    se.completed_at,
    se.created_at,
    se.updated_at,
    cs.session_name,
    cs.teacher_id,
    cs.class_id,
    cs.is_active,
    lp.id as lesson_plan_id,
    lp.class_name,
    lp.subject,
    lp.grade
  FROM student_exercises se
  JOIN class_sessions cs ON se.class_session_id = cs.id
  LEFT JOIN lesson_plans lp ON cs.lesson_plan_id = lp.id
  WHERE 
    cs.teacher_id = auth.uid() AND
    (session_id IS NULL OR cs.id = session_id);
$function$;
