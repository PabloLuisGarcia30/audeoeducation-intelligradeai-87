
import { ClassificationStrategy, ClassificationResult, ClassificationContext } from '../types';
import { supabase } from '@/integrations/supabase/client';

export class DatabaseLookupStrategy implements ClassificationStrategy {
  name = 'database-lookup';

  async classify(context: ClassificationContext): Promise<ClassificationResult | null> {
    const { skillName, studentId } = context;
    
    if (!studentId) {
      return null;
    }
    
    try {
      // Check for existing content skill scores
      const { data: contentScores } = await supabase
        .from('content_skill_scores')
        .select('id')
        .eq('authenticated_student_id', studentId)
        .eq('skill_name', skillName)
        .limit(1);

      if (contentScores && contentScores.length > 0) {
        console.log(`📊 Database lookup found content skill for "${skillName}"`);
        return {
          skillType: 'content',
          confidence: 0.8,
          strategy: this.name,
          metadata: { existingRecords: contentScores.length }
        };
      }

      // Check for existing subject skill scores
      const { data: subjectScores } = await supabase
        .from('subject_skill_scores')
        .select('id')
        .eq('authenticated_student_id', studentId)
        .eq('skill_name', skillName)
        .limit(1);

      if (subjectScores && subjectScores.length > 0) {
        console.log(`📊 Database lookup found subject skill for "${skillName}"`);
        return {
          skillType: 'subject',
          confidence: 0.8,
          strategy: this.name,
          metadata: { existingRecords: subjectScores.length }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error in database lookup strategy:', error);
      return null;
    }
  }
}
