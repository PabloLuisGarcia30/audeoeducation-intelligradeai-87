
-- Phase 1: Database Schema Enhancement
-- Add misconception tracking columns to trailblazer_sessions table
ALTER TABLE trailblazer_sessions 
ADD COLUMN misconception_ids UUID[] DEFAULT '{}',
ADD COLUMN misconception_summary JSONB DEFAULT '{}';

-- Create linking table for better many-to-many relationships
CREATE TABLE trailblazer_session_misconceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES trailblazer_sessions(id) ON DELETE CASCADE,
  misconception_id UUID NOT NULL REFERENCES student_misconceptions(id) ON DELETE CASCADE,
  question_sequence INTEGER,
  time_occurred TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolution_status TEXT DEFAULT 'unresolved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_trailblazer_session_misconceptions_session_id ON trailblazer_session_misconceptions(session_id);
CREATE INDEX idx_trailblazer_session_misconceptions_misconception_id ON trailblazer_session_misconceptions(misconception_id);

-- Add trigger for updated_at
CREATE TRIGGER update_trailblazer_session_misconceptions_updated_at
  BEFORE UPDATE ON trailblazer_session_misconceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
