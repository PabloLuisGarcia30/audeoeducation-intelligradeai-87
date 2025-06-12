
-- Trailblazer Learner: Complete Supabase Schema with RLS

-- Table: trailblazer_sessions
CREATE TABLE trailblazer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    focus_concept TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    actual_duration_minutes INTEGER,
    score_improvement FLOAT,
    session_date DATE DEFAULT CURRENT_DATE,
    mistake_types_encountered JSONB DEFAULT '[]'::jsonb,
    status TEXT CHECK (status IN ('started', 'completed', 'abandoned')) DEFAULT 'started',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: user_streaks
CREATE TABLE user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_session_date DATE,
    rescue_used_today BOOLEAN DEFAULT FALSE,
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: user_concept_mastery
CREATE TABLE user_concept_mastery (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    mastery_score FLOAT DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
    time_spent_minutes INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    mistake_history JSONB DEFAULT '{}'::jsonb,
    practice_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, concept)
);

-- Table: goal_history
CREATE TABLE goal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    concept TEXT NOT NULL,
    session_id UUID REFERENCES trailblazer_sessions(id) ON DELETE CASCADE,
    target_score FLOAT,
    achieved_score FLOAT,
    achieved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: learning_delta_log
CREATE TABLE learning_delta_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES trailblazer_sessions(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    initial_score FLOAT,
    final_score FLOAT,
    improvement FLOAT GENERATED ALWAYS AS (final_score - initial_score) STORED,
    mistake_types_fixed JSONB DEFAULT '{}'::jsonb,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: ai_prompt_personality
CREATE TABLE ai_prompt_personality (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_tone TEXT CHECK (preferred_tone IN ('snarky', 'encouraging', 'straight')) DEFAULT 'straight',
    learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')) DEFAULT 'mixed',
    difficulty_preference TEXT CHECK (difficulty_preference IN ('easy', 'medium', 'hard', 'adaptive')) DEFAULT 'adaptive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: daily_prompt_cache
CREATE TABLE daily_prompt_cache (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_type TEXT NOT NULL,
    generated_prompt TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, prompt_type)
);

-- Table: trailblazer_achievements
CREATE TABLE trailblazer_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security on all tables
ALTER TABLE trailblazer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delta_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_prompt_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailblazer_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see/modify their own data
CREATE POLICY "Users can view own trailblazer sessions" ON trailblazer_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trailblazer sessions" ON trailblazer_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trailblazer sessions" ON trailblazer_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON user_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own concept mastery" ON user_concept_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own concept mastery" ON user_concept_mastery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own concept mastery" ON user_concept_mastery FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own goal history" ON goal_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal history" ON goal_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own learning delta log" ON learning_delta_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning delta log" ON learning_delta_log FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own AI personality" ON ai_prompt_personality FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI personality" ON ai_prompt_personality FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI personality" ON ai_prompt_personality FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own prompt cache" ON daily_prompt_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompt cache" ON daily_prompt_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompt cache" ON daily_prompt_cache FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON trailblazer_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON trailblazer_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_trailblazer_sessions_user_id ON trailblazer_sessions(user_id);
CREATE INDEX idx_trailblazer_sessions_status ON trailblazer_sessions(status);
CREATE INDEX idx_trailblazer_sessions_date ON trailblazer_sessions(session_date);
CREATE INDEX idx_user_concept_mastery_user_id ON user_concept_mastery(user_id);
CREATE INDEX idx_user_concept_mastery_concept ON user_concept_mastery(concept);
CREATE INDEX idx_goal_history_user_id ON goal_history(user_id);
CREATE INDEX idx_learning_delta_log_user_id ON learning_delta_log(user_id);
CREATE INDEX idx_learning_delta_log_session_id ON learning_delta_log(session_id);
CREATE INDEX idx_trailblazer_achievements_user_id ON trailblazer_achievements(user_id);
CREATE INDEX idx_daily_prompt_cache_expires ON daily_prompt_cache(expires_at);

-- Helper Functions
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_session DATE;
    current_streak INTEGER;
    longest_streak INTEGER;
BEGIN
    -- Get user's last session date and current streak
    SELECT last_session_date, current_streak_days, longest_streak_days
    INTO last_session, current_streak, longest_streak
    FROM user_streaks 
    WHERE user_id = p_user_id;
    
    -- If no streak record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_streaks (user_id, current_streak_days, longest_streak_days, last_session_date, total_sessions)
        VALUES (p_user_id, 1, 1, CURRENT_DATE, 1);
        RETURN;
    END IF;
    
    -- Check if session is today
    IF last_session = CURRENT_DATE THEN
        -- Already practiced today, just increment total sessions
        UPDATE user_streaks 
        SET total_sessions = total_sessions + 1,
            updated_at = now()
        WHERE user_id = p_user_id;
    ELSIF last_session = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day, increment streak
        current_streak := current_streak + 1;
        longest_streak := GREATEST(longest_streak, current_streak);
        
        UPDATE user_streaks 
        SET current_streak_days = current_streak,
            longest_streak_days = longest_streak,
            last_session_date = CURRENT_DATE,
            total_sessions = total_sessions + 1,
            rescue_used_today = FALSE,
            updated_at = now()
        WHERE user_id = p_user_id;
    ELSE
        -- Streak broken, reset to 1
        UPDATE user_streaks 
        SET current_streak_days = 1,
            longest_streak_days = GREATEST(longest_streak, 1),
            last_session_date = CURRENT_DATE,
            total_sessions = total_sessions + 1,
            rescue_used_today = FALSE,
            updated_at = now()
        WHERE user_id = p_user_id;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_concept_mastery(
    p_user_id UUID,
    p_concept TEXT,
    p_score_change FLOAT,
    p_time_spent INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_concept_mastery (user_id, concept, mastery_score, time_spent_minutes, practice_count, last_practiced_at)
    VALUES (p_user_id, p_concept, GREATEST(0, LEAST(100, p_score_change)), p_time_spent, 1, now())
    ON CONFLICT (user_id, concept)
    DO UPDATE SET
        mastery_score = GREATEST(0, LEAST(100, user_concept_mastery.mastery_score + p_score_change)),
        time_spent_minutes = user_concept_mastery.time_spent_minutes + p_time_spent,
        practice_count = user_concept_mastery.practice_count + 1,
        last_practiced_at = now(),
        updated_at = now();
END;
$$;

-- Trigger to auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trailblazer_sessions_updated_at BEFORE UPDATE ON trailblazer_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_streaks_updated_at BEFORE UPDATE ON user_streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_concept_mastery_updated_at BEFORE UPDATE ON user_concept_mastery FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_prompt_personality_updated_at BEFORE UPDATE ON ai_prompt_personality FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
