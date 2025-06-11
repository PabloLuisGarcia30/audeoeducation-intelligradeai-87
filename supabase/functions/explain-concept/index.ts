
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
}

interface ComplexityAnalysis {
  complexityScore: number;
  confidenceInDecision: number;
  complexityFactors: string[];
  modelRecommendation: string;
}

interface ExplanationRoutingDecision {
  selectedModel: 'gpt-4o-mini' | 'gpt-4o';
  complexityAnalysis: ComplexityAnalysis;
  estimatedCost: number;
  confidence: number;
  reasoning: string;
}

// Smart routing logic for explanations
function analyzeExplanationComplexity(context: ExplanationContext): ComplexityAnalysis {
  let complexityScore = 0;
  const factors: string[] = [];

  // Subject complexity
  const subjectLower = context.subject.toLowerCase();
  if (subjectLower.includes('physics') || subjectLower.includes('chemistry') || subjectLower.includes('calculus')) {
    complexityScore += 25;
    factors.push(`High complexity subject: ${context.subject}`);
  } else if (subjectLower.includes('math') || subjectLower.includes('science') || subjectLower.includes('algebra')) {
    complexityScore += 15;
    factors.push(`Medium complexity subject: ${context.subject}`);
  } else {
    complexityScore += 5;
    factors.push(`Basic subject: ${context.subject}`);
  }

  // Grade level
  const gradeMatch = context.grade.match(/(\d+)/);
  const gradeNumber = gradeMatch ? parseInt(gradeMatch[1]) : 10;
  if (gradeNumber >= 11) {
    complexityScore += 20;
    factors.push('High school level');
  } else if (gradeNumber >= 8) {
    complexityScore += 15;
    factors.push('Middle school level');
  } else {
    complexityScore += 10;
    factors.push('Elementary/Middle level');
  }

  // Question complexity
  if (context.question.length > 200) {
    complexityScore += 10;
    factors.push('Long question text');
  }

  // Mathematical notation
  const mathPatterns = [/\$.*?\$/, /\\frac/, /\\sqrt/, /\^/, /_/];
  const mathComplexity = mathPatterns.filter(pattern => 
    pattern.test(context.question) || pattern.test(context.correctAnswer)
  ).length;
  if (mathComplexity > 0) {
    complexityScore += mathComplexity * 5;
    factors.push(`Mathematical notation (${mathComplexity} patterns)`);
  }

  // Reasoning indicators
  const reasoningWords = ['explain why', 'compare', 'analyze', 'evaluate', 'justify'];
  const reasoningCount = reasoningWords.filter(word => 
    context.question.toLowerCase().includes(word)
  ).length;
  if (reasoningCount > 0) {
    complexityScore += reasoningCount * 8;
    factors.push(`Multi-step reasoning (${reasoningCount} indicators)`);
  }

  // Skill complexity
  const skillLower = context.skillName.toLowerCase();
  if (skillLower.includes('critical thinking') || skillLower.includes('analytical')) {
    complexityScore += 15;
    factors.push(`High complexity skill: ${context.skillName}`);
  } else if (skillLower.includes('application') || skillLower.includes('comprehension')) {
    complexityScore += 8;
    factors.push(`Medium complexity skill: ${context.skillName}`);
  }

  // Calculate confidence
  let confidence = 75 + Math.min(factors.length * 3, 15);
  if (complexityScore < 20 || complexityScore > 60) confidence += 10;
  if (complexityScore >= 30 && complexityScore <= 40) confidence -= 15;

  return {
    complexityScore: Math.min(100, Math.max(0, complexityScore)),
    confidenceInDecision: Math.min(95, Math.max(60, confidence)),
    complexityFactors: factors,
    modelRecommendation: complexityScore >= 35 ? 'gpt-4o' : 'gpt-4o-mini'
  };
}

function routeExplanationRequest(context: ExplanationContext): ExplanationRoutingDecision {
  const complexityAnalysis = analyzeExplanationComplexity(context);
  const selectedModel = complexityAnalysis.complexityScore >= 35 ? 'gpt-4o' : 'gpt-4o-mini';
  
  // Cost estimates (relative to gpt-4o-mini baseline)
  const estimatedCost = selectedModel === 'gpt-4o' ? 8 : 1; // gpt-4o is ~8x more expensive
  
  const factors = complexityAnalysis.complexityFactors.slice(0, 3).join(', ');
  const reasoning = `Selected ${selectedModel} based on complexity score ${complexityAnalysis.complexityScore}/100. Key factors: ${factors}`;

  return {
    selectedModel,
    complexityAnalysis,
    estimatedCost,
    confidence: complexityAnalysis.confidenceInDecision,
    reasoning
  };
}

function shouldFallbackToGPT4o(result: string, originalComplexity: ComplexityAnalysis): boolean {
  // Quality checks for explanations
  const wordCount = result.split(/\s+/).length;
  
  // Too short for educational value
  if (wordCount < 200) return true;
  
  // Too technical for 12-year-olds
  const technicalTerms = (result.match(/\b[a-z]+tion\b|\b[a-z]+ism\b/gi) || []).length;
  const technicalDensity = technicalTerms / wordCount;
  if (technicalDensity > 0.15 && originalComplexity.complexityScore > 30) return true;
  
  // Lacks engaging elements for complex topics
  const hasEngagingElements = /\b(imagine|picture|think about|like when)\b/i.test(result);
  const hasExamples = /\b(example|for instance|such as)\b/i.test(result);
  if (!hasEngagingElements && !hasExamples && originalComplexity.complexityScore > 40) return true;
  
  return false;
}

async function generateExplanationWithModel(model: string, context: ExplanationContext): Promise<string> {
  const systemPrompt = `You are an expert teacher who explains concepts to 12-year-old students. Your goal is to make complex ideas simple, engaging, and easy to understand.

Instructions:
- Explain the concept as if talking to a 12-year-old student
- Use simple words, analogies, and examples from everyday life
- Make it engaging and interesting
- Write approximately 350 words
- Break down complex ideas into smaller, digestible parts
- Use encouraging and supportive language
- Include practical examples or real-world connections when possible
- Avoid jargon and technical terms, or explain them simply if necessary

The student is learning ${context.subject} in ${context.grade} and working on the skill: ${context.skillName}`;

  const userPrompt = `The student answered this question: "${context.question}"

The correct answer was: "${context.correctAnswer}"

The basic explanation given was: "${context.explanation}"

Please provide a detailed, engaging explanation of this concept that a 12-year-old would understand. Make it about 350 words and help them really grasp why this answer is correct and how this concept works in general.`;

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
      max_tokens: 550,
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
    const { question, correctAnswer, explanation, subject, grade, skillName } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const context: ExplanationContext = {
      question,
      correctAnswer,
      explanation,
      subject: subject || 'General',
      grade: grade || 'Grade 10',
      skillName
    };

    console.log('Analyzing explanation complexity for smart routing...');
    
    // Smart routing decision
    const routingDecision = routeExplanationRequest(context);
    console.log(`Routing decision: ${routingDecision.selectedModel} (complexity: ${routingDecision.complexityAnalysis.complexityScore}, confidence: ${routingDecision.confidence}%)`);
    console.log(`Reasoning: ${routingDecision.reasoning}`);

    let detailedExplanation: string;
    let usedModel = routingDecision.selectedModel;
    let fallbackTriggered = false;

    try {
      // Try with initially selected model
      detailedExplanation = await generateExplanationWithModel(routingDecision.selectedModel, context);
      
      // Quality check and potential fallback for gpt-4o-mini
      if (routingDecision.selectedModel === 'gpt-4o-mini') {
        if (shouldFallbackToGPT4o(detailedExplanation, routingDecision.complexityAnalysis)) {
          console.log('Quality check failed for gpt-4o-mini, falling back to gpt-4o...');
          detailedExplanation = await generateExplanationWithModel('gpt-4o', context);
          usedModel = 'gpt-4o';
          fallbackTriggered = true;
        }
      }
    } catch (error) {
      // Error fallback - if gpt-4o-mini fails, try gpt-4o
      if (routingDecision.selectedModel === 'gpt-4o-mini') {
        console.log('gpt-4o-mini failed, falling back to gpt-4o...');
        detailedExplanation = await generateExplanationWithModel('gpt-4o', context);
        usedModel = 'gpt-4o';
        fallbackTriggered = true;
      } else {
        throw error;
      }
    }

    // Log routing results for analytics
    console.log(`Successfully generated explanation using ${usedModel}${fallbackTriggered ? ' (after fallback)' : ''}`);
    console.log(`Cost factor: ${usedModel === 'gpt-4o' ? '8x' : '1x'} baseline`);

    return new Response(JSON.stringify({ 
      detailedExplanation,
      routingInfo: {
        selectedModel: usedModel,
        originalModel: routingDecision.selectedModel,
        fallbackTriggered,
        complexityScore: routingDecision.complexityAnalysis.complexityScore,
        confidence: routingDecision.confidence,
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
