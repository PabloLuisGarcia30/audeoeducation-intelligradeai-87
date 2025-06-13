
/**
 * Shared exercise generation helpers
 */

export interface SkillMetadata {
  skillType: 'content' | 'subject';
  skillCategory: string;
  subject: string;
  grade: string;
  detectedPatterns: string[];
  confidence: number;
  classificationMethod: string;
}

export interface ExerciseMetadata {
  skillName: string;
  difficulty: string;
  generatedAt: string;
  studentName?: string;
  className?: string;
  [key: string]: any;
}

/**
 * Determine target difficulty based on student's score
 */
export function determineTargetDifficulty(
  skillScore: number,
  explicitDifficulty?: string
): 'easy' | 'medium' | 'hard' {
  if (explicitDifficulty) {
    return explicitDifficulty as 'easy' | 'medium' | 'hard';
  }

  if (skillScore < 60) {
    return 'easy';
  } else if (skillScore < 80) {
    return 'medium';
  } else {
    return 'hard';
  }
}

/**
 * Enhanced skill type detection based on skill name patterns
 */
export function detectSkillType(skillName: string, subject?: string): 'content' | 'subject' {
  const contentSkillPatterns = [
    // Math content skills
    'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics', 'probability',
    'fractions', 'decimals', 'integers', 'equations', 'functions', 'graphing',
    'polynomials', 'logarithms', 'matrices', 'sequences', 'series',
    
    // Science content skills
    'chemistry', 'physics', 'biology', 'atomic structure', 'periodic table',
    'chemical bonds', 'reactions', 'thermodynamics', 'mechanics', 'waves',
    'electricity', 'magnetism', 'genetics', 'evolution', 'ecology',
    
    // English content skills
    'grammar', 'vocabulary', 'syntax', 'phonics', 'spelling', 'punctuation',
    'literature', 'poetry', 'prose', 'rhetoric', 'composition',
    
    // History content skills
    'ancient history', 'medieval', 'renaissance', 'industrial revolution',
    'world wars', 'cold war', 'civilizations', 'empires'
  ];

  const subjectSkillPatterns = [
    // Cross-subject cognitive skills
    'critical thinking', 'problem solving', 'analytical reasoning', 'logical reasoning',
    'reading comprehension', 'written communication', 'oral communication',
    'research skills', 'data analysis', 'interpretation', 'synthesis',
    'evaluation', 'application', 'comprehension', 'knowledge recall',
    'creative thinking', 'decision making', 'time management', 'organization',
    'collaboration', 'leadership', 'presentation skills', 'study skills'
  ];

  const skillLower = skillName.toLowerCase();
  
  // Check for content skill patterns
  for (const pattern of contentSkillPatterns) {
    if (skillLower.includes(pattern)) {
      return 'content';
    }
  }
  
  // Check for subject skill patterns
  for (const pattern of subjectSkillPatterns) {
    if (skillLower.includes(pattern)) {
      return 'subject';
    }
  }
  
  // Default classification based on skill name characteristics
  if (skillLower.includes('understanding') || skillLower.includes('knowledge') || 
      skillLower.includes('concepts') || skillLower.includes('principles')) {
    return 'content';
  }
  
  if (skillLower.includes('skills') || skillLower.includes('ability') || 
      skillLower.includes('thinking') || skillLower.includes('reasoning')) {
    return 'subject';
  }
  
  // Final fallback: content skills for specific subjects, subject skills for general
  if (subject) {
    const specificSubjects = ['math', 'science', 'english', 'history', 'physics', 'chemistry', 'biology'];
    if (specificSubjects.some(subj => subject.toLowerCase().includes(subj))) {
      return 'content';
    }
  }
  
  return 'subject'; // Default to subject skill
}

/**
 * Generate skill metadata
 */
export function generateSkillMetadata(
  skillName: string,
  skillType: 'content' | 'subject',
  subject?: string,
  grade?: string
): SkillMetadata {
  return {
    skillType,
    skillCategory: skillType === 'content' ? 'domain_specific' : 'cross_curricular',
    subject: subject || 'General',
    grade: grade || 'Unknown',
    detectedPatterns: skillType === 'content' ? ['subject_specific_content'] : ['cognitive_skill'],
    confidence: 0.8,
    classificationMethod: 'pattern_matching_enhanced'
  };
}

/**
 * Add consistent metadata to exercise data
 */
export function addExerciseMetadata(
  exerciseData: any,
  metadata: ExerciseMetadata
): any {
  return {
    ...exerciseData,
    generated_at: metadata.generatedAt,
    student_name: metadata.studentName,
    skill_focus: metadata.skillName,
    difficulty: metadata.difficulty,
    metadata
  };
}

/**
 * Validate exercise data structure
 */
export function validateExerciseData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title) errors.push('Missing title');
  if (!data.questions || !Array.isArray(data.questions)) errors.push('Missing or invalid questions array');
  if (data.questions && data.questions.length === 0) errors.push('No questions provided');
  
  // Validate individual questions
  if (data.questions) {
    data.questions.forEach((q: any, index: number) => {
      if (!q.question) errors.push(`Question ${index + 1}: Missing question text`);
      if (!q.type) errors.push(`Question ${index + 1}: Missing question type`);
      if (typeof q.points !== 'number') errors.push(`Question ${index + 1}: Invalid points value`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Standardize error response format
 */
export function createErrorResponse(message: string, details?: any): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  return new Response(
    JSON.stringify({ 
      error: message,
      details: details || undefined
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
