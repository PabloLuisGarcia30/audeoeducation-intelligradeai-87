// Barrel export for advanced services including new unified grading services
export { PerformanceMonitoringService } from './performanceMonitoringService';
export { SmartOcrService } from './smartOcrService';
export { BatchProcessingService } from './batchProcessingService';
export { DistilBertLocalGradingService } from './distilBertLocalGrading';
export { EnhancedQuestionClassifier } from './enhancedQuestionClassifier';
export { OpenAIComplexGradingService } from './openAIComplexGradingService';
export { HybridGradingResultsMerger } from './hybridGradingResultsMerger';
export { QuestionCacheService } from './questionCacheService';
export { ExamPreProcessingService } from './examPreProcessingService';
export { ExamSkillPreClassificationService } from './examSkillPreClassificationService';

// New unified grading services
export { gradeBatchUnified, gradeComplexQuestions } from './grading/UnifiedBatchGradingService';
export { OpenAIGraderAdapter } from './grading/adapters/OpenAIGraderAdapter';
export { DistilBERTGraderAdapter } from './grading/adapters/DistilBERTGraderAdapter';
export { getCachedResults, writeResults, getCacheStats, cleanupCache } from './grading/cache/GradingCache';

// New unified practice exercise grading
export { PracticeExerciseGradingServiceUnified } from './practiceExerciseGradingServiceUnified';

// New caching services
export { SkillAwareCacheService } from './skillAwareCacheService';
export { CacheResponseService } from './cacheResponseService';
export { CacheLoggingService } from './cacheLoggingService';

// New canonical grading types
export type { 
  QuestionInput,
  GradedAnswer,
  BatchGradingResult,
  BatchProcessingConfig,
  SkillMapping,
  QuestionSkillMappings,
  EnhancedGradingResult,
  CommonAnswerPattern,
  QuestionCacheKey,
  QuestionCacheResult
} from './grading/types';

// Legacy type aliases for backward compatibility
export type { 
  OpenAIGradingResult,
  EnhancedLocalGradingResult,
  BatchQuestionResult
} from './grading/types';

export type { DocumentClassification, OcrMethod, AdaptiveOcrConfig, ProcessingMetrics } from './smartOcrService';
export type { BatchJob, QueueStatus } from './batchProcessingService';
export type { PerformanceMetric, SystemHealthMetrics, PerformanceReport } from './performanceMonitoringService';
export type { DistilBertConfig, DistilBertGradingResult } from './distilBertLocalGrading';
export type { QuestionClassification, SimpleAnswerValidation } from './enhancedQuestionClassifier';
export type { ComplexQuestionBatch } from './openAIComplexGradingService';
export type { HybridGradingResults } from './hybridGradingResultsMerger';
export type { QuestionCacheStats } from './questionCacheService';
export type { ExamPreProcessingConfig, PreProcessingReport } from './examPreProcessingService';
export type { SkillPreClassificationResult, SkillMappingCache } from './examSkillPreClassificationService';

// New caching types
export type { SkillAwareCacheKey, SkillAwareCacheResult, SkillCacheStats } from './skillAwareCacheService';
export type { CacheResponseConfig } from './cacheResponseService';
export type { CacheLogEvent } from './cacheLoggingService';

// New grading interfaces
export type { BatchGrader, GraderConfig } from './grading/BatchGrader';
