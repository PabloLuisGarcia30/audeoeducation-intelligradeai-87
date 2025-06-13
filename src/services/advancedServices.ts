
// Barrel export for advanced services including new caching services
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

// New caching services
export { SkillAwareCacheService } from './skillAwareCacheService';
export { CacheResponseService } from './cacheResponseService';
export { CacheLoggingService } from './cacheLoggingService';

export type { DocumentClassification, OcrMethod, AdaptiveOcrConfig, ProcessingMetrics } from './smartOcrService';
export type { BatchJob, QueueStatus } from './batchProcessingService';
export type { PerformanceMetric, SystemHealthMetrics, PerformanceReport } from './performanceMonitoringService';
export type { DistilBertConfig, DistilBertGradingResult } from './distilBertLocalGrading';
export type { QuestionClassification, SimpleAnswerValidation } from './enhancedQuestionClassifier';
export type { OpenAIGradingResult, ComplexQuestionBatch } from './openAIComplexGradingService';
export type { HybridGradingResults } from './hybridGradingResultsMerger';
export type { QuestionCacheKey, QuestionCacheResult, QuestionCacheStats } from './questionCacheService';
export type { CommonAnswerPattern, ExamPreProcessingConfig, PreProcessingReport } from './examPreProcessingService';
export type { SkillPreClassificationResult, SkillMappingCache } from './examSkillPreClassificationService';

// New caching types
export type { SkillAwareCacheKey, SkillAwareCacheResult, SkillCacheStats } from './skillAwareCacheService';
export type { CacheResponseConfig } from './cacheResponseService';
export type { CacheLogEvent } from './cacheLoggingService';
