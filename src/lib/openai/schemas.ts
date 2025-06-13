
import { z } from 'zod';

// Base schemas
const pointsSchema = z.number().min(0);
const confidenceSchema = z.number().min(0).max(1);
const scoreBetween0And100 = z.number().min(0).max(100);

// Single Question Grading Response Schema
export const singleQuestionGradingResponseSchema = z.object({
  isCorrect: z.boolean(),
  pointsEarned: pointsSchema,
  confidence: confidenceSchema,
  reasoning: z.string().min(1, 'Reasoning is required'),
  complexityScore: z.number().min(0).max(1).optional(),
  reasoningDepth: z.enum(['shallow', 'medium', 'deep']).optional(),
  misconceptionCategory: z.string().optional(),
  misconceptionSubtype: z.string().optional(),
  misconceptionConfidence: confidenceSchema.optional(),
  misconceptionReasoning: z.string().optional()
});

// Batch Question Result Schema
export const batchQuestionResultSchema = z.object({
  questionNumber: z.number().positive(),
  isCorrect: z.boolean(),
  pointsEarned: pointsSchema,
  confidence: confidenceSchema,
  reasoning: z.string().min(1, 'Reasoning is required'),
  complexityScore: z.number().min(0).max(1).optional(),
  reasoningDepth: z.enum(['shallow', 'medium', 'deep']).optional(),
  matchedSkills: z.array(z.string()).optional(),
  skillConfidence: confidenceSchema.optional()
});

// Batch Grading Response Schema
export const batchGradingResponseSchema = z.object({
  results: z.array(batchQuestionResultSchema).min(1, 'At least one result is required')
});

// Skill Escalation Response Schema
export const skillEscalationResponseSchema = z.object({
  matchedSkills: z.array(z.string()).min(1, 'At least one skill must be matched'),
  confidence: confidenceSchema,
  reasoning: z.string().min(1, 'Reasoning is required'),
  primarySkill: z.string().min(1, 'Primary skill is required')
});

// Concept Explanation Response Schema
export const conceptExplanationResponseSchema = z.object({
  detailedExplanation: z.string().min(50, 'Explanation must be at least 50 characters'),
  routingInfo: z.object({
    selectedModel: z.string(),
    originalModel: z.string().optional(),
    fallbackTriggered: z.boolean().optional(),
    complexityScore: z.number().min(0).max(1).optional(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string()
  }).optional()
});

// Misconception Detection Response Schema
export const misconceptionDetectionResponseSchema = z.object({
  concept_missed: z.string().min(1, 'Concept description is required'),
  concept_id: z.string().nullable(),
  confidence: confidenceSchema
});

// Test Analysis Response Schema
export const testAnalysisResponseSchema = z.object({
  overallScore: scoreBetween0And100,
  grade: z.string().min(1, 'Grade is required'),
  total_points_earned: pointsSchema,
  total_points_possible: pointsSchema,
  ai_feedback: z.string().optional(),
  content_skill_scores: z.array(z.object({
    skill_name: z.string(),
    score: scoreBetween0And100,
    points_earned: pointsSchema,
    points_possible: pointsSchema
  })).optional(),
  subject_skill_scores: z.array(z.object({
    skill_name: z.string(),
    score: scoreBetween0And100,
    points_earned: pointsSchema,
    points_possible: pointsSchema
  })).optional()
});

// Export type definitions
export type SingleQuestionGradingResponse = z.infer<typeof singleQuestionGradingResponseSchema>;
export type BatchGradingResponse = z.infer<typeof batchGradingResponseSchema>;
export type SkillEscalationResponse = z.infer<typeof skillEscalationResponseSchema>;
export type ConceptExplanationResponse = z.infer<typeof conceptExplanationResponseSchema>;
export type MisconceptionDetectionResponse = z.infer<typeof misconceptionDetectionResponseSchema>;
export type TestAnalysisResponse = z.infer<typeof testAnalysisResponseSchema>;
