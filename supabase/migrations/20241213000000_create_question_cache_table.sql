
-- Create question_cache table for unified grading system
CREATE TABLE IF NOT EXISTS public.question_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  question_id TEXT NOT NULL,
  result JSONB NOT NULL,
  model TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_question_cache_key ON public.question_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_question_cache_expires ON public.question_cache(expires_at);

-- Add RLS policies
ALTER TABLE public.question_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage cache (used by edge functions)
CREATE POLICY "Service role can manage question cache" ON public.question_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read cache for performance
CREATE POLICY "Authenticated users can read question cache" ON public.question_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_question_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_question_cache_updated_at
  BEFORE UPDATE ON public.question_cache
  FOR EACH ROW EXECUTE FUNCTION update_question_cache_updated_at();
