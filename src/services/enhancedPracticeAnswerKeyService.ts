
import { supabase } from '@/integrations/supabase/client';
import { PracticeAnswerKeyService, type PracticeAnswerKeyQuestion } from './practiceAnswerKeyService';

export interface EnhancedPracticeAnswerKeyQuestion extends PracticeAnswerKeyQuestion {
  choiceMisconceptions?: Record<string, {
    correct?: boolean;
    misconceptionCategory?: string;
    misconceptionSubtype?: string;
    description?: string;
    confidence?: number;
  }>;
}

export interface EnhancedPracticeAnswerKey {
  id: string;
  exercise_id: string;
  questions: EnhancedPracticeAnswerKeyQuestion[];
  metadata: {
    skillName: string;
    subject: string;
    grade: string;
    totalPoints: number;
    estimatedTime: number;
    generatedAt: string;
    misconceptionAnnotated?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export class EnhancedPracticeAnswerKeyService extends PracticeAnswerKeyService {
  /**
   * Save answer key with misconception annotations
   */
  static async saveEnhancedAnswerKey(
    exerciseId: string, 
    questions: EnhancedPracticeAnswerKeyQuestion[], 
    metadata: any
  ): Promise<void> {
    console.log('💾 Saving enhanced answer key with misconception data for exercise:', exerciseId);
    
    // Mark metadata as misconception annotated if any questions have misconceptions
    const hasMisconceptions = questions.some(q => 
      q.choiceMisconceptions && Object.keys(q.choiceMisconceptions).length > 0
    );

    const enhancedMetadata = {
      ...metadata,
      misconceptionAnnotated: hasMisconceptions,
      generatedAt: new Date().toISOString()
    };

    const { error } = await supabase
      .from('practice_answer_keys')
      .insert({
        exercise_id: exerciseId,
        questions: questions as unknown as any,  // Cast to any for Supabase Json compatibility
        metadata: enhancedMetadata as unknown as any
      });

    if (error) {
      console.error('❌ Error saving enhanced answer key:', error);
      throw new Error(`Failed to save enhanced answer key: ${error.message}`);
    }

    console.log('✅ Enhanced answer key saved successfully');
  }

  /**
   * Get answer key with misconception data
   */
  static async getEnhancedAnswerKey(exerciseId: string): Promise<EnhancedPracticeAnswerKey | null> {
    console.log('📖 Fetching enhanced answer key for exercise:', exerciseId);
    
    const { data, error } = await supabase
      .from('practice_answer_keys')
      .select('*')
      .eq('exercise_id', exerciseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️ No enhanced answer key found for exercise:', exerciseId);
        return null;
      }
      console.error('❌ Error fetching enhanced answer key:', error);
      throw new Error(`Failed to fetch enhanced answer key: ${error.message}`);
    }

    console.log('✅ Enhanced answer key fetched successfully');
    return {
      id: data.id,
      exercise_id: data.exercise_id,
      questions: data.questions as unknown as EnhancedPracticeAnswerKeyQuestion[],
      metadata: data.metadata as any,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  /**
   * Update misconception annotations for existing answer key
   */
  static async updateMisconceptionAnnotations(
    exerciseId: string,
    questionId: string,
    choiceMisconceptions: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`📝 Updating misconception annotations for question ${questionId} in exercise ${exerciseId}`);

      const answerKey = await this.getEnhancedAnswerKey(exerciseId);
      if (!answerKey) {
        throw new Error('Answer key not found');
      }

      // Update the specific question's misconceptions
      const updatedQuestions = answerKey.questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            choiceMisconceptions
          };
        }
        return q;
      });

      // Update in database
      const { error } = await supabase
        .from('practice_answer_keys')
        .update({
          questions: updatedQuestions as unknown as any,
          metadata: {
            ...answerKey.metadata,
            misconceptionAnnotated: true
          } as unknown as any
        })
        .eq('exercise_id', exerciseId);

      if (error) {
        console.error('❌ Error updating misconception annotations:', error);
        throw error;
      }

      console.log('✅ Misconception annotations updated successfully');
    } catch (error) {
      console.error('❌ Error in updateMisconceptionAnnotations:', error);
      throw error;
    }
  }

  /**
   * Get misconception statistics for analytics
   */
  static async getMisconceptionStatistics(filters?: {
    skillName?: string;
    subject?: string;
    timeframe?: number;
  }): Promise<any> {
    try {
      let query = supabase
        .from('practice_answer_keys')
        .select('questions, metadata, created_at')
        .not('questions', 'is', null);

      if (filters?.timeframe) {
        const since = new Date();
        since.setDate(since.getDate() - filters.timeframe);
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data to extract misconception statistics
      const stats = {
        totalQuestions: 0,
        questionsWithMisconceptions: 0,
        misconceptionCategories: {} as Record<string, number>,
        misconceptionSubtypes: {} as Record<string, number>
      };

      data?.forEach(answerKey => {
        const questions = answerKey.questions as any[];
        questions?.forEach(question => {
          stats.totalQuestions++;
          
          if (question.choiceMisconceptions) {
            const hasAnnotations = Object.values(question.choiceMisconceptions).some(
              (choice: any) => choice.misconceptionCategory
            );
            
            if (hasAnnotations) {
              stats.questionsWithMisconceptions++;
              
              Object.values(question.choiceMisconceptions).forEach((choice: any) => {
                if (choice.misconceptionCategory) {
                  stats.misconceptionCategories[choice.misconceptionCategory] = 
                    (stats.misconceptionCategories[choice.misconceptionCategory] || 0) + 1;
                }
                if (choice.misconceptionSubtype) {
                  stats.misconceptionSubtypes[choice.misconceptionSubtype] = 
                    (stats.misconceptionSubtypes[choice.misconceptionSubtype] || 0) + 1;
                }
              });
            }
          }
        });
      });

      return stats;
    } catch (error) {
      console.error('❌ Error in getMisconceptionStatistics:', error);
      throw error;
    }
  }
}
