
-- Create student_goals table for storing AI-suggested and user-selected goals
CREATE TABLE public.student_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  goal_title TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  goal_type TEXT NOT NULL, -- 'skill_mastery', 'misconception_resolution', 'learning_velocity', 'consistency', 'time_based'
  target_value NUMERIC NOT NULL, -- Target value (e.g., 85 for 85% accuracy)
  current_value NUMERIC DEFAULT 0, -- Current progress value
  target_skill_name TEXT, -- Skill this goal targets (if applicable)
  target_misconception_id UUID, -- Misconception this goal targets (if applicable)
  is_ai_suggested BOOLEAN DEFAULT false,
  ai_confidence_score NUMERIC DEFAULT 0, -- How confident AI is in this goal
  difficulty_level TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  target_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'expired'
  progress_percentage NUMERIC DEFAULT 0, -- 0-100
  milestones JSONB DEFAULT '[]'::jsonb, -- Array of milestone objects
  context_data JSONB DEFAULT '{}'::jsonb, -- Additional context for goal generation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (target_misconception_id) REFERENCES public.misconception_subtypes(id)
);

-- Create goal_achievements table for tracking completion events
CREATE TABLE public.goal_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  goal_id UUID NOT NULL REFERENCES public.student_goals(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL, -- 'milestone', 'goal_completion', 'streak'
  achievement_title TEXT NOT NULL,
  achievement_description TEXT,
  value_achieved NUMERIC,
  progress_snapshot JSONB DEFAULT '{}'::jsonb, -- Snapshot of progress data at achievement
  celebration_shown BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_recommendations_log table for tracking AI recommendation effectiveness
CREATE TABLE public.goal_recommendations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  recommended_goals JSONB NOT NULL, -- Array of AI-suggested goals
  student_performance_data JSONB NOT NULL, -- Snapshot of performance data used
  misconception_data JSONB DEFAULT '{}'::jsonb, -- Misconceptions considered
  recommendation_reasoning TEXT,
  goals_accepted INTEGER DEFAULT 0, -- How many goals student accepted
  goals_completed INTEGER DEFAULT 0, -- How many were eventually completed
  effectiveness_score NUMERIC, -- Calculated later based on outcomes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_student_goals_student_id ON public.student_goals(student_id);
CREATE INDEX idx_student_goals_status ON public.student_goals(status);
CREATE INDEX idx_student_goals_target_skill ON public.student_goals(target_skill_name);
CREATE INDEX idx_goal_achievements_student_id ON public.goal_achievements(student_id);
CREATE INDEX idx_goal_achievements_goal_id ON public.goal_achievements(goal_id);
CREATE INDEX idx_goal_recommendations_log_student_id ON public.goal_recommendations_log(student_id);

-- Enable RLS for all goal-related tables
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_recommendations_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_goals
CREATE POLICY "Users can view their own goals" 
  ON public.student_goals 
  FOR SELECT 
  USING (auth.uid() = student_id);

CREATE POLICY "Users can create their own goals" 
  ON public.student_goals 
  FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own goals" 
  ON public.student_goals 
  FOR UPDATE 
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students' goals" 
  ON public.student_goals 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.active_classes ac
      JOIN public.class_enrollments ce ON ac.id = ce.class_id
      JOIN public.student_profiles sp ON ce.student_profile_id = sp.id
      WHERE ac.teacher_id = auth.uid() 
      AND sp.authenticated_user_id = student_goals.student_id
    )
  );

-- RLS policies for goal_achievements
CREATE POLICY "Users can view their own achievements" 
  ON public.goal_achievements 
  FOR SELECT 
  USING (auth.uid() = student_id);

CREATE POLICY "System can insert achievements" 
  ON public.goal_achievements 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Teachers can view their students' achievements" 
  ON public.goal_achievements 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.active_classes ac
      JOIN public.class_enrollments ce ON ac.id = ce.class_id
      JOIN public.student_profiles sp ON ce.student_profile_id = sp.id
      WHERE ac.teacher_id = auth.uid() 
      AND sp.authenticated_user_id = goal_achievements.student_id
    )
  );

-- RLS policies for goal_recommendations_log
CREATE POLICY "Users can view their own recommendations" 
  ON public.goal_recommendations_log 
  FOR SELECT 
  USING (auth.uid() = student_id);

CREATE POLICY "System can insert recommendations" 
  ON public.goal_recommendations_log 
  FOR INSERT 
  WITH CHECK (true);

-- Database functions for goal management
CREATE OR REPLACE FUNCTION public.calculate_goal_progress(p_goal_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    CASE 
      WHEN sg.target_value = 0 THEN 100
      ELSE LEAST(100, (sg.current_value / sg.target_value) * 100)
    END
  FROM public.student_goals sg
  WHERE sg.id = p_goal_id;
$$;

CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Update progress percentage when current_value changes
  NEW.progress_percentage = LEAST(100, CASE 
    WHEN NEW.target_value = 0 THEN 100
    ELSE (NEW.current_value / NEW.target_value) * 100
  END);
  
  -- Mark as completed if progress reaches 100%
  IF NEW.progress_percentage >= 100 AND OLD.status != 'completed' THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic goal progress updates
CREATE TRIGGER update_goal_progress_trigger
  BEFORE UPDATE ON public.student_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goal_progress();

-- Function to get student goal analytics
CREATE OR REPLACE FUNCTION public.get_student_goal_analytics(p_student_id UUID)
RETURNS TABLE(
  total_goals INTEGER,
  active_goals INTEGER,
  completed_goals INTEGER,
  avg_completion_time_days NUMERIC,
  most_successful_goal_type TEXT,
  current_streaks JSONB
)
LANGUAGE SQL
STABLE
AS $$
  WITH goal_stats AS (
    SELECT 
      COUNT(*) as total_goals,
      COUNT(*) FILTER (WHERE status = 'active') as active_goals,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
      AVG(EXTRACT(DAY FROM (completed_at - created_at))) FILTER (WHERE status = 'completed') as avg_completion_time_days
    FROM public.student_goals sg
    WHERE sg.student_id = p_student_id
  ),
  goal_type_success AS (
    SELECT 
      goal_type,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) FILTER (WHERE status = 'completed') DESC) as rn
    FROM public.student_goals sg
    WHERE sg.student_id = p_student_id
    GROUP BY goal_type
  )
  SELECT 
    gs.total_goals::INTEGER,
    gs.active_goals::INTEGER,
    gs.completed_goals::INTEGER,
    ROUND(gs.avg_completion_time_days, 2),
    COALESCE(gts.goal_type, 'none') as most_successful_goal_type,
    '{}'::jsonb as current_streaks
  FROM goal_stats gs
  LEFT JOIN goal_type_success gts ON gts.rn = 1;
$$;

-- Function to detect goal achievements
CREATE OR REPLACE FUNCTION public.detect_goal_achievements(p_student_id UUID, p_goal_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  goal_record RECORD;
  milestone JSONB;
  milestone_value NUMERIC;
BEGIN
  -- Get the goal details
  SELECT * INTO goal_record
  FROM public.student_goals
  WHERE id = p_goal_id AND student_id = p_student_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check for milestone achievements
  FOR milestone IN SELECT jsonb_array_elements(goal_record.milestones)
  LOOP
    milestone_value := (milestone->>'value')::NUMERIC;
    
    -- Check if milestone is reached and not already achieved
    IF goal_record.current_value >= milestone_value AND 
       NOT EXISTS (
         SELECT 1 FROM public.goal_achievements 
         WHERE goal_id = p_goal_id 
         AND achievement_type = 'milestone' 
         AND value_achieved = milestone_value
       ) THEN
      
      -- Insert milestone achievement
      INSERT INTO public.goal_achievements (
        student_id, goal_id, achievement_type, achievement_title, 
        achievement_description, value_achieved, progress_snapshot
      ) VALUES (
        p_student_id, p_goal_id, 'milestone',
        milestone->>'title',
        milestone->>'description',
        milestone_value,
        jsonb_build_object(
          'current_value', goal_record.current_value,
          'progress_percentage', goal_record.progress_percentage,
          'timestamp', NOW()
        )
      );
    END IF;
  END LOOP;
  
  -- Check for goal completion
  IF goal_record.status = 'completed' AND 
     NOT EXISTS (
       SELECT 1 FROM public.goal_achievements 
       WHERE goal_id = p_goal_id AND achievement_type = 'goal_completion'
     ) THEN
    
    INSERT INTO public.goal_achievements (
      student_id, goal_id, achievement_type, achievement_title,
      achievement_description, value_achieved, progress_snapshot
    ) VALUES (
      p_student_id, p_goal_id, 'goal_completion',
      'Goal Completed: ' || goal_record.goal_title,
      'Successfully achieved ' || goal_record.goal_description,
      goal_record.current_value,
      jsonb_build_object(
        'completion_date', goal_record.completed_at,
        'days_to_complete', EXTRACT(DAY FROM (goal_record.completed_at - goal_record.created_at)),
        'final_progress', 100
      )
    );
  END IF;
END;
$$;
