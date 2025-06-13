
-- Create atomic job claiming function with row-level locking
CREATE OR REPLACE FUNCTION claim_pending_jobs(batch_size INT)
RETURNS SETOF jobs
LANGUAGE plpgsql AS $$
BEGIN
  -- Lock and select up to batch_size pending jobs, then mark them processing
  RETURN QUERY
  WITH next_jobs AS (
    SELECT id 
    FROM jobs
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
  UPDATE jobs
  SET status = 'processing', started_at = NOW()
  WHERE id IN (SELECT id FROM next_jobs)
  RETURNING *;
END;
$$;

-- Create advisory lock functions for distributed coordination
CREATE OR REPLACE FUNCTION try_acquire_queue_lock()
RETURNS BOOLEAN AS $$
  SELECT pg_try_advisory_lock(123456789);  -- Unique lock ID for queue management
$$ LANGUAGE sql VOLATILE;

CREATE OR REPLACE FUNCTION release_queue_lock()
RETURNS BOOLEAN AS $$
  SELECT pg_advisory_unlock(123456789);
$$ LANGUAGE sql VOLATILE;

-- Create function to get current processing job count
CREATE OR REPLACE FUNCTION get_processing_job_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM jobs WHERE status = 'processing';
$$ LANGUAGE sql STABLE;
