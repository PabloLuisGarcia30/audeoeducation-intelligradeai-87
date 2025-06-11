
export interface DifficultyLevel {
  name: 'review' | 'mixed' | 'challenge' | 'adaptive';
  complexityFactor: number;
  questionTypes: string[];
  supportLevel: 'high' | 'medium' | 'low';
}

export interface ProgressiveDifficultyConfig {
  studentScore: number;
  skillName: string;
  targetImprovement: number;
  preferredDifficulty?: string;
}

export interface DifficultyRecommendation {
  level: DifficultyLevel;
  reasoning: string;
  questionDistribution: {
    review: number;
    practice: number;
    challenge: number;
  };
  supportFeatures: string[];
}

export class ProgressiveDifficultyService {
  private static readonly DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
    review: {
      name: 'review',
      complexityFactor: 0.6,
      questionTypes: ['multiple-choice', 'true-false'],
      supportLevel: 'high'
    },
    mixed: {
      name: 'mixed',
      complexityFactor: 0.8,
      questionTypes: ['multiple-choice', 'short-answer'],
      supportLevel: 'medium'
    },
    challenge: {
      name: 'challenge',
      complexityFactor: 1.0,
      questionTypes: ['short-answer', 'essay'],
      supportLevel: 'low'
    },
    adaptive: {
      name: 'adaptive',
      complexityFactor: 0.75,
      questionTypes: ['multiple-choice', 'short-answer'],
      supportLevel: 'medium'
    }
  };

  static calculateDifficulty(config: ProgressiveDifficultyConfig): DifficultyRecommendation {
    const { studentScore, preferredDifficulty, targetImprovement } = config;
    
    // If user explicitly set a difficulty, respect it
    if (preferredDifficulty && preferredDifficulty !== 'adaptive') {
      const level = this.DIFFICULTY_LEVELS[preferredDifficulty];
      return this.buildRecommendation(level, `User selected ${preferredDifficulty} difficulty`);
    }

    // Progressive difficulty based on student score
    let selectedLevel: DifficultyLevel;
    let reasoning: string;

    if (studentScore < 50) {
      selectedLevel = this.DIFFICULTY_LEVELS.review;
      reasoning = 'Review level selected - focus on fundamental understanding with scaffolding';
    } else if (studentScore < 70) {
      selectedLevel = this.DIFFICULTY_LEVELS.mixed;
      reasoning = 'Mixed difficulty - building on basics with some challenge questions';
    } else if (studentScore < 85) {
      selectedLevel = this.DIFFICULTY_LEVELS.challenge;
      reasoning = 'Challenge level - pushing understanding with complex applications';
    } else {
      // High performers get adaptive difficulty
      selectedLevel = this.DIFFICULTY_LEVELS.adaptive;
      reasoning = 'Adaptive difficulty - maintaining excellence while exploring advanced concepts';
    }

    return this.buildRecommendation(selectedLevel, reasoning);
  }

  private static buildRecommendation(level: DifficultyLevel, reasoning: string): DifficultyRecommendation {
    // Calculate question distribution based on difficulty level
    let questionDistribution;
    
    switch (level.name) {
      case 'review':
        questionDistribution = { review: 75, practice: 25, challenge: 0 };
        break;
      case 'mixed':
        questionDistribution = { review: 40, practice: 50, challenge: 10 };
        break;
      case 'challenge':
        questionDistribution = { review: 15, practice: 35, challenge: 50 };
        break;
      case 'adaptive':
        questionDistribution = { review: 25, practice: 50, challenge: 25 };
        break;
      default:
        questionDistribution = { review: 50, practice: 40, challenge: 10 };
    }

    const supportFeatures = this.getSupportFeatures(level);

    return {
      level,
      reasoning,
      questionDistribution,
      supportFeatures
    };
  }

  private static getSupportFeatures(level: DifficultyLevel): string[] {
    const baseFeatures = ['explanations', 'feedback'];
    
    switch (level.supportLevel) {
      case 'high':
        return [...baseFeatures, 'hints', 'step-by-step guidance', 'worked examples'];
      case 'medium':
        return [...baseFeatures, 'hints', 'conceptual connections'];
      case 'low':
        return [...baseFeatures, 'advanced applications'];
      default:
        return baseFeatures;
    }
  }

  /**
   * Generate difficulty prompt for AI generation
   */
  static generateDifficultyPrompt(recommendation: DifficultyRecommendation, questionCount: number): string {
    const { level, questionDistribution, supportFeatures } = recommendation;
    
    const reviewCount = Math.round((questionDistribution.review / 100) * questionCount);
    const practiceCount = Math.round((questionDistribution.practice / 100) * questionCount);
    const challengeCount = questionCount - reviewCount - practiceCount;

    return `
PROGRESSIVE DIFFICULTY CONFIGURATION:
- Difficulty Level: ${level.name} (complexity factor: ${level.complexityFactor})
- Question Distribution: ${reviewCount} review, ${practiceCount} practice, ${challengeCount} challenge
- Preferred Question Types: ${level.questionTypes.join(', ')}
- Support Level: ${level.supportLevel}
- Include Features: ${supportFeatures.join(', ')}

QUESTION COMPLEXITY GUIDELINES:
${reviewCount > 0 ? `- Review Questions (${reviewCount}): Focus on fundamental concepts, clear scaffolding, multiple choice preferred` : ''}
${practiceCount > 0 ? `- Practice Questions (${practiceCount}): Apply concepts in familiar contexts, mix of question types` : ''}
${challengeCount > 0 ? `- Challenge Questions (${challengeCount}): Complex applications, real-world scenarios, higher-order thinking` : ''}

Ensure questions progressively build understanding and maintain appropriate challenge level.`;
  }
}
