
import { z } from 'zod';

// Validation schemas specific to grade-complex-question
export const singleQuestionGradingSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  studentAnswer: z.string().min(1, 'Student answer is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  pointsPossible: z.number().min(0),
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
  pointsPossible: z.number().min(0),
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

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  validationTime?: number;
}

export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  operationType: string
): ValidationResult<T> {
  const startTime = Date.now();
  
  try {
    const validatedData = schema.parse(data);
    const validationTime = Date.now() - startTime;
    
    console.log(`✅ ${operationType} validation successful in ${validationTime}ms`);
    
    return {
      success: true,
      data: validatedData,
      validationTime
    };
  } catch (error) {
    const validationTime = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      console.error(`❌ ${operationType} validation failed in ${validationTime}ms:`, formattedErrors);
      
      return {
        success: false,
        errors: formattedErrors,
        validationTime
      };
    }
    
    console.error(`❌ ${operationType} validation error:`, error);
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }],
      validationTime
    };
  }
}

export function createValidationResponse(
  errors: ValidationError[],
  operationType: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: errors,
      operationType,
      timestamp: new Date().toISOString()
    }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
