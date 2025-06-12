
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

export { type SkillScore };
