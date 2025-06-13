
-- Create escalation_outcomes table for tracking GPT ambiguities and fallback paths
CREATE TABLE public.escalation_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Context identifiers
  student_id UUID,
  exam_id TEXT,
  question_id TEXT,
  session_id UUID,
  
  -- Escalation details
  escalation_type TEXT NOT NULL CHECK (escalation_type IN ('skill_ambiguity', 'fallback_triggered', 'model_escalation', 'validation_failure')),
  original_service TEXT NOT NULL, -- Which service triggered the escalation
  ambiguity_description TEXT NOT NULL,
  selected_solution TEXT NOT NULL,
  fallback_path TEXT,
  
  -- Decision tracking
  original_confidence NUMERIC,
  final_confidence NUMERIC,
  models_used TEXT[], -- Array of models involved
  processing_time_ms INTEGER,
  
  -- Outcome tracking
  success BOOLEAN,
  quality_score NUMERIC,
  cost_impact NUMERIC,
  
  -- Additional context
  context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Add indexes for common query patterns
CREATE INDEX idx_escalation_outcomes_student_id ON public.escalation_outcomes(student_id);
CREATE INDEX idx_escalation_outcomes_exam_id ON public.escalation_outcomes(exam_id);
CREATE INDEX idx_escalation_outcomes_escalation_type ON public.escalation_outcomes(escalation_type);
CREATE INDEX idx_escalation_outcomes_created_at ON public.escalation_outcomes(created_at);
CREATE INDEX idx_escalation_outcomes_original_service ON public.escalation_outcomes(original_service);

-- Add updated_at trigger
CREATE TRIGGER update_escalation_outcomes_updated_at
  BEFORE UPDATE ON public.escalation_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (optional - adjust based on your security needs)
ALTER TABLE public.escalation_outcomes ENABLE ROW LEVEL SECURITY;

-- Create policy for teachers to view escalations for their students
CREATE POLICY "Teachers can view escalation outcomes for their students" 
  ON public.escalation_outcomes 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.active_classes ac
      JOIN public.class_enrollments ce ON ac.id = ce.class_id
      JOIN public.student_profiles sp ON ce.student_profile_id = sp.id
      WHERE sp.authenticated_user_id = escalation_outcomes.student_id
      AND ac.teacher_id = auth.uid()
    )
  );

-- Create policy for system inserts
CREATE POLICY "System can insert escalation outcomes" 
  ON public.escalation_outcomes 
  FOR INSERT 
  WITH CHECK (true);
