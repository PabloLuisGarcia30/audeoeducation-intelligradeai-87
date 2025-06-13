
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  explainConceptSchema,
  validateWithSchema,
  createValidationResponse
} from './validation.ts';

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

interface GradeConfig {
  wordLimit: number;
  temperature: number;
  vocabularyLevel: string;
  toneDescription: string;
  analogySources: string;
  gradeCategory: string;
}

// Grade-appropriate configuration
function getGradeConfig(grade: string): GradeConfig {
  const gradeNumber = extractGradeNumber(grade);
  
  if (gradeNumber <= 5) {
    // Elementary (K-5)
    return {
      wordLimit: 150,
      temperature: 0.8,
      vocabularyLevel: 'simple, age-appropriate',
      toneDescription: 'fun, engaging, and memorable',
      analogySources: 'animals, fairy tales, playground games, toys, and familiar activities',
      gradeCategory: 'elementary'
    };
  } else if (gradeNumber <= 8) {
    // Middle School (6-8)
    return {
      wordLimit: 180,
      temperature: 0.75,
      vocabularyLevel: 'moderate, with some advanced terms explained simply',
      toneDescription: 'engaging and relatable',
      analogySources: 'social media, popular movies, sports, video games, and teen interests',
      gradeCategory: 'middle school'
    };
  } else if (gradeNumber <= 12) {
    // High School (9-12)
    return {
      wordLimit: 200,
      temperature: 0.7,
      vocabularyLevel: 'sophisticated but accessible',
      toneDescription: 'clear, professional, and relatable',
      analogySources: 'real-world careers, current events, technology, and practical applications',
      gradeCategory: 'high school'
    };
  } else {
    // College/Adult (13+)
    return {
      wordLimit: 220,
      temperature: 0.6,
      vocabularyLevel: 'academic and precise',
      toneDescription: 'insightful, professional, and comprehensive',
      analogySources: 'professional scenarios, historical examples, scientific principles, and advanced concepts',
      gradeCategory: 'college/adult'
    };
  }
}

function extractGradeNumber(grade: string): number {
  // Extract numeric part from grade strings like "Grade 10", "10th Grade", "Grade K", etc.
  const match = grade.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  // Handle special cases
  if (grade.toLowerCase().includes('k') || grade.toLowerCase().includes('kindergarten')) {
    return 0;
  }
  
  // Default to middle school if unclear
  return 7;
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
  const gradeConfig = getGradeConfig(context.grade);
  
  const systemPrompt = `You are a ${gradeConfig.toneDescription} teacher who loves using memorable analogies to explain concepts to ${gradeConfig.gradeCategory} students. Your specialty is making complex ideas stick in students' minds through unforgettable comparisons and engaging stories.

STRICT WORD COUNT REQUIREMENT: Your response must be EXACTLY ${gradeConfig.wordLimit} words or less. This is a hard limit that cannot be exceeded.

Your mission for ${gradeConfig.gradeCategory} students:
- Create ${gradeConfig.toneDescription.toUpperCase()} and MEMORABLE analogies that students will never forget
- Use comparisons to: ${gradeConfig.analogySources}
- Make it feel like you're telling an engaging story, not just explaining a concept
- Use ${gradeConfig.vocabularyLevel} vocabulary
- Include at least one creative analogy or metaphor that makes the concept "click"
- Make students think "OH! Now I totally get it!" and remember it forever
- Keep it engaging and educational - learning should be meaningful
- Write EXACTLY ${gradeConfig.wordLimit} words or less - this is critical
- Use encouraging and enthusiastic language appropriate for ${gradeConfig.gradeCategory} level

Remember: The best explanations are the ones students remember months later because they were so engaging and well-matched to their level!

The student is learning ${context.subject} in ${context.grade} and working on the skill: ${context.skillName}`;

  const userPrompt = `The student answered this question: "${context.question}"

The correct answer was: "${context.correctAnswer}"

The basic explanation given was: "${context.explanation}"

Please create a ${gradeConfig.toneDescription.toUpperCase()}, MEMORABLE explanation using creative analogies that a ${gradeConfig.gradeCategory} student will never forget! Make it engaging and use comparisons that will make this concept stick in their mind forever. CRITICAL: Keep it to exactly ${gradeConfig.wordLimit} words or less. Help them really grasp why this answer is correct through an amazing analogy or story!`;

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
      temperature: gradeConfig.temperature,
      max_tokens: Math.min(300, gradeConfig.wordLimit + 50),
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
    const requestBody = await req.json();
    
    // Validate input payload
    const validation = validateWithSchema(explainConceptSchema, requestBody, 'Explain Concept');
    if (!validation.success) {
      return createValidationResponse(validation.errors!, 'Explain Concept', corsHeaders);
    }

    const { question, correctAnswer, explanation, subject, grade, skillName, questionType } = validation.data!;

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

    console.log(`Using grade-appropriate routing for ${context.grade} student...`);
    
    // Simple question-type-based routing
    const routingDecision = routeByQuestionType(context);
    const gradeConfig = getGradeConfig(context.grade);
    
    console.log(`Routing decision: ${routingDecision.selectedModel}`);
    console.log(`Grade configuration: ${gradeConfig.gradeCategory} level with ${gradeConfig.wordLimit} word limit`);
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
    console.log(`Grade-appropriate settings: ${gradeConfig.gradeCategory}, ${gradeConfig.wordLimit} words, temperature ${gradeConfig.temperature}`);

    return new Response(JSON.stringify({ 
      detailedExplanation,
      routingInfo: {
        selectedModel: usedModel,
        originalModel: routingDecision.selectedModel,
        fallbackTriggered,
        complexityScore: routingDecision.complexityScore,
        confidence: 95, // High confidence in question-type routing
        reasoning: routingDecision.reasoning,
        gradeConfiguration: {
          category: gradeConfig.gradeCategory,
          wordLimit: gradeConfig.wordLimit,
          temperature: gradeConfig.temperature,
          vocabularyLevel: gradeConfig.vocabularyLevel
        }
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
