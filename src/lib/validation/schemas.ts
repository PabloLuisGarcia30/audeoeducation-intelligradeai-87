
import { z } from 'zod';

// Base schemas for reusable validation patterns
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const scoreSchema = z.number().min(0).max(100);
export const confidenceSchema = z.number().min(0).max(1);
export const pointsSchema = z.number().min(0);

// Grading Input Schemas
export const singleQuestionGradingSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  studentAnswer: z.string().min(1, 'Student answer is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  pointsPossible: pointsSchema,
  questionNumber: z.number().positive(),
  studentName: z.string().optional(),
  skillContext: z.string().optional(),
  subject: z.string().optional(),
  questionType: z.string().optional()
});

export const batchQuestionSchema = z.object({
  questionNumber: z.number().positive(),
  questionText: z.string().min(1),
  studentAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
  pointsPossible: pointsSchema,
  skillContext: z.string().optional()
});

export const batchGradingSchema = z.object({
  questions: z.array(batchQuestionSchema).min(1, 'At least one question is required'),
  enhancedBatchPrompt: z.string().optional(),
  examId: z.string().min(1, 'Exam ID is required'),
  rubric: z.string().optional(),
  batchMode: z.boolean().optional()
});

export const skillEscalationSchema = z.object({
  questionNumber: z.number().positive(),
  questionText: z.string().min(1),
  studentAnswer: z.string().min(1),
  availableSkills: z.array(z.string()).min(1, 'At least one skill is required'),
  escalationPrompt: z.string().min(1),
  escalationMode: z.boolean(),
  model: z.enum(['gpt-4o-mini', 'gpt-4.1-2025-04-14']).optional()
});

export const wasmGradingSchema = z.object({
  studentAnswer: z.string().min(1, 'Student answer is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  questionClassification: z.any().optional()
});

// Explain Concept Schemas
export const explainConceptSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  explanation: z.string().min(1, 'Explanation is required'),
  subject: z.string().min(1, 'Subject is required'),
  grade: z.string().min(1, 'Grade is required'),
  skillName: z.string().min(1, 'Skill name is required'),
  questionType: z.string().optional()
});

// Student Answer Submission Schemas
export const singleAnswerSubmissionSchema = z.object({
  questionId: z.string().min(1),
  studentAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
  skillName: z.string().min(1),
  sessionId: uuidSchema.optional(),
  exerciseId: uuidSchema.optional(),
  timeSpent: z.number().min(0).optional(),
  answerChanges: z.number().min(0).optional()
});

export const bulkAnswerSubmissionSchema = z.object({
  sessionId: uuidSchema,
  answers: z.array(z.object({
    questionId: z.string().min(1),
    studentAnswer: z.string(),
    correctAnswer: z.string().min(1),
    skillName: z.string().min(1),
    timeSpent: z.number().min(0).optional(),
    answerChanges: z.number().min(0).optional()
  })).min(1, 'At least one answer is required'),
  studentId: uuidSchema,
  exerciseId: uuidSchema.optional()
});

// Misconception Logging Schemas
export const misconceptionDetectionSchema = z.object({
  questionContext: z.string().min(1, 'Question context is required'),
  studentAnswer: z.string().min(1, 'Student answer is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  skillTargeted: z.string().min(1, 'Skill targeted is required'),
  subject: z.string().min(1, 'Subject is required'),
  grade: z.string().min(1, 'Grade is required')
});

export const misconceptionLoggingSchema = z.object({
  studentId: uuidSchema,
  questionId: z.string().min(1),
  misconceptionCategory: z.string().min(1),
  misconceptionSubtype: z.string().optional(),
  confidence: confidenceSchema,
  skillName: z.string().min(1),
  studentAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
  context: z.record(z.any()).optional(),
  sessionId: uuidSchema.optional(),
  exerciseId: uuidSchema.optional()
});

// Test Analysis Schemas (for uploaded tests)
export const extractTextSchema = z.object({
  fileContent: z.string().min(1, 'File content is required'),
  fileName: z.string().min(1, 'File name is required')
});

export const analyzeTestSchema = z.object({
  files: z.array(z.object({
    fileName: z.string().min(1),
    extractedText: z.string(),
    structuredData: z.any()
  })).min(1, 'At least one file is required'),
  examId: z.string().min(1, 'Exam ID is required'),
  studentName: z.string().min(1, 'Student name is required'),
  studentEmail: z.string().email().optional()
});

// Export type definitions for TypeScript
export type SingleQuestionGradingInput = z.infer<typeof singleQuestionGradingSchema>;
export type BatchGradingInput = z.infer<typeof batchGradingSchema>;
export type SkillEscalationInput = z.infer<typeof skillEscalationSchema>;
export type WasmGradingInput = z.infer<typeof wasmGradingSchema>;
export type ExplainConceptInput = z.infer<typeof explainConceptSchema>;
export type SingleAnswerSubmissionInput = z.infer<typeof singleAnswerSubmissionSchema>;
export type BulkAnswerSubmissionInput = z.infer<typeof bulkAnswerSubmissionSchema>;
export type MisconceptionDetectionInput = z.infer<typeof misconceptionDetectionSchema>;
export type MisconceptionLoggingInput = z.infer<typeof misconceptionLoggingSchema>;
export type ExtractTextInput = z.infer<typeof extractTextSchema>;
export type AnalyzeTestInput = z.infer<typeof analyzeTestSchema>;
