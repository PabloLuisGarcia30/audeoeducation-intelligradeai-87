
-- Insert mock content skill scores for Pablo Luis Garcia using his existing student profile
-- We'll use the student_id field instead of authenticated_student_id to avoid the auth constraint
INSERT INTO content_skill_scores (
  student_id,
  skill_name,
  score,
  points_earned,
  points_possible,
  created_at
) VALUES 
-- Lower performing skills (for practice recommendations)
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Factoring Polynomials', 65, 13, 20, now() - interval '5 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Solving Quadratic Equations', 68, 17, 25, now() - interval '4 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Understanding Function Notation', 62, 15, 24, now() - interval '3 days'),

-- Medium performing skills
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Linear Functions', 78, 19, 24, now() - interval '6 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Graphing Functions', 75, 18, 24, now() - interval '2 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Systems of Equations', 80, 20, 25, now() - interval '7 days'),

-- Higher performing skills
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Basic Algebra', 88, 22, 25, now() - interval '8 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Properties of Triangles', 85, 17, 20, now() - interval '9 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Area and Perimeter', 90, 18, 20, now() - interval '10 days');

-- Insert mock subject skill scores for Pablo Luis Garcia
INSERT INTO subject_skill_scores (
  student_id,
  skill_name,
  score,
  points_earned,
  points_possible,
  created_at
) VALUES 
-- Lower performing subject skills
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Problem-solving strategies', 64, 16, 25, now() - interval '5 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Mathematical reasoning', 70, 14, 20, now() - interval '4 days'),

-- Medium performing subject skills
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Mathematical communication', 76, 19, 25, now() - interval '6 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Critical thinking', 78, 16, 20, now() - interval '3 days'),

-- Higher performing subject skills
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Mental math skills', 85, 20, 24, now() - interval '7 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Mathematical modeling', 82, 20, 24, now() - interval '8 days');
