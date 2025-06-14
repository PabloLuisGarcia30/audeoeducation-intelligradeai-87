
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JSON schema for AI responses with practice recommendations
const responseSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "The main response message to the student"
    },
    practiceRecommendations: {
      type: "array",
      description: "Practice recommendations when student asks about what to work on",
      items: {
        type: "object",
        properties: {
          skillName: { type: "string" },
          currentScore: { type: "number", minimum: 0, maximum: 100 },
          difficulty: { type: "string", enum: ["Review", "Standard", "Challenge"] },
          estimatedTime: { type: "string" },
          expectedImprovement: { type: "string" },
          category: { type: "string", enum: ["PRIORITY", "REVIEW", "CHALLENGE"] }
        },
        required: ["skillName", "currentScore", "difficulty", "estimatedTime", "expectedImprovement", "category"]
      }
    }
  },
  required: ["message"]
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, studentContext } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Process individual skill scores for detailed analysis
    const contentSkillDetails = studentContext.contentSkillScores.map(skill => ({
      name: skill.skill_name,
      score: skill.score,
      pointsEarned: skill.points_earned,
      pointsPossible: skill.points_possible
    }));

    const subjectSkillDetails = studentContext.subjectSkillScores.map(skill => ({
      name: skill.skill_name,
      score: skill.score,
      pointsEarned: skill.points_earned,
      pointsPossible: skill.points_possible
    }));

    // Identify low-scoring skills (below 80%)
    const lowContentSkills = contentSkillDetails.filter(skill => skill.score < 80);
    const lowSubjectSkills = subjectSkillDetails.filter(skill => skill.score < 80);

    // Combine all skills for practice recommendations
    const allSkills = [...contentSkillDetails, ...subjectSkillDetails];
    const prioritySkills = allSkills.filter(skill => skill.score < 70).slice(0, 3);
    const reviewSkills = allSkills.filter(skill => skill.score >= 70 && skill.score < 85).slice(0, 2);
    const challengeSkills = allSkills.filter(skill => skill.score >= 85).slice(0, 2);

    // Check if this is a practice-related question
    const practiceKeywords = [
      'what should i work on', 'what to practice', 'what to study', 'what should i practice',
      'help me practice', 'create practice', 'generate practice', 'practice recommendations',
      'what to improve', 'areas to focus', 'skills to work on', 'study suggestions'
    ];
    
    const isPracticeQuestion = practiceKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Check if this is an explanation request
    const explanationKeywords = [
      'explain', 'what is', 'what are', 'how does', 'how do', 'why does', 'why do',
      'tell me about', 'help me understand', 'can you explain', 'what does it mean',
      'define', 'meaning of', 'concept of', 'how to', 'show me', 'teach me'
    ];
    
    const isExplanationRequest = explanationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Group skills by topics for better context
    const skillsByTopic = Object.entries(studentContext.groupedSkills).map(([topic, skills]) => ({
      topic,
      skills: skills.map(skill => ({
        name: skill.skill_name,
        score: skill.score,
        status: skill.score >= 80 ? 'Proficient' : skill.score >= 60 ? 'Developing' : 'Needs Practice'
      }))
    }));

    // Create the enhanced system prompt for JSON mode
    const systemPrompt = `You are an AI learning assistant helping ${studentContext.studentName} in ${studentContext.classSubject} (${studentContext.classGrade}).

📘 STUDENT CONTEXT
- Class: ${studentContext.className}
- Subject: ${studentContext.classSubject}
- Grade: ${studentContext.classGrade}
- Teacher: ${studentContext.teacher}

📊 SKILL SNAPSHOT

Content Skills:
${contentSkillDetails.map(s => `- ${s.name}: ${s.score}% (${s.pointsEarned}/${s.pointsPossible})`).join('\n')}

Subject Skills:
${subjectSkillDetails.map(s => `- ${s.name}: ${s.score}% (${s.pointsEarned}/${s.pointsPossible})`).join('\n')}

Skills by Topic:
${skillsByTopic.map(topic => `${topic.topic}:\n${topic.skills.map(skill => `  - ${skill.name}: ${skill.score}% (${skill.status})`).join('\n')}`).join('\n\n')}

🔻 LOW-SCORING AREAS (Below 80%)

Content:
${lowContentSkills.length ? lowContentSkills.map(s => `- ${s.name}: ${s.score}%`).join('\n') : "- None"}

Subject:
${lowSubjectSkills.length ? lowSubjectSkills.map(s => `- ${s.name}: ${s.score}%`).join('\n') : "- None"}

🧪 TEST PERFORMANCE
${studentContext.testResults.length ? 
`- Tests Completed: ${studentContext.testResults.length}
- Average Score: ${Math.round(studentContext.testResults.reduce((sum, t) => sum + t.overall_score, 0) / studentContext.testResults.length)}%
- Latest Test: ${Math.round(studentContext.testResults[0]?.overall_score || 0)}%` : "- No test data yet"}

🎯 YOUR ROLE

You MUST respond in JSON format with this structure:
{
  "message": "Your main response text",
  "practiceRecommendations": [array of practice recommendations - ONLY include if student asks practice questions]
}

📌 PRACTICE RECOMMENDATIONS RULES
- Include practiceRecommendations array ONLY when student asks practice-related questions
- For each skill recommendation, include:
  - skillName: exact skill name from the data
  - currentScore: the actual score number
  - difficulty: "Review", "Standard", or "Challenge" 
  - estimatedTime: like "15-20 min"
  - expectedImprovement: like "+3-8%"
  - category: "PRIORITY" (score < 70), "REVIEW" (70-84%), or "CHALLENGE" (85%+)

Priority order: ${prioritySkills.length ? prioritySkills.map(s => `${s.name} (${s.score}%)`).join(', ') : 'None'}
Review order: ${reviewSkills.length ? reviewSkills.map(s => `${s.name} (${s.score}%)`).join(', ') : 'None'}
Challenge order: ${challengeSkills.length ? challengeSkills.map(s => `${s.name} (${s.score}%)`).join(', ') : 'None'}

🧠 EXPLAIN LIKE I'M 12 (When asked "what is..." or "explain...")
- Use simple words and relatable examples
- Use emojis to keep it friendly 😊
- Break it down step-by-step
- Start with: "Great question! Let me explain it simply..."
- End with encouragement

📈 ANALYSIS GUIDELINES
- <60% = urgent
- 60–79% = developing  
- 80%+ = proficient
- Use actual scores and skill names when giving recommendations
- Keep replies warm and focused on student progress`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { 
          type: "json_object"
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponseText = data.choices[0].message.content;
    
    // Parse the JSON response
    let aiResponse;
    try {
      aiResponse = JSON.parse(aiResponseText);
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', parseError);
      // Fallback for non-JSON responses
      aiResponse = {
        message: aiResponseText || "I'm sorry, I couldn't generate a proper response. Please try again.",
        practiceRecommendations: []
      };
    }

    // Ensure the response has the expected structure
    if (!aiResponse.message) {
      aiResponse.message = "I'm sorry, I couldn't generate a proper response. Please try again.";
    }
    if (!Array.isArray(aiResponse.practiceRecommendations)) {
      aiResponse.practiceRecommendations = [];
    }

    return new Response(JSON.stringify({ 
      response: aiResponse.message,
      practiceRecommendations: aiResponse.practiceRecommendations 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get AI response. Please try again.',
      practiceRecommendations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
