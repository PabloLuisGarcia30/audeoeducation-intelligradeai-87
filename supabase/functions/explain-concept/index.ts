
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

interface MCQDetectionResult {
  isMCQ: boolean;
  confidence: number;
  detectionMethod: string;
  patterns: string[];
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

// Enhanced MCQ detection with comprehensive pattern matching
function detectMCQQuestion(context: ExplanationContext): MCQDetectionResult {
  let confidence = 0;
  let detectionMethod = '';
  const patterns: string[] = [];

  // 1. Explicit question type parameter (highest confidence)
  if (context.questionType) {
    const questionType = context.questionType.toLowerCase();
    if (questionType.includes('multiple-choice') || questionType.includes('multiple_choice') || questionType === 'mcq') {
      return {
        isMCQ: true,
        confidence: 100,
        detectionMethod: 'explicit_question_type',
        patterns: [`questionType: ${context.questionType}`]
      };
    }
  }

  const questionText = context.question.toLowerCase();
  const correctAnswer = context.correctAnswer.toLowerCase().trim();

  // 2. Answer format detection (high confidence)
  const answerPatterns = [
    /^[A-D]$/i,           // Single letter: A, B, C, D
    /^[A-D]\)$/i,         // Letter with parenthesis: A), B), C), D)
    /^\([A-D]\)$/i,       // Letter in parentheses: (A), (B), (C), (D)
    /^[A-D]\.$/i,         // Letter with period: A., B., C., D.
    /^[1-4]$/,            // Numbers: 1, 2, 3, 4
    /^[1-4]\)$/,          // Numbers with parenthesis: 1), 2), 3), 4)
    /^\([1-4]\)$/,        // Numbers in parentheses: (1), (2), (3), (4)
  ];

  for (const pattern of answerPatterns) {
    if (pattern.test(correctAnswer)) {
      confidence = Math.max(confidence, 90);
      detectionMethod = 'answer_format';
      patterns.push(`Answer format: ${correctAnswer}`);
      break;
    }
  }

  // 3. Question text pattern detection (medium confidence)
  const questionPatterns = [
    { regex: /\ba\)|b\)|c\)|d\)/i, name: 'letter_options_with_paren', confidence: 85 },
    { regex: /\b\(?a\)|\(?b\)|\(?c\)|\(?d\)/i, name: 'letter_options_various', confidence: 80 },
    { regex: /\b1\)|2\)|3\)|4\)/i, name: 'numbered_options', confidence: 80 },
    { regex: /which of the following/i, name: 'which_following', confidence: 85 },
    { regex: /select the (best|correct|most appropriate)/i, name: 'select_directive', confidence: 80 },
    { regex: /choose the (best|correct|most appropriate)/i, name: 'choose_directive', confidence: 80 },
    { regex: /the (best|correct|most appropriate) answer is/i, name: 'answer_directive', confidence: 75 },
    { regex: /all of the above|none of the above/i, name: 'inclusive_options', confidence: 70 },
    { regex: /mark the letter|circle the letter|select the letter/i, name: 'letter_instruction', confidence: 85 }
  ];

  for (const pattern of questionPatterns) {
    if (pattern.regex.test(questionText)) {
      confidence = Math.max(confidence, pattern.confidence);
      if (!detectionMethod) detectionMethod = 'question_text_patterns';
      patterns.push(pattern.name);
    }
  }

  // 4. Combined heuristics (lower confidence boost)
  if (questionText.includes('option') && (questionText.includes('correct') || questionText.includes('best'))) {
    confidence = Math.max(confidence, 65);
    if (!detectionMethod) detectionMethod = 'combined_heuristics';
    patterns.push('option_and_correctness_keywords');
  }

  // Determine if it's an MCQ based on confidence threshold
  const isMCQ = confidence >= 65; // Lowered threshold for better detection

  return {
    isMCQ,
    confidence,
    detectionMethod: detectionMethod || 'no_detection',
    patterns
  };
}

// Strict routing with no fallback for MCQ questions
function routeWithStrictMCQRule(context: ExplanationContext): {
  selectedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14';
  reasoning: string;
  complexityScore: number;
  mcqDetection: MCQDetectionResult;
  strictRuleApplied: boolean;
} {
  const mcqDetection = detectMCQQuestion(context);
  
  // STRICT RULE: If detected as MCQ, ALWAYS use gpt-4o-mini
  if (mcqDetection.isMCQ) {
    return {
      selectedModel: 'gpt-4o-mini',
      reasoning: `STRICT MCQ RULE: Detected multiple choice question (${mcqDetection.confidence}% confidence, method: ${mcqDetection.detectionMethod}). Using gpt-4o-mini with NO fallback allowed.`,
      complexityScore: 20,
      mcqDetection,
      strictRuleApplied: true
    };
  }

  // For non-MCQ questions, use original logic
  const questionText = context.question.toLowerCase();
  const correctAnswer = context.correctAnswer.toLowerCase();

  // Check for true/false
  const isTF = ['true', 'false', 't', 'f', 'yes', 'no'].includes(correctAnswer.trim());
  if (isTF) {
    return {
      selectedModel: 'gpt-4o-mini',
      reasoning: 'Selected gpt-4o-mini for true/false question - simple explanation suitable',
      complexityScore: 15,
      mcqDetection,
      strictRuleApplied: false
    };
  }

  // Default to complex for open-ended questions
  return {
    selectedModel: 'gpt-4.1-2025-04-14',
    reasoning: 'Selected gpt-4.1-2025-04-14 for open-ended question - detailed explanation required',
    complexityScore: 80,
    mcqDetection,
    strictRuleApplied: false
  };
}

// MCQ-specific error handling that retries with gpt-4o-mini
async function generateExplanationWithMCQRetry(
  model: string, 
  context: ExplanationContext, 
  isMCQ: boolean,
  attempt: number = 1
): Promise<string> {
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

  try {
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
    const result = data.choices[0].message.content;
    
    // For MCQ questions, validate the response quality
    if (isMCQ) {
      const wordCount = result.split(/\s+/).length;
      
      // If response is too short and this is first attempt, retry with gpt-4o-mini
      if (wordCount < 30 && attempt === 1) {
        console.log(`MCQ explanation too short (${wordCount} words), retrying with gpt-4o-mini (attempt ${attempt + 1})`);
        return await generateExplanationWithMCQRetry('gpt-4o-mini', context, isMCQ, attempt + 1);
      }
      
      // If response contains error indicators and this is first attempt, retry
      if ((result.toLowerCase().includes('error') || result.toLowerCase().includes('sorry')) && attempt === 1) {
        console.log(`MCQ explanation contains error indicators, retrying with gpt-4o-mini (attempt ${attempt + 1})`);
        return await generateExplanationWithMCQRetry('gpt-4o-mini', context, isMCQ, attempt + 1);
      }
    }
    
    return result;
  } catch (error) {
    // For MCQ questions, always retry with gpt-4o-mini (never fallback to gpt-4.1)
    if (isMCQ && attempt === 1) {
      console.log(`MCQ explanation failed, retrying with gpt-4o-mini (attempt ${attempt + 1}): ${error.message}`);
      return await generateExplanationWithMCQRetry('gpt-4o-mini', context, isMCQ, attempt + 1);
    }
    
    throw error;
  }
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

    console.log(`Using strict MCQ routing for ${context.grade} student...`);
    
    // Apply strict MCQ routing rule
    const routingDecision = routeWithStrictMCQRule(context);
    const gradeConfig = getGradeConfig(context.grade);
    
    console.log(`Routing decision: ${routingDecision.selectedModel}`);
    console.log(`MCQ Detection: ${routingDecision.mcqDetection.isMCQ ? 'YES' : 'NO'} (${routingDecision.mcqDetection.confidence}% confidence)`);
    console.log(`Strict rule applied: ${routingDecision.strictRuleApplied}`);
    console.log(`Grade configuration: ${gradeConfig.gradeCategory} level with ${gradeConfig.wordLimit} word limit`);
    console.log(`Reasoning: ${routingDecision.reasoning}`);

    let detailedExplanation: string;
    let usedModel = routingDecision.selectedModel;
    let fallbackTriggered = false;
    let retryCount = 0;

    try {
      // Use MCQ-specific retry logic that never falls back to gpt-4.1 for MCQ questions
      detailedExplanation = await generateExplanationWithMCQRetry(
        routingDecision.selectedModel, 
        context, 
        routingDecision.mcqDetection.isMCQ
      );
      
    } catch (error) {
      // For MCQ questions: NEVER fallback to gpt-4.1, always stay with gpt-4o-mini
      if (routingDecision.mcqDetection.isMCQ) {
        console.log(`MCQ explanation failed completely, providing fallback response with gpt-4o-mini: ${error.message}`);
        detailedExplanation = `I apologize, but I'm having trouble generating a detailed explanation right now. However, since this is a multiple choice question, here's a simple explanation: ${explanation}. The correct answer is ${correctAnswer}. Please try again in a moment for a more detailed explanation.`;
        usedModel = 'gpt-4o-mini';
        fallbackTriggered = false; // Not a model fallback, just error handling
        retryCount = 2;
      } else {
        // For non-MCQ questions, allow fallback to gpt-4.1 if original was gpt-4o-mini
        if (routingDecision.selectedModel === 'gpt-4o-mini') {
          console.log('Non-MCQ gpt-4o-mini failed, falling back to gpt-4.1-2025-04-14...');
          detailedExplanation = await generateExplanationWithMCQRetry('gpt-4.1-2025-04-14', context, false);
          usedModel = 'gpt-4.1-2025-04-14';
          fallbackTriggered = true;
        } else {
          throw error;
        }
      }
    }

    // Enhanced routing info with MCQ detection details
    const routingInfo = {
      selectedModel: usedModel,
      originalModel: routingDecision.selectedModel,
      fallbackTriggered,
      complexityScore: routingDecision.complexityScore,
      confidence: routingDecision.mcqDetection.confidence,
      reasoning: routingDecision.reasoning,
      mcqDetection: {
        detected: routingDecision.mcqDetection.isMCQ,
        confidence: routingDecision.mcqDetection.confidence,
        method: routingDecision.mcqDetection.detectionMethod,
        patterns: routingDecision.mcqDetection.patterns
      },
      strictMCQRule: {
        applied: routingDecision.strictRuleApplied,
        enforced: routingDecision.mcqDetection.isMCQ,
        modelLocked: routingDecision.mcqDetection.isMCQ ? 'gpt-4o-mini' : 'none'
      },
      gradeConfiguration: {
        category: gradeConfig.gradeCategory,
        wordLimit: gradeConfig.wordLimit,
        temperature: gradeConfig.temperature,
        vocabularyLevel: gradeConfig.vocabularyLevel
      },
      retryCount
    };

    // Log routing results for analytics
    console.log(`✅ Successfully generated explanation using ${usedModel}${fallbackTriggered ? ' (after fallback)' : ''}${retryCount > 0 ? ` (${retryCount} retries)` : ''}`);
    if (routingDecision.mcqDetection.isMCQ) {
      console.log(`🔒 STRICT MCQ RULE ENFORCED: Question locked to gpt-4o-mini (Detection: ${routingDecision.mcqDetection.detectionMethod}, Patterns: ${routingDecision.mcqDetection.patterns.join(', ')})`);
    }
    console.log(`💰 Cost factor: ${usedModel === 'gpt-4.1-2025-04-14' ? '8x' : '1x'} baseline`);
    console.log(`📚 Grade-appropriate settings: ${gradeConfig.gradeCategory}, ${gradeConfig.wordLimit} words, temperature ${gradeConfig.temperature}`);

    return new Response(JSON.stringify({ 
      detailedExplanation,
      routingInfo
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
