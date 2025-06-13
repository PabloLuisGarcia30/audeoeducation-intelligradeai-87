
import { 
  safeParseOpenAIResponse, 
  validateGradingLogic, 
  logOpenAIError, 
  logOpenAISuccess,
  generateCorrelationId 
} from '../../../src/lib/openai/responseHandler.ts';
import { 
  singleQuestionGradingResponseSchema,
  batchGradingResponseSchema,
  skillEscalationResponseSchema 
} from '../../../src/lib/openai/schemas.ts';
import { 
  generateSingleQuestionFallback,
  generateFallbackResults,
  generateSkillEscalationFallback 
} from '../../../src/lib/openai/fallbacks.ts';

export function handleSingleQuestionResponse(
  rawResponse: string,
  questionNumber: number,
  pointsPossible: number,
  correlationId: string
): any {
  const parseResult = safeParseOpenAIResponse(
    rawResponse,
    singleQuestionGradingResponseSchema,
    'Single Question Grading',
    correlationId
  );

  if (!parseResult.success) {
    logOpenAIError('Single Question Grading', new Error(parseResult.error), rawResponse, correlationId);
    return generateSingleQuestionFallback(questionNumber, pointsPossible, parseResult.error || 'Unknown error');
  }

  const result = parseResult.data!;
  
  // Content sanity checks
  const validation = validateGradingLogic(result, pointsPossible);
  if (!validation.isValid) {
    console.warn(`⚠️ [${correlationId}] Grading logic warnings:`, validation.warnings);
  }

  return validation.correctedResult || result;
}

export function handleBatchGradingResponse(
  rawResponse: string,
  questions: any[],
  correlationId: string
): any {
  const parseResult = safeParseOpenAIResponse(
    rawResponse,
    batchGradingResponseSchema,
    'Batch Grading',
    correlationId
  );

  if (!parseResult.success) {
    logOpenAIError('Batch Grading', new Error(parseResult.error), rawResponse, correlationId);
    return {
      results: generateFallbackResults(questions),
      fallbackUsed: true,
      error: parseResult.error
    };
  }

  const batchResults = parseResult.data!;
  
  // Validate result count matches question count
  if (batchResults.results.length !== questions.length) {
    console.warn(`⚠️ [${correlationId}] Result count mismatch: expected ${questions.length}, got ${batchResults.results.length}`);
    
    // Pad or trim results to match
    while (batchResults.results.length < questions.length) {
      const missingIndex = batchResults.results.length;
      batchResults.results.push(generateSingleQuestionFallback(
        questions[missingIndex]?.questionNumber || missingIndex + 1,
        questions[missingIndex]?.pointsPossible || 1,
        'Missing result from batch response'
      ));
    }
    
    if (batchResults.results.length > questions.length) {
      batchResults.results = batchResults.results.slice(0, questions.length);
    }
  }

  // Validate each result
  batchResults.results = batchResults.results.map((result, index) => {
    const question = questions[index];
    const pointsPossible = question?.pointsPossible || 1;
    
    const validation = validateGradingLogic(result, pointsPossible);
    if (!validation.isValid) {
      console.warn(`⚠️ [${correlationId}] Q${result.questionNumber} warnings:`, validation.warnings);
    }
    
    return validation.correctedResult || result;
  });

  return batchResults;
}

export function handleSkillEscalationResponse(
  rawResponse: string,
  availableSkills: string[],
  correlationId: string
): any {
  const parseResult = safeParseOpenAIResponse(
    rawResponse,
    skillEscalationResponseSchema,
    'Skill Escalation',
    correlationId
  );

  if (!parseResult.success) {
    logOpenAIError('Skill Escalation', new Error(parseResult.error), rawResponse, correlationId);
    return generateSkillEscalationFallback(availableSkills, parseResult.error || 'Unknown error');
  }

  const result = parseResult.data!;
  
  // Validate matched skills are in available skills
  const validSkills = result.matchedSkills.filter(skill => availableSkills.includes(skill));
  if (validSkills.length === 0) {
    console.warn(`⚠️ [${correlationId}] No valid skills matched, using fallback`);
    return generateSkillEscalationFallback(availableSkills, 'No valid skills matched');
  }

  return {
    ...result,
    matchedSkills: validSkills,
    primarySkill: validSkills[0]
  };
}
