
-- Create unified student results table
CREATE TABLE IF NOT EXISTS unified_student_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('class_session', 'trailblazer', 'home_learner', 'practice')),
    session_id UUID, -- References class_sessions.id, user_streaks.id, or student_practice_sessions.id
    skill_name TEXT NOT NULL,
    skill_type TEXT NOT NULL CHECK (skill_type IN ('content', 'subject')),
    score NUMERIC NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    points_possible INTEGER NOT NULL DEFAULT 0,
    exercise_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unified misconceptions table
CREATE TABLE IF NOT EXISTS unified_student_misconceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('class_session', 'trailblazer', 'home_learner', 'practice')),
    session_id UUID, -- References the session where misconception was detected
    skill_name TEXT NOT NULL,
    misconception_type TEXT NOT NULL,
    misconception_category TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    confidence_score NUMERIC DEFAULT 0.8,
    question_id TEXT,
    student_answer TEXT,
    correct_answer TEXT,
    context_data JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    persistence_count INTEGER DEFAULT 1,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_results_student_session ON unified_student_results(student_id, session_type);
CREATE INDEX IF NOT EXISTS idx_unified_results_skill ON unified_student_results(skill_name, skill_type);
CREATE INDEX IF NOT EXISTS idx_unified_misconceptions_student ON unified_student_misconceptions(student_id, session_type);
CREATE INDEX IF NOT EXISTS idx_unified_misconceptions_skill ON unified_student_misconceptions(skill_name, resolved);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_results_updated_at BEFORE UPDATE ON unified_student_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_unified_misconceptions_updated_at BEFORE UPDATE ON unified_student_misconceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get unified student performance
CREATE OR REPLACE FUNCTION get_unified_student_performance(p_student_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    skill_name TEXT,
    skill_type TEXT,
    avg_score NUMERIC,
    total_attempts INTEGER,
    best_score NUMERIC,
    latest_score NUMERIC,
    session_types TEXT[],
    last_practiced_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        usr.skill_name,
        usr.skill_type,
        ROUND(AVG(usr.score), 2) as avg_score,
        COUNT(*)::INTEGER as total_attempts,
        MAX(usr.score) as best_score,
        (SELECT score FROM unified_student_results WHERE student_id = p_student_id AND skill_name = usr.skill_name ORDER BY created_at DESC LIMIT 1) as latest_score,
        ARRAY_AGG(DISTINCT usr.session_type) as session_types,
        MAX(usr.created_at) as last_practiced_at
    FROM unified_student_results usr
    WHERE usr.student_id = p_student_id
    AND usr.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY usr.skill_name, usr.skill_type
    ORDER BY last_practiced_at DESC;
$$;

-- Function to get unified misconception analysis
CREATE OR REPLACE FUNCTION get_unified_misconception_analysis(p_student_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    skill_name TEXT,
    misconception_type TEXT,
    misconception_category TEXT,
    total_occurrences BIGINT,
    avg_persistence NUMERIC,
    severity_distribution JSONB,
    session_types TEXT[],
    resolved_count BIGINT,
    active_count BIGINT,
    latest_detection TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        usm.skill_name,
        usm.misconception_type,
        usm.misconception_category,
        COUNT(*) as total_occurrences,
        ROUND(AVG(usm.persistence_count), 2) as avg_persistence,
        JSON_BUILD_OBJECT(
            'low', COUNT(*) FILTER (WHERE severity = 'low'),
            'medium', COUNT(*) FILTER (WHERE severity = 'medium'),
            'high', COUNT(*) FILTER (WHERE severity = 'high')
        ) as severity_distribution,
        ARRAY_AGG(DISTINCT usm.session_type) as session_types,
        COUNT(*) FILTER (WHERE resolved = true) as resolved_count,
        COUNT(*) FILTER (WHERE resolved = false) as active_count,
        MAX(usm.detected_at) as latest_detection
    FROM unified_student_misconceptions usm
    WHERE usm.student_id = p_student_id
    AND usm.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY usm.skill_name, usm.misconception_type, usm.misconception_category
    ORDER BY total_occurrences DESC, latest_detection DESC;
$$;
