
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExplanationContext {
  question: string;
  correctAnswer: string;
  explanation: string;
  subject: string;
  grade: string;
  skillName: string;
  questionType?: string;
}

// Simple question-type-based routing
function routeByQuestionType(context: ExplanationContext): {
  selectedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14';
  reasoning: string;
  complexityScore: number;
} {
  const questionText = context.question.toLowerCase();
  const correctAnswer = context.correctAnswer.toLowerCase();

  // Check for multiple choice indicators
  const mcqIndicators = [
    /\ba\)|b\)|c\)|d\)/i,
    /\b\(?a\)|\(?b\)|\(?c\)|\(?d\)/i,
    /which of the following/i,
    /select the/i,
    /choose the/i
  ];

  const isMCQ = mcqIndicators.some(pattern => pattern.test(questionText)) ||
                /^[A-D]$/i.test(correctAnswer.trim()) ||
                /^[A-D]\)/i.test(correctAnswer.trim());

  // Check for true/false
  const isTF = ['true', 'false', 't', 'f', 'yes', 'no'].includes(correctAnswer.trim().toLowerCase());

  if (isMCQ) {
    return {
      selectedModel: 'gpt-4o-mini',
      reasoning: 'Selected gpt-4o-mini for multiple choice question - simple explanation suitable',
      complexityScore: 20
    };
  }

  if (isTF) {
    return {
      selectedModel: 'gpt-4o-mini', 
      reasoning: 'Selected gpt-4o-mini for true/false question - simple explanation suitable',
      complexityScore: 15
    };
  }

  // Default to complex for open-ended questions
  return {
    selectedModel: 'gpt-4.1-2025-04-14',
    reasoning: 'Selected gpt-4.1-2025-04-14 for open-ended question - detailed explanation required',
    complexityScore: 80
  };
}

function shouldFallbackToGPT4o(result: string, wasSimpleQuestion: boolean): boolean {
  // For simple routing, minimal fallback logic
  const wordCount = result.split(/\s+/).length;
  
  // Only fallback if result is extremely short (likely an error)
  if (wordCount < 50) return true;
  
  // Check for error messages
  if (result.toLowerCase().includes('error') || result.toLowerCase().includes('sorry')) return true;
  
  return false;
}

async function generateExplanationWithModel(model: string, context: ExplanationContext): Promise<string> {
  const systemPrompt = `You are an expert teacher who explains concepts to 12-year-old students. Your goal is to make complex ideas simple, engaging, and easy to understand.

Instructions:
- Explain the concept as if talking to a 12-year-old student
- Use simple words, analogies, and examples from everyday life
- Make it engaging and interesting
- Write approximately 180 words
- Break down complex ideas into smaller, digestible parts
- Use encouraging and supportive language
- Include practical examples or real-world connections when possible
- Avoid jargon and technical terms, or explain them simply if necessary

The student is learning ${context.subject} in ${context.grade} and working on the skill: ${context.skillName}`;

  const userPrompt = `The student answered this question: "${context.question}"

The correct answer was: "${context.correctAnswer}"

The basic explanation given was: "${context.explanation}"

Please provide a detailed, engaging explanation of this concept that a 12-year-old would understand. Make it about 180 words and help them really grasp why this answer is correct and how this concept works in general.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, correctAnswer, explanation, subject, grade, skillName, questionType } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const context: ExplanationContext = {
      question,
      correctAnswer,
      explanation,
      subject: subject || 'General',
      grade: grade || 'Grade 10',
      skillName,
      questionType
    };

    console.log('Using simplified question-type routing for explanations...');
    
    // Simple question-type-based routing
    const routingDecision = routeByQuestionType(context);
    console.log(`Routing decision: ${routingDecision.selectedModel}`);
    console.log(`Reasoning: ${routingDecision.reasoning}`);

    let detailedExplanation: string;
    let usedModel = routingDecision.selectedModel;
    let fallbackTriggered = false;

    try {
      // Try with initially selected model
      detailedExplanation = await generateExplanationWithModel(routingDecision.selectedModel, context);
      
      // Quality check and potential fallback for gpt-4o-mini
      if (routingDecision.selectedModel === 'gpt-4o-mini') {
        const wasSimpleQuestion = routingDecision.complexityScore < 30;
        if (shouldFallbackToGPT4o(detailedExplanation, wasSimpleQuestion)) {
          console.log('Quality check failed for gpt-4o-mini, falling back to gpt-4.1-2025-04-14...');
          detailedExplanation = await generateExplanationWithModel('gpt-4.1-2025-04-14', context);
          usedModel = 'gpt-4.1-2025-04-14';
          fallbackTriggered = true;
        }
      }
    } catch (error) {
      // Error fallback - if gpt-4o-mini fails, try gpt-4.1-2025-04-14
      if (routingDecision.selectedModel === 'gpt-4o-mini') {
        console.log('gpt-4o-mini failed, falling back to gpt-4.1-2025-04-14...');
        detailedExplanation = await generateExplanationWithModel('gpt-4.1-2025-04-14', context);
        usedModel = 'gpt-4.1-2025-04-14';
        fallbackTriggered = true;
      } else {
        throw error;
      }
    }

    // Log routing results for analytics
    console.log(`Successfully generated explanation using ${usedModel}${fallbackTriggered ? ' (after fallback)' : ''}`);
    console.log(`Cost factor: ${usedModel === 'gpt-4.1-2025-04-14' ? '8x' : '1x'} baseline`);

    return new Response(JSON.stringify({ 
      detailedExplanation,
      routingInfo: {
        selectedModel: usedModel,
        originalModel: routingDecision.selectedModel,
        fallbackTriggered,
        complexityScore: routingDecision.complexityScore,
        confidence: 95, // High confidence in question-type routing
        reasoning: routingDecision.reasoning
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in explain-concept function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate detailed explanation. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
