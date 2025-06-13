
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createMisconceptionAwareMCQPrompt, createMisconceptionPromptForSubject } from './misconceptionPrompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      skillName, 
      className, 
      subject, 
      grade, 
      currentScore, 
      questionCount = 4,
      difficulty = 'adaptive',
      includeMisconceptions = true // New parameter for misconception-aware generation
    } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🎯 Generating practice exercise: ${skillName} for ${grade} ${subject}`);
    if (includeMisconceptions) {
      console.log('📋 Including misconception annotations in MCQ distractors');
    }

    // Determine difficulty level based on current score if adaptive
    let actualDifficulty = difficulty;
    if (difficulty === 'adaptive' && currentScore !== undefined) {
      if (currentScore < 60) actualDifficulty = 'easy';
      else if (currentScore < 80) actualDifficulty = 'medium';
      else actualDifficulty = 'hard';
    }

    // Create misconception-aware prompt if requested
    const basePrompt = includeMisconceptions 
      ? createMisconceptionAwareMCQPrompt(skillName, subject, grade, actualDifficulty)
      : createStandardPrompt(skillName, subject, grade, actualDifficulty, questionCount);

    // Add subject-specific misconception guidance
    const subjectGuidance = createMisconceptionPromptForSubject(subject);
    const finalPrompt = includeMisconceptions 
      ? `${basePrompt}\n\n${subjectGuidance}`
      : basePrompt;

    console.log('🤖 Sending request to OpenAI for exercise generation...');

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
            content: `You are an expert educational content creator specializing in ${subject} for ${grade} students. ${
              includeMisconceptions 
                ? 'Create engaging multiple-choice questions with distractors based on real student misconceptions.' 
                : 'Create engaging practice exercises that build understanding.'
            }`
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    let exerciseData;
    try {
      exerciseData = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate and enhance the generated exercise
    const enhancedExercise = {
      ...exerciseData,
      metadata: {
        skillName,
        className,
        subject,
        grade,
        currentScore,
        difficulty: actualDifficulty,
        questionCount: exerciseData.questions?.length || questionCount,
        misconceptionAnnotated: includeMisconceptions,
        generatedAt: new Date().toISOString(),
        estimatedTime: Math.max(10, (exerciseData.questions?.length || questionCount) * 2)
      },
      usage: {
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0
      }
    };

    console.log(`✅ Generated ${enhancedExercise.questions?.length || 0} questions for ${skillName}`);
    if (includeMisconceptions) {
      const misconceptionCount = enhancedExercise.questions?.reduce((count: number, q: any) => {
        return count + (q.choiceMisconceptions ? Object.keys(q.choiceMisconceptions).length - 1 : 0); // -1 for correct answer
      }, 0) || 0;
      console.log(`📋 Added ${misconceptionCount} misconception annotations`);
    }

    return new Response(
      JSON.stringify(enhancedExercise),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in generate-student-practice-exercise:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate practice exercise'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function createStandardPrompt(skillName: string, subject: string, grade: string, difficulty: string, questionCount: number): string {
  return `Generate ${questionCount} ${difficulty} level questions for ${grade} ${subject}, focusing on the skill: "${skillName}".

Return a JSON object with this structure:
{
  "title": "Practice: [skill name]",
  "description": "Practice exercises for [skill]",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "Question text here",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation",
      "points": 1,
      "targetSkill": "${skillName}"
    }
  ]
}`;
}
