
// Response Fallbacks (Soft Failure)
export interface Question {
  questionNumber: number;
  pointsPossible?: number;
}

export interface GradedResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  confidence: number;
  reasoning: string;
  skillAlignment?: string[];
}

export function generateFallbackResults(questions: Question[]): GradedResult[] {
  return questions.map((q, i) => ({
    questionNumber: q.questionNumber || i + 1,
    isCorrect: false,
    pointsEarned: 0,
    confidence: 0.1,
    reasoning: "Unable to grade due to AI response error. Please review manually.",
    skillAlignment: []
  }));
}

export function generateSingleQuestionFallback(
  questionNumber: number,
  pointsPossible: number,
  errorReason: string
): GradedResult {
  return {
    questionNumber,
    isCorrect: false,
    pointsEarned: 0,
    confidence: 0.1,
    reasoning: `Grading failed: ${errorReason}. Manual review required.`,
    skillAlignment: []
  };
}

export function generateSkillEscalationFallback(
  availableSkills: string[],
  errorReason: string
): {
  matchedSkills: string[];
  confidence: number;
  reasoning: string;
  primarySkill: string;
} {
  return {
    matchedSkills: [availableSkills[0] || 'General'],
    confidence: 0.5,
    reasoning: `Skill escalation failed: ${errorReason}. Using fallback assignment.`,
    primarySkill: availableSkills[0] || 'General'
  };
}
