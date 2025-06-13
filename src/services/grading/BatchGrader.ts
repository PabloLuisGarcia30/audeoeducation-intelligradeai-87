
import { QuestionInput, BatchGradingResult } from './types';

/**
 * Common interface for all grading engines
 * Ensures consistent behavior across OpenAI, DistilBERT, and rule-based graders
 */
export interface BatchGrader {
  gradeBatch(questions: QuestionInput[]): Promise<BatchGradingResult>;
}

/**
 * Base configuration for all graders
 */
export interface GraderConfig {
  maxBatchSize: number;
  timeoutMs: number;
  retryAttempts: number;
  enableFallback: boolean;
}

/**
 * Abstract base class providing common functionality
 */
export abstract class BaseBatchGrader implements BatchGrader {
  protected config: GraderConfig;

  constructor(config: Partial<GraderConfig> = {}) {
    this.config = {
      maxBatchSize: 10,
      timeoutMs: 30000,
      retryAttempts: 2,
      enableFallback: true,
      ...config
    };
  }

  abstract gradeBatch(questions: QuestionInput[]): Promise<BatchGradingResult>;

  /**
   * Helper method to chunk large batches
   */
  protected chunkQuestions(questions: QuestionInput[]): QuestionInput[][] {
    const chunks: QuestionInput[][] = [];
    for (let i = 0; i < questions.length; i += this.config.maxBatchSize) {
      chunks.push(questions.slice(i, i + this.config.maxBatchSize));
    }
    return chunks;
  }

  /**
   * Helper method to generate question cache key
   */
  protected generateCacheKey(question: QuestionInput): string {
    return `${question.id}-${question.studentAnswer}-${question.correctAnswer || ''}`;
  }
}
