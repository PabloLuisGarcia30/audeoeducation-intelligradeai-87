
-- Function to add misconception ID to session's misconception_ids array
CREATE OR REPLACE FUNCTION add_misconception_to_session(
  p_session_id UUID,
  p_misconception_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE trailblazer_sessions 
  SET misconception_ids = array_append(
    COALESCE(misconception_ids, '{}'), 
    p_misconception_id
  )
  WHERE id = p_session_id
  AND NOT (p_misconception_id = ANY(COALESCE(misconception_ids, '{}')));
END;
$$;

-- Function to get comprehensive session analytics with misconceptions
CREATE OR REPLACE FUNCTION get_session_analytics_with_misconceptions(
  p_session_id UUID
) RETURNS TABLE(
  session_id UUID,
  total_misconceptions BIGINT,
  resolved_misconceptions BIGINT,
  persistent_misconceptions BIGINT,
  misconception_categories TEXT[],
  session_duration INTEGER,
  score_improvement DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ts.id as session_id,
    COUNT(tsm.id) as total_misconceptions,
    COUNT(tsm.id) FILTER (WHERE tsm.resolution_status = 'resolved') as resolved_misconceptions,
    COUNT(tsm.id) FILTER (WHERE tsm.resolution_status = 'persistent') as persistent_misconceptions,
    ARRAY[]::TEXT[] as misconception_categories, -- Will be enhanced with actual categories later
    ts.actual_duration_minutes as session_duration,
    ts.score_improvement
  FROM trailblazer_sessions ts
  LEFT JOIN trailblazer_session_misconceptions tsm ON ts.id = tsm.session_id
  WHERE ts.id = p_session_id
  GROUP BY ts.id, ts.actual_duration_minutes, ts.score_improvement;
$$;
