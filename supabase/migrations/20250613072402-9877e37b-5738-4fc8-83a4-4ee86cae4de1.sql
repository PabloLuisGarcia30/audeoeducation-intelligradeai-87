
-- Create tables for AI Supercoach system
CREATE TABLE public.mini_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Core lesson data
  misconception_subtype_id UUID NOT NULL REFERENCES public.misconception_subtypes(id),
  student_id UUID REFERENCES auth.users(id), -- For personalized lessons
  lesson_content TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'adaptive',
  
  -- Generation metadata
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  triggered_by TEXT DEFAULT 'student_request' CHECK (triggered_by IN ('student_request', 'teacher_request', 'ai_generated')),
  generation_context JSONB DEFAULT '{}',
  effectiveness_score NUMERIC DEFAULT NULL,
  
  -- Usage tracking
  viewed_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE public.mini_lesson_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Request details
  student_id UUID NOT NULL REFERENCES auth.users(id),
  misconception_subtype_id UUID NOT NULL REFERENCES public.misconception_subtypes(id),
  request_context JSONB DEFAULT '{}',
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  mini_lesson_id UUID REFERENCES public.mini_lessons(id),
  error_message TEXT DEFAULT NULL
);

CREATE TABLE public.predictive_misconception_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Alert details
  student_id UUID NOT NULL REFERENCES auth.users(id),
  question_id TEXT NOT NULL,
  exercise_id UUID DEFAULT NULL,
  exam_id TEXT DEFAULT NULL,
  
  -- Prediction data
  predicted_misconception_subtype_id UUID REFERENCES public.misconception_subtypes(id),
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Behavioral signals that triggered prediction
  behavioral_signals JSONB DEFAULT '{}', -- time_spent, answer_changes, hesitation_patterns
  
  -- Resolution tracking
  resolved BOOLEAN DEFAULT false,
  resolution_type TEXT DEFAULT NULL CHECK (resolution_type IN ('false_positive', 'mini_lesson_helped', 'student_self_corrected', 'teacher_intervention')),
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Add indexes for performance
CREATE INDEX idx_mini_lessons_misconception_subtype ON public.mini_lessons(misconception_subtype_id);
CREATE INDEX idx_mini_lessons_student_id ON public.mini_lessons(student_id);
CREATE INDEX idx_mini_lesson_requests_student ON public.mini_lesson_requests(student_id);
CREATE INDEX idx_mini_lesson_requests_status ON public.mini_lesson_requests(status);
CREATE INDEX idx_predictive_alerts_student ON public.predictive_misconception_alerts(student_id);
CREATE INDEX idx_predictive_alerts_resolved ON public.predictive_misconception_alerts(resolved);

-- Add updated_at trigger for mini_lessons
CREATE TRIGGER update_mini_lessons_updated_at
  BEFORE UPDATE ON public.mini_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.mini_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_lesson_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_misconception_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for students to access their own data
CREATE POLICY "Students can view their own mini lessons" 
  ON public.mini_lessons 
  FOR SELECT 
  USING (student_id = auth.uid() OR student_id IS NULL);

CREATE POLICY "Students can view their own mini lesson requests" 
  ON public.mini_lesson_requests 
  FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Students can create mini lesson requests" 
  ON public.mini_lesson_requests 
  FOR INSERT 
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their own predictive alerts" 
  ON public.predictive_misconception_alerts 
  FOR SELECT 
  USING (student_id = auth.uid());

-- Create policies for teachers to access their students' data
CREATE POLICY "Teachers can view all mini lessons" 
  ON public.mini_lessons 
  FOR ALL 
  USING (true); -- Teachers can see all for classroom management

CREATE POLICY "Teachers can view all mini lesson requests" 
  ON public.mini_lesson_requests 
  FOR ALL 
  USING (true);

CREATE POLICY "Teachers can view all predictive alerts" 
  ON public.predictive_misconception_alerts 
  FOR ALL 
  USING (true);

CREATE POLICY "System can insert predictive alerts" 
  ON public.predictive_misconception_alerts 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update predictive alerts" 
  ON public.predictive_misconception_alerts 
  FOR UPDATE 
  USING (true);
