
-- Create progress_metrics table for comprehensive progress tracking
CREATE TABLE public.progress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_type TEXT NOT NULL DEFAULT 'content', -- 'content' or 'subject'
  session_type TEXT NOT NULL DEFAULT 'practice', -- 'class_session', 'trailblazer', 'home_learner', 'practice'
  session_id UUID,
  accuracy NUMERIC DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  attempts_count INTEGER DEFAULT 1,
  misconception_detected BOOLEAN DEFAULT FALSE,
  misconception_subtype_id UUID REFERENCES public.misconception_subtypes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_progress_metrics_student_id ON public.progress_metrics(student_id);
CREATE INDEX idx_progress_metrics_skill_name ON public.progress_metrics(skill_name);
CREATE INDEX idx_progress_metrics_session_type ON public.progress_metrics(session_type);
CREATE INDEX idx_progress_metrics_created_at ON public.progress_metrics(created_at);

-- Enable RLS for progress_metrics
ALTER TABLE public.progress_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for progress_metrics
CREATE POLICY "Users can view their own progress metrics" 
  ON public.progress_metrics 
  FOR SELECT 
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students' progress metrics" 
  ON public.progress_metrics 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.active_classes ac
      JOIN public.class_enrollments ce ON ac.id = ce.class_id
      JOIN public.student_profiles sp ON ce.student_profile_id = sp.id
      WHERE ac.teacher_id = auth.uid() 
      AND sp.authenticated_user_id = progress_metrics.student_id
    )
  );

CREATE POLICY "System can insert progress metrics" 
  ON public.progress_metrics 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update progress metrics" 
  ON public.progress_metrics 
  FOR UPDATE 
  USING (true);

-- Create function to get student progress analytics
CREATE OR REPLACE FUNCTION public.get_student_progress_analytics(p_student_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  skill_name TEXT,
  skill_type TEXT,
  avg_accuracy NUMERIC,
  avg_confidence NUMERIC,
  total_attempts INTEGER,
  total_time_spent INTEGER,
  latest_accuracy NUMERIC,
  improvement_trend NUMERIC,
  session_types TEXT[]
)
LANGUAGE SQL
STABLE
AS $$
  WITH skill_stats AS (
    SELECT 
      pm.skill_name,
      pm.skill_type,
      ROUND(AVG(pm.accuracy), 2) as avg_accuracy,
      ROUND(AVG(pm.confidence_score), 2) as avg_confidence,
      COUNT(*)::INTEGER as total_attempts,
      SUM(pm.time_spent_seconds)::INTEGER as total_time_spent,
      ARRAY_AGG(DISTINCT pm.session_type) as session_types,
      (SELECT accuracy FROM public.progress_metrics 
       WHERE student_id = p_student_id 
       AND skill_name = pm.skill_name 
       ORDER BY created_at DESC LIMIT 1) as latest_accuracy,
      (SELECT accuracy FROM public.progress_metrics 
       WHERE student_id = p_student_id 
       AND skill_name = pm.skill_name 
       ORDER BY created_at ASC LIMIT 1) as first_accuracy
    FROM public.progress_metrics pm
    WHERE pm.student_id = p_student_id
    AND pm.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY pm.skill_name, pm.skill_type
  )
  SELECT 
    ss.skill_name,
    ss.skill_type,
    ss.avg_accuracy,
    ss.avg_confidence,
    ss.total_attempts,
    ss.total_time_spent,
    ss.latest_accuracy,
    ROUND(COALESCE(ss.latest_accuracy - ss.first_accuracy, 0), 2) as improvement_trend,
    ss.session_types
  FROM skill_stats ss
  ORDER BY ss.avg_accuracy DESC;
$$;

-- Create function to get class progress analytics
CREATE OR REPLACE FUNCTION public.get_class_progress_analytics(p_class_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  student_id UUID,
  student_name TEXT,
  skill_name TEXT,
  skill_type TEXT,
  accuracy NUMERIC,
  confidence_score NUMERIC,
  attempts_count INTEGER,
  misconceptions_count INTEGER,
  last_practiced_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    sp.authenticated_user_id as student_id,
    sp.student_name,
    pm.skill_name,
    pm.skill_type,
    ROUND(AVG(pm.accuracy), 2) as accuracy,
    ROUND(AVG(pm.confidence_score), 2) as confidence_score,
    COUNT(*)::INTEGER as attempts_count,
    COUNT(*) FILTER (WHERE pm.misconception_detected = true)::INTEGER as misconceptions_count,
    MAX(pm.created_at) as last_practiced_at
  FROM public.progress_metrics pm
  JOIN public.student_profiles sp ON pm.student_id = sp.authenticated_user_id
  JOIN public.class_enrollments ce ON sp.id = ce.student_profile_id
  WHERE ce.class_id = p_class_id
  AND ce.is_active = true
  AND pm.created_at >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY sp.authenticated_user_id, sp.student_name, pm.skill_name, pm.skill_type
  ORDER BY sp.student_name, pm.skill_name;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER update_progress_metrics_updated_at
  BEFORE UPDATE ON public.progress_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
