
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      studentId,
      misconceptionSubtypeId,
      learningProfile,
      requestContext,
      requestId
    } = await req.json();

    console.log('📚 Generating adaptive mini-lesson for misconception:', misconceptionSubtypeId);

    // Get misconception details
    const { data: misconceptionData } = await supabase
      .from('misconception_subtypes')
      .select(`
        subtype_name,
        description,
        misconception_categories!inner(
          category_name,
          description
        )
      `)
      .eq('id', misconceptionSubtypeId)
      .single();

    if (!misconceptionData) {
      throw new Error('Misconception subtype not found');
    }

    // Generate personalized mini-lesson content
    const lessonContent = await generatePersonalizedLesson(
      misconceptionData,
      learningProfile,
      requestContext,
      openAIApiKey
    );

    // Store the mini-lesson
    const { data: miniLessonData, error: insertError } = await supabase
      .from('mini_lessons')
      .insert({
        misconception_subtype_id: misconceptionSubtypeId,
        student_id: studentId,
        lesson_content: lessonContent.content,
        difficulty_level: learningProfile.difficultyPreference || 'adaptive',
        triggered_by: 'student_request',
        generation_context: {
          learning_profile: learningProfile,
          request_context: requestContext
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error storing mini-lesson:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        id: miniLessonData.id,
        content: lessonContent.content,
        difficultyLevel: miniLessonData.difficulty_level,
        generatedAt: miniLessonData.generated_at,
        miniLessonId: miniLessonData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in generate-adaptive-mini-lesson:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generatePersonalizedLesson(
  misconceptionData: any,
  learningProfile: any,
  requestContext: any,
  apiKey: string
): Promise<any> {
  const prompt = `Create a personalized mini-lesson to address a specific student misconception.

MISCONCEPTION DETAILS:
- Category: ${misconceptionData.misconception_categories.category_name}
- Subtype: ${misconceptionData.subtype_name}
- Description: ${misconceptionData.description}

STUDENT LEARNING PROFILE:
- Explanation Style: ${learningProfile.preferredExplanationStyle || 'textual'}
- Difficulty Preference: ${learningProfile.difficultyPreference || 'standard'}
- Learning Pace: ${learningProfile.learningPace || 'normal'}
- Common Patterns: ${learningProfile.commonMisconceptionPatterns?.join(', ') || 'None specified'}
- Strengths: ${learningProfile.strengths?.join(', ') || 'None specified'}
- Weaknesses: ${learningProfile.weaknesses?.join(', ') || 'None specified'}

CONTEXT: ${JSON.stringify(requestContext)}

Create a concise, personalized mini-lesson (200-300 words) that:
1. Directly addresses this specific misconception
2. Uses the student's preferred learning style
3. Builds on their strengths
4. Provides clear, actionable guidance
5. Includes a simple example if appropriate

Format as HTML with appropriate tags for structure.

Respond with JSON:
{
  "content": "HTML formatted mini-lesson content",
  "keyPoints": ["point1", "point2", "point3"],
  "difficulty": "simplified|standard|advanced"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator specializing in personalized micro-learning. Create engaging, clear mini-lessons that directly address student misconceptions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API call failed: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}
