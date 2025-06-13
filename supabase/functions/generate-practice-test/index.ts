
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { 
  callOpenAI, 
  parseAndValidateJSON, 
  buildEducationalSystemPrompt,
  handleOpenAIError 
} from "../shared/openaiClient.ts";
import {
  validateExerciseData,
  createErrorResponse
} from "../shared/exerciseHelpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface PracticeTestRequest {
  studentName: string;
  skillName: string;
  className: string;
  subject: string;
  grade: string;
  difficulty?: string;
  questionCount?: number;
  includeExplanations?: boolean;
  classId?: string;
  skillDistribution?: Array<{
    skill_name: string;
    score: number;
    questions: number;
  }>;
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
  targetSkill?: string;
}

interface PracticeTestData {
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  estimatedTime: number;
  metadata: {
    skillName: string;
    difficulty: string;
    generatedAt: string;
    studentName: string;
    className: string;
  };
}

function buildSingleSkillPrompt(request: PracticeTestRequest): string {
  const { studentName, skillName, className, subject, grade, difficulty = 'mixed', questionCount = 5 } = request;
  
  return `Create a practice test for ${studentName} in ${className} (${subject}, ${grade}) focusing on: ${skillName}.

Questions: ${questionCount}
Difficulty: ${difficulty}
${request.includeExplanations ? 'Include explanations for each answer.' : ''}

Generate exactly ${questionCount} questions targeting ${skillName}. Mix question types but focus on the specific skill.

Format as JSON:
{
  "title": "${skillName} Practice Test",
  "description": "Practice test for ${skillName} skill",
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
      "explanation": "Why this is correct",
      "targetSkill": "${skillName}"
    }
  ],
  "totalPoints": ${questionCount},
  "estimatedTime": ${questionCount * 2}
}`;
}

function buildMultiSkillPrompt(request: PracticeTestRequest): string {
  const { studentName, className, subject, grade, difficulty = 'mixed', questionCount = 5 } = request;
  
  if (!request.skillDistribution || request.skillDistribution.length === 0) {
    throw new Error('Skill distribution required for multi-skill test');
  }
  
  const skillDescriptions = request.skillDistribution.map(skill => 
    `${skill.skill_name} (${skill.questions} questions)`
  ).join(', ');
  
  return `Create a practice test for ${studentName} in ${className} (${subject}, ${grade}) covering these skills: ${skillDescriptions}.

Total questions: ${questionCount}
Difficulty: ${difficulty}
${request.includeExplanations ? 'Include explanations for each answer.' : ''}

Generate exactly ${questionCount} questions distributed across the specified skills. Each question should target the specific skill mentioned.

Format as JSON:
{
  "title": "Practice Test Title",
  "description": "Brief description",
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
      "explanation": "Why this is correct",
      "targetSkill": "Skill this question targets"
    }
  ],
  "totalPoints": ${questionCount},
  "estimatedTime": ${questionCount * 2}
}`;
}

function buildPrompt(request: PracticeTestRequest): string {
  // Handle multi-skill distribution if provided
  if (request.skillDistribution && request.skillDistribution.length > 1) {
    return buildMultiSkillPrompt(request);
  }
  
  // Single skill prompt
  return buildSingleSkillPrompt(request);
}

async function generatePracticeTest(request: PracticeTestRequest): Promise<PracticeTestData> {
  console.log('🎯 Generating practice test:', request);
  
  const prompt = buildPrompt(request);
  
  try {
    const openAIResponse = await callOpenAI(prompt, {
      model: 'gpt-4o-mini',
      systemPrompt: buildEducationalSystemPrompt('test'),
      temperature: 0.7,
      maxTokens: 2000
    });

    // Parse and validate the JSON response
    const practiceTest = parseAndValidateJSON<PracticeTestData>(openAIResponse.content, (data) => {
      const validation = validateExerciseData(data);
      if (!validation.isValid) {
        console.error('Practice test validation failed:', validation.errors);
        return false;
      }
      return true;
    });

    // Add metadata
    practiceTest.metadata = {
      skillName: request.skillName,
      difficulty: request.difficulty || 'mixed',
      generatedAt: new Date().toISOString(),
      studentName: request.studentName,
      className: request.className
    };

    console.log('✅ Successfully generated practice test with', practiceTest.questions.length, 'questions');
    return practiceTest;

  } catch (error) {
    console.error('❌ Error generating practice test:', error);
    throw handleOpenAIError(error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Practice test generation request received');
    
    const requestData: PracticeTestRequest = await req.json();
    console.log('📋 Request data:', requestData);

    // Validate required fields
    if (!requestData.studentName || !requestData.skillName || !requestData.className) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentName, skillName, className' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const practiceTest = await generatePracticeTest(requestData);

    return new Response(
      JSON.stringify(practiceTest),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-practice-test function:', error);
    const handledError = handleOpenAIError(error);
    return createErrorResponse(handledError.message);
  }
});
