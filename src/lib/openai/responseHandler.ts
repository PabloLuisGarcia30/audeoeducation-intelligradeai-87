
import { z } from 'zod';

// Safe JSON Parsing Layer
export function cleanOpenAIResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/, '')
    .replace(/\s*```$/, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

export function safeParseOpenAIResponse<T>(
  rawContent: string,
  schema: z.ZodSchema<T>,
  operationType: string,
  correlationId?: string
): {
  success: boolean;
  data?: T;
  error?: string;
  usedFallback?: boolean;
} {
  const logPrefix = correlationId ? `[${correlationId}]` : '';
  
  try {
    // Step 1: Clean the response
    const cleanedContent = cleanOpenAIResponse(rawContent);
    console.log(`${logPrefix} 🧹 Cleaned OpenAI response for ${operationType}`);
    
    // Step 2: Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(`${logPrefix} ❌ JSON parse failed for ${operationType}:`, parseError);
      console.error(`${logPrefix} Raw content preview:`, rawContent.substring(0, 200));
      return {
        success: false,
        error: `Invalid JSON returned from OpenAI: ${parseError.message}`
      };
    }

    // Step 3: Schema validation
    const validationResult = schema.safeParse(parsed);
    if (!validationResult.success) {
      console.error(`${logPrefix} ❌ Schema validation failed for ${operationType}:`, validationResult.error.issues);
      console.error(`${logPrefix} Parsed content:`, JSON.stringify(parsed, null, 2));
      return {
        success: false,
        error: `OpenAI response failed schema validation: ${validationResult.error.issues.map(i => i.message).join(', ')}`
      };
    }

    console.log(`${logPrefix} ✅ OpenAI response validated successfully for ${operationType}`);
    return {
      success: true,
      data: validationResult.data
    };

  } catch (error) {
    console.error(`${logPrefix} ❌ Unexpected error in response handling for ${operationType}:`, error);
    return {
      success: false,
      error: `Unexpected error processing OpenAI response: ${error.message}`
    };
  }
}

// Content Sanity Checks
export function validateGradingLogic(result: any, pointsPossible: number): {
  isValid: boolean;
  warnings: string[];
  correctedResult?: any;
} {
  const warnings: string[] = [];
  let correctedResult = { ...result };

  // Check points earned vs possible
  if (result.pointsEarned > pointsPossible) {
    warnings.push(`Points earned (${result.pointsEarned}) exceeds possible (${pointsPossible})`);
    correctedResult.pointsEarned = pointsPossible;
  }

  // Flag suspicious confidence + incorrect combinations
  if (result.confidence > 0.95 && !result.isCorrect) {
    warnings.push(`High confidence (${result.confidence}) with incorrect answer - may indicate model confusion`);
    correctedResult.confidence = Math.min(result.confidence, 0.85);
  }

  // Check for empty reasoning
  if (!result.reasoning || result.reasoning.trim().length === 0) {
    warnings.push('Empty reasoning provided');
    correctedResult.reasoning = 'Automated grading completed - manual review recommended for detailed feedback';
  }

  // Validate confidence bounds
  if (result.confidence < 0 || result.confidence > 1) {
    warnings.push(`Invalid confidence value: ${result.confidence}`);
    correctedResult.confidence = Math.max(0, Math.min(1, result.confidence || 0.5));
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    correctedResult: warnings.length > 0 ? correctedResult : undefined
  };
}

// Enhanced Error Logging
export function logOpenAIError(
  operationType: string,
  error: any,
  rawResponse?: string,
  correlationId?: string,
  retryCount = 0
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    operationType,
    correlationId,
    retryCount,
    error: {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack?.substring(0, 500)
    },
    rawResponsePreview: rawResponse?.substring(0, 300),
    responseLength: rawResponse?.length
  };

  console.error('🚨 OpenAI Response Error:', JSON.stringify(logData, null, 2));
  
  // In production, you might want to send this to a monitoring service
  // monitoringService.trackError('openai_response_error', logData);
}

export function logOpenAISuccess(
  operationType: string,
  processingTimeMs: number,
  tokenUsage?: any,
  correlationId?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    operationType,
    correlationId,
    processingTimeMs,
    tokenUsage,
    status: 'success'
  };

  console.log('✅ OpenAI Response Success:', JSON.stringify(logData, null, 2));
}

// Generate correlation ID for request tracking
export function generateCorrelationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
