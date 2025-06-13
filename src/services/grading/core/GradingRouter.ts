
import type { 
  UnifiedQuestionContext, 
  GradingContext, 
  GradingRouterDecision, 
  GradingMethod, 
  ComplexityLevel 
} from '../types/UnifiedGradingTypes';

export class GradingRouter {
  private static readonly COMPLEXITY_THRESHOLDS = {
    simple: { maxLength: 50, maxWords: 10 },
    medium: { maxLength: 150, maxWords: 30 },
    complex: { maxLength: Infinity, maxWords: Infinity }
  };

  private static readonly COST_ESTIMATES = {
    exact_match: 0,
    flexible_match: 0.001,
    distilbert_local: 0.002,
    openai_single: 0.01,
    openai_batch: 0.005,
    ai_graded: 0.008
  };

  /**
   * Main routing decision for a single question
   */
  static routeQuestion(
    question: UnifiedQuestionContext, 
    context: GradingContext
  ): GradingRouterDecision {
    const complexity = this.analyzeComplexity(question);
    const configThresholds = context.configuration.thresholds;

    // Check for exact match first
    if (this.isExactMatch(question)) {
      return {
        method: 'exact_match',
        confidence: 0.99,
        reasoning: 'Exact string match detected',
        estimatedCost: 0,
        estimatedTime: 5,
        batchRecommended: false,
        complexityLevel: 'simple'
      };
    }

    // Check question type for simple processing
    if (this.isSimpleQuestionType(question)) {
      return {
        method: 'flexible_match',
        confidence: 0.9,
        reasoning: 'Simple question type suitable for pattern matching',
        estimatedCost: this.COST_ESTIMATES.flexible_match,
        estimatedTime: 10,
        batchRecommended: false,
        complexityLevel: complexity
      };
    }

    // Determine if DistilBERT is suitable
    if (complexity !== 'complex' && this.isDistilBertSuitable(question, context)) {
      return {
        method: 'distilbert_local',
        confidence: 0.85,
        reasoning: 'Medium complexity suitable for local DistilBERT processing',
        estimatedCost: this.COST_ESTIMATES.distilbert_local,
        estimatedTime: 100,
        batchRecommended: false,
        complexityLevel: complexity
      };
    }

    // Route to OpenAI for complex questions
    const batchRecommended = context.configuration.batchProcessing?.enabled && 
                           complexity === 'complex';

    return {
      method: batchRecommended ? 'openai_batch' : 'openai_single',
      confidence: 0.95,
      reasoning: `Complex question requiring OpenAI processing${batchRecommended ? ' (batch recommended)' : ''}`,
      estimatedCost: this.COST_ESTIMATES[batchRecommended ? 'openai_batch' : 'openai_single'],
      estimatedTime: batchRecommended ? 2000 : 800,
      batchRecommended,
      complexityLevel: complexity
    };
  }

  /**
   * Batch routing decision for multiple questions
   */
  static routeBatch(
    questions: UnifiedQuestionContext[], 
    context: GradingContext
  ): GradingRouterDecision {
    if (!context.configuration.batchProcessing?.enabled || questions.length < 2) {
      return this.routeQuestion(questions[0], context);
    }

    const complexities = questions.map(q => this.analyzeComplexity(q));
    const avgComplexity = this.calculateAverageComplexity(complexities);
    const totalCost = questions.length * this.COST_ESTIMATES.openai_batch;

    return {
      method: 'openai_batch',
      confidence: 0.9,
      reasoning: `Batch processing ${questions.length} questions with average complexity: ${avgComplexity}`,
      estimatedCost: totalCost,
      estimatedTime: Math.max(2000, questions.length * 100),
      batchRecommended: true,
      complexityLevel: avgComplexity
    };
  }

  private static analyzeComplexity(question: UnifiedQuestionContext): ComplexityLevel {
    const answerLength = question.studentAnswer.length;
    const answerWords = question.studentAnswer.split(/\s+/).length;
    const correctLength = question.correctAnswer.length;
    const lengthDiff = Math.abs(answerLength - correctLength);

    // Simple cases
    if (answerLength <= this.COMPLEXITY_THRESHOLDS.simple.maxLength && 
        answerWords <= this.COMPLEXITY_THRESHOLDS.simple.maxWords &&
        lengthDiff <= 20) {
      return 'simple';
    }

    // Complex cases
    if (answerLength > this.COMPLEXITY_THRESHOLDS.medium.maxLength ||
        answerWords > this.COMPLEXITY_THRESHOLDS.medium.maxWords ||
        lengthDiff > 100) {
      return 'complex';
    }

    return 'medium';
  }

  private static isExactMatch(question: UnifiedQuestionContext): boolean {
    const cleanStudent = question.studentAnswer.toLowerCase().trim();
    const cleanCorrect = question.correctAnswer.toLowerCase().trim();
    return cleanStudent === cleanCorrect;
  }

  private static isSimpleQuestionType(question: UnifiedQuestionContext): boolean {
    return ['multiple-choice', 'true-false', 'numeric'].includes(question.questionType);
  }

  private static isDistilBertSuitable(
    question: UnifiedQuestionContext, 
    context: GradingContext
  ): boolean {
    // Check if local processing is preferred
    if (context.configuration.preferredMethod === 'distilbert_local') {
      return true;
    }

    // Check complexity and length constraints
    const answerLength = question.studentAnswer.length;
    return answerLength <= 200 && 
           question.questionType !== 'essay' &&
           !this.hasComplexSkillRequirements(question);
  }

  private static hasComplexSkillRequirements(question: UnifiedQuestionContext): boolean {
    return question.skillContext?.some(skill => 
      skill.skillType === 'subject' && skill.confidence < 0.7
    ) || false;
  }

  private static calculateAverageComplexity(complexities: ComplexityLevel[]): ComplexityLevel {
    const scores = complexities.map(c => {
      switch (c) {
        case 'simple': return 1;
        case 'medium': return 2;
        case 'complex': return 3;
        default: return 2;
      }
    });

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (avgScore <= 1.5) return 'simple';
    if (avgScore <= 2.5) return 'medium';
    return 'complex';
  }
}
