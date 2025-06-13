
import { EnhancedGradingResult, SkillMapping } from "./grading/types";

export interface QuestionCacheResult extends EnhancedGradingResult {
  cachedAt: number;
  expiresAt: number;
  originalGradingMethod?: string;
}

export class QuestionCacheService {
  private static cache = new Map<string, QuestionCacheResult>();
  
  static async getCachedQuestionResult(
    examId: string,
    questionNumber: number,
    studentAnswer: string,
    correctAnswer: string
  ): Promise<QuestionCacheResult | null> {
    const key = `${examId}-${questionNumber}-${studentAnswer}-${correctAnswer}`;
    const cached = this.cache.get(key);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
    
    return null;
  }
  
  static async setCachedQuestionResult(
    examId: string,
    questionNumber: number,
    studentAnswer: string,
    correctAnswer: string,
    result: EnhancedGradingResult
  ): Promise<void> {
    const key = `${examId}-${questionNumber}-${studentAnswer}-${correctAnswer}`;
    const cached: QuestionCacheResult = {
      ...result,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      originalGradingMethod: result.gradingMethod
    };
    
    this.cache.set(key, cached);
  }
  
  static async getQuestionCacheStats() {
    return {
      size: this.cache.size,
      hitRate: 0.85, // Mock data
      memoryUsage: this.cache.size * 1024
    };
  }
}

// Export SkillMapping for compatibility
export type { SkillMapping };
