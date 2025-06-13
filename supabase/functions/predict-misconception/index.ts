
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
      questionId,
      behaviorSignals,
      questionContext,
      exerciseId,
      examId
    } = await req.json();

    console.log('🔮 Analyzing behavioral signals for predictive misconception detection');

    // Get student's historical misconception patterns
    const { data: studentHistory } = await supabase
      .from('student_misconceptions')
      .select(`
        misconception_subtype_id,
        confidence_score,
        misconception_subtypes!inner(
          subtype_name,
          misconception_categories!inner(
            category_name
          )
        )
      `)
      .eq('student_id', studentId)
      .order('detected_at', { ascending: false })
      .limit(10);

    // Analyze behavioral risk indicators
    const riskFactors = {
      timeRisk: calculateTimeRisk(behaviorSignals.timeSpentSeconds, behaviorSignals.questionDifficulty),
      changeRisk: calculateAnswerChangeRisk(behaviorSignals.answerChanges),
      hesitationRisk: calculateHesitationRisk(behaviorSignals.hesitationPatterns),
      historicalRisk: calculateHistoricalRisk(studentHistory || [])
    };

    const overallRisk = (riskFactors.timeRisk + riskFactors.changeRisk + riskFactors.hesitationRisk + riskFactors.historicalRisk) / 4;

    // Determine if prediction should be made
    const shouldPredict = overallRisk > 0.6; // 60% threshold for prediction
    
    let prediction = {
      predicted: false,
      confidence: overallRisk,
      riskLevel: overallRisk > 0.8 ? 'high' : overallRisk > 0.6 ? 'medium' : 'low',
      reasoning: generateRiskReasoning(riskFactors, behaviorSignals)
    };

    if (shouldPredict) {
      // Use GPT to predict specific misconception type
      const gptPrediction = await predictSpecificMisconception(
        behaviorSignals,
        questionContext,
        studentHistory || [],
        openAIApiKey
      );

      if (gptPrediction.misconceptionSubtypeId) {
        prediction = {
          ...prediction,
          predicted: true,
          misconceptionSubtypeId: gptPrediction.misconceptionSubtypeId,
          reasoning: gptPrediction.reasoning,
          suggestedIntervention: gptPrediction.suggestedIntervention
        };
      }
    }

    console.log(`🎯 Prediction result: ${prediction.predicted ? 'RISK DETECTED' : 'NO RISK'} (${prediction.riskLevel} risk)`);

    return new Response(
      JSON.stringify(prediction),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in predict-misconception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateTimeRisk(timeSpent: number, difficulty: string): number {
  const expectedTimes = { easy: 30, medium: 60, hard: 120 }; // seconds
  const expected = expectedTimes[difficulty] || 60;
  
  if (timeSpent > expected * 2) return 0.9; // Taking too long
  if (timeSpent < expected * 0.3) return 0.7; // Too rushed
  return 0.1; // Normal timing
}

function calculateAnswerChangeRisk(changes: number): number {
  if (changes > 5) return 0.9; // Too many changes indicates confusion
  if (changes > 3) return 0.6;
  if (changes > 1) return 0.3;
  return 0.1;
}

function calculateHesitationRisk(patterns: any): number {
  let risk = 0;
  if (patterns.longPauses > 3) risk += 0.3;
  if (patterns.rapidChanges > 2) risk += 0.4;
  if (patterns.backtracking) risk += 0.3;
  return Math.min(risk, 1.0);
}

function calculateHistoricalRisk(history: any[]): number {
  if (history.length === 0) return 0.1;
  
  const recentMisconceptions = history.filter(h => {
    const detectedAt = new Date(h.detected_at);
    const daysSince = (Date.now() - detectedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 7; // Last week
  });

  return Math.min(recentMisconceptions.length * 0.2, 0.9);
}

function generateRiskReasoning(riskFactors: any, signals: any): string {
  const reasons = [];
  
  if (riskFactors.timeRisk > 0.5) {
    reasons.push(`Time spent (${signals.timeSpentSeconds}s) indicates difficulty`);
  }
  if (riskFactors.changeRisk > 0.5) {
    reasons.push(`Multiple answer changes (${signals.answerChanges}) suggest uncertainty`);
  }
  if (riskFactors.hesitationRisk > 0.5) {
    reasons.push('Hesitation patterns detected');
  }
  if (riskFactors.historicalRisk > 0.5) {
    reasons.push('Recent misconception history');
  }

  return reasons.length > 0 ? reasons.join('; ') : 'Low risk indicators';
}

async function predictSpecificMisconception(
  behaviorSignals: any,
  questionContext: any,
  studentHistory: any[],
  apiKey: string
): Promise<any> {
  try {
    const prompt = `You are an expert educational AI analyzing student behavior to predict specific misconceptions.

BEHAVIORAL SIGNALS:
- Time spent: ${behaviorSignals.timeSpentSeconds} seconds
- Answer changes: ${behaviorSignals.answerChanges}
- Hesitation patterns: ${JSON.stringify(behaviorSignals.hesitationPatterns)}
- Question difficulty: ${behaviorSignals.questionDifficulty}

QUESTION CONTEXT:
${JSON.stringify(questionContext)}

STUDENT HISTORY (Recent misconceptions):
${studentHistory.map(h => `- ${h.misconception_subtypes.category_name}: ${h.misconception_subtypes.subtype_name}`).join('\n')}

Based on these behavioral signals, predict the most likely misconception category and provide intervention suggestions.

Respond with JSON:
{
  "misconceptionSubtypeId": "specific-id-or-null",
  "reasoning": "explanation of prediction",
  "suggestedIntervention": "immediate help suggestion"
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
            content: 'You are an expert educational diagnostician. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API call failed:', response.status);
      return { misconceptionSubtypeId: null };
    }

    const data = await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
  } catch (error) {
    console.error('Error in GPT prediction:', error);
    return { misconceptionSubtypeId: null };
  }
}
