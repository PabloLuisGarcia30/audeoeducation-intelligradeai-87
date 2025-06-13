
// Canonical grading types - single source of truth for all grading services

/** Input expected by any batch‑grading engine */
export interface QuestionInput {
  id: string;                // unique per question (e.g. UUID or question number)
  prompt: string;            // raw question text
  studentAnswer: string;     // learner response
  skillTags: string[];       // taxonomy tags, e.g. ["fractions", "algebra"]
  correctAnswer?: string;    // expected answer for comparison
  pointsPossible?: number;   // maximum points for this question
  questionType?: string;     // multiple-choice, short-answer, essay, etc.
  metadata?: Record<string, any>; // additional context
}

/** Single graded answer returned by an engine */
export interface GradedAnswer {
  questionId: string;        // mirrors QuestionInput.id
  score: number;             // 0‑100 percentage or points earned
  pointsEarned?: number;     // actual points earned (if different from score)
  pointsPossible?: number;   // maximum points available
  isCorrect: boolean;        // binary correctness flag
  rationale: string;         // explanation of the score
  feedback?: string;         // optional coach text for student
  model: 'openai' | 'distilbert' | 'rule' | 'local_ai' | 'hybrid';
  confidence: number;        // 0‑1 for ML engines; 1 for deterministic
  gradingMethod?: string;    // specific method used within model type
  misconceptionDetected?: boolean;
  misconceptionCategory?: string;
  misconceptionSubtype?: string;
  skillMappings?: Array<{
    skill_name: string;
    confidence: number;
  }>;
  complexityScore?: number;  // 0-1 difficulty assessment
  reasoningDepth?: 'shallow' | 'medium' | 'deep';
  qualityFlags?: {
    hasMultipleMarks?: boolean;
    reviewRequired?: boolean;
    bubbleQuality?: string;
    confidenceAdjusted?: boolean;
    openAIProcessed?: boolean;
    batchProcessed?: boolean;
    requiresManualReview?: boolean;
    complexQuestion?: boolean;
    conservativeProcessing?: boolean;
    qualityFirst?: boolean;
    preValidatedAnswerKeys?: boolean;
    enhancedProcessing?: boolean;
    cacheHit?: boolean;
    wasmProcessed?: boolean;
    processingTime?: number;
    aiProcessingUsed?: boolean;
    semanticMatchingUsed?: boolean;
    localAIProcessed?: boolean;
  };
}

/** Result of a call that graded many questions at once */
export interface BatchGradingResult {
  results: GradedAnswer[];
  metadata?: {
    totalQuestions: number;
    processingTime: number;
    batchSize: number;
    averageConfidence: number;
    failureCount: number;
    fallbackUsed?: boolean;
    correlationId?: string;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

/** Configuration for batch processing */
export interface BatchProcessingConfig {
  maxBatchSize: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  enableCache: boolean;
  fallbackToLocal: boolean;
  timeoutMs: number;
  retryAttempts: number;
}

/** Skill mapping information */
export interface SkillMapping {
  question_number: number;
  skill_name: string;
  skill_type: 'content' | 'subject';
  confidence: number;
  skill_weight?: number;
}

/** Question skill mappings grouped by question */
export type QuestionSkillMappings = Record<number, SkillMapping[]>;

/** Enhanced grading result with additional metadata */
export interface EnhancedGradingResult extends GradedAnswer {
  questionNumber: number;
  skillMappings: SkillMapping[];
  openAIUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

/** Common answer pattern for preprocessing */
export interface CommonAnswerPattern {
  questionNumber: number;
  questionText: string;
  correctAnswer: string;
  commonStudentAnswers: string[];
  isComplex: boolean;
}

/** Cache key for question results */
export interface QuestionCacheKey {
  examId: string;
  questionNumber: number;
  studentAnswer: string;
  correctAnswer: string;
}

/** Cached question result */
export interface QuestionCacheResult {
  result: GradedAnswer;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

// Legacy type aliases for backward compatibility
export type OpenAIGradingResult = EnhancedGradingResult;
export type EnhancedLocalGradingResult = EnhancedGradingResult;
export type BatchQuestionResult = GradedAnswer;
