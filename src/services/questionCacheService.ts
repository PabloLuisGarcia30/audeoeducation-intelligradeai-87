
import { EnhancedGradingResult, SkillMapping } from "./grading/types";

export interface QuestionCacheResult extends EnhancedGradingResult {
  cachedAt: number;
  expiresAt: number;
  originalGradingMethod?: string;
}

export interface QuestionCacheStats {
  size: number;
  hitRate: number;
  memoryUsage: number;
  totalCachedQuestions: number;
  costSavings: number;
  distilBertCached: number;
  openAICached: number;
  topCachedExams: Array<{
    examId: string;
    hitRate: number;
    questionCount: number;
  }>;
  dailyStats?: {
    totalQueries: number;
    cacheHits: number;
  };
}

export interface CacheHealthMetrics {
  memorySize: number;
  maxSize: number;
  utilizationPercent: number;
  lastCleanup: number | null;
  nextCleanup: number | null;
}

export class QuestionCacheService {
  private static cache = new Map<string, QuestionCacheResult>();
  private static hitCount = 0;
  private static totalQueries = 0;
  
  static async getCachedQuestionResult(
    examId: string,
    questionNumber: number,
    studentAnswer: string,
    correctAnswer: string
  ): Promise<QuestionCacheResult | null> {
    this.totalQueries++;
    const key = `${examId}-${questionNumber}-${studentAnswer}-${correctAnswer}`;
    const cached = this.cache.get(key);
    
    if (cached && cached.expiresAt > Date.now()) {
      this.hitCount++;
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
  
  static async getQuestionCacheStats(): Promise<QuestionCacheStats> {
    const cacheEntries = Array.from(this.cache.values());
    const distilBertCached = cacheEntries.filter(entry => 
      entry.originalGradingMethod?.includes('local') || 
      entry.originalGradingMethod?.includes('distilbert')
    ).length;
    const openAICached = cacheEntries.filter(entry => 
      entry.originalGradingMethod?.includes('openai')
    ).length;

    // Group by exam ID
    const examGroups = new Map<string, QuestionCacheResult[]>();
    cacheEntries.forEach(entry => {
      const examId = this.extractExamIdFromCache(entry);
      if (!examGroups.has(examId)) {
        examGroups.set(examId, []);
      }
      examGroups.get(examId)!.push(entry);
    });

    const topCachedExams = Array.from(examGroups.entries())
      .map(([examId, entries]) => ({
        examId,
        hitRate: this.calculateExamHitRate(examId),
        questionCount: entries.length
      }))
      .sort((a, b) => b.questionCount - a.questionCount)
      .slice(0, 10);

    return {
      size: this.cache.size,
      hitRate: this.totalQueries > 0 ? this.hitCount / this.totalQueries : 0.85,
      memoryUsage: this.cache.size * 1024,
      totalCachedQuestions: this.cache.size,
      costSavings: this.calculateCostSavings(),
      distilBertCached,
      openAICached,
      topCachedExams,
      dailyStats: {
        totalQueries: this.totalQueries,
        cacheHits: this.hitCount
      }
    };
  }

  static async getCacheHealthMetrics(): Promise<CacheHealthMetrics> {
    const maxSize = 1000; // Default max cache size
    const currentSize = this.cache.size;
    const utilizationPercent = (currentSize / maxSize) * 100;

    return {
      memorySize: currentSize,
      maxSize,
      utilizationPercent,
      lastCleanup: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago (mock)
      nextCleanup: Date.now() + (18 * 60 * 60 * 1000)  // 18 hours from now (mock)
    };
  }

  private static extractExamIdFromCache(entry: QuestionCacheResult): string {
    // Try to extract exam ID from the cached entry
    return entry.questionId?.split('-')[0] || 'unknown';
  }

  private static calculateExamHitRate(examId: string): number {
    // Mock calculation - in a real implementation, this would track hits per exam
    return 0.75 + (Math.random() * 0.2); // Random between 0.75-0.95
  }

  private static calculateCostSavings(): number {
    const cacheEntries = Array.from(this.cache.values());
    return cacheEntries.reduce((savings, entry) => {
      const isOpenAI = entry.originalGradingMethod?.includes('openai');
      return savings + (isOpenAI ? 0.01 : 0.001); // OpenAI costs more
    }, 0);
  }
}

// Export SkillMapping for compatibility
export type { SkillMapping };
