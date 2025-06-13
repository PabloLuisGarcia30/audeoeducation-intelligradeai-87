
/**
 * Shared exercise validation and error handling utilities
 */

export interface ExerciseValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate exercise data structure with detailed error reporting
 */
export function validateExerciseData(data: any): ExerciseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic structure validation
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return { isValid: false, errors, warnings };
  }
  
  // Required fields
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Missing or invalid title');
  }
  
  if (!data.description || typeof data.description !== 'string') {
    warnings.push('Missing or invalid description');
  }
  
  if (!data.questions || !Array.isArray(data.questions)) {
    errors.push('Missing or invalid questions array');
    return { isValid: false, errors, warnings };
  }
  
  if (data.questions.length === 0) {
    errors.push('No questions provided');
    return { isValid: false, errors, warnings };
  }
  
  // Validate each question
  data.questions.forEach((question: any, index: number) => {
    const questionNum = index + 1;
    
    // Required question fields
    if (!question.id || typeof question.id !== 'string') {
      errors.push(`Question ${questionNum}: Missing or invalid id`);
    }
    
    if (!question.question || typeof question.question !== 'string') {
      errors.push(`Question ${questionNum}: Missing or invalid question text`);
    }
    
    if (!question.type || typeof question.type !== 'string') {
      errors.push(`Question ${questionNum}: Missing or invalid type`);
    }
    
    if (!question.correctAnswer) {
      errors.push(`Question ${questionNum}: Missing correct answer`);
    }
    
    if (question.points === undefined || question.points === null || typeof question.points !== 'number') {
      errors.push(`Question ${questionNum}: Missing or invalid points`);
    }
    
    // Type-specific validation
    if (question.type === 'multiple-choice') {
      if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`Question ${questionNum}: Multiple choice question must have at least 2 options`);
      }
      
      if (question.options && !question.options.includes(question.correctAnswer)) {
        warnings.push(`Question ${questionNum}: Correct answer not found in options`);
      }
    }
    
    // Optional field warnings
    if (!question.explanation) {
      warnings.push(`Question ${questionNum}: Missing explanation`);
    }
    
    if (!question.targetSkill) {
      warnings.push(`Question ${questionNum}: Missing target skill`);
    }
  });
  
  // Total points validation
  const expectedTotalPoints = data.questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
  if (data.totalPoints && data.totalPoints !== expectedTotalPoints) {
    warnings.push(`Total points mismatch: declared ${data.totalPoints}, calculated ${expectedTotalPoints}`);
    // Auto-correct the total points
    data.totalPoints = expectedTotalPoints;
  }
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    warnings 
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(message: string, status = 500) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  return new Response(
    JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Create fallback exercise data when generation fails
 */
export function createFallbackExercise(request: any): any {
  const skillName = request.skillName || 'General Knowledge';
  const questionCount = request.questionCount || 5;
  
  return {
    title: `${skillName} Practice (Simplified)`,
    description: `Simplified practice exercise for ${skillName}`,
    questions: Array.from({ length: questionCount }, (_, i) => ({
      id: `fallback_q${i + 1}`,
      type: 'short-answer',
      question: `Practice question ${i + 1} for ${skillName}. Please provide your answer.`,
      correctAnswer: 'Student response required for manual grading',
      points: 1,
      explanation: 'This is a simplified question created due to generation issues. Manual review recommended.',
      targetSkill: skillName
    })),
    totalPoints: questionCount,
    estimatedTime: questionCount * 2,
    metadata: {
      skillName,
      difficulty: 'simplified',
      generatedAt: new Date().toISOString(),
      studentName: request.studentName || 'Student',
      className: request.className || 'Class',
      fallback: true
    }
  };
}

/**
 * Log exercise generation metrics
 */
export function logExerciseMetrics(
  operation: string,
  success: boolean,
  duration: number,
  studentName?: string,
  skillName?: string,
  errorDetails?: string
) {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    success,
    duration,
    studentName,
    skillName,
    errorDetails
  };
  
  if (success) {
    console.log('✅ Exercise generation success:', JSON.stringify(logData));
  } else {
    console.error('❌ Exercise generation failure:', JSON.stringify(logData));
  }
}
