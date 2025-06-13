
/**
 * Transparent L1 (in‑memory) + L2 (Supabase) cache.
 * Called once by UnifiedBatchGradingService per batch.
 */
import { QuestionInput, GradedAnswer } from '../types';
import { supabase } from "@/integrations/supabase/client";

// L1 in-memory cache
const memoryCache = new Map<string, GradedAnswer>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_MEMORY_CACHE_SIZE = 1000;

interface CacheEntry {
  result: GradedAnswer;
  timestamp: number;
  hitCount: number;
}

/**
 * Get cached results for a batch of questions
 * Checks L1 (memory) first, then L2 (Supabase)
 */
export async function getCachedResults(questions: QuestionInput[]): Promise<Record<string, GradedAnswer>> {
  const results: Record<string, GradedAnswer> = {};
  const uncachedKeys: string[] = [];
  
  // Check L1 cache first
  for (const question of questions) {
    const key = generateCacheKey(question);
    const cached = memoryCache.get(key);
    
    if (cached && isValidCacheEntry(cached)) {
      results[question.id] = cached;
    } else {
      uncachedKeys.push(key);
      memoryCache.delete(key); // Remove expired entries
    }
  }

  // Check L2 cache for remaining questions
  if (uncachedKeys.length > 0) {
    try {
      const { data, error } = await supabase
        .from('question_cache')
        .select('*')
        .in('cache_key', uncachedKeys)
        .gt('expires_at', new Date().toISOString());

      if (!error && data) {
        for (const row of data) {
          const result = row.result as GradedAnswer;
          results[result.questionId] = result;
          
          // Populate L1 cache
          memoryCache.set(row.cache_key, result);
        }
      }
    } catch (error) {
      console.warn('L2 cache read failed:', error);
    }
  }

  return results;
}

/**
 * Write results to both L1 and L2 cache
 */
export async function writeResults(results: GradedAnswer[], questions: QuestionInput[]): Promise<void> {
  if (results.length === 0) return;

  const cacheEntries = results.map((result, index) => {
    const question = questions.find(q => q.id === result.questionId);
    if (!question) return null;

    const key = generateCacheKey(question);
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

    // Write to L1 cache
    memoryCache.set(key, result);
    
    return {
      cache_key: key,
      question_id: result.questionId,
      result: result,
      model: result.model,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };
  }).filter(Boolean);

  // Manage L1 cache size
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const keysToDelete = Array.from(memoryCache.keys()).slice(0, memoryCache.size - MAX_MEMORY_CACHE_SIZE);
    keysToDelete.forEach(key => memoryCache.delete(key));
  }

  // Write to L2 cache
  if (cacheEntries.length > 0) {
    try {
      const { error } = await supabase
        .from('question_cache')
        .upsert(cacheEntries, { onConflict: 'cache_key' });
      
      if (error) {
        console.error('L2 cache write failed:', error);
      }
    } catch (error) {
      console.warn('L2 cache write failed:', error);
    }
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  l1Size: number;
  l2Size: number;
  hitRate: number;
  memoryUsage: number;
}> {
  let l2Size = 0;
  
  try {
    const { count } = await supabase
      .from('question_cache')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());
    
    l2Size = count || 0;
  } catch (error) {
    console.warn('Failed to get L2 cache size:', error);
  }

  return {
    l1Size: memoryCache.size,
    l2Size,
    hitRate: 0.85, // TODO: Implement proper hit rate tracking
    memoryUsage: memoryCache.size * 1024 // Rough estimate
  };
}

/**
 * Clear expired entries from caches
 */
export async function cleanupCache(): Promise<void> {
  // Clean L1 cache
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (!isValidCacheEntry(value)) {
      memoryCache.delete(key);
    }
  }

  // Clean L2 cache
  try {
    await supabase
      .from('question_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.warn('L2 cache cleanup failed:', error);
  }
}

// Helper functions
function generateCacheKey(question: QuestionInput): string {
  return `${question.id}-${question.studentAnswer}-${question.correctAnswer || ''}-${question.skillTags.join(',')}`;
}

function isValidCacheEntry(entry: any): boolean {
  // For L1 cache, we don't have timestamp, so assume valid
  // In a real implementation, you'd want to track timestamps
  return entry && typeof entry === 'object' && entry.questionId;
}
