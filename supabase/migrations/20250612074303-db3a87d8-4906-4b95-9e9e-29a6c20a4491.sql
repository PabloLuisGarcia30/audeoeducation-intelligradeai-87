
-- Phase 1: Create the Misconception Tracking System Schema (Fixed)

-- Main taxonomy: misconception categories
CREATE TABLE misconception_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subtypes linked to categories
CREATE TABLE misconception_subtypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES misconception_categories(id) ON DELETE CASCADE,
  subtype_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, subtype_name)
);

-- Each time a student displays a misconception
CREATE TABLE student_misconceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  question_id TEXT,
  skill_id UUID,
  exam_id TEXT,
  misconception_subtype_id UUID NOT NULL REFERENCES misconception_subtypes(id),
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  corrected BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0,
  feedback_given BOOLEAN DEFAULT FALSE,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track feedback sessions tied to a misconception event
CREATE TABLE misconception_feedback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_misconception_id UUID NOT NULL REFERENCES student_misconceptions(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL, -- e.g. "visual", "text", "example", "guided_practice"
  success BOOLEAN DEFAULT FALSE,
  notes TEXT,
  intervention_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Long-term record of persistent misconceptions
CREATE TABLE misconception_persistence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  misconception_subtype_id UUID NOT NULL REFERENCES misconception_subtypes(id),
  first_detected_at TIMESTAMP WITH TIME ZONE,
  last_detected_at TIMESTAMP WITH TIME ZONE,
  total_occurrences INTEGER DEFAULT 1,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, misconception_subtype_id)
);

-- Optional: Emotionally-aware error context
CREATE TABLE affective_response_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  question_id TEXT,
  exam_id TEXT,
  flag_type TEXT NOT NULL, -- e.g. "frustration_spike", "avoidance", "disengagement", "triggered_confusion"
  intensity_score NUMERIC(2,1) CHECK (intensity_score >= 0 AND intensity_score <= 5),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  behavioral_data JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX idx_student_misconceptions_student_id ON student_misconceptions(student_id);
CREATE INDEX idx_student_misconceptions_detected_at ON student_misconceptions(detected_at);
CREATE INDEX idx_student_misconceptions_subtype_id ON student_misconceptions(misconception_subtype_id);
CREATE INDEX idx_persistence_logs_student_subtype ON misconception_persistence_logs(student_id, misconception_subtype_id);
CREATE INDEX idx_affective_flags_student_type ON affective_response_flags(student_id, flag_type);

-- Enable RLS on all tables
ALTER TABLE misconception_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE misconception_subtypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE misconception_feedback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE misconception_persistence_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affective_response_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teachers to view their students' data
CREATE POLICY "Teachers can view misconception categories" ON misconception_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can view misconception subtypes" ON misconception_subtypes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can view their students' misconceptions" ON student_misconceptions 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = auth.uid() 
    AND sp.id = student_misconceptions.student_id
  )
);

CREATE POLICY "Teachers can view their students' feedback sessions" ON misconception_feedback_sessions 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM student_misconceptions sm
    JOIN active_classes ac ON true
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE sm.id = misconception_feedback_sessions.student_misconception_id
    AND ac.teacher_id = auth.uid() 
    AND sp.id = sm.student_id
  )
);

CREATE POLICY "Teachers can view their students' persistence logs" ON misconception_persistence_logs 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = auth.uid() 
    AND sp.id = misconception_persistence_logs.student_id
  )
);

CREATE POLICY "Teachers can view their students' affective flags" ON affective_response_flags 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM active_classes ac
    JOIN class_enrollments ce ON ac.id = ce.class_id
    JOIN student_profiles sp ON ce.student_profile_id = sp.id
    WHERE ac.teacher_id = auth.uid() 
    AND sp.id = affective_response_flags.student_id
  )
);

-- Functions for misconception tracking
CREATE OR REPLACE FUNCTION update_misconception_persistence(
  p_student_id UUID,
  p_subtype_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO misconception_persistence_logs (
    student_id, 
    misconception_subtype_id, 
    first_detected_at, 
    last_detected_at,
    total_occurrences
  )
  VALUES (p_student_id, p_subtype_id, NOW(), NOW(), 1)
  ON CONFLICT (student_id, misconception_subtype_id)
  DO UPDATE SET
    last_detected_at = NOW(),
    total_occurrences = misconception_persistence_logs.total_occurrences + 1,
    updated_at = NOW();
END;
$$;

-- Insert the core misconception categories from Audeo Education taxonomy
INSERT INTO misconception_categories (category_name, description) VALUES
('Procedural Errors', 'Mistakes made in execution of known steps or methods'),
('Conceptual Errors', 'Misunderstanding of the underlying idea or principle'),
('Interpretive Errors', 'Misunderstood the task, prompt, or content presentation'),
('Expression Errors', 'Knows the content but can''t express it clearly or accurately'),
('Strategic Errors', 'Selected the wrong approach, method, or tool'),
('Meta-Cognitive Errors', 'Breakdown in the student''s awareness of their own learning/thinking'),
('Misconception Persistence', 'Patterns of recurring errors despite exposure to correction'),
('Emotional/Affective Flags', 'Affective cues tied to performance or interaction behavior');

-- Insert subtypes for each category (fixed with proper column alias)
INSERT INTO misconception_subtypes (category_id, subtype_name, description)
SELECT c.id, subtype.name, subtype.description FROM misconception_categories c,
(VALUES 
  ('Procedural Errors', 'Step Omission', 'Skipped a required step'),
  ('Procedural Errors', 'Step Order Error', 'Executed steps in the wrong sequence'),
  ('Procedural Errors', 'Symbol Confusion', 'Misinterpreted or swapped symbols'),
  ('Procedural Errors', 'Partial Completion', 'Incomplete work despite correct direction'),
  ('Procedural Errors', 'Flawed Memorized Routine', 'Misapplied memorized method'),
  
  ('Conceptual Errors', 'False Assumption', 'Wrong belief about how the concept works'),
  ('Conceptual Errors', 'Category Confusion', 'Misplaced classification or identity'),
  ('Conceptual Errors', 'Causal Misunderstanding', 'Incorrect cause-effect logic'),
  ('Conceptual Errors', 'Overgeneralization', 'Applies rule too broadly'),
  ('Conceptual Errors', 'Model Misuse', 'Misapplies conceptual framework'),
  
  ('Interpretive Errors', 'Keyword Confusion', 'Misread key instruction words'),
  ('Interpretive Errors', 'Ambiguity Blindness', 'Missed double meanings or unclear references'),
  ('Interpretive Errors', 'Literal Interpretation', 'Took figurative content too literally'),
  ('Interpretive Errors', 'Task Misread', 'Answered the wrong question'),
  ('Interpretive Errors', 'Diagram/Text Misalignment', 'Couldn''t synthesize visual + text'),
  
  ('Expression Errors', 'Vocabulary Mismatch', 'Uses vague or incorrect terms'),
  ('Expression Errors', 'Poor Organization', 'Points are disordered'),
  ('Expression Errors', 'Omitted Justification', 'Correct answer with no explanation'),
  ('Expression Errors', 'Communication Breakdown', 'Response is incoherent or off-topic'),
  ('Expression Errors', 'Grammatical Noise', 'Grammar blocks understanding'),
  
  ('Strategic Errors', 'Guess-and-Check Default', 'Defaults to trial and error approach'),
  ('Strategic Errors', 'Overkill Strategy', 'Overcomplicates simple tasks'),
  ('Strategic Errors', 'Off-topic Response', 'Response doesn''t address the question'),
  ('Strategic Errors', 'Algorithmic Overreliance', 'Recites method without adapting'),
  ('Strategic Errors', 'Misapplied Prior Knowledge', 'Uses wrong knowledge from different context'),
  
  ('Meta-Cognitive Errors', 'Overconfidence in Error', 'Confident about incorrect answer'),
  ('Meta-Cognitive Errors', 'Underconfidence in Correct Work', 'Doubts correct solution'),
  ('Meta-Cognitive Errors', 'Repeated Submission Without Adjustment', 'No learning from feedback'),
  ('Meta-Cognitive Errors', 'Ignores Feedback', 'Dismisses corrective information'),
  ('Meta-Cognitive Errors', 'Abandons Question Midway', 'Gives up before completion'),
  
  ('Emotional/Affective Flags', 'Frustration Spike', 'Sudden increase in time + errors'),
  ('Emotional/Affective Flags', 'Avoidance Patterns', 'Skipping specific task types'),
  ('Emotional/Affective Flags', 'Disengagement', 'Drop in interaction or accuracy'),
  ('Emotional/Affective Flags', 'Triggered Confusion', 'Specific topics cause abrupt failure')
) AS subtype(category, name, description)
WHERE c.category_name = subtype.category;
