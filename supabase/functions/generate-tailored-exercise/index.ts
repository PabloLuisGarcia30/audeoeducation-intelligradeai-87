
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  callOpenAI, 
  parseAndValidateJSON, 
  buildEducationalSystemPrompt,
  handleOpenAIError 
} from "../shared/openaiClient.ts";
import {
  determineTargetDifficulty,
  detectSkillType,
  generateSkillMetadata,
  addExerciseMetadata,
  validateExerciseData,
  createErrorResponse
} from "../shared/exerciseHelpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateExerciseRequest {
  skill_name: string;
  skill_score: number;
  student_name: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  subject?: string;
  grade?: string;
}

function buildExercisePrompt(request: GenerateExerciseRequest, targetDifficulty: string, skillType: string, skillMetadata: any): string {
  const { skill_name, skill_score, student_name, subject, grade } = request;
  
  return `Create a ${targetDifficulty} level practice exercise for the skill "${skill_name}" for student ${student_name}. 
The student currently has a score of ${skill_score}% in this skill.

SKILL TYPE: ${skillType} (${skillType === 'content' ? 'subject-specific content knowledge' : 'cross-curricular cognitive skill'})
${subject ? `SUBJECT: ${subject}` : ''}
${grade ? `GRADE: ${grade}` : ''}

Return a JSON object with this structure:
{
  "title": "Exercise title",
  "description": "Brief description of what the student will practice",
  "skillType": "${skillType}",
  "skillMetadata": ${JSON.stringify(skillMetadata)},
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "type": "multiple_choice" | "short_answer" | "true_false",
      "options": ["A", "B", "C", "D"] (only for multiple choice),
      "correct_answer": "correct answer",
      "explanation": "Why this is the correct answer",
      "points": 10
    }
  ],
  "total_points": 100,
  "estimated_time_minutes": 15,
  "difficulty": "${targetDifficulty}",
  "skill_focus": "${skill_name}"
}

Include 5-8 questions that progressively build on the skill. Make it engaging and educational.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: GenerateExerciseRequest = await req.json();
    const { skill_name, skill_score, student_name, difficulty_level, subject, grade } = request;

    // Detect skill type and generate metadata
    const skillType = detectSkillType(skill_name, subject);
    const skillMetadata = generateSkillMetadata(skillType, skill_name, subject, grade);
    
    console.log(`Generating tailored exercise - Skill: ${skill_name}, Type: ${skillType}, Score: ${skill_score}%`);

    // Determine difficulty
    const targetDifficulty = determineTargetDifficulty(skill_score, difficulty_level);

    // Build prompt
    const prompt = buildExercisePrompt(request, targetDifficulty, skillType, skillMetadata);

    // Call OpenAI
    const openAIResponse = await callOpenAI(prompt, {
      model: 'gpt-4',
      systemPrompt: buildEducationalSystemPrompt('exercise')
    });

    // Parse and validate response
    const exerciseData = parseAndValidateJSON(openAIResponse.content, (data) => {
      const validation = validateExerciseData(data);
      if (!validation.isValid) {
        console.error('Exercise validation failed:', validation.errors);
        return false;
      }
      return true;
    });

    // Ensure skill metadata is included
    if (!exerciseData.skillType) {
      exerciseData.skillType = skillType;
    }
    
    if (!exerciseData.skillMetadata) {
      exerciseData.skillMetadata = skillMetadata;
    }

    // Add metadata
    const finalExerciseData = addExerciseMetadata(exerciseData, {
      skillName: skill_name,
      difficulty: targetDifficulty,
      generatedAt: new Date().toISOString(),
      studentName: student_name
    });

    console.log(`Generated tailored exercise with skill type: ${finalExerciseData.skillType}`);

    return new Response(
      JSON.stringify({ exercise_data: finalExerciseData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-tailored-exercise function:', error);
    const handledError = handleOpenAIError(error);
    return createErrorResponse(handledError.message);
  }
});
