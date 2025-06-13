
-- Create table to track auto-created skills
CREATE TABLE public.skill_auto_creation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Skill information
  skill_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('content', 'subject')),
  skill_description TEXT NOT NULL,
  
  -- Analysis details
  confidence NUMERIC NOT NULL,
  reasoning TEXT NOT NULL,
  auto_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Context
  exam_id TEXT NOT NULL,
  class_id UUID NOT NULL,
  context_data JSONB DEFAULT '{}'
);

-- Create table for review queue of skills that need manual approval
CREATE TABLE public.skill_review_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Proposed skill details
  skill_name TEXT NOT NULL,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('content', 'subject')),
  skill_description TEXT NOT NULL,
  topic TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  
  -- Analysis context
  confidence NUMERIC NOT NULL,
  reasoning TEXT NOT NULL,
  context_evidence TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  class_id UUID NOT NULL,
  
  -- Review status
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'merged')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- If approved, reference to created skill
  created_skill_id UUID,
  created_skill_type TEXT CHECK (created_skill_type IN ('content', 'subject'))
);

-- Add indexes for performance
CREATE INDEX idx_skill_auto_creation_log_skill_id ON public.skill_auto_creation_log(skill_id);
CREATE INDEX idx_skill_auto_creation_log_exam_id ON public.skill_auto_creation_log(exam_id);
CREATE INDEX idx_skill_auto_creation_log_created_at ON public.skill_auto_creation_log(auto_created_at);
CREATE INDEX idx_skill_review_queue_status ON public.skill_review_queue(status);
CREATE INDEX idx_skill_review_queue_exam_id ON public.skill_review_queue(exam_id);
CREATE INDEX idx_skill_review_queue_created_at ON public.skill_review_queue(created_at);

-- Add updated_at trigger for review queue
CREATE TRIGGER update_skill_review_queue_updated_at
  BEFORE UPDATE ON public.skill_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.skill_auto_creation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_review_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for teachers to view auto-creation logs
CREATE POLICY "Teachers can view auto-creation logs" 
  ON public.skill_auto_creation_log 
  FOR SELECT 
  USING (true);

-- Create policies for review queue
CREATE POLICY "Teachers can view skill review queue" 
  ON public.skill_review_queue 
  FOR SELECT 
  USING (true);

CREATE POLICY "Teachers can update skill review queue" 
  ON public.skill_review_queue 
  FOR UPDATE 
  USING (true);

CREATE POLICY "System can insert into skill review queue" 
  ON public.skill_review_queue 
  FOR INSERT 
  WITH CHECK (true);

-- Add new columns to exam_skill_mappings for auto-created skills
ALTER TABLE public.exam_skill_mappings 
ADD COLUMN auto_created_skill BOOLEAN DEFAULT FALSE,
ADD COLUMN suggested_skill_name TEXT,
ADD COLUMN suggested_skill_description TEXT,
ADD COLUMN creation_confidence NUMERIC;
