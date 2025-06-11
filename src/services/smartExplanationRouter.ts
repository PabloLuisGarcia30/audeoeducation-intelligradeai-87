
import { 
  SharedQuestionComplexityAnalyzer, 
  AIOptimizationConfig, 
  DEFAULT_CONFIG,
  ComplexityAnalysis 
} from './shared/aiOptimizationShared';

export interface ExplanationContext {
  question: string;
  correctAnswer: string;
  explanation: string;
  subject: string;
  grade: string;
  skillName: string;
  questionType?: string; // Added to support question type routing
}

export interface ExplanationRoutingDecision {
  selectedModel: 'gpt-4o-mini' | 'gpt-4o';
  complexityAnalysis: ComplexityAnalysis;
  estimatedCost: number;
  confidence: number;
  reasoning: string;
}

export class SmartExplanationRouter {
  private analyzer: SharedQuestionComplexityAnalyzer;
  private config: AIOptimizationConfig;

  constructor(config: AIOptimizationConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.analyzer = new SharedQuestionComplexityAnalyzer(config);
  }

  routeExplanationRequest(context: ExplanationContext): ExplanationRoutingDecision {
    const routingDecision = this.routeByQuestionType(context);
    
    // Create a complete complexity analysis that matches the interface
    const complexityAnalysis: ComplexityAnalysis = {
      complexityScore: routingDecision.isComplex ? 80 : 20,
      recommendedModel: routingDecision.selectedModel,
      factors: this.createComplexityFactors(context),
      reasoning: [routingDecision.reasoning],
      confidenceInDecision: 95 // High confidence in question-type routing
    };
    
    const estimatedCost = routingDecision.selectedModel === 'gpt-4o' ? this.config.gpt4oMiniCost * 8 : this.config.gpt4oMiniCost;
    
    return {
      selectedModel: routingDecision.selectedModel,
      complexityAnalysis,
      estimatedCost,
      confidence: complexityAnalysis.confidenceInDecision,
      reasoning: routingDecision.reasoning
    };
  }

  private createComplexityFactors(context: ExplanationContext): any {
    // Create basic complexity factors based on the question type analysis
    return {
      ocrConfidence: 100, // Not applicable for explanations
      bubbleQuality: 'high', // Not applicable for explanations
      hasMultipleMarks: false,
      hasReviewFlags: false,
      isCrossValidated: true,
      questionType: this.inferQuestionType(context),
      answerClarity: 100,
      selectedAnswer: context.correctAnswer
    };
  }

  private inferQuestionType(context: ExplanationContext): string {
    if (context.questionType) {
      return context.questionType.toLowerCase();
    }

    const questionText = context.question.toLowerCase();
    const correctAnswer = context.correctAnswer.toLowerCase();

    if (this.isMultipleChoice(questionText, context)) {
      return 'mcq';
    }

    if (this.isTrueFalse(correctAnswer)) {
      return 'true-false';
    }

    return 'short-answer';
  }

  private routeByQuestionType(context: ExplanationContext): {
    selectedModel: 'gpt-4o-mini' | 'gpt-4o';
    isComplex: boolean;
    reasoning: string;
  } {
    // If we have explicit question type, use it
    if (context.questionType) {
      const questionType = context.questionType.toLowerCase();
      
      if (questionType.includes('multiple-choice') || questionType.includes('true-false')) {
        return {
          selectedModel: 'gpt-4o-mini',
          isComplex: false,
          reasoning: `Selected gpt-4o-mini for ${context.questionType} question - simple explanation suitable`
        };
      }
      
      if (questionType.includes('short-answer') || questionType.includes('essay')) {
        return {
          selectedModel: 'gpt-4o',
          isComplex: true,
          reasoning: `Selected gpt-4o for ${context.questionType} question - detailed explanation required`
        };
      }
    }

    // Fallback: analyze question content to infer type
    const questionText = context.question.toLowerCase();
    const correctAnswer = context.correctAnswer.toLowerCase();

    // Check for multiple choice indicators
    if (this.isMultipleChoice(questionText, context)) {
      return {
        selectedModel: 'gpt-4o-mini',
        isComplex: false,
        reasoning: 'Selected gpt-4o-mini - detected multiple choice question format'
      };
    }

    // Check for true/false indicators
    if (this.isTrueFalse(correctAnswer)) {
      return {
        selectedModel: 'gpt-4o-mini',
        isComplex: false,
        reasoning: 'Selected gpt-4o-mini - detected true/false question'
      };
    }

    // Default to complex for open-ended questions
    return {
      selectedModel: 'gpt-4o',
      isComplex: true,
      reasoning: 'Selected gpt-4o - detected open-ended question requiring detailed explanation'
    };
  }

  private isMultipleChoice(questionText: string, context: ExplanationContext): boolean {
    // Check for common MCQ patterns
    const mcqIndicators = [
      /\ba\)|b\)|c\)|d\)/i,
      /\b\(?a\)|\(?b\)|\(?c\)|\(?d\)/i,
      /which of the following/i,
      /select the/i,
      /choose the/i
    ];

    // Check if question has MCQ patterns
    if (mcqIndicators.some(pattern => pattern.test(questionText))) {
      return true;
    }

    // Check if answer looks like a single choice (A, B, C, D)
    const answer = context.correctAnswer.trim();
    if (/^[A-D]$/i.test(answer) || /^[A-D]\)/i.test(answer)) {
      return true;
    }

    return false;
  }

  private isTrueFalse(correctAnswer: string): boolean {
    const answer = correctAnswer.trim().toLowerCase();
    return answer === 'true' || answer === 'false' || 
           answer === 't' || answer === 'f' ||
           answer === 'yes' || answer === 'no';
  }

  shouldFallbackToGPT4o(gpt4oMiniResult: any, originalComplexity: ComplexityAnalysis): {
    shouldFallback: boolean;
    reason: string;
    confidence: number;
  } {
    // For the simplified approach, we trust the initial routing decision
    // Only fallback in extreme cases
    const result = gpt4oMiniResult?.detailedExplanation || '';
    
    // Check if explanation is extremely short (likely an error)
    const wordCount = result.split(/\s+/).length;
    if (wordCount < 50) {
      return {
        shouldFallback: true,
        reason: 'Explanation too short - likely generation error',
        confidence: 90
      };
    }

    // Check if response seems like an error message
    if (result.toLowerCase().includes('error') || result.toLowerCase().includes('sorry')) {
      return {
        shouldFallback: true,
        reason: 'Error detected in response',
        confidence: 85
      };
    }

    return {
      shouldFallback: false,
      reason: 'Explanation quality acceptable for question type',
      confidence: 80
    };
  }
}

export const smartExplanationRouter = new SmartExplanationRouter();
