
import { z } from 'zod';

export const misconceptionDetectionSchema = z.object({
  questionContext: z.string().min(1, 'Question context is required'),
  studentAnswer: z.string().min(1, 'Student answer is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  skillTargeted: z.string().min(1, 'Skill targeted is required'),
  subject: z.string().min(1, 'Subject is required'),
  grade: z.string().min(1, 'Grade is required')
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
