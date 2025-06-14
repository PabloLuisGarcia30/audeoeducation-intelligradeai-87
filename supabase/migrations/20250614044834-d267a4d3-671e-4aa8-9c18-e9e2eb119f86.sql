
-- Add Geography 11 content skill scores for Pablo Luis Garcia
INSERT INTO content_skill_scores (
  student_id,
  skill_name,
  score,
  points_earned,
  points_possible,
  created_at
) VALUES 
-- Population Studies - Mixed performance
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Interpreting population pyramids', 89, 18, 20, now() - interval '3 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Analyzing demographic transition models', 74, 18, 24, now() - interval '5 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Calculating demographic rates', 67, 16, 24, now() - interval '4 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Evaluating aging population implications', 85, 17, 20, now() - interval '6 days'),

-- Development & Economics - Variable performance  
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Interpreting development indicators (GDP, HDI, Gini Coefficient)', 81, 20, 25, now() - interval '7 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Comparing disparities at different scales', 72, 18, 25, now() - interval '8 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Analyzing economic disparity case studies', 88, 22, 25, now() - interval '2 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Evaluating development strategies', 76, 19, 25, now() - interval '9 days'),

-- Environmental Sustainability - Strong performance
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Understanding ecological footprints', 91, 18, 20, now() - interval '1 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Interpreting climate change data', 86, 21, 24, now() - interval '10 days');

-- Add Geography 11 subject skill scores for Pablo Luis Garcia
INSERT INTO subject_skill_scores (
  student_id,
  skill_name,
  score,
  points_earned,
  points_possible,
  created_at
) VALUES 
-- Geographic thinking and analysis skills
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Geographic analysis and interpretation', 83, 20, 24, now() - interval '3 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Spatial reasoning and patterns', 78, 19, 24, now() - interval '5 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Data interpretation in geography', 71, 17, 24, now() - interval '4 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Critical thinking in geography', 87, 17, 20, now() - interval '6 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Geographic communication', 79, 19, 24, now() - interval '7 days'),
('f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', 'Environmental impact assessment', 84, 21, 25, now() - interval '2 days');
