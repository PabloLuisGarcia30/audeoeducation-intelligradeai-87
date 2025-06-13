
-- Phase 1: Enhanced Student Learning Profile Database Schema

-- Create adaptive learning profiles table
CREATE TABLE public.adaptive_learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Learning velocity and patterns
  learning_velocity NUMERIC DEFAULT 1.0, -- How fast student learns (relative to average)
  confidence_trend TEXT DEFAULT 'stable', -- 'improving', 'declining', 'stable'
  engagement_score NUMERIC DEFAULT 0.75, -- 0.0 to 1.0
  
  -- Learning modalities (preferences)
  preferred_explanation_style TEXT DEFAULT 'mixed', -- 'visual', 'textual', 'step-by-step', 'conceptual', 'mixed'
  learning_modality TEXT DEFAULT 'mixed', -- 'visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed'
  
  -- Session patterns
  optimal_session_length_minutes INTEGER DEFAULT 25,
  optimal_difficulty_progression TEXT DEFAULT 'gradual', -- 'rapid', 'gradual', 'plateau'
  fatigue_threshold_minutes INTEGER DEFAULT 45,
  
  -- Cognitive patterns
  cognitive_load_tolerance TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  help_seeking_frequency TEXT DEFAULT 'moderate', -- 'rare', 'moderate', 'frequent'
  mistake_recovery_style TEXT DEFAULT 'reflective', -- 'quick', 'reflective', 'methodical'
  
  -- Adaptive metrics
  zone_of_proximal_development JSONB DEFAULT '{"lower_bound": 0.6, "upper_bound": 0.85}'::jsonb,
  scaffolding_preferences JSONB DEFAULT '{"hints": true, "examples": true, "step_by_step": false}'::jsonb
);

-- Create learning trajectory events table
CREATE TABLE public.learning_trajectory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  session_id UUID,
  event_type TEXT NOT NULL, -- 'breakthrough', 'struggle', 'plateau', 'confusion', 'mastery'
  skill_name TEXT NOT NULL,
  skill_type TEXT NOT NULL, -- 'content', 'subject'
  
  -- Event context
  difficulty_level TEXT NOT NULL, -- 'easy', 'medium', 'hard', 'adaptive'
  confidence_before NUMERIC,
  confidence_after NUMERIC,
  performance_before NUMERIC,
  performance_after NUMERIC,
  
  -- Learning indicators
  time_to_resolution_seconds INTEGER,
  help_requests_count INTEGER DEFAULT 0,
  explanation_attempts_count INTEGER DEFAULT 1,
  successful_explanation_type TEXT, -- What worked for this student
  
  -- Context data
  question_context JSONB DEFAULT '{}'::jsonb,
  behavioral_signals JSONB DEFAULT '{}'::jsonb,
  intervention_triggered BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation analytics table
CREATE TABLE public.conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  
  -- Conversation metrics
  total_messages INTEGER DEFAULT 0,
  student_messages INTEGER DEFAULT 0,
  ai_responses INTEGER DEFAULT 0,
  
  -- Effectiveness indicators
  confusion_indicators INTEGER DEFAULT 0, -- Questions like "I don't understand"
  breakthrough_indicators INTEGER DEFAULT 0, -- "Oh I get it now!"
  help_requests INTEGER DEFAULT 0,
  topic_changes INTEGER DEFAULT 0,
  
  -- Learning outcomes
  skills_practiced TEXT[] DEFAULT ARRAY[]::TEXT[],
  concepts_clarified TEXT[] DEFAULT ARRAY[]::TEXT[],
  misconceptions_addressed TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty_adjustments_made INTEGER DEFAULT 0,
  
  -- Session context
  session_duration_minutes INTEGER,
  explanation_styles_used TEXT[] DEFAULT ARRAY[]::TEXT[],
  student_satisfaction_score NUMERIC, -- If we can infer it
  learning_objectives_achieved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create adaptive recommendations log table
CREATE TABLE public.adaptive_recommendations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'difficulty_adjustment', 'explanation_style', 'scaffolding', 'break_suggestion'
  
  -- Recommendation context
  trigger_event TEXT NOT NULL, -- What caused this recommendation
  skill_context TEXT NOT NULL,
  current_performance NUMERIC,
  current_confidence NUMERIC,
  
  -- Recommendation details
  recommendation_data JSONB NOT NULL,
  rationale TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0.75, -- How confident the system is in this recommendation
  
  -- Outcome tracking
  was_implemented BOOLEAN DEFAULT false,
  implementation_timestamp TIMESTAMP WITH TIME ZONE,
  effectiveness_score NUMERIC, -- Measured later
  student_response TEXT, -- 'positive', 'negative', 'neutral'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_adaptive_learning_profiles_student_id ON public.adaptive_learning_profiles(student_id);
CREATE INDEX idx_learning_trajectory_events_student_id ON public.learning_trajectory_events(student_id);
CREATE INDEX idx_learning_trajectory_events_skill ON public.learning_trajectory_events(skill_name, skill_type);
CREATE INDEX idx_learning_trajectory_events_event_type ON public.learning_trajectory_events(event_type);
CREATE INDEX idx_conversation_analytics_student_id ON public.conversation_analytics(student_id);
CREATE INDEX idx_adaptive_recommendations_log_student_id ON public.adaptive_recommendations_log(student_id);
CREATE INDEX idx_adaptive_recommendations_log_type ON public.adaptive_recommendations_log(recommendation_type);

-- Add updated_at triggers
CREATE TRIGGER update_adaptive_learning_profiles_updated_at
  BEFORE UPDATE ON public.adaptive_learning_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_analytics_updated_at
  BEFORE UPDATE ON public.conversation_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.adaptive_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_trajectory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_recommendations_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own adaptive learning profile" 
  ON public.adaptive_learning_profiles 
  FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Users can update their own adaptive learning profile" 
  ON public.adaptive_learning_profiles 
  FOR UPDATE 
  USING (student_id = auth.uid());

CREATE POLICY "System can manage adaptive learning profiles" 
  ON public.adaptive_learning_profiles 
  FOR ALL 
  USING (true);

CREATE POLICY "Users can view their own learning trajectory events" 
  ON public.learning_trajectory_events 
  FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "System can create learning trajectory events" 
  ON public.learning_trajectory_events 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own conversation analytics" 
  ON public.conversation_analytics 
  FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "System can manage conversation analytics" 
  ON public.conversation_analytics 
  FOR ALL 
  USING (true);

CREATE POLICY "Users can view their own recommendations" 
  ON public.adaptive_recommendations_log 
  FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "System can manage recommendations" 
  ON public.adaptive_recommendations_log 
  FOR ALL 
  USING (true);

-- Create database functions for adaptive learning

-- Function to get or create adaptive learning profile
CREATE OR REPLACE FUNCTION public.get_or_create_adaptive_profile(p_student_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Try to get existing profile
  SELECT id INTO profile_id
  FROM public.adaptive_learning_profiles
  WHERE student_id = p_student_id;
  
  -- Create if doesn't exist
  IF profile_id IS NULL THEN
    INSERT INTO public.adaptive_learning_profiles (student_id)
    VALUES (p_student_id)
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;

-- Function to update learning velocity based on recent performance
CREATE OR REPLACE FUNCTION public.update_learning_velocity(p_student_id UUID, p_performance_change NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_velocity NUMERIC;
  new_velocity NUMERIC;
BEGIN
  -- Get current velocity
  SELECT learning_velocity INTO current_velocity
  FROM public.adaptive_learning_profiles
  WHERE student_id = p_student_id;
  
  -- Calculate new velocity (weighted average)
  new_velocity := COALESCE(current_velocity, 1.0) * 0.8 + (p_performance_change * 0.2);
  new_velocity := GREATEST(0.1, LEAST(3.0, new_velocity)); -- Clamp between 0.1 and 3.0
  
  -- Update profile
  UPDATE public.adaptive_learning_profiles
  SET learning_velocity = new_velocity,
      updated_at = now()
  WHERE student_id = p_student_id;
END;
$$;

-- Function to log learning trajectory events
CREATE OR REPLACE FUNCTION public.log_learning_event(
  p_student_id UUID,
  p_event_type TEXT,
  p_skill_name TEXT,
  p_skill_type TEXT,
  p_difficulty_level TEXT,
  p_performance_change NUMERIC DEFAULT NULL,
  p_confidence_change NUMERIC DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.learning_trajectory_events (
    student_id,
    event_type,
    skill_name,
    skill_type,
    difficulty_level,
    performance_after,
    confidence_after,
    question_context
  )
  VALUES (
    p_student_id,
    p_event_type,
    p_skill_name,
    p_skill_type,
    p_difficulty_level,
    p_performance_change,
    p_confidence_change,
    p_context
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;
