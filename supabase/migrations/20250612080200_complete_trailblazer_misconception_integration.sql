
-- Complete the Trailblazer-Misconception integration with additional functions and optimizations

-- Function to get session misconception summary
CREATE OR REPLACE FUNCTION get_session_misconception_summary(
  p_session_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_misconceptions', COUNT(*),
    'resolved_count', COUNT(*) FILTER (WHERE resolution_status = 'resolved'),
    'persistent_count', COUNT(*) FILTER (WHERE resolution_status = 'persistent'),
    'unresolved_count', COUNT(*) FILTER (WHERE resolution_status = 'detected'),
    'resolution_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE resolution_status = 'resolved')::numeric / COUNT(*)) * 100, 2)
        ELSE 0 
      END,
    'misconception_timeline', array_agg(
      jsonb_build_object(
        'sequence', question_sequence,
        'time_occurred', time_occurred,
        'status', resolution_status
      ) ORDER BY time_occurred
    )
  )
  INTO result
  FROM trailblazer_session_misconceptions
  WHERE session_id = p_session_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to update session misconception summary automatically
CREATE OR REPLACE FUNCTION update_session_misconception_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE trailblazer_sessions 
  SET misconception_summary = get_session_misconception_summary(NEW.session_id)
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically update misconception summary when misconceptions change
CREATE TRIGGER trigger_update_session_misconception_summary
  AFTER INSERT OR UPDATE OR DELETE ON trailblazer_session_misconceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_misconception_summary();

-- Add RLS policies for the new table
ALTER TABLE trailblazer_session_misconceptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access misconceptions for their own sessions
CREATE POLICY "Users can view their own session misconceptions" 
  ON trailblazer_session_misconceptions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM trailblazer_sessions ts 
      WHERE ts.id = trailblazer_session_misconceptions.session_id 
      AND ts.user_id = auth.uid()
    )
  );

-- Policy: Users can create misconceptions for their own sessions
CREATE POLICY "Users can create misconceptions for their own sessions" 
  ON trailblazer_session_misconceptions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trailblazer_sessions ts 
      WHERE ts.id = trailblazer_session_misconceptions.session_id 
      AND ts.user_id = auth.uid()
    )
  );

-- Policy: Users can update misconceptions for their own sessions
CREATE POLICY "Users can update their own session misconceptions" 
  ON trailblazer_session_misconceptions 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM trailblazer_sessions ts 
      WHERE ts.id = trailblazer_session_misconceptions.session_id 
      AND ts.user_id = auth.uid()
    )
  );

-- Function to get comprehensive session analytics for teachers
CREATE OR REPLACE FUNCTION get_teacher_session_analytics(
  p_teacher_user_id UUID,
  p_class_id UUID DEFAULT NULL
) RETURNS TABLE(
  session_id UUID,
  student_name TEXT,
  focus_concept TEXT,
  session_duration INTEGER,
  total_misconceptions BIGINT,
  resolved_misconceptions BIGINT,
  learning_progress NUMERIC,
  session_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    ts.id as session_id,
    sp.student_name,
    ts.focus_concept,
    ts.actual_duration_minutes as session_duration,
    COALESCE(tsm_stats.total_misconceptions, 0) as total_misconceptions,
    COALESCE(tsm_stats.resolved_misconceptions, 0) as resolved_misconceptions,
    CASE 
      WHEN COALESCE(tsm_stats.total_misconceptions, 0) > 0 THEN
        ROUND((COALESCE(tsm_stats.resolved_misconceptions, 0)::numeric / tsm_stats.total_misconceptions) * 100, 2)
      ELSE 100
    END as learning_progress,
    ts.created_at as session_date
  FROM trailblazer_sessions ts
  JOIN student_profiles sp ON sp.authenticated_user_id = ts.user_id
  JOIN class_enrollments ce ON ce.student_profile_id = sp.id
  JOIN active_classes ac ON ac.id = ce.class_id
  LEFT JOIN (
    SELECT 
      session_id,
      COUNT(*) as total_misconceptions,
      COUNT(*) FILTER (WHERE resolution_status = 'resolved') as resolved_misconceptions
    FROM trailblazer_session_misconceptions
    GROUP BY session_id
  ) tsm_stats ON tsm_stats.session_id = ts.id
  WHERE ac.teacher_id = p_teacher_user_id
    AND (p_class_id IS NULL OR ac.id = p_class_id)
    AND ts.status = 'completed'
  ORDER BY ts.created_at DESC;
$$;
