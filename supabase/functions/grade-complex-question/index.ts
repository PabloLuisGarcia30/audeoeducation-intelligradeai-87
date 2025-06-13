import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  singleQuestionGradingSchema,
  batchGradingSchema,
  skillEscalationSchema,
  validateWithSchema,
  createValidationResponse
} from './validation.ts';
import { 
  handleSingleQuestionResponse,
  handleBatchGradingResponse,
  handleSkillEscalationResponse
} from './responseHandler.ts';
import { generateCorrelationId, logOpenAISuccess } from './responseUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly recoveryTimeoutMs = 60000;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('Circuit breaker opened due to failures');
    }
  }
}

const circuitBreaker = new CircuitBreaker();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const startTime = Date.now();
    
    // Validate input based on request type
    if (requestBody.escalationMode) {
      const validation = validateWithSchema(skillEscalationSchema, requestBody, 'Skill Escalation');
      if (!validation.success) {
        return createValidationResponse(validation.errors!, 'Skill Escalation', corsHeaders);
      }
      return await processSkillEscalation(validation.data!, openAIApiKey, startTime);
    } else if (requestBody.batchMode || Array.isArray(requestBody.questions)) {
      const validation = validateWithSchema(batchGradingSchema, requestBody, 'Batch Grading');
      if (!validation.success) {
        return createValidationResponse(validation.errors!, 'Batch Grading', corsHeaders);
      }
      return await processEnhancedBatchQuestions(validation.data!, openAIApiKey, startTime);
    } else {
      const validation = validateWithSchema(singleQuestionGradingSchema, requestBody, 'Single Question Grading');
      if (!validation.success) {
        return createValidationResponse(validation.errors!, 'Single Question Grading', corsHeaders);
      }
      return await processSingleQuestion(validation.data!, openAIApiKey, startTime);
    }

  } catch (error) {
    console.error('Error in grade-complex-question:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processEnhancedBatchQuestions(requestBody: any, openAIApiKey: string, startTime: number) {
  const { questions, enhancedBatchPrompt, examId, rubric } = requestBody;
  const correlationId = generateCorrelationId('batch_grade');
  
  if (!questions || !Array.isArray(questions)) {
    return new Response(
      JSON.stringify({ error: 'Invalid batch request: questions array required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const finalPrompt = enhancedBatchPrompt || createEnhancedBatchPrompt(questions, rubric);

  console.log(`🎯 [${correlationId}] Processing enhanced batch: ${questions.length} questions`);

  try {
    const result = await circuitBreaker.execute(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational grading assistant. Process each question independently and avoid cross-question contamination. Always respond with valid JSON matching the requested format.'
            },
            {
              role: 'user',
              content: finalPrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 3000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API request failed: ${response.status}`);
      }

      return await response.json();
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Use enhanced response handler
    const processedResults = handleBatchGradingResponse(content, questions, correlationId);
    
    const processingTime = Date.now() - startTime;
    logOpenAISuccess('Batch Grading', processingTime, result.usage, correlationId);

    console.log(`✅ [${correlationId}] Enhanced batch grading completed: ${questions.length} questions processed`);

    return new Response(
      JSON.stringify({
        success: true,
        results: processedResults.results || processedResults,
        usage: result.usage,
        batchSize: questions.length,
        processingTime,
        enhancedProcessing: true,
        correlationId,
        fallbackUsed: processedResults.fallbackUsed || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${correlationId}] Enhanced batch processing failed:`, error);
    
    const fallbackResults = questions.map((q: any, index: number) => ({
      questionNumber: q.questionNumber || index + 1,
      isCorrect: false,
      pointsEarned: 0,
      confidence: 0.3,
      reasoning: `Enhanced batch processing failed: ${error.message}. Manual review required.`,
      complexityScore: 0.5,
      reasoningDepth: 'medium',
      matchedSkills: [],
      skillConfidence: 0.3
    }));

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results: fallbackResults,
        fallbackUsed: true,
        correlationId,
        enhancedProcessing: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processSkillEscalation(requestBody: any, openAIApiKey: string, startTime: number) {
  const { questionNumber, questionText, studentAnswer, availableSkills, escalationPrompt, model = 'gpt-4.1-2025-04-14' } = requestBody;
  const correlationId = generateCorrelationId('skill_esc');

  console.log(`🎯 [${correlationId}] Processing skill escalation for Q${questionNumber} using ${model}`);

  try {
    const result = await circuitBreaker.execute(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational assessment specialist. Resolve skill matching ambiguity with precision and confidence.'
            },
            {
              role: 'user',
              content: escalationPrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Skill escalation API error:', errorText);
        throw new Error(`Skill escalation failed: ${response.status}`);
      }

      return await response.json();
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from skill escalation');
    }

    // Use enhanced response handler
    const skillResult = handleSkillEscalationResponse(content, availableSkills, correlationId);
    
    const processingTime = Date.now() - startTime;
    logOpenAISuccess('Skill Escalation', processingTime, result.usage, correlationId);

    console.log(`✅ [${correlationId}] Skill escalation completed for Q${questionNumber}: ${skillResult.matchedSkills.join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        skillEscalation: skillResult,
        usage: result.usage,
        model,
        correlationId,
        escalated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${correlationId}] Skill escalation processing failed:`, error);
    
    const fallbackResult = {
      matchedSkills: [availableSkills[0] || 'General'],
      confidence: 0.6,
      reasoning: `Skill escalation failed: ${error.message}. Using fallback assignment.`,
      primarySkill: availableSkills[0] || 'General'
    };

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        skillEscalation: fallbackResult,
        correlationId,
        fallbackUsed: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processSingleQuestion(requestBody: any, openAIApiKey: string, startTime: number) {
  const { questionText, studentAnswer, correctAnswer, pointsPossible, questionNumber, studentName, skillContext, questionType } = requestBody;
  const correlationId = generateCorrelationId('single_grade');

  if (!questionText || !studentAnswer || !correctAnswer) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: questionText, studentAnswer, correctAnswer' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const prompt = createSingleQuestionPrompt(requestBody);

  try {
    const result = await circuitBreaker.execute(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational grading assistant with expertise in misconception analysis. Always respond with valid JSON matching the requested format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error('OpenAI API request failed');
      }

      return await response.json();
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Use enhanced response handler
    const gradingResult = handleSingleQuestionResponse(content, questionNumber, pointsPossible, correlationId);
    
    const processingTime = Date.now() - startTime;
    logOpenAISuccess('Single Question Grading', processingTime, result.usage, correlationId);

    // Add usage information
    const sanitizedResult = {
      ...gradingResult,
      usage: {
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0
      },
      correlationId,
      processingTime
    };

    console.log(`✅ [${correlationId}] OpenAI graded Q${questionNumber}: ${sanitizedResult.pointsEarned}/${pointsPossible} points`);

    return new Response(
      JSON.stringify(sanitizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${correlationId}] Single question processing failed:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        correlationId,
        fallbackUsed: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function createSingleQuestionPrompt(requestBody: any): string {
  const { questionText, studentAnswer, correctAnswer, pointsPossible, questionNumber, studentName, skillContext, subject, questionType } = requestBody;

  const isAnalyzableForMisconceptions = questionType === 'short-answer' || questionType === 'essay';
  
  return `You are an expert educational grading assistant. Grade this ${questionType} question and ${isAnalyzableForMisconceptions ? 'analyze any misconceptions' : 'provide basic feedback'}.

Question: ${questionText}
Student Answer: "${studentAnswer}"
Correct Answer: "${correctAnswer}"
Points Possible: ${pointsPossible}
${subject ? `Subject: ${subject}` : ''}
${skillContext ? `Skill Context: ${skillContext}` : ''}

${isAnalyzableForMisconceptions ? `
MISCONCEPTION ANALYSIS: Since this is a ${questionType} question, analyze the student's response for educational misconceptions using these categories:

1. **Procedural Errors**: Mistakes in execution of known steps (Step Omission, Step Order Error, Symbol Confusion, Partial Completion, Flawed Memorized Routine)
2. **Conceptual Errors**: Misunderstanding of underlying ideas (False Assumption, Category Confusion, Causal Misunderstanding, Overgeneralization, Model Misuse)
3. **Interpretive Errors**: Misunderstood task/content (Keyword Confusion, Ambiguity Blindness, Literal Interpretation, Task Misread, Diagram/Text Misalignment)
4. **Expression Errors**: Can't express knowledge clearly (Vocabulary Mismatch, Poor Organization, Omitted Justification, Communication Breakdown, Grammatical Noise)
5. **Strategic Errors**: Wrong approach/method (Guess-and-Check Default, Overkill Strategy, Off-topic Response, Algorithmic Overreliance, Misapplied Prior Knowledge)
6. **Meta-Cognitive Errors**: Awareness breakdown (Overconfidence in Error, Underconfidence in Correct Work, Repeated Submission Without Adjustment, Ignores Feedback, Abandons Question Midway)

If the answer is incorrect, identify the primary misconception category and specific subtype.` : ''}

Provide your response in JSON format:
{
  "isCorrect": boolean,
  "pointsEarned": number (0 to ${pointsPossible}),
  "confidence": number (0 to 1),
  "reasoning": "detailed explanation of grading decision",
  "complexityScore": number (0 to 1),
  "reasoningDepth": "shallow" | "medium" | "deep"${isAnalyzableForMisconceptions ? `,
  "misconceptionCategory": "category name or null",
  "misconceptionSubtype": "specific subtype or null",
  "misconceptionConfidence": number (0 to 1),
  "misconceptionReasoning": "explanation of misconception if found"` : ''}
}`;
}

function createEnhancedBatchPrompt(questions: any[], rubric?: string): string {
  const questionCount = questions.length;
  const delimiter = '---END QUESTION---';
  
  return `Grade ${questionCount} test questions with enhanced cross-question isolation. Process each question INDEPENDENTLY.

CRITICAL PROCESSING RULES:
1. Each question is separated by "${delimiter}"
2. Do NOT let answers from one question influence another
3. Process questions as completely separate tasks
4. Match skills ONLY from the provided list for each question
5. Maintain strict question boundaries

${rubric ? `GRADING RUBRIC:\n${rubric}\n` : ''}

QUESTIONS TO GRADE (PROCESS INDEPENDENTLY):
${questions.map((q, index) => {
  const skillContext = q.skillContext ? `\nAvailable Skills: ${q.skillContext}` : '';
  return `Question ${index + 1} (Q${q.questionNumber || index + 1}):
Question Text: ${q.questionText || 'Question text not available'}
Student Answer: "${q.studentAnswer || 'No answer detected'}"
Correct Answer: "${q.correctAnswer || 'Not specified'}"
Points Possible: ${q.pointsPossible || 1}${skillContext}
Instructions: Match answer strictly to provided skills. Do not infer additional skills.`;
}).join(`\n${delimiter}\n`)}

REQUIRED OUTPUT FORMAT (JSON object with results array):
{
  "results": [
    {
      "questionNumber": 1,
      "isCorrect": true,
      "pointsEarned": 2,
      "confidence": 0.95,
      "reasoning": "Detailed explanation focusing on this question only",
      "complexityScore": 0.6,
      "reasoningDepth": "medium",
      "matchedSkills": ["skill1"],
      "skillConfidence": 0.9
    }
  ]
}

CRITICAL: Return exactly ${questionCount} results. Process each question independently without cross-contamination.`;
}
