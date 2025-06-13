
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalRecommendationRequest {
  student_id: string;
  progress_analytics: any[];
  performance_data: any[];
  misconception_data: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      student_id, 
      progress_analytics, 
      performance_data, 
      misconception_data 
    }: GoalRecommendationRequest = await req.json();

    console.log(`Generating goal recommendations for student: ${student_id}`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare context for AI
    const context = {
      student_performance: progress_analytics,
      recent_results: performance_data,
      misconceptions: misconception_data,
      current_date: new Date().toISOString().split('T')[0]
    };

    const prompt = `You are an AI learning coach specializing in personalized goal setting for students. 

Based on the following student data, generate 3-4 specific, achievable learning goals:

STUDENT PERFORMANCE DATA:
${JSON.stringify(context, null, 2)}

Guidelines for goal generation:
1. Goals should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
2. Consider current performance levels and realistic improvement targets
3. Address identified misconceptions and skill gaps
4. Include different goal types: skill_mastery, misconception_resolution, consistency, learning_velocity
5. Set target dates within 2-4 weeks
6. Provide clear reasoning for each goal

For each goal, provide:
- goal_type: One of ['skill_mastery', 'misconception_resolution', 'learning_velocity', 'consistency', 'time_based']
- goal_title: Clear, motivating title
- goal_description: Detailed description of what the student should achieve
- target_value: Numeric target (e.g., 85 for 85% accuracy, 7 for 7 consecutive days)
- target_skill_name: If applicable, the specific skill being targeted
- difficulty_level: 'easy', 'medium', or 'hard' based on current performance
- target_date: Date in YYYY-MM-DD format (2-4 weeks from now)
- ai_confidence_score: 0.0-1.0 confidence in this goal's appropriateness
- reasoning: Why this goal is recommended for this student
- milestones: Array of 2-3 milestone objects with {value, title, description}

Return a JSON object with:
{
  "recommendations": [array of goal objects],
  "reasoning": "Overall reasoning for these recommendations"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI learning coach. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      console.log(`✅ Generated ${parsedResponse.recommendations.length} goal recommendations`);
      
      return new Response(
        JSON.stringify(parsedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback recommendations
      const fallbackRecommendations = generateFallbackRecommendations(context);
      
      return new Response(
        JSON.stringify({
          recommendations: fallbackRecommendations,
          reasoning: "Generated using fallback logic due to AI parsing error"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in generate-smart-goal-recommendations:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        recommendations: [],
        reasoning: "Error occurred during recommendation generation"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateFallbackRecommendations(context: any) {
  const recommendations = [];
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 14);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  // Skill improvement goal
  if (context.student_performance && context.student_performance.length > 0) {
    const lowestSkill = context.student_performance.sort((a: any, b: any) => a.avg_accuracy - b.avg_accuracy)[0];
    const improvementTarget = Math.min(90, lowestSkill.avg_accuracy + 10);
    
    recommendations.push({
      goal_type: 'skill_mastery',
      goal_title: `Improve ${lowestSkill.skill_name}`,
      goal_description: `Achieve ${improvementTarget}% accuracy in ${lowestSkill.skill_name}`,
      target_value: improvementTarget,
      target_skill_name: lowestSkill.skill_name,
      difficulty_level: 'medium',
      target_date: targetDateStr,
      ai_confidence_score: 0.8,
      reasoning: `Current accuracy is ${lowestSkill.avg_accuracy}%. This goal provides achievable improvement.`,
      milestones: [
        { value: improvementTarget * 0.6, title: 'Making Progress!', description: 'You\'re on the right track!' },
        { value: improvementTarget * 0.85, title: 'Almost There!', description: 'So close to your goal!' }
      ]
    });
  }

  // Consistency goal
  recommendations.push({
    goal_type: 'consistency',
    goal_title: 'Build Daily Learning Habit',
    goal_description: 'Complete practice exercises for 7 consecutive days',
    target_value: 7,
    difficulty_level: 'medium',
    target_date: targetDateStr,
    ai_confidence_score: 0.9,
    reasoning: 'Consistent daily practice leads to better learning outcomes.',
    milestones: [
      { value: 3, title: 'Getting Started!', description: '3 days in a row - great beginning!' },
      { value: 5, title: 'Building Momentum!', description: '5 days strong - excellent progress!' }
    ]
  });

  return recommendations;
}
