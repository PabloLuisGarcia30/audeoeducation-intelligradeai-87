
import type { 
  UnifiedQuestionContext, 
  GradingContext, 
  UnifiedGradingResult 
} from '../types/UnifiedGradingTypes';

export class CacheManager {
  private memoryCache = new Map<string, UnifiedGradingResult>();
  private cacheStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memorySize: 0,
    avgRetrievalTime: 0
  };

  async getCachedResult(
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<UnifiedGradingResult | null> {
    const startTime = Date.now();
    this.cacheStats.totalQueries++;

    try {
      const cacheKey = this.generateCacheKey(question, context);
      
      // Check memory cache first
      const memoryResult = this.memoryCache.get(cacheKey);
      if (memoryResult && this.isValidCacheEntry(memoryResult, context)) {
        this.cacheStats.cacheHits++;
        this.updateRetrievalTime(Date.now() - startTime);
        return memoryResult;
      }

      // Check persistent cache if enabled
      if (context.configuration.caching?.skillAware) {
        const persistentResult = await this.getFromPersistentCache(cacheKey, question);
        if (persistentResult) {
          // Store in memory for faster future access
          this.memoryCache.set(cacheKey, persistentResult);
          this.cacheStats.cacheHits++;
          this.updateRetrievalTime(Date.now() - startTime);
          return persistentResult;
        }
      }

      this.cacheStats.cacheMisses++;
      this.updateRetrievalTime(Date.now() - startTime);
      return null;

    } catch (error) {
      console.warn('Cache retrieval error:', error);
      this.cacheStats.cacheMisses++;
      return null;
    }
  }

  async setCachedResult(
    question: UnifiedQuestionContext,
    context: GradingContext,
    result: UnifiedGradingResult
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(question, context);
      
      // Store in memory cache
      this.memoryCache.set(cacheKey, {
        ...result,
        qualityFlags: {
          ...result.qualityFlags,
          cacheHit: false // Mark as original result, not cached
        }
      });

      this.cacheStats.memorySize = this.memoryCache.size;

      // Store in persistent cache if enabled
      if (context.configuration.caching?.skillAware) {
        await this.setInPersistentCache(cacheKey, question, result, context);
      }

      // Cleanup if memory cache is getting too large
      if (this.memoryCache.size > 1000) {
        this.cleanupMemoryCache();
      }

    } catch (error) {
      console.warn('Cache storage error:', error);
    }
  }

  private generateCacheKey(question: UnifiedQuestionContext, context: GradingContext): string {
    // Create a unique key based on question content and context
    const questionHash = this.hashString(
      `${question.questionText}_${question.studentAnswer}_${question.correctAnswer}`
    );
    
    const skillContext = question.skillContext?.map(s => `${s.skillName}:${s.skillType}`).join(',') || '';
    const contextHash = this.hashString(`${context.subject || ''}_${context.grade || ''}_${skillContext}`);
    
    return `unified_${questionHash}_${contextHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isValidCacheEntry(result: UnifiedGradingResult, context: GradingContext): boolean {
    const ttl = context.configuration.caching?.ttl || 3600000; // 1 hour default
    const now = Date.now();
    
    // For this implementation, we'll assume results don't have timestamps
    // In a real implementation, you'd store cache timestamps
    return true; // Simplified for now
  }

  private async getFromPersistentCache(
    cacheKey: string,
    question: UnifiedQuestionContext
  ): Promise<UnifiedGradingResult | null> {
    try {
      // Import existing cache service
      const { QuestionCacheService } = await import('../../questionCacheService');
      
      const cached = await QuestionCacheService.getCachedQuestionResult(
        question.questionId,
        question.questionNumber,
        question.studentAnswer,
        question.correctAnswer
      );

      if (cached) {
        // Convert to unified format
        return {
          questionId: question.questionId,
          questionNumber: question.questionNumber,
          isCorrect: cached.isCorrect,
          pointsEarned: cached.pointsEarned,
          pointsPossible: cached.pointsPossible,
          confidence: cached.confidence,
          gradingMethod: cached.gradingMethod as any,
          reasoning: cached.reasoning,
          processingTimeMs: 0,
          skillMappings: this.convertLegacySkillMappings(cached.skillMappings || []),
          qualityFlags: {
            cacheHit: true
          }
        };
      }

      return null;

    } catch (error) {
      console.warn('Persistent cache retrieval error:', error);
      return null;
    }
  }

  private async setInPersistentCache(
    cacheKey: string,
    question: UnifiedQuestionContext,
    result: UnifiedGradingResult,
    context: GradingContext
  ): Promise<void> {
    try {
      // Import existing cache service
      const { QuestionCacheService } = await import('../../questionCacheService');
      
      await QuestionCacheService.setCachedQuestionResult(
        context.examId || 'unified',
        question.questionNumber,
        question.studentAnswer,
        question.correctAnswer,
        {
          questionNumber: question.questionNumber,
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
          pointsPossible: result.pointsPossible,
          confidence: result.confidence,
          gradingMethod: result.gradingMethod,
          reasoning: result.reasoning,
          skillMappings: this.convertToLegacySkillMappings(result.skillMappings)
        } as any
      );

    } catch (error) {
      console.warn('Persistent cache storage error:', error);
    }
  }

  private convertLegacySkillMappings(legacyMappings: any[]): any[] {
    return legacyMappings.map(mapping => ({
      skillId: mapping.skill_id || mapping.skillId,
      skillName: mapping.skill_name || mapping.skillName,
      skillType: mapping.skill_type || mapping.skillType,
      confidence: mapping.confidence || 0.5,
      weight: mapping.skill_weight || mapping.weight || 1.0
    }));
  }

  private convertToLegacySkillMappings(unifiedMappings: any[]): any[] {
    return unifiedMappings.map(mapping => ({
      skill_id: mapping.skillId,
      skill_name: mapping.skillName,
      skill_type: mapping.skillType,
      confidence: mapping.confidence,
      skill_weight: mapping.weight
    }));
  }

  private cleanupMemoryCache(): void {
    // Simple cleanup: remove oldest 20% of entries
    const entries = Array.from(this.memoryCache.entries());
    const toRemove = Math.floor(entries.length * 0.2);
    
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }

    this.cacheStats.memorySize = this.memoryCache.size;
    console.log(`🧹 Memory cache cleaned up: removed ${toRemove} entries, size now: ${this.memoryCache.size}`);
  }

  private updateRetrievalTime(time: number): void {
    this.cacheStats.avgRetrievalTime = 
      (this.cacheStats.avgRetrievalTime + time) / 2;
  }

  async getStats() {
    const hitRate = this.cacheStats.totalQueries > 0 
      ? this.cacheStats.cacheHits / this.cacheStats.totalQueries 
      : 0;

    return {
      ...this.cacheStats,
      hitRate,
      memoryUtilization: (this.cacheStats.memorySize / 1000) * 100 // Assuming 1000 max
    };
  }

  clearCache(): void {
    this.memoryCache.clear();
    this.cacheStats.memorySize = 0;
    console.log('🧹 Unified cache cleared');
  }
}
