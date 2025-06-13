
import { supabase } from '@/integrations/supabase/client';

export interface MisconceptionLog {
  studentId: string;
  questionId: string;
  selectedOption: string;
  misconceptionCategory?: string;
  misconceptionSubtype?: string;
  description?: string;
  confidence?: number;
  exerciseId?: string;
  practiceSessionId?: string;
}

export class MisconceptionLoggingService {
  /**
   * Log misconception when student selects incorrect MCQ option
   */
  static async logMCQMisconception(log: MisconceptionLog): Promise<void> {
    try {
      console.log(`🎯 Logging misconception for student ${log.studentId}, question ${log.questionId}`);

      // Check if this is a practice exercise or exam question
      let choiceMisconceptions: any = {};
      
      if (log.exerciseId) {
        // Get misconceptions from practice answer key
        const { data: answerKey, error } = await supabase
          .from('practice_answer_keys')
          .select('questions')
          .eq('exercise_id', log.exerciseId)
          .single();

        if (!error && answerKey?.questions) {
          const questions = answerKey.questions as any[];
          const question = questions.find(q => q.id === log.questionId);
          choiceMisconceptions = question?.choiceMisconceptions || {};
        }
      } else {
        // Get misconceptions from exam answer key
        const { data: answerKey, error } = await supabase
          .from('answer_keys')
          .select('choice_misconceptions')
          .eq('question_number', parseInt(log.questionId))
          .single();

        if (!error && answerKey?.choice_misconceptions) {
          choiceMisconceptions = answerKey.choice_misconceptions;
        }
      }

      const selectedMisconception = choiceMisconceptions[log.selectedOption];

      // Only log if the selected option has a misconception annotation and is incorrect
      if (selectedMisconception && !selectedMisconception.correct) {
        // Record in student_misconceptions table
        const misconceptionData = {
          student_id: log.studentId,
          question_id: log.questionId,
          exam_id: log.exerciseId || 'practice',
          confidence_score: selectedMisconception.confidence || log.confidence || 0.8,
          context_data: {
            selectedOption: log.selectedOption,
            misconceptionCategory: selectedMisconception.misconceptionCategory,
            misconceptionSubtype: selectedMisconception.misconceptionSubtype,
            description: selectedMisconception.description,
            practiceSessionId: log.practiceSessionId,
            exerciseId: log.exerciseId
          }
        };

        const { error: insertError } = await supabase
          .from('student_misconceptions')
          .insert(misconceptionData);

        if (insertError) {
          console.error('❌ Failed to log misconception:', insertError);
          throw insertError;
        }

        console.log(`✅ Successfully logged misconception: ${selectedMisconception.misconceptionCategory} - ${selectedMisconception.misconceptionSubtype}`);
      }
    } catch (error) {
      console.error('❌ Error in logMCQMisconception:', error);
      throw error;
    }
  }

  /**
   * Get misconception patterns for a student
   */
  static async getStudentMisconceptionPatterns(studentId: string, timeframe?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('student_misconceptions')
        .select(`
          *,
          misconception_subtypes(subtype_name, description),
          misconception_categories(category_name)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (timeframe) {
        const since = new Date();
        since.setDate(since.getDate() - timeframe);
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching misconception patterns:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getStudentMisconceptionPatterns:', error);
      throw error;
    }
  }

  /**
   * Get aggregated misconception statistics for analytics
   */
  static async getMisconceptionAnalytics(filters?: {
    classId?: string;
    skillName?: string;
    timeframe?: number;
  }): Promise<any> {
    try {
      console.log('📊 Fetching misconception analytics with filters:', filters);

      // This would typically involve complex queries
      // For now, return basic structure that can be enhanced
      const { data, error } = await supabase
        .from('student_misconceptions')
        .select('context_data, confidence_score, created_at')
        .gte('created_at', new Date(Date.now() - (filters?.timeframe || 30) * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Process data to create analytics
      const misconceptionCounts: Record<string, number> = {};
      const categories: Record<string, number> = {};

      data?.forEach(item => {
        const context = item.context_data as any;
        if (context?.misconceptionCategory) {
          categories[context.misconceptionCategory] = (categories[context.misconceptionCategory] || 0) + 1;
        }
        if (context?.misconceptionSubtype) {
          misconceptionCounts[context.misconceptionSubtype] = (misconceptionCounts[context.misconceptionSubtype] || 0) + 1;
        }
      });

      return {
        totalMisconceptions: data?.length || 0,
        misconceptionCounts,
        categories,
        timeframe: filters?.timeframe || 30
      };
    } catch (error) {
      console.error('❌ Error in getMisconceptionAnalytics:', error);
      throw error;
    }
  }
}
