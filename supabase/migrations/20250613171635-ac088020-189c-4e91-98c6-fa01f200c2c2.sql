
-- Create file_jobs table for the decoupled processing queue
CREATE TABLE public.file_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  file_group_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  result_json JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.file_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for file_jobs
CREATE POLICY "Users can view their own file jobs" 
  ON public.file_jobs 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create file jobs" 
  ON public.file_jobs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can update file jobs" 
  ON public.file_jobs 
  FOR UPDATE 
  USING (true);

-- Create index for efficient job polling
CREATE INDEX idx_file_jobs_status_priority_created 
  ON public.file_jobs (status, priority DESC, created_at ASC);

-- Create index for user queries
CREATE INDEX idx_file_jobs_user_id 
  ON public.file_jobs (user_id);

-- Enable realtime for file_jobs
ALTER TABLE public.file_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_jobs;

-- Create function to get file job queue stats
CREATE OR REPLACE FUNCTION public.get_file_job_queue_stats()
RETURNS TABLE(
  pending_jobs INTEGER,
  processing_jobs INTEGER,
  completed_jobs_today INTEGER,
  failed_jobs_today INTEGER,
  avg_processing_time_ms NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_jobs,
    COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as processing_jobs,
    COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE)::INTEGER as completed_jobs_today,
    COUNT(*) FILTER (WHERE status = 'failed' AND completed_at >= CURRENT_DATE)::INTEGER as failed_jobs_today,
    ROUND(AVG(processing_time_ms) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE), 2) as avg_processing_time_ms
  FROM public.file_jobs;
$$;

-- Create function to claim and process file jobs
CREATE OR REPLACE FUNCTION public.claim_file_jobs(batch_size INTEGER DEFAULT 5)
RETURNS SETOF public.file_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lock and select up to batch_size pending jobs, then mark them processing
  RETURN QUERY
  WITH next_jobs AS (
    SELECT id 
    FROM public.file_jobs
    WHERE status = 'pending'
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 4
        WHEN 'high' THEN 3
        WHEN 'normal' THEN 2
        WHEN 'low' THEN 1
        ELSE 2
      END DESC,
      created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.file_jobs
  SET status = 'processing', 
      started_at = NOW(),
      updated_at = NOW()
  WHERE id IN (SELECT id FROM next_jobs)
  RETURNING *;
END;
$$;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_file_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_file_jobs_updated_at_trigger
    BEFORE UPDATE ON public.file_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_file_jobs_updated_at();
