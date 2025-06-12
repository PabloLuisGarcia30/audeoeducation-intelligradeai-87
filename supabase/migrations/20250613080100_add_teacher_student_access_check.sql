
-- Function to check if a teacher has access to a student
CREATE OR REPLACE FUNCTION public.teacher_has_access_to_student(
  teacher_uuid UUID,
  student_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = teacher_uuid
    AND sp.authenticated_user_id = student_uuid
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- Enable Row Level Security on teacher-related tables if not already enabled
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for class_sessions
CREATE POLICY "Teachers can view their own sessions" 
ON public.class_sessions 
FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own sessions" 
ON public.class_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own sessions" 
ON public.class_sessions 
FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own sessions" 
ON public.class_sessions 
FOR DELETE 
USING (auth.uid() = teacher_id);
