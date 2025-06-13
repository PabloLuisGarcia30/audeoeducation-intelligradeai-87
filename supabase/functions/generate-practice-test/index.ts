
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { 
  callOpenAI, 
  parseAndValidateJSON, 
  buildEducationalSystemPrompt,
  handleOpenAIError 
} from "../shared/openaiClient.ts";

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

function validateExerciseData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return { isValid: false, errors };
  }
  
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Missing or invalid title');
  }
  
  if (!data.questions || !Array.isArray(data.questions)) {
    errors.push('Missing or invalid questions array');
    return { isValid: false, errors };
  }
  
  if (data.questions.length === 0) {
    errors.push('No questions provided');
  }
  
  // Validate each question structure
  data.questions.forEach((question: any, index: number) => {
    if (!question.id) errors.push(`Question ${index + 1}: Missing id`);
    if (!question.question) errors.push(`Question ${index + 1}: Missing question text`);
    if (!question.type) errors.push(`Question ${index + 1}: Missing type`);
    if (question.points === undefined || question.points === null) {
      errors.push(`Question ${index + 1}: Missing points`);
    }
  });
  
  return { isValid: errors.length === 0, errors };
}

function buildSingleSkillPrompt(request: PracticeTestRequest): string {
  const { studentName, skillName, className, subject, grade, difficulty = 'mixed', questionCount = 5 } = request;
  
  return `Create a practice test for ${studentName} in ${className} (${subject}, ${grade}) focusing on: ${skillName}.

Questions: ${questionCount}
Difficulty: ${difficulty}
${request.includeExplanations ? 'Include explanations for each answer.' : ''}

Generate exactly ${questionCount} questions targeting ${skillName}. Mix question types but focus on the specific skill.

Return a JSON object with this exact structure:
{
  "title": "${skillName} Practice Test",
  "description": "Practice test for ${skillName} skill",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
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

Return a JSON object with this exact structure:
{
  "title": "Practice Test Title",
  "description": "Brief description",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
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

async function generatePracticeTestWithRetry(request: PracticeTestRequest, maxRetries = 2): Promise<PracticeTestData> {
  const requestId = `${request.studentName}_${Date.now()}`;
  console.log(`🎯 Generating practice test for ${requestId}:`, request);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`📝 Attempt ${attempt}/${maxRetries + 1} for ${requestId}`);
      
      const prompt = buildPrompt(request);
      
      const openAIResponse = await callOpenAI(prompt, {
        model: 'gpt-4o-mini',
        systemPrompt: buildEducationalSystemPrompt('test'),
        temperature: 0.7,
        maxTokens: 2000
      });

      // Parse and validate the JSON response with context
      const practiceTest = parseAndValidateJSON<PracticeTestData>(
        openAIResponse.content, 
        (data) => {
          const validation = validateExerciseData(data);
          if (!validation.isValid) {
            console.error(`❌ Practice test validation failed for ${requestId}:`, validation.errors);
            return false;
          }
          return true;
        },
        `practice test generation for ${requestId}`
      );

      // Add metadata
      practiceTest.metadata = {
        skillName: request.skillName,
        difficulty: request.difficulty || 'mixed',
        generatedAt: new Date().toISOString(),
        studentName: request.studentName,
        className: request.className
      };

      console.log(`✅ Successfully generated practice test for ${requestId} with ${practiceTest.questions.length} questions`);
      return practiceTest;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed for ${requestId}:`, error);
      
      // If not the last attempt, wait before retrying
      if (attempt <= maxRetries) {
        const delay = 1000 * attempt; // Exponential backoff
        console.log(`⏱️ Waiting ${delay}ms before retry for ${requestId}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  console.error(`❌ All attempts failed for ${requestId}. Final error:`, lastError);
  throw handleOpenAIError(lastError);
}

function createErrorResponse(message: string, status = 500) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
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
      return createErrorResponse('Missing required fields: studentName, skillName, className', 400);
    }

    const practiceTest = await generatePracticeTestWithRetry(requestData);

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
