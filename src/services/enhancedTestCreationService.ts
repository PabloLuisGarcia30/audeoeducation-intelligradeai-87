
import { supabase } from '@/integrations/supabase/client';
import type { Question } from '../utils/pdfGenerator';

export interface EnhancedTestCreationOptions {
  includeMisconceptions?: boolean;
  subject?: string;
  grade?: string;
  difficulty?: string;
  skillName?: string;
}

export class EnhancedTestCreationService {
  /**
   * Generate AI-powered questions with misconception annotations
   */
  static async generateEnhancedQuestions(
    examId: string,
    questionCount: number,
    options: EnhancedTestCreationOptions
  ): Promise<Question[]> {
    try {
      console.log('🎯 Generating enhanced questions with misconception support');

      const response = await supabase.functions.invoke('generate-student-practice-exercise', {
        body: {
          skillName: options.skillName || 'General Knowledge',
          className: 'Test Creation',
          subject: options.subject || 'Math',
          grade: options.grade || 'Grade 10',
          questionCount,
          difficulty: options.difficulty || 'medium',
          includeMisconceptions: options.includeMisconceptions !== false // Default to true
        }
      });

      if (response.error) {
        throw new Error(`Failed to generate questions: ${response.error.message}`);
      }

      const exerciseData = response.data;
      
      if (!exerciseData?.questions) {
        throw new Error('No questions generated');
      }

      // Convert the generated questions to the Test Creator format
      const enhancedQuestions: Question[] = exerciseData.questions.map((q: any, index: number) => ({
        id: q.id || `question-${index + 1}`,
        type: q.type as Question['type'],
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
        explanation: q.explanation,
        choiceMisconceptions: q.choiceMisconceptions || {}
      }));

      console.log(`✅ Generated ${enhancedQuestions.length} enhanced questions with misconception annotations`);
      return enhancedQuestions;

    } catch (error) {
      console.error('❌ Error generating enhanced questions:', error);
      throw error;
    }
  }

  /**
   * Save test with misconception annotations to the database
   */
  static async saveEnhancedTest(
    examId: string,
    questions: Question[],
    metadata: {
      title: string;
      description?: string;
      classId?: string;
      className?: string;
      subject?: string;
      grade?: string;
    }
  ): Promise<void> {
    try {
      console.log('💾 Saving enhanced test with misconception data');

      // Save the exam metadata
      const { error: examError } = await supabase
        .from('exams')
        .insert({
          exam_id: examId,
          title: metadata.title,
          description: metadata.description,
          class_id: metadata.classId,
          class_name: metadata.className,
          total_points: questions.reduce((sum, q) => sum + q.points, 0)
        });

      if (examError) {
        console.error('Error saving exam:', examError);
        throw examError;
      }

      // Save answer keys with misconception data
      const answerKeyPromises = questions.map(async (question, index) => {
        const answerKeyData = {
          exam_id: examId,
          question_number: index + 1,
          question_text: question.question,
          question_type: question.type,
          correct_answer: question.correctAnswer,
          explanation: question.explanation,
          points: question.points,
          options: question.options || [],
          choice_misconceptions: (question as any).choiceMisconceptions || {}
        };

        const { error } = await supabase
          .from('answer_keys')
          .insert(answerKeyData);

        if (error) {
          console.error(`Error saving answer key for question ${index + 1}:`, error);
          throw error;
        }
      });

      await Promise.all(answerKeyPromises);

      console.log('✅ Enhanced test saved successfully with misconception annotations');

    } catch (error) {
      console.error('❌ Error saving enhanced test:', error);
      throw error;
    }
  }

  /**
   * Get misconception statistics for a specific test
   */
  static async getTestMisconceptionStats(examId: string): Promise<any> {
    try {
      const { data: answerKeys, error } = await supabase
        .from('answer_keys')
        .select('choice_misconceptions, question_type')
        .eq('exam_id', examId);

      if (error) throw error;

      const stats = {
        totalQuestions: answerKeys?.length || 0,
        questionsWithMisconceptions: 0,
        misconceptionCategories: {} as Record<string, number>,
        questionTypes: {} as Record<string, number>
      };

      answerKeys?.forEach(key => {
        if (key.choice_misconceptions && Object.keys(key.choice_misconceptions).length > 0) {
          stats.questionsWithMisconceptions++;
          
          // Count misconception categories
          Object.values(key.choice_misconceptions as any).forEach((choice: any) => {
            if (choice.misconceptionCategory) {
              stats.misconceptionCategories[choice.misconceptionCategory] = 
                (stats.misconceptionCategories[choice.misconceptionCategory] || 0) + 1;
            }
          });
        }

        // Count question types
        stats.questionTypes[key.question_type] = (stats.questionTypes[key.question_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting test misconception stats:', error);
      throw error;
    }
  }
}
