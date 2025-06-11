
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
    const complexityAnalysis = this.analyzeExplanationComplexity(context);
    
    // Route based on complexity threshold (adjusted for explanations)
    const explanationThreshold = 35; // Slightly higher threshold for explanations
    const selectedModel = complexityAnalysis.complexityScore >= explanationThreshold ? 'gpt-4o' : 'gpt-4o-mini';
    
    const estimatedCost = selectedModel === 'gpt-4o' ? this.config.gpt4oMiniCost * 8 : this.config.gpt4oMiniCost;
    
    return {
      selectedModel,
      complexityAnalysis,
      estimatedCost,
      confidence: complexityAnalysis.confidenceInDecision,
      reasoning: this.generateRoutingReasoning(complexityAnalysis, selectedModel)
    };
  }

  private analyzeExplanationComplexity(context: ExplanationContext): ComplexityAnalysis {
    let complexityScore = 0;
    const factors: string[] = [];

    // Subject complexity analysis
    const subjectComplexity = this.getSubjectComplexity(context.subject);
    complexityScore += subjectComplexity.score;
    factors.push(...subjectComplexity.factors);

    // Grade level analysis  
    const gradeComplexity = this.getGradeComplexity(context.grade);
    complexityScore += gradeComplexity.score;
    factors.push(...gradeComplexity.factors);

    // Question type and content analysis
    const questionComplexity = this.getQuestionComplexity(context.question, context.correctAnswer);
    complexityScore += questionComplexity.score;
    factors.push(...questionComplexity.factors);

    // Explanation depth analysis
    const explanationComplexity = this.getExplanationComplexity(context.explanation);
    complexityScore += explanationComplexity.score;
    factors.push(...explanationComplexity.factors);

    // Skill type analysis
    const skillComplexity = this.getSkillComplexity(context.skillName);
    complexityScore += skillComplexity.score;
    factors.push(...skillComplexity.factors);

    // Calculate confidence based on clarity of factors
    const confidenceInDecision = this.calculateConfidence(complexityScore, factors);

    return {
      complexityScore: Math.min(100, Math.max(0, complexityScore)),
      confidenceInDecision,
      modelRecommendation: complexityScore >= 35 ? 'gpt-4o' : 'gpt-4o-mini'
    };
  }

  private getSubjectComplexity(subject: string): { score: number; factors: string[] } {
    const subjectLower = subject.toLowerCase();
    
    // High complexity subjects (20-30 points)
    if (subjectLower.includes('physics') || 
        subjectLower.includes('chemistry') || 
        subjectLower.includes('calculus') ||
        subjectLower.includes('advanced')) {
      return { 
        score: 25, 
        factors: [`High complexity subject: ${subject}`] 
      };
    }
    
    // Medium complexity subjects (10-20 points)
    if (subjectLower.includes('math') || 
        subjectLower.includes('algebra') || 
        subjectLower.includes('geometry') ||
        subjectLower.includes('biology') ||
        subjectLower.includes('science')) {
      return { 
        score: 15, 
        factors: [`Medium complexity subject: ${subject}`] 
      };
    }
    
    // Low complexity subjects (0-10 points)
    return { 
      score: 5, 
      factors: [`Basic subject: ${subject}`] 
    };
  }

  private getGradeComplexity(grade: string): { score: number; factors: string[] } {
    const gradeMatch = grade.match(/(\d+)/);
    const gradeNumber = gradeMatch ? parseInt(gradeMatch[1]) : 10;
    
    if (gradeNumber >= 11) {
      return { score: 20, factors: ['High school level'] };
    } else if (gradeNumber >= 8) {
      return { score: 15, factors: ['Middle school level'] };
    } else if (gradeNumber >= 5) {
      return { score: 10, factors: ['Upper elementary level'] };
    } else {
      return { score: 5, factors: ['Elementary level'] };
    }
  }

  private getQuestionComplexity(question: string, answer: string): { score: number; factors: string[] } {
    let score = 0;
    const factors: string[] = [];

    // Question length analysis
    if (question.length > 200) {
      score += 10;
      factors.push('Long question text');
    }

    // Mathematical complexity
    const mathPatterns = [/\$.*?\$/, /\\frac/, /\\sqrt/, /\^/, /_/, /∫/, /∑/, /∏/];
    const mathComplexity = mathPatterns.filter(pattern => 
      pattern.test(question) || pattern.test(answer)
    ).length;
    
    if (mathComplexity > 0) {
      score += mathComplexity * 5;
      factors.push(`Mathematical notation detected (${mathComplexity} patterns)`);
    }

    // Multi-step reasoning indicators
    const reasoningIndicators = [
      'explain why', 'compare', 'analyze', 'evaluate', 'justify', 
      'describe the process', 'what would happen if', 'predict'
    ];
    
    const reasoningCount = reasoningIndicators.filter(indicator => 
      question.toLowerCase().includes(indicator)
    ).length;
    
    if (reasoningCount > 0) {
      score += reasoningCount * 8;
      factors.push(`Multi-step reasoning required (${reasoningCount} indicators)`);
    }

    return { score, factors };
  }

  private getExplanationComplexity(explanation: string): { score: number; factors: string[] } {
    let score = 0;
    const factors: string[] = [];

    // Current explanation length and complexity
    if (explanation.length > 150) {
      score += 8;
      factors.push('Detailed base explanation provided');
    }

    // Technical term density
    const technicalTerms = [
      'theorem', 'hypothesis', 'coefficient', 'variable', 'equation',
      'molecule', 'atom', 'reaction', 'synthesis', 'analysis'
    ];
    
    const termCount = technicalTerms.filter(term => 
      explanation.toLowerCase().includes(term)
    ).length;
    
    if (termCount > 0) {
      score += termCount * 5;
      factors.push(`Technical terms in explanation (${termCount})`);
    }

    return { score, factors };
  }

  private getSkillComplexity(skillName: string): { score: number; factors: string[] } {
    const skillLower = skillName.toLowerCase();
    
    // High complexity skills
    const highComplexityPatterns = [
      'critical thinking', 'analytical reasoning', 'problem solving',
      'synthesis', 'evaluation', 'advanced', 'complex'
    ];
    
    for (const pattern of highComplexityPatterns) {
      if (skillLower.includes(pattern)) {
        return { 
          score: 15, 
          factors: [`High complexity skill: ${skillName}`] 
        };
      }
    }
    
    // Medium complexity skills
    const mediumComplexityPatterns = [
      'application', 'comprehension', 'understanding', 'calculation'
    ];
    
    for (const pattern of mediumComplexityPatterns) {
      if (skillLower.includes(pattern)) {
        return { 
          score: 8, 
          factors: [`Medium complexity skill: ${skillName}`] 
        };
      }
    }
    
    // Basic skills
    return { 
      score: 3, 
      factors: [`Basic skill: ${skillName}`] 
    };
  }

  private calculateConfidence(complexityScore: number, factors: string[]): number {
    let confidence = 75; // Base confidence

    // More factors = higher confidence
    confidence += Math.min(factors.length * 3, 15);

    // Extreme scores = higher confidence
    if (complexityScore < 20 || complexityScore > 60) {
      confidence += 10;
    }

    // Borderline scores = lower confidence
    if (complexityScore >= 30 && complexityScore <= 40) {
      confidence -= 15;
    }

    return Math.min(95, Math.max(60, confidence));
  }

  private generateRoutingReasoning(analysis: ComplexityAnalysis, selectedModel: string): string {
    // Create a summary of key factors without accessing complexityFactors
    const score = analysis.complexityScore;
    let factors = 'complexity analysis';
    
    if (score > 60) {
      factors = 'high complexity detected';
    } else if (score > 30) {
      factors = 'medium complexity detected';
    } else {
      factors = 'low complexity detected';
    }
    
    return `Selected ${selectedModel} based on complexity score ${score}/100. Reasoning: ${factors}`;
  }

  shouldFallbackToGPT4o(gpt4oMiniResult: any, originalComplexity: ComplexityAnalysis): {
    shouldFallback: boolean;
    reason: string;
    confidence: number;
  } {
    // Quality indicators for explanations
    const result = gpt4oMiniResult?.detailedExplanation || '';
    
    // Check explanation length (should be ~350 words)
    const wordCount = result.split(/\s+/).length;
    if (wordCount < 200) {
      return {
        shouldFallback: true,
        reason: 'Explanation too short for educational value',
        confidence: 85
      };
    }

    // Check for 12-year-old appropriate language
    const technicalTerms = (result.match(/\b[a-z]+tion\b|\b[a-z]+ism\b/gi) || []).length;
    const totalWords = wordCount;
    const technicalDensity = technicalTerms / totalWords;
    
    if (technicalDensity > 0.15 && originalComplexity.complexityScore > 30) {
      return {
        shouldFallback: true,
        reason: 'Language too complex for target age group',
        confidence: 75
      };
    }

    // Check for educational structure
    const hasEngagingElements = /\b(imagine|picture|think about|like when)\b/i.test(result);
    const hasExamples = /\b(example|for instance|such as)\b/i.test(result);
    
    if (!hasEngagingElements && !hasExamples && originalComplexity.complexityScore > 40) {
      return {
        shouldFallback: true,
        reason: 'Lacks engaging educational elements for complex topic',
        confidence: 70
      };
    }

    return {
      shouldFallback: false,
      reason: 'Explanation quality meets standards',
      confidence: 80
    };
  }
}

export const smartExplanationRouter = new SmartExplanationRouter();
