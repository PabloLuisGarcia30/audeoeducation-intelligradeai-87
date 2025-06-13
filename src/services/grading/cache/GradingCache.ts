
/**
 * Transparent L1 (in‑memory) + L2 (Supabase) cache.
 * Called once by UnifiedBatchGradingService per batch.
 */
import { QuestionInput, GradedAnswer } from '../types';

// L1 in-memory cache
const memoryCache = new Map<string, CacheEntry>();
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
  
  // Check L1 cache first
  for (const question of questions) {
    const key = generateCacheKey(question);
    const cached = memoryCache.get(key);
    
    if (cached && isValidCacheEntry(cached)) {
      results[question.id] = cached.result;
      cached.hitCount++;
    } else {
      memoryCache.delete(key); // Remove expired entries
    }
  }

  // L2 cache is disabled for now since question_cache table may not be available
  console.log(`🎯 Cache check: ${Object.keys(results).length}/${questions.length} hits from L1 cache`);

  return results;
}

/**
 * Write results to both L1 and L2 cache
 */
export async function writeResults(results: GradedAnswer[], questions: QuestionInput[]): Promise<void> {
  if (results.length === 0) return;

  // Write to L1 cache
  for (const result of results) {
    const question = questions.find(q => q.id === result.questionId);
    if (!question) continue;

    const key = generateCacheKey(question);
    memoryCache.set(key, {
      result,
      timestamp: Date.now(),
      hitCount: 1
    });
  }

  // Manage L1 cache size
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const keysToDelete = Array.from(memoryCache.keys()).slice(0, memoryCache.size - MAX_MEMORY_CACHE_SIZE);
    keysToDelete.forEach(key => memoryCache.delete(key));
  }

  // L2 cache writing is disabled for now
  console.log(`🎯 Cache write: ${results.length} results written to L1 cache`);
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
  // Calculate hit rate from L1 cache
  const totalHits = Array.from(memoryCache.values()).reduce((sum, entry) => sum + entry.hitCount, 0);
  const totalEntries = memoryCache.size;
  const hitRate = totalEntries > 0 ? totalHits / (totalHits + totalEntries) : 0;

  return {
    l1Size: memoryCache.size,
    l2Size: 0, // L2 disabled for now
    hitRate,
    memoryUsage: memoryCache.size * 1024 // Rough estimate
  };
}

/**
 * Clear expired entries from caches
 */
export async function cleanupCache(): Promise<void> {
  // Clean L1 cache
  for (const [key, entry] of memoryCache.entries()) {
    if (!isValidCacheEntry(entry)) {
      memoryCache.delete(key);
    }
  }

  console.log(`🎯 Cache cleanup: L1 cache cleaned, ${memoryCache.size} entries remaining`);
}

// Helper functions
function generateCacheKey(question: QuestionInput): string {
  return `${question.id}-${question.studentAnswer}-${question.correctAnswer || ''}-${question.skillTags.join(',')}`;
}

function isValidCacheEntry(entry: CacheEntry): boolean {
  const age = Date.now() - entry.timestamp;
  return age < CACHE_TTL_MS && entry.result && typeof entry.result === 'object' && entry.result.questionId;
}
