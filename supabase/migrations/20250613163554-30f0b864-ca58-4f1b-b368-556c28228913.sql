
-- Create the grading jobs queue table
CREATE TABLE IF NOT EXISTS grading_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  payload JSONB NOT NULL,
  result_payload JSONB,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  job_type TEXT DEFAULT 'grading',
  error_message TEXT,
  processing_time_ms INTEGER
);

-- Add indexes for efficient queue operations
CREATE INDEX IF NOT EXISTS idx_grading_jobs_status_priority_created 
  ON grading_jobs (status, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_grading_jobs_user_id 
  ON grading_jobs (user_id);

CREATE INDEX IF NOT EXISTS idx_grading_jobs_created_at 
  ON grading_jobs (created_at DESC);

-- Create rate limiting tracking table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_name, window_start)
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_service_window 
  ON api_rate_limits (service_name, window_start DESC);

-- Create job failures tracking table for monitoring
CREATE TABLE IF NOT EXISTS job_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES grading_jobs(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  retry_attempt INTEGER,
  failed_at TIMESTAMPTZ DEFAULT now(),
  context JSONB DEFAULT '{}'
);

-- Enable RLS on new tables
ALTER TABLE grading_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_failures ENABLE ROW LEVEL SECURITY;

-- RLS policies for grading_jobs
CREATE POLICY "Users can view their own grading jobs" 
  ON grading_jobs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grading jobs" 
  ON grading_jobs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all jobs (for background worker)
CREATE POLICY "Service role can manage all jobs" 
  ON grading_jobs FOR ALL 
  USING (auth.role() = 'service_role');

-- RLS policies for rate limits (service role only)
CREATE POLICY "Service role can manage rate limits" 
  ON api_rate_limits FOR ALL 
  USING (auth.role() = 'service_role');

-- RLS policies for job failures (service role only)
CREATE POLICY "Service role can manage job failures" 
  ON job_failures FOR ALL 
  USING (auth.role() = 'service_role');

-- Enable realtime for grading_jobs table
ALTER TABLE grading_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE grading_jobs;

-- Function to clean up old completed jobs (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_completed_grading_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM grading_jobs 
  WHERE status IN ('completed', 'failed') 
  AND completed_at < now() - interval '7 days';
END;
$$;

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_grading_queue_stats()
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
  FROM grading_jobs;
$$;
