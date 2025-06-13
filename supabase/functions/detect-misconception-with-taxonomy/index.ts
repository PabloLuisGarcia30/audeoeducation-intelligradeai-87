
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
      studentAnswer,
      correctAnswer,
      questionContext,
      subject = 'General',
      questionType = 'short-answer',
      autoCreateEnabled = true,
      confidenceThreshold = 0.75
    } = await req.json();

    console.log('🧠 Analyzing misconception with auto-creation capability');

    // Get existing taxonomy for reference
    const { data: existingSubtypes } = await supabase
      .from('misconception_subtypes')
      .select(`
        id,
        subtype_name,
        description,
        misconception_categories!inner(
          category_name,
          description
        )
      `);

    const taxonomyContext = existingSubtypes?.map(subtype => ({
      id: subtype.id,
      name: subtype.subtype_name,
      category: subtype.misconception_categories.category_name,
      description: subtype.description
    })) || [];

    // Enhanced GPT prompt with auto-creation capability
    const analysisPrompt = `You are an expert educational diagnostician specializing in misconception analysis.

STUDENT CONTEXT:
- Subject: ${subject}
- Question Type: ${questionType}
- Question: ${questionContext}
- Student Answer: "${studentAnswer}"
- Correct Answer: "${correctAnswer}"

EXISTING MISCONCEPTION TAXONOMY:
${taxonomyContext.map(item => `- ${item.category}: ${item.name} (${item.description})`).join('\n')}

INSTRUCTIONS:
1. Analyze the student's answer to identify the specific misconception
2. First, try to match the misconception to an existing taxonomy entry
3. If no good match exists (confidence < 0.7), propose a new misconception subtype
4. Provide confidence score (0.0-1.0) for your analysis
5. Include remediation suggestions

AUTO-CREATION CRITERIA:
- Create new subtype if confidence in existing match < 0.7
- Ensure new subtype is specific and actionable
- Map to appropriate existing category or suggest new category
- Minimum confidence ${confidenceThreshold} required for auto-creation

REQUIRED OUTPUT FORMAT (JSON):
{
  "matchFound": true/false,
  "subtypeId": "existing-id-or-null",
  "subtypeName": "Specific Misconception Name",
  "categoryName": "Error Category",
  "confidence": 0.85,
  "reasoning": "Detailed analysis of the misconception",
  "remediationSuggestions": ["suggestion1", "suggestion2"],
  "isNewSubtype": false,
  "newSubtypeDescription": "Description if new",
  "contextEvidence": "Evidence from student answer"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational diagnostician. Always respond with valid JSON. Be conservative with confidence scores and specific with misconception identification.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API call failed:', response.status);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    let finalResult = {
      subtypeId: analysis.subtypeId,
      subtypeName: analysis.subtypeName,
      categoryName: analysis.categoryName,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      remediationSuggestions: analysis.remediationSuggestions || [],
      isNewSubtype: false
    };

    // Handle auto-creation if enabled and needed
    if (autoCreateEnabled && !analysis.matchFound && analysis.confidence >= confidenceThreshold) {
      console.log(`🆕 Auto-creating new misconception subtype: ${analysis.subtypeName}`);
      
      try {
        // Find or create category
        let categoryId = await findOrCreateCategory(supabase, analysis.categoryName);
        
        if (categoryId) {
          // Create new subtype
          const { data: newSubtype, error: createError } = await supabase
            .from('misconception_subtypes')
            .insert({
              subtype_name: analysis.subtypeName,
              description: analysis.newSubtypeDescription || `Auto-created: ${analysis.reasoning}`,
              category_id: categoryId
            })
            .select('id')
            .single();

          if (!createError && newSubtype) {
            finalResult.subtypeId = newSubtype.id;
            finalResult.isNewSubtype = true;

            // Log the auto-creation
            await supabase
              .from('misconception_auto_creation_log')
              .insert({
                subtype_id: newSubtype.id,
                subtype_name: analysis.subtypeName,
                category_name: analysis.categoryName,
                confidence: analysis.confidence,
                reasoning: analysis.reasoning,
                auto_created_at: new Date().toISOString()
              });

            console.log(`✅ Successfully auto-created misconception subtype: ${analysis.subtypeName}`);
          }
        }
      } catch (createError) {
        console.error('❌ Error during auto-creation:', createError);
        // Continue with analysis even if auto-creation fails
      }
    }

    // Add to review queue if confidence is medium but below auto-creation threshold
    if (autoCreateEnabled && !analysis.matchFound && 
        analysis.confidence >= 0.65 && analysis.confidence < confidenceThreshold) {
      try {
        await supabase
          .from('misconception_review_queue')
          .insert({
            subtype_name: analysis.subtypeName,
            category_name: analysis.categoryName,
            description: analysis.newSubtypeDescription || analysis.reasoning,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            context_evidence: analysis.contextEvidence || studentAnswer,
            status: 'pending_review'
          });

        console.log(`📋 Added to review queue: ${analysis.subtypeName}`);
      } catch (reviewError) {
        console.error('❌ Error adding to review queue:', reviewError);
      }
    }

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in detect-misconception-with-taxonomy:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function findOrCreateCategory(supabase: any, categoryName: string): Promise<string | null> {
  try {
    // Try to find existing category
    const { data: existingCategory } = await supabase
      .from('misconception_categories')
      .select('id')
      .ilike('category_name', categoryName)
      .single();

    if (existingCategory) {
      return existingCategory.id;
    }

    // Create new category
    const { data: newCategory, error } = await supabase
      .from('misconception_categories')
      .insert({
        category_name: categoryName,
        description: `Auto-created category for ${categoryName} misconceptions`
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating category:', error);
      return null;
    }

    console.log(`🆕 Auto-created category: ${categoryName}`);
    return newCategory.id;
  } catch (error) {
    console.error('❌ Exception in findOrCreateCategory:', error);
    return null;
  }
}
