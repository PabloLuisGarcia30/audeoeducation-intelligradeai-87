
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

// Export type definitions
export type SingleQuestionGradingResponse = z.infer<typeof singleQuestionGradingResponseSchema>;
export type BatchGradingResponse = z.infer<typeof batchGradingResponseSchema>;
export type SkillEscalationResponse = z.infer<typeof skillEscalationResponseSchema>;
