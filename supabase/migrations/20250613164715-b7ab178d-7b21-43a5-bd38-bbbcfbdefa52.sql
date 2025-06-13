
-- Step 1: Audit + Add Indexes in SQL (Supabase compatible)
-- Fixed version - only indexing tables that exist

-- Index for fetching teacher's sessions
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher_id ON class_sessions (teacher_id);

-- Index for fetching exercises by student
CREATE INDEX IF NOT EXISTS idx_student_exercises_student_id ON student_exercises (student_id);
CREATE INDEX IF NOT EXISTS idx_student_exercises_student_created ON student_exercises (student_id, created_at DESC);

-- Indexes for exams and results
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams (class_id);
CREATE INDEX IF NOT EXISTS idx_test_results_exam_id ON test_results (exam_id);
CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON test_results (student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_authenticated_student_id ON test_results (authenticated_student_id);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_active_classes_teacher_id ON active_classes (teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments (class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_profile_id ON class_enrollments (student_profile_id);

-- Temporal indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_grading_jobs_created_at ON grading_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistake_patterns_created_at ON mistake_patterns (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_skill_scores_created_at ON content_skill_scores (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subject_skill_scores_created_at ON subject_skill_scores (created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher_active_created ON class_sessions (teacher_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_exercises_student_status_created ON student_exercises (student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_active ON class_enrollments (class_id, is_active);

-- Index for grading jobs queue performance (already exists but ensuring it's there)
CREATE INDEX IF NOT EXISTS idx_grading_jobs_status_priority_created 
  ON grading_jobs (status, priority DESC, created_at ASC);

-- Auto-cleanup function for old cache entries (only for tables that exist)
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM grading_jobs WHERE status IN ('completed', 'failed') AND completed_at < now() - interval '30 days';
END;
$$;
