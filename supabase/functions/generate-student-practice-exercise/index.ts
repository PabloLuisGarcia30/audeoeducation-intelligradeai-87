
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface StudentPracticeRequest {
  studentId: string;
  studentName: string;
  skillName: string;
  currentSkillScore: number;
  classId: string;
  className: string;
  subject: string;
  grade: string;
  preferredDifficulty?: 'adaptive' | 'review' | 'challenge';
  questionCount?: number;
}

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  points: number;
  explanation?: string;
  targetSkill: string;
  difficultyLevel: string;
  hint?: string;
}

interface StudentPracticeExercise {
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  estimatedTime: number;
  adaptiveDifficulty: string;
  studentGuidance: string;
  metadata: {
    skillName: string;
    currentSkillScore: number;
    targetImprovement: number;
    generatedAt: string;
    studentName: string;
    className: string;
    sessionId: string;
  };
}

function determineDifficultyLevel(currentScore: number, preferredDifficulty?: string): string {
  if (preferredDifficulty && preferredDifficulty !== 'adaptive') {
    return preferredDifficulty;
  }
  
  if (currentScore < 60) return 'review';
  if (currentScore < 80) return 'mixed';
  return 'challenge';
}

function buildStudentPracticePrompt(request: StudentPracticeRequest, difficultyLevel: string): string {
  const { studentName, skillName, currentSkillScore, className, subject, grade, questionCount = 4 } = request;
  
  const difficultyGuidance = {
    review: 'Focus on fundamental concepts with step-by-step explanations. Include hints and scaffolding.',
    mixed: 'Mix of review and application questions. Include some challenge while reinforcing basics.',
    challenge: 'Advanced application questions that push understanding. Include real-world scenarios.'
  };

  const targetImprovement = Math.min(currentSkillScore + 15, 95);

  return `Create a personalized practice exercise for ${studentName} in ${className} (${subject}, ${grade}).

STUDENT CONTEXT:
- Current skill level in "${skillName}": ${currentSkillScore}%
- Target improvement: ${targetImprovement}%
- Difficulty level: ${difficultyLevel}

EXERCISE REQUIREMENTS:
- Generate exactly ${questionCount} questions targeting "${skillName}"
- Difficulty: ${difficultyGuidance[difficultyLevel]}
- Include explanations and hints for each question
- Focus on areas where students typically struggle at this skill level
- Make questions engaging and relatable to ${grade} students

FORMAT AS JSON:
{
  "title": "Personalized Practice: ${skillName}",
  "description": "Adaptive practice designed to improve your ${skillName} skills",
  "studentGuidance": "Encouraging message about practice goals and what they'll learn",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice" | "short-answer" | "essay",
      "question": "Question text",
      "options": ["A", "B", "C", "D"] (for multiple choice),
      "correctAnswer": "Correct answer",
      "acceptableAnswers": ["Alternative answers"],
      "keywords": ["key", "words"],
      "points": 1,
      "explanation": "Clear explanation of why this is correct",
      "targetSkill": "${skillName}",
      "difficultyLevel": "${difficultyLevel}",
      "hint": "Helpful hint if student gets stuck"
    }
  ],
  "totalPoints": ${questionCount},
  "estimatedTime": ${questionCount * 3},
  "adaptiveDifficulty": "${difficultyLevel}"
}`;
}

async function createPracticeSession(request: StudentPracticeRequest, difficultyLevel: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('student_practice_sessions')
      .insert({
        student_id: request.studentId,
        student_name: request.studentName,
        skill_name: request.skillName,
        current_skill_score: request.currentSkillScore,
        class_id: request.classId,
        class_name: request.className,
        subject: request.subject,
        grade: request.grade,
        difficulty_level: difficultyLevel,
        question_count: request.questionCount || 4
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('❌ Error creating practice session:', error);
    throw error;
  }
}

async function updatePracticeAnalytics(studentId: string, skillName: string): Promise<void> {
  try {
    // Check if analytics record exists
    const { data: existing, error: selectError } = await supabase
      .from('student_practice_analytics')
      .select('*')
      .eq('student_id', studentId)
      .eq('skill_name', skillName)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('student_practice_analytics')
        .update({
          total_practice_sessions: existing.total_practice_sessions + 1,
          last_practiced_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('student_practice_analytics')
        .insert({
          student_id: studentId,
          skill_name: skillName,
          total_practice_sessions: 1,
          last_practiced_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('❌ Error updating practice analytics:', error);
    // Don't throw - analytics failure shouldn't block exercise generation
  }
}

async function generateStudentPracticeExercise(request: StudentPracticeRequest): Promise<StudentPracticeExercise> {
  console.log('🎯 Generating student practice exercise:', request);
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const difficultyLevel = determineDifficultyLevel(request.currentSkillScore, request.preferredDifficulty);
  const sessionId = await createPracticeSession(request, difficultyLevel);
  
  // Update analytics in background
  updatePracticeAnalytics(request.studentId, request.skillName);

  const prompt = buildStudentPracticePrompt(request, difficultyLevel);
  
  try {
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
            content: `You are an expert tutor creating personalized practice exercises. Generate adaptive questions that help students improve specific skills. Focus on encouraging learning and building confidence. Always respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    let practiceExercise: StudentPracticeExercise;
    try {
      practiceExercise = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Add metadata
    practiceExercise.metadata = {
      skillName: request.skillName,
      currentSkillScore: request.currentSkillScore,
      targetImprovement: Math.min(request.currentSkillScore + 15, 95),
      generatedAt: new Date().toISOString(),
      studentName: request.studentName,
      className: request.className,
      sessionId
    };

    // Mark session as exercise generated
    await supabase
      .from('student_practice_sessions')
      .update({ exercise_generated: true })
      .eq('id', sessionId);

    console.log('✅ Successfully generated student practice exercise with', practiceExercise.questions.length, 'questions');
    return practiceExercise;

  } catch (error) {
    console.error('❌ Error generating student practice exercise:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Student practice exercise generation request received');
    
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestData: StudentPracticeRequest = await req.json();
    console.log('📋 Student request data:', requestData);

    // Validate required fields
    if (!requestData.studentId || !requestData.skillName || !requestData.className) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentId, skillName, className' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const practiceExercise = await generateStudentPracticeExercise(requestData);

    return new Response(
      JSON.stringify(practiceExercise),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-student-practice-exercise function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate student practice exercise',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
