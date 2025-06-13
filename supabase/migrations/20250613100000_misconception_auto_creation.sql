
-- Create table to track auto-created misconceptions
CREATE TABLE public.misconception_auto_creation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Subtype information
  subtype_id UUID NOT NULL REFERENCES public.misconception_subtypes(id),
  subtype_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  
  -- Analysis details
  confidence NUMERIC NOT NULL,
  reasoning TEXT NOT NULL,
  auto_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Context
  context_data JSONB DEFAULT '{}'
);

-- Create table for review queue of misconceptions that need manual approval
CREATE TABLE public.misconception_review_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Proposed misconception details
  subtype_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Analysis context
  confidence NUMERIC NOT NULL,
  reasoning TEXT NOT NULL,
  context_evidence TEXT NOT NULL,
  
  -- Review status
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'merged')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- If approved, reference to created subtype
  created_subtype_id UUID REFERENCES public.misconception_subtypes(id)
);

-- Add indexes for performance
CREATE INDEX idx_misconception_auto_creation_log_subtype_id ON public.misconception_auto_creation_log(subtype_id);
CREATE INDEX idx_misconception_auto_creation_log_created_at ON public.misconception_auto_creation_log(auto_created_at);
CREATE INDEX idx_misconception_review_queue_status ON public.misconception_review_queue(status);
CREATE INDEX idx_misconception_review_queue_created_at ON public.misconception_review_queue(created_at);

-- Add updated_at trigger for review queue
CREATE TRIGGER update_misconception_review_queue_updated_at
  BEFORE UPDATE ON public.misconception_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.misconception_auto_creation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misconception_review_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for teachers to view auto-creation logs
CREATE POLICY "Teachers can view auto-creation logs for their students" 
  ON public.misconception_auto_creation_log 
  FOR SELECT 
  USING (true); -- For now, allow all authenticated users to view logs

-- Create policies for review queue
CREATE POLICY "Teachers can view review queue" 
  ON public.misconception_review_queue 
  FOR SELECT 
  USING (true);

CREATE POLICY "Teachers can update review queue" 
  ON public.misconception_review_queue 
  FOR UPDATE 
  USING (true);

CREATE POLICY "System can insert into review queue" 
  ON public.misconception_review_queue 
  FOR INSERT 
  WITH CHECK (true);
