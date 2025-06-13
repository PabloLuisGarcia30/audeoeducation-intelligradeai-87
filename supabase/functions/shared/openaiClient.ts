
/**
 * Shared OpenAI client utilities for edge functions
 */

export interface OpenAICallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Standardized OpenAI API interaction
 */
export async function callOpenAI(
  userPrompt: string,
  options: OpenAICallOptions = {}
): Promise<OpenAIResponse> {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt = 'You are an expert teacher creating educational content. Always respond with valid JSON only.'
  } = options;

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

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
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  return {
    content,
    usage: data.usage
  };
}

/**
 * Parse and validate JSON response from OpenAI
 */
export function parseAndValidateJSON<T>(content: string, validator?: (data: any) => boolean): T {
  let parsedData: T;
  
  try {
    parsedData = JSON.parse(content);
  } catch (parseError) {
    console.error('❌ Failed to parse OpenAI response:', content);
    throw new Error('Invalid JSON response from OpenAI');
  }

  // Apply custom validation if provided
  if (validator && !validator(parsedData)) {
    throw new Error('Response validation failed');
  }

  return parsedData;
}

/**
 * Build consistent system prompts for educational content
 */
export function buildEducationalSystemPrompt(type: 'exercise' | 'test' | 'practice'): string {
  const basePrompt = 'You are an expert teacher creating educational content.';
  
  switch (type) {
    case 'exercise':
      return `${basePrompt} Create engaging, interactive exercises that help students improve their skills. Always respond with valid JSON only.`;
    case 'test':
      return `${basePrompt} Generate high-quality, educational questions that help students practice specific skills. Always respond with valid JSON only.`;
    case 'practice':
      return `${basePrompt} Create personalized practice exercises. Always respond with valid JSON only.`;
    default:
      return `${basePrompt} Always respond with valid JSON only.`;
  }
}

/**
 * Handle OpenAI errors with consistent error messages
 */
export function handleOpenAIError(error: any): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('temporarily unavailable')) {
    return new Error('AI service is temporarily unavailable. Please try again in a moment.');
  } else if (errorMessage.includes('rate limit')) {
    return new Error('Rate limit reached. Please try again in a moment.');
  } else if (errorMessage.includes('server had an error')) {
    return new Error('AI service encountered an error. Please try again.');
  } else if (errorMessage.includes('timeout')) {
    return new Error('Request timed out. Please try again.');
  } else if (errorMessage.includes('API key')) {
    return new Error('API configuration error. Please contact support.');
  } else {
    return new Error(errorMessage);
  }
}
