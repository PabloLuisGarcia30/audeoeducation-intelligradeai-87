
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
      misconceptionSubtypeId,
      requestedBy,
      studentId,
      customizationOptions = {}
    } = await req.json();

    console.log(`🤖 Generating AI mini-lesson requested by ${requestedBy}`);

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

    // Generate AI content
    const aiContent = await generateAIContent(
      misconceptionData,
      requestedBy,
      customizationOptions,
      openAIApiKey
    );

    // Store the mini-lesson if requested
    let miniLessonData = null;
    if (requestedBy === 'student' && studentId) {
      const { data, error } = await supabase
        .from('mini_lessons')
        .insert({
          misconception_subtype_id: misconceptionSubtypeId,
          student_id: studentId,
          lesson_content: aiContent.content,
          difficulty_level: customizationOptions.difficultyLevel || 'standard',
          triggered_by: 'ai_generated',
          generation_context: {
            requested_by: requestedBy,
            customization_options: customizationOptions
          }
        })
        .select()
        .single();

      if (!error) {
        miniLessonData = data;
      }
    }

    return new Response(
      JSON.stringify({
        content: aiContent.content,
        practiceProblems: aiContent.practiceProblems,
        keyPoints: aiContent.keyPoints,
        miniLessonId: miniLessonData?.id,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in generate-ai-mini-lesson:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateAIContent(
  misconceptionData: any,
  requestedBy: string,
  options: any,
  apiKey: string
): Promise<any> {
  const prompt = `Generate comprehensive educational content to address a specific misconception.

MISCONCEPTION DETAILS:
- Category: ${misconceptionData.misconception_categories.category_name}
- Subtype: ${misconceptionData.subtype_name}
- Description: ${misconceptionData.description}

CONTENT OPTIONS:
- Explanation Style: ${options.explanationStyle || 'textual'}
- Difficulty Level: ${options.difficultyLevel || 'standard'}
- Include Examples: ${options.includeExamples !== false}
- Include Practice Problems: ${options.includePracticeProblems === true}
- Custom Request: ${options.customPrompt || 'None'}

REQUESTED BY: ${requestedBy}

Create comprehensive content that includes:
1. Clear explanation of the misconception
2. Correct understanding/approach
3. Step-by-step guidance
4. Examples to illustrate the concept
${options.includePracticeProblems ? '5. Practice problems with solutions' : ''}

Format content as HTML with appropriate structure.

Respond with JSON:
{
  "content": "Main HTML formatted lesson content",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "practiceProblems": ${options.includePracticeProblems ? '["problem1", "problem2"]' : '[]'},
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
          content: 'You are an expert educational content creator. Create comprehensive, clear, and actionable educational content that directly addresses misconceptions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API call failed: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}
