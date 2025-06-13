
-- Step 1: Add Composite Indexes for Better Query Performance
-- These indexes match the actual access patterns in the batch queue manager

-- Index for common polling query pattern (status + created_at ordering)
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at
  ON jobs (status, created_at);

-- Index for prioritization logic used during job selection
-- This covers the complex ORDER BY CASE statement for priority
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority_created_at
  ON jobs (status, priority, created_at);

-- Index for job ID + status lookups (used in status checks)
CREATE INDEX IF NOT EXISTS idx_jobs_id_status
  ON jobs (id, status);

-- Step 2: Create Side Table for Large Payload Data
-- This separates large JSONB fields from the main jobs table for better throughput
CREATE TABLE IF NOT EXISTS job_payloads (
  job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  files_data JSONB,
  results_data JSONB,
  errors_data JSONB,
  request_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on job_payloads for efficient lookups
CREATE INDEX IF NOT EXISTS idx_job_payloads_job_id
  ON job_payloads (job_id);

-- Step 3: Add monitoring view for performance tracking
CREATE OR REPLACE VIEW job_performance_stats AS
SELECT 
  status,
  COUNT(*) as job_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at))) as max_duration_seconds,
  MIN(created_at) as oldest_job,
  MAX(created_at) as newest_job
FROM jobs 
GROUP BY status;
