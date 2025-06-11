
import { supabase } from '@/integrations/supabase/client';

export interface MistakePatternData {
  id: string;
  student_exercise_id: string;
  question_id: string;
  question_number: number;
  question_type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  mistake_type?: string;
  skill_targeted: string;
  confidence_score?: number;
  grading_method?: 'exact_match' | 'flexible_match' | 'ai_graded';
  feedback_given?: string;
  created_at: string;
}

export interface MistakePattern {
  skill_name: string;
  mistake_type: string;
  mistake_count: number;
  total_questions: number;
  mistake_rate: number;
}

export class MistakePatternService {
  
  /**
   * Record a mistake pattern for a question
   */
  static async recordMistakePattern(mistakeData: {
    studentExerciseId: string;
    questionId: string;
    questionNumber: number;
    questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    skillTargeted: string;
    mistakeType?: string;
    confidenceScore?: number;
    gradingMethod?: 'exact_match' | 'flexible_match' | 'ai_graded';
    feedbackGiven?: string;
  }): Promise<string | null> {
    try {
      console.log(`🔍 Recording mistake pattern for question ${mistakeData.questionNumber}`);
      
      const { data, error } = await supabase
        .from('mistake_patterns')
        .insert({
          student_exercise_id: mistakeData.studentExerciseId,
          question_id: mistakeData.questionId,
          question_number: mistakeData.questionNumber,
          question_type: mistakeData.questionType,
          student_answer: mistakeData.studentAnswer,
          correct_answer: mistakeData.correctAnswer,
          is_correct: mistakeData.isCorrect,
          mistake_type: mistakeData.mistakeType,
          skill_targeted: mistakeData.skillTargeted,
          confidence_score: mistakeData.confidenceScore,
          grading_method: mistakeData.gradingMethod,
          feedback_given: mistakeData.feedbackGiven
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error recording mistake pattern:', error);
        return null;
      }

      console.log(`✅ Mistake pattern recorded: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Exception in recordMistakePattern:', error);
      return null;
    }
  }

  /**
   * Analyze mistake type based on question type and answers
   */
  static analyzeMistakeType(
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    options?: string[]
  ): string {
    if (!studentAnswer || studentAnswer.trim() === '') {
      return 'no_answer';
    }

    switch (questionType) {
      case 'multiple-choice':
        if (options && options.includes(studentAnswer)) {
          return 'wrong_option_selected';
        }
        return 'invalid_selection';
      
      case 'true-false':
        return 'opposite_chosen';
      
      case 'short-answer':
        const studentLower = studentAnswer.toLowerCase().trim();
        const correctLower = correctAnswer.toLowerCase().trim();
        
        if (studentLower.length < correctLower.length * 0.5) {
          return 'incomplete_answer';
        } else if (studentLower.includes(correctLower.substring(0, 3))) {
          return 'partial_understanding';
        } else {
          return 'conceptual_error';
        }
      
      case 'essay':
        if (studentAnswer.length < 50) {
          return 'insufficient_detail';
        } else if (studentAnswer.length < correctAnswer.length * 0.7) {
          return 'incomplete_response';
        } else {
          return 'conceptual_misunderstanding';
        }
      
      default:
        return 'unknown_error';
    }
  }

  /**
   * Get mistake patterns for a student
   */
  static async getStudentMistakePatterns(
    studentId: string, 
    skillFilter?: string
  ): Promise<MistakePattern[]> {
    try {
      console.log(`📊 Fetching mistake patterns for student: ${studentId}`);
      
      const { data, error } = await supabase.rpc('get_student_mistake_patterns', {
        student_uuid: studentId,
        skill_filter: skillFilter || null
      });

      if (error) {
        console.error('❌ Error fetching mistake patterns:', error);
        return [];
      }

      console.log(`✅ Retrieved ${data?.length || 0} mistake patterns`);
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getStudentMistakePatterns:', error);
      return [];
    }
  }

  /**
   * Get detailed mistake data for an exercise
   */
  static async getExerciseMistakeData(studentExerciseId: string): Promise<MistakePatternData[]> {
    try {
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select('*')
        .eq('student_exercise_id', studentExerciseId)
        .order('question_number');

      if (error) {
        console.error('❌ Error fetching exercise mistake data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception in getExerciseMistakeData:', error);
      return [];
    }
  }

  /**
   * Get most common mistakes across all students for a skill
   */
  static async getSkillMistakePatterns(skillName: string): Promise<{
    mistake_type: string;
    count: number;
    percentage: number;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select('mistake_type')
        .eq('skill_targeted', skillName)
        .eq('is_correct', false);

      if (error) {
        console.error('❌ Error fetching skill mistake patterns:', error);
        return [];
      }

      // Count occurrences of each mistake type
      const mistakeCounts: Record<string, number> = {};
      const total = data.length;

      data.forEach(record => {
        const mistakeType = record.mistake_type || 'unknown';
        mistakeCounts[mistakeType] = (mistakeCounts[mistakeType] || 0) + 1;
      });

      // Convert to array and calculate percentages
      return Object.entries(mistakeCounts)
        .map(([mistake_type, count]) => ({
          mistake_type,
          count,
          percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Exception in getSkillMistakePatterns:', error);
      return [];
    }
  }
}
