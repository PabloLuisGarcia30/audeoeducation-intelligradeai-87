
-- Create adaptive_learning_metrics table for tracking learning analytics
CREATE TABLE public.adaptive_learning_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('engagement', 'mastery_time', 'difficulty_accuracy', 'retention_rate', 'recommendation_effectiveness')),
  metric_value NUMERIC NOT NULL,
  skill_context TEXT,
  session_context TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.adaptive_learning_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for adaptive_learning_metrics
CREATE POLICY "Users can view their own learning metrics" 
  ON public.adaptive_learning_metrics 
  FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Users can insert their own learning metrics" 
  ON public.adaptive_learning_metrics 
  FOR INSERT 
  WITH CHECK (student_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_adaptive_learning_metrics_student_id ON public.adaptive_learning_metrics(student_id);
CREATE INDEX idx_adaptive_learning_metrics_timestamp ON public.adaptive_learning_metrics(timestamp);
CREATE INDEX idx_adaptive_learning_metrics_type ON public.adaptive_learning_metrics(metric_type);
