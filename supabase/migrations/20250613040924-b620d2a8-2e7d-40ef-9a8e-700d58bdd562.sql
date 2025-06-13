
-- Create a proper student profile for Pablo Luis Garcia without authenticated_user_id
INSERT INTO student_profiles (
  id,
  student_name,
  email,
  student_id,
  created_at,
  updated_at
) VALUES (
  'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26',
  'Pablo Luis Garcia',
  'PabloLuisAlegaGarcia@gmail.com',
  'STU001',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  student_name = 'Pablo Luis Garcia',
  email = 'PabloLuisAlegaGarcia@gmail.com',
  updated_at = now();

-- Update existing practice sessions to link to the student profile
UPDATE student_practice_sessions 
SET student_id = 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26'
WHERE student_name = 'Pablo Luis Garcia';

-- Update any content skill scores that might be linked to Pablo
UPDATE content_skill_scores 
SET student_id = 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26'
WHERE student_id IN (
  SELECT id FROM active_students WHERE name = 'Pablo Luis Garcia'
);

-- Update any subject skill scores that might be linked to Pablo
UPDATE subject_skill_scores 
SET student_id = 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26'
WHERE student_id IN (
  SELECT id FROM active_students WHERE name = 'Pablo Luis Garcia'
);

-- Update any test results that might be linked to Pablo
UPDATE test_results 
SET student_id = 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26'
WHERE student_id IN (
  SELECT id FROM active_students WHERE name = 'Pablo Luis Garcia'
);
