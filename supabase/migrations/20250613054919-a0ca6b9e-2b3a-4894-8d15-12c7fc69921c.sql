
-- Create the strategic summary table for enhanced logging
CREATE TABLE public.student_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  reference_table TEXT,
  reference_id UUID,
  context_summary JSONB DEFAULT '{}',
  session_type TEXT, -- 'practice', 'class_session', 'trailblazer', 'exam'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for fast teacher queries
CREATE INDEX idx_student_action_logs_student_id ON public.student_action_logs(student_id);
CREATE INDEX idx_student_action_logs_action_type ON public.student_action_logs(action_type);
CREATE INDEX idx_student_action_logs_session_type ON public.student_action_logs(session_type);
CREATE INDEX idx_student_action_logs_created_at ON public.student_action_logs(created_at);
CREATE INDEX idx_student_action_logs_reference ON public.student_action_logs(reference_table, reference_id);

-- Add trigger for updated_at
CREATE TRIGGER update_student_action_logs_updated_at
  BEFORE UPDATE ON public.student_action_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for security
ALTER TABLE public.student_action_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for teachers to see their students' logs
CREATE POLICY "Teachers can view student action logs for their classes" 
  ON public.student_action_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM active_classes ac
      JOIN class_enrollments ce ON ac.id = ce.class_id
      JOIN student_profiles sp ON ce.student_profile_id = sp.id
      WHERE sp.authenticated_user_id = student_action_logs.student_id
      AND ac.teacher_id = auth.uid()
    )
  );

-- Create policy for students to view their own logs
CREATE POLICY "Students can view their own action logs" 
  ON public.student_action_logs 
  FOR SELECT 
  USING (auth.uid() = student_id);
