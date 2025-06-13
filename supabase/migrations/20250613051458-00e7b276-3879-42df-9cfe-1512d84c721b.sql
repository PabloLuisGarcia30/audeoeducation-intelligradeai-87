
-- Step 1: Database Schema Enhancement
-- Add choice_misconceptions column to answer_keys table to store misconception metadata
ALTER TABLE answer_keys 
ADD COLUMN choice_misconceptions JSONB DEFAULT '{}';

-- Create index for efficient querying of misconception data
CREATE INDEX idx_answer_keys_choice_misconceptions ON answer_keys USING GIN (choice_misconceptions);

-- Add comment to document the new column
COMMENT ON COLUMN answer_keys.choice_misconceptions IS 'JSON object mapping MCQ options to misconception subtypes and descriptions';

-- Update practice_answer_keys table as well for practice exercises
ALTER TABLE practice_answer_keys 
ADD COLUMN choice_misconceptions JSONB DEFAULT '{}';

-- Add index for practice answer keys misconceptions
CREATE INDEX idx_practice_answer_keys_choice_misconceptions ON practice_answer_keys USING GIN (choice_misconceptions);

-- Create a view to easily query misconceptions across all question types
CREATE OR REPLACE VIEW question_misconceptions AS
SELECT 
  'exam' as question_source,
  exam_id as source_id,
  question_number,
  question_text,
  choice_misconceptions
FROM answer_keys 
WHERE choice_misconceptions != '{}'::jsonb

UNION ALL

SELECT 
  'practice' as question_source,
  exercise_id::text as source_id,
  ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY id) as question_number,
  (questions->0->>'question')::text as question_text,
  choice_misconceptions
FROM practice_answer_keys 
WHERE choice_misconceptions != '{}'::jsonb;
