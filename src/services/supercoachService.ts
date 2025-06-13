
import { supabase } from "@/integrations/supabase/client";

export interface BehaviorSignals {
  timeSpentSeconds: number;
  answerChanges: number;
  hesitationPatterns: {
    longPauses: number;
    rapidChanges: number;
    backtracking: boolean;
  };
  questionDifficulty: 'easy' | 'medium' | 'hard';
  studentHistoricalPerformance: number;
}

export interface PredictiveMisconceptionResult {
  predicted: boolean;
  misconceptionSubtypeId?: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  suggestedIntervention?: string;
}

export interface MiniLesson {
  id: string;
  content: string;
  difficultyLevel: string;
  generatedAt: string;
  effectivenessScore?: number;
}

export interface StudentLearningProfile {
  preferredExplanationStyle: 'visual' | 'textual' | 'step-by-step' | 'conceptual';
  difficultyPreference: 'simplified' | 'standard' | 'advanced';
  learningPace: 'slow' | 'normal' | 'fast';
  commonMisconceptionPatterns: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface ContentOptions {
  explanationStyle?: 'visual' | 'textual' | 'step-by-step' | 'conceptual';
  difficultyLevel?: 'simplified' | 'standard' | 'advanced';
  includeExamples?: boolean;
  includePracticeProblems?: boolean;
  customPrompt?: string;
}

export class SupercoachService {
  /**
   * Backend automatic predictive detection during question attempts
   */
  static async detectPredictiveMisconception(
    studentId: string,
    questionId: string,
    behaviorSignals: BehaviorSignals,
    questionContext: any,
    exerciseId?: string,
    examId?: string
  ): Promise<PredictiveMisconceptionResult | null> {
    try {
      console.log('🔮 Running predictive misconception detection');

      const { data, error } = await supabase.functions.invoke('predict-misconception', {
        body: {
          studentId,
          questionId,
          behaviorSignals,
          questionContext,
          exerciseId,
          examId
        }
      });

      if (error) {
        console.error('❌ Error in predictive misconception detection:', error);
        return null;
      }

      // If high risk prediction, log alert for teachers
      if (data.predicted && data.riskLevel === 'high') {
        await this.logPredictiveAlert(studentId, questionId, data, behaviorSignals, exerciseId, examId);
      }

      return data;
    } catch (error) {
      console.error('❌ Exception in predictive misconception detection:', error);
      return null;
    }
  }

  /**
   * Log predictive misconception alert for teacher dashboard
   */
  private static async logPredictiveAlert(
    studentId: string,
    questionId: string,
    prediction: any,
    behaviorSignals: BehaviorSignals,
    exerciseId?: string,
    examId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('predictive_misconception_alerts')
        .insert({
          student_id: studentId,
          question_id: questionId,
          exercise_id: exerciseId,
          exam_id: examId,
          predicted_misconception_subtype_id: prediction.misconceptionSubtypeId,
          confidence_score: prediction.confidence,
          risk_level: prediction.riskLevel,
          behavioral_signals: {
            time_spent: behaviorSignals.timeSpentSeconds,
            answer_changes: behaviorSignals.answerChanges,
            hesitation_patterns: behaviorSignals.hesitationPatterns,
            question_difficulty: behaviorSignals.questionDifficulty
          }
        });

      if (error) {
        console.error('❌ Error logging predictive alert:', error);
      } else {
        console.log('🚨 Logged high-risk predictive misconception alert');
      }
    } catch (error) {
      console.error('❌ Exception logging predictive alert:', error);
    }
  }

  /**
   * User-triggered adaptive mini-lesson generation
   */
  static async generateAdaptiveMiniLesson(
    studentId: string,
    misconceptionSubtypeId: string,
    learningProfile: StudentLearningProfile,
    requestContext?: any
  ): Promise<MiniLesson | null> {
    try {
      console.log('📚 Generating adaptive mini-lesson for student');

      // First, create a request record
      const { data: requestData, error: requestError } = await supabase
        .from('mini_lesson_requests')
        .insert({
          student_id: studentId,
          misconception_subtype_id: misconceptionSubtypeId,
          request_context: requestContext || {},
          status: 'processing'
        })
        .select()
        .single();

      if (requestError) {
        console.error('❌ Error creating mini-lesson request:', requestError);
        return null;
      }

      // Generate the mini-lesson content
      const { data, error } = await supabase.functions.invoke('generate-adaptive-mini-lesson', {
        body: {
          studentId,
          misconceptionSubtypeId,
          learningProfile,
          requestContext,
          requestId: requestData.id
        }
      });

      if (error) {
        console.error('❌ Error generating adaptive mini-lesson:', error);
        
        // Update request status to failed
        await supabase
          .from('mini_lesson_requests')
          .update({ status: 'failed', error_message: error.message })
          .eq('id', requestData.id);
          
        return null;
      }

      // Update request status to completed
      await supabase
        .from('mini_lesson_requests')
        .update({ 
          status: 'completed', 
          mini_lesson_id: data.miniLessonId 
        })
        .eq('id', requestData.id);

      return data;
    } catch (error) {
      console.error('❌ Exception in adaptive mini-lesson generation:', error);
      return null;
    }
  }

  /**
   * Optional AI content generation (teacher/student triggered)
   */
  static async generateAIMiniLesson(
    misconceptionSubtypeId: string,
    requestedBy: 'teacher' | 'student',
    studentId?: string,
    customizationOptions?: ContentOptions
  ): Promise<any | null> {
    try {
      console.log(`🤖 Generating AI mini-lesson requested by ${requestedBy}`);

      const { data, error } = await supabase.functions.invoke('generate-ai-mini-lesson', {
        body: {
          misconceptionSubtypeId,
          requestedBy,
          studentId,
          customizationOptions: customizationOptions || {}
        }
      });

      if (error) {
        console.error('❌ Error generating AI mini-lesson:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Exception in AI mini-lesson generation:', error);
      return null;
    }
  }

  /**
   * Get student's mini-lessons
   */
  static async getStudentMiniLessons(studentId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('mini_lessons')
        .select(`
          id,
          lesson_content,
          difficulty_level,
          generated_at,
          triggered_by,
          effectiveness_score,
          viewed_count,
          last_viewed_at,
          misconception_subtypes!inner(
            subtype_name,
            misconception_categories!inner(
              category_name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('generated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching student mini-lessons:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching student mini-lessons:', error);
      return [];
    }
  }

  /**
   * Get predictive alerts for teachers
   */
  static async getPredictiveAlerts(resolved: boolean = false, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('predictive_misconception_alerts')
        .select(`
          id,
          student_id,
          question_id,
          exercise_id,
          exam_id,
          confidence_score,
          risk_level,
          behavioral_signals,
          resolved,
          resolution_type,
          created_at,
          misconception_subtypes!inner(
            subtype_name,
            misconception_categories!inner(
              category_name
            )
          )
        `)
        .eq('resolved', resolved)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching predictive alerts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching predictive alerts:', error);
      return [];
    }
  }

  /**
   * Mark mini-lesson as viewed (for effectiveness tracking)
   */
  static async markMiniLessonViewed(miniLessonId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('mini_lessons')
        .update({
          viewed_count: supabase.sql`viewed_count + 1`,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', miniLessonId);

      if (error) {
        console.error('❌ Error marking mini-lesson as viewed:', error);
      }
    } catch (error) {
      console.error('❌ Exception marking mini-lesson as viewed:', error);
    }
  }

  /**
   * Resolve predictive alert
   */
  static async resolvePredictiveAlert(
    alertId: string,
    resolutionType: 'false_positive' | 'mini_lesson_helped' | 'student_self_corrected' | 'teacher_intervention'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('predictive_misconception_alerts')
        .update({
          resolved: true,
          resolution_type: resolutionType,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('❌ Error resolving predictive alert:', error);
      }
    } catch (error) {
      console.error('❌ Exception resolving predictive alert:', error);
    }
  }
}
