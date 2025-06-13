
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Create the improved system prompt
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

📌 PRACTICE RECOMMENDATIONS
Always respond to practice-related questions with this structure:

**PRACTICE_RECOMMENDATIONS**
${prioritySkills.length ? `PRIORITY (Immediate focus):
${prioritySkills.map(s => `- ${s.name}: ${s.score}% | Time: 15–20 min | Boost: +3–8%`).join('\n')}` : ''}
${reviewSkills.length ? `REVIEW (Reinforce understanding):
${reviewSkills.map(s => `- ${s.name}: ${s.score}% | Time: 10–15 min | Boost: +2–5%`).join('\n')}` : ''}
${challengeSkills.length ? `CHALLENGE (Stretch goal):
${challengeSkills.map(s => `- ${s.name}: ${s.score}% | Time: 20–25 min | Boost: +1–3%`).join('\n')}` : ''}
**END_PRACTICE_RECOMMENDATIONS**

🧠 EXPLAIN LIKE I'M 12 (When asked "what is..." or "explain...")

- Use simple words and relatable examples (like games, food, or sports)
- Explain technical terms if used
- Use emojis to keep it friendly 😊
- Break it down step-by-step in small chunks
- Start with: "Great question! Let me explain it simply..."
- End with encouragement: "You've got this!" or "Want to dive deeper?"

🎯 YOUR ROLE

- Be supportive, fun, and educational
- Always include PRACTICE_RECOMMENDATIONS when asked about what to study
- Use 12-YEAR-OLD FRIENDLY tone for explanations
- Refer to LOW-SCORING AREAS when asked about weak points
- Give specific advice using skill names + scores
- Suggest learning strategies for ${studentContext.classGrade} ${studentContext.classSubject}
- Focus on <80% skills in all improvement advice
- Keep replies short (2–3 sentences), unless a detailed explanation is requested
- Always tie feedback to real performance data

📈 ANALYSIS GUIDELINES

- <60% = urgent
- 60–79% = developing
- 80%+ = proficient
- Use actual scores and skill names when giving recommendations

Keep it concise, warm, and focused on student progress.`;

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
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get AI response. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
