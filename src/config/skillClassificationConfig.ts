
export interface SkillPattern {
  pattern: string;
  confidence: number;
  subject?: string;
  grade?: string;
}

export interface SkillClassificationConfig {
  contentSkillPatterns: SkillPattern[];
  subjectSkillPatterns: SkillPattern[];
  defaultConfidenceThreshold: number;
  fallbackSkillType: 'content' | 'subject';
}

export const skillClassificationConfig: SkillClassificationConfig = {
  contentSkillPatterns: [
    // Math content skills
    { pattern: 'algebra', confidence: 0.9, subject: 'Math' },
    { pattern: 'geometry', confidence: 0.9, subject: 'Math' },
    { pattern: 'calculus', confidence: 0.9, subject: 'Math' },
    { pattern: 'trigonometry', confidence: 0.9, subject: 'Math' },
    { pattern: 'fractions', confidence: 0.8, subject: 'Math' },
    { pattern: 'equations', confidence: 0.8, subject: 'Math' },
    { pattern: 'polynomials', confidence: 0.8, subject: 'Math' },
    { pattern: 'logarithms', confidence: 0.8, subject: 'Math' },
    
    // Science content skills
    { pattern: 'chemistry', confidence: 0.9, subject: 'Science' },
    { pattern: 'physics', confidence: 0.9, subject: 'Science' },
    { pattern: 'biology', confidence: 0.9, subject: 'Science' },
    { pattern: 'molecules', confidence: 0.8, subject: 'Science' },
    { pattern: 'atoms', confidence: 0.8, subject: 'Science' },
    { pattern: 'genetics', confidence: 0.8, subject: 'Science' },
    
    // English content skills
    { pattern: 'grammar', confidence: 0.9, subject: 'English' },
    { pattern: 'vocabulary', confidence: 0.8, subject: 'English' },
    { pattern: 'literature', confidence: 0.9, subject: 'English' },
    { pattern: 'poetry', confidence: 0.8, subject: 'English' },
    { pattern: 'shakespeare', confidence: 0.9, subject: 'English' },
    
    // Geography content skills
    { pattern: 'geography', confidence: 0.9, subject: 'Geography' },
    { pattern: 'cartography', confidence: 0.8, subject: 'Geography' },
    { pattern: 'topography', confidence: 0.8, subject: 'Geography' },
    { pattern: 'climate', confidence: 0.7, subject: 'Geography' },
    { pattern: 'geological', confidence: 0.7, subject: 'Geography' }
  ],
  
  subjectSkillPatterns: [
    // Cross-subject skills
    { pattern: 'critical thinking', confidence: 0.9 },
    { pattern: 'problem solving', confidence: 0.9 },
    { pattern: 'analytical reasoning', confidence: 0.8 },
    { pattern: 'reading comprehension', confidence: 0.8 },
    { pattern: 'communication', confidence: 0.7 },
    { pattern: 'research skills', confidence: 0.7 },
    { pattern: 'study skills', confidence: 0.7 },
    { pattern: 'time management', confidence: 0.6 },
    { pattern: 'collaboration', confidence: 0.6 }
  ],
  
  defaultConfidenceThreshold: 0.6,
  fallbackSkillType: 'content'
};
