
export type GradingMethod = 
  | 'exact_match' 
  | 'flexible_match' 
  | 'ai_graded' 
  | 'distilbert_local'
  | 'openai_single'
  | 'openai_batch'
  | 'hybrid';

export type QuestionType = 
  | 'multiple-choice' 
  | 'true-false' 
  | 'short-answer' 
  | 'essay'
  | 'numeric'
  | 'fill-in-blank';

export type SkillType = 'content' | 'subject';

export type ComplexityLevel = 'simple' | 'medium' | 'complex';

export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export interface UnifiedQuestionContext {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: QuestionType;
  studentAnswer: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  pointsPossible: number;
  options?: string[];
  keywords?: string[];
  skillContext?: SkillMapping[];
  examId?: string;
  studentId?: string;
  studentName?: string;
  subject?: string;
  grade?: string;
}

export interface SkillMapping {
  skillId: string;
  skillName: string;
  skillType: SkillType;
  confidence: number;
  weight: number;
}

export interface MisconceptionAnalysis {
  categoryName?: string;
  subtypeName?: string;
  confidence?: number;
  reasoning?: string;
  misconceptionId?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface UnifiedGradingResult {
  questionId: string;
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: GradingMethod;
  reasoning: string;
  feedback?: string;
  processingTimeMs: number;
  skillMappings: SkillMapping[];
  misconceptionAnalysis?: MisconceptionAnalysis;
  complexityScore?: number;
  qualityFlags?: {
    hasMultipleMarks?: boolean;
    reviewRequired?: boolean;
    bubbleQuality?: string;
    confidenceAdjusted?: boolean;
    cacheHit?: boolean;
    fallbackUsed?: boolean;
  };
  openAIUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export interface GradingConfiguration {
  preferredMethod?: GradingMethod;
  batchProcessing?: {
    enabled: boolean;
    maxBatchSize: number;
    timeout: number;
    priority: PriorityLevel;
  };
  caching?: {
    enabled: boolean;
    ttl: number;
    skillAware: boolean;
  };
  thresholds?: {
    distilbertConfidence: number;
    openaiEscalation: number;
    complexityThreshold: number;
  };
  misconceptionAnalysis?: {
    enabled: boolean;
    categories: string[];
  };
  trailblazerIntegration?: {
    enabled: boolean;
    sessionId?: string;
  };
}

export interface GradingContext {
  examId?: string;
  studentId?: string;
  studentName?: string;
  exerciseId?: string;
  sessionId?: string;
  subject?: string;
  grade?: string;
  exerciseType?: string;
  skillsTargeted?: string[];
  configuration: GradingConfiguration;
}

export interface BatchGradingRequest {
  questions: UnifiedQuestionContext[];
  context: GradingContext;
  priority?: PriorityLevel;
  estimatedComplexity?: ComplexityLevel;
}

export interface BatchGradingResult {
  batchId: string;
  results: UnifiedGradingResult[];
  totalProcessingTime: number;
  totalCost: number;
  batchSize: number;
  successRate: number;
  fallbackUsed: boolean;
  cacheHitRate: number;
  processingMethod: GradingMethod;
  metadata: {
    startTime: Date;
    endTime: Date;
    processingPath: string[];
    errors?: string[];
  };
}

export interface GradingRouterDecision {
  method: GradingMethod;
  confidence: number;
  reasoning: string;
  estimatedCost: number;
  estimatedTime: number;
  batchRecommended: boolean;
  complexityLevel: ComplexityLevel;
}
