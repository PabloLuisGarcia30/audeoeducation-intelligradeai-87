
import { ClassificationStrategy, ClassificationResult, ClassificationContext } from './types';
import { MetadataClassificationStrategy } from './strategies/MetadataClassificationStrategy';
import { PatternMatchingStrategy } from './strategies/PatternMatchingStrategy';
import { DatabaseLookupStrategy } from './strategies/DatabaseLookupStrategy';
import { skillClassificationConfig } from '@/config/skillClassificationConfig';

export class SkillClassificationService {
  private strategies: ClassificationStrategy[];
  private cache: Map<string, ClassificationResult> = new Map();

  constructor() {
    this.strategies = [
      new MetadataClassificationStrategy(),
      new DatabaseLookupStrategy(),
      new PatternMatchingStrategy()
    ];
  }

  /**
   * Classify a skill using multiple strategies in order of priority
   */
  async classifySkill(context: ClassificationContext): Promise<'content' | 'subject'> {
    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`🔄 Using cached classification for "${context.skillName}": ${cached.skillType}`);
      return cached.skillType;
    }

    console.log(`🎯 Classifying skill: "${context.skillName}" using multiple strategies`);

    // Try each strategy in order
    for (const strategy of this.strategies) {
      try {
        const result = await strategy.classify(context);
        if (result) {
          console.log(`✅ Strategy "${strategy.name}" classified "${context.skillName}" as ${result.skillType} (confidence: ${result.confidence})`);
          
          // Cache the result
          this.cache.set(cacheKey, result);
          
          return result.skillType;
        }
      } catch (error) {
        console.warn(`⚠️ Strategy "${strategy.name}" failed for "${context.skillName}":`, error);
      }
    }

    // Fallback to default
    const fallbackType = skillClassificationConfig.fallbackSkillType;
    console.log(`🔄 Using fallback classification for "${context.skillName}": ${fallbackType}`);
    
    const fallbackResult: ClassificationResult = {
      skillType: fallbackType,
      confidence: 0.5,
      strategy: 'fallback',
      metadata: { reason: 'no_strategy_succeeded' }
    };
    
    this.cache.set(cacheKey, fallbackResult);
    return fallbackType;
  }

  /**
   * Classify multiple skills in batch for efficiency
   */
  async classifySkillsBatch(contexts: ClassificationContext[]): Promise<Map<string, 'content' | 'subject'>> {
    const results = new Map<string, 'content' | 'subject'>();
    
    for (const context of contexts) {
      const skillType = await this.classifySkill(context);
      results.set(context.skillName, skillType);
    }
    
    return results;
  }

  /**
   * Clear the classification cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Skill classification cache cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    };
  }

  private generateCacheKey(context: ClassificationContext): string {
    return `${context.skillName}|${context.studentId || 'anonymous'}|${context.subject || ''}|${context.grade || ''}`;
  }
}

// Export singleton instance
export const skillClassificationService = new SkillClassificationService();
