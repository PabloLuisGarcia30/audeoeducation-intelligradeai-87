
// Simple SkillScore interface for mock data
interface SkillScore {
  id: string;
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
  created_at: string;
}

export const mockSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Algebra',
    score: 85,
    points_earned: 17,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    skill_name: 'Geometry',
    score: 92,
    points_earned: 18,
    points_possible: 20,
    created_at: '2024-01-02T00:00:00Z'
  }
];

// Mock data for Pablo Luis Garcia
export const mockPabloContentSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Factoring Polynomials',
    score: 85,
    points_earned: 17,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    skill_name: 'Solving Systems of Equations',
    score: 78,
    points_earned: 15,
    points_possible: 20,
    created_at: '2024-01-02T00:00:00Z'
  }
];

export const mockPabloSubjectSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Algebra',
    score: 82,
    points_earned: 16,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockPabloGeographyContentSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Interpreting population pyramids',
    score: 88,
    points_earned: 18,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockPabloGeographySubjectSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Geography',
    score: 85,
    points_earned: 17,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockPabloGeographyTestResults = [
  {
    id: '1',
    exam_id: 'geo-test-1',
    student_id: 'pablo-id',
    class_id: 'class-1',
    overall_score: 85,
    total_points_earned: 17,
    total_points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

// Mock data for Betty Johnson
export const mockBettyContentSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Cell Structure and Function',
    score: 92,
    points_earned: 18,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockBettySubjectSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Biology',
    score: 90,
    points_earned: 18,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockBettyTestResults = [
  {
    id: '1',
    exam_id: 'bio-test-1',
    student_id: 'betty-id',
    class_id: 'class-1',
    overall_score: 90,
    total_points_earned: 18,
    total_points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockBettyGeographyContentSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Analyzing demographic transition models',
    score: 94,
    points_earned: 19,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockBettyGeographySubjectSkillScores: SkillScore[] = [
  {
    id: '1',
    skill_name: 'Geography',
    score: 92,
    points_earned: 18,
    points_possible: 20,
    created_at: '2024-01-01T00:00:00Z'
  }
];

// Mock class data
export const mockClassData = {
  attendanceRate: 95,
  participationScore: 8
};

// Mock grade history
export const gradeHistory = [
  { semester: 'Fall 2023', gpa: 3.2 },
  { semester: 'Spring 2024', gpa: 3.5 },
  { semester: 'Fall 2024', gpa: 3.7 }
];

export { type SkillScore };
