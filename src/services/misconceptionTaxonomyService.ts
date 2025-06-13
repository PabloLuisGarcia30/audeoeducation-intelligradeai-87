
import { supabase } from "@/integrations/supabase/client";

export interface MisconceptionCategory {
  id: string;
  category_name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface MisconceptionSubtype {
  id: string;
  category_id: string;
  subtype_name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Extended type for subtypes with category information
export interface MisconceptionSubtypeWithCategory extends MisconceptionSubtype {
  category: {
    id: string;
    category_name: string;
    description: string;
  };
}

export interface StudentMisconception {
  id: string;
  student_id: string;
  question_id?: string;
  skill_id?: string;
  exam_id?: string;
  misconception_subtype_id: string;
  confidence_score: number;
  detected_at: string;
  corrected: boolean;
  retry_count: number;
  feedback_given: boolean;
  context_data: any;
  created_at: string;
  updated_at: string;
}

export interface MisconceptionFeedbackSession {
  id: string;
  student_misconception_id: string;
  feedback_type: string;
  success: boolean;
  notes?: string;
  intervention_data: any;
  created_at: string;
}

export interface MisconceptionPersistenceLog {
  id: string;
  student_id: string;
  misconception_subtype_id: string;
  first_detected_at: string;
  last_detected_at: string;
  total_occurrences: number;
  resolved: boolean;
  resolution_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AffectiveResponseFlag {
  id: string;
  student_id: string;
  question_id?: string;
  exam_id?: string;
  flag_type: string;
  intensity_score: number;
  detected_at: string;
  notes?: string;
  behavioral_data: any;
}

export interface MisconceptionAnalysisResult {
  subtypeId: string;
  subtypeName: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  remediationSuggestions: string[];
  isNewSubtype?: boolean; // NEW: Flag for auto-created subtypes
}

export interface NewMisconceptionCandidate {
  subtypeName: string;
  categoryName: string;
  description: string;
  confidence: number;
  reasoning: string;
  contextEvidence: string;
  needsReview: boolean;
}

export class MisconceptionTaxonomyService {
  private static readonly AUTO_CREATE_CONFIDENCE_THRESHOLD = 0.75;
  private static readonly REVIEW_QUEUE_THRESHOLD = 0.65;

  /**
   * Enhanced misconception analysis with auto-creation capability
   */
  static async analyzeMisconception(
    studentAnswer: string,
    correctAnswer: string,
    questionContext: string,
    subject: string = 'General',
    questionType: string = 'short-answer'
  ): Promise<MisconceptionAnalysisResult | null> {
    try {
      console.log('🧠 Analyzing misconception with auto-creation capability');

      const { data, error } = await supabase.functions.invoke('detect-misconception-with-taxonomy', {
        body: {
          studentAnswer,
          correctAnswer,
          questionContext,
          subject,
          questionType,
          autoCreateEnabled: true, // NEW: Enable auto-creation
          confidenceThreshold: this.AUTO_CREATE_CONFIDENCE_THRESHOLD
        }
      });

      if (error) {
        console.error('❌ Error in misconception analysis:', error);
        return null;
      }

      // Handle auto-created misconceptions
      if (data.isNewSubtype) {
        console.log(`🆕 Auto-created new misconception subtype: ${data.subtypeName} in category: ${data.categoryName}`);
        
        // Log the auto-creation for monitoring
        await this.logAutoCreation(data);
      }

      return {
        subtypeId: data.subtypeId,
        subtypeName: data.subtypeName,
        categoryName: data.categoryName,
        confidence: data.confidence,
        reasoning: data.reasoning,
        remediationSuggestions: data.remediationSuggestions || [],
        isNewSubtype: data.isNewSubtype
      };
    } catch (error) {
      console.error('❌ Exception in analyzeMisconception:', error);
      return null;
    }
  }

  /**
   * Auto-create a new misconception subtype if it meets criteria
   */
  static async autoCreateMisconceptionSubtype(
    candidate: NewMisconceptionCandidate
  ): Promise<{ success: boolean; subtypeId?: string; needsReview?: boolean }> {
    try {
      // Check if confidence meets auto-creation threshold
      if (candidate.confidence < this.AUTO_CREATE_CONFIDENCE_THRESHOLD) {
        if (candidate.confidence >= this.REVIEW_QUEUE_THRESHOLD) {
          // Add to review queue instead
          await this.addToReviewQueue(candidate);
          return { success: false, needsReview: true };
        }
        return { success: false };
      }

      // Find or create the category
      const categoryId = await this.findOrCreateCategory(candidate.categoryName);
      if (!categoryId) {
        console.error('❌ Failed to find or create category:', candidate.categoryName);
        return { success: false };
      }

      // Check if subtype already exists
      const existingSubtype = await this.findSimilarSubtype(candidate.subtypeName, categoryId);
      if (existingSubtype) {
        console.log(`✅ Using existing similar subtype: ${existingSubtype.subtype_name}`);
        return { success: true, subtypeId: existingSubtype.id };
      }

      // Create new subtype
      const { data: newSubtype, error } = await supabase
        .from('misconception_subtypes')
        .insert({
          subtype_name: candidate.subtypeName,
          description: candidate.description,
          category_id: categoryId
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating new misconception subtype:', error);
        return { success: false };
      }

      console.log(`🆕 Successfully auto-created misconception subtype: ${candidate.subtypeName}`);
      return { success: true, subtypeId: newSubtype.id };
    } catch (error) {
      console.error('❌ Exception in autoCreateMisconceptionSubtype:', error);
      return { success: false };
    }
  }

  /**
   * Find or create a misconception category
   */
  private static async findOrCreateCategory(categoryName: string): Promise<string | null> {
    try {
      // Try to find existing category
      const { data: existingCategory } = await supabase
        .from('misconception_categories')
        .select('id')
        .ilike('category_name', categoryName)
        .single();

      if (existingCategory) {
        return existingCategory.id;
      }

      // Create new category
      const { data: newCategory, error } = await supabase
        .from('misconception_categories')
        .insert({
          category_name: categoryName,
          description: `Auto-created category for ${categoryName} misconceptions`
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating category:', error);
        return null;
      }

      console.log(`🆕 Auto-created category: ${categoryName}`);
      return newCategory.id;
    } catch (error) {
      console.error('❌ Exception in findOrCreateCategory:', error);
      return null;
    }
  }

  /**
   * Find similar existing subtype to avoid duplicates
   */
  private static async findSimilarSubtype(subtypeName: string, categoryId: string): Promise<MisconceptionSubtypeWithCategory | null> {
    try {
      const { data } = await supabase
        .from('misconception_subtypes')
        .select(`
          id,
          subtype_name,
          description,
          category_id,
          created_at,
          updated_at,
          misconception_categories!inner(
            id,
            category_name,
            description
          )
        `)
        .eq('category_id', categoryId);

      if (!data) return null;

      // Simple similarity check - could be enhanced with more sophisticated matching
      const normalizedInput = subtypeName.toLowerCase().trim();
      for (const subtype of data) {
        const normalizedExisting = subtype.subtype_name.toLowerCase().trim();
        
        // Check for exact match or high similarity
        if (normalizedExisting === normalizedInput || 
            this.calculateSimilarity(normalizedInput, normalizedExisting) > 0.8) {
          return {
            id: subtype.id,
            subtype_name: subtype.subtype_name,
            description: subtype.description,
            category_id: subtype.category_id,
            created_at: subtype.created_at,
            updated_at: subtype.updated_at,
            category: {
              id: subtype.misconception_categories.id,
              category_name: subtype.misconception_categories.category_name,
              description: subtype.misconception_categories.description
            }
          };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Exception in findSimilarSubtype:', error);
      return null;
    }
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word)).length;
    const totalUniqueWords = new Set([...words1, ...words2]).size;
    
    return commonWords / totalUniqueWords;
  }

  /**
   * Add candidate to review queue for manual approval
   */
  private static async addToReviewQueue(candidate: NewMisconceptionCandidate): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('execute-sql', {
        body: {
          sql: `
            INSERT INTO misconception_review_queue (
              subtype_name, category_name, description, confidence, 
              reasoning, context_evidence, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_review')
          `,
          params: [
            candidate.subtypeName,
            candidate.categoryName,
            candidate.description,
            candidate.confidence,
            candidate.reasoning,
            candidate.contextEvidence
          ]
        }
      });

      if (error) {
        console.error('❌ Error adding to review queue:', error);
        return;
      }

      console.log(`📋 Added misconception to review queue: ${candidate.subtypeName}`);
    } catch (error) {
      console.error('❌ Error adding to review queue:', error);
    }
  }

  /**
   * Log auto-creation event for monitoring
   */
  private static async logAutoCreation(data: any): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('execute-sql', {
        body: {
          sql: `
            INSERT INTO misconception_auto_creation_log (
              subtype_id, subtype_name, category_name, confidence, 
              reasoning, auto_created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
          params: [
            data.subtypeId,
            data.subtypeName,
            data.categoryName,
            data.confidence,
            data.reasoning,
            new Date().toISOString()
          ]
        }
      });

      if (error) {
        console.error('❌ Error logging auto-creation:', error);
      }
    } catch (error) {
      console.error('❌ Error logging auto-creation:', error);
    }
  }

  // Get all misconception categories
  static async getCategories(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('misconception_categories')
        .select(`
          id,
          category_name,
          description,
          misconception_subtypes(
            id,
            subtype_name,
            description
          )
        `)
        .order('category_name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getCategories:', error);
      return [];
    }
  }

  // Get subtypes for a specific category
  static async getSubtypesByCategory(categoryId: string): Promise<MisconceptionSubtype[]> {
    const { data, error } = await supabase
      .from('misconception_subtypes')
      .select('*')
      .eq('category_id', categoryId)
      .order('subtype_name');

    if (error) {
      console.error('Error fetching misconception subtypes:', error);
      throw error;
    }

    return data || [];
  }

  // Get all subtypes with category information
  static async getAllSubtypesWithCategories(): Promise<MisconceptionSubtypeWithCategory[]> {
    try {
      const { data, error } = await supabase
        .from('misconception_subtypes')
        .select(`
          id,
          subtype_name,
          description,
          category_id,
          created_at,
          updated_at,
          misconception_categories!inner(
            id,
            category_name,
            description
          )
        `)
        .order('subtype_name');

      if (error) {
        console.error('Error fetching subtypes:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        subtype_name: item.subtype_name,
        description: item.description,
        category_id: item.category_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        category: {
          id: item.misconception_categories.id,
          category_name: item.misconception_categories.category_name,
          description: item.misconception_categories.description
        }
      }));
    } catch (error) {
      console.error('Exception in getAllSubtypesWithCategories:', error);
      return [];
    }
  }

  // Record a misconception
  static async recordMisconception(
    studentId: string,
    subtypeId: string,
    confidence: number,
    contextData: any,
    questionId?: string,
    skillId?: string,
    examId?: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('student_misconceptions')
        .insert({
          student_id: studentId,
          misconception_subtype_id: subtypeId,
          confidence_score: confidence,
          context_data: contextData,
          question_id: questionId,
          skill_id: skillId,
          exam_id: examId,
          detected_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording misconception:', error);
        return null;
      }

      // Update persistence tracking
      await supabase.rpc('update_misconception_persistence', {
        p_student_id: studentId,
        p_subtype_id: subtypeId
      });

      return data;
    } catch (error) {
      console.error('Exception in recordMisconception:', error);
      return null;
    }
  }

  // Record feedback session
  static async recordFeedbackSession(
    misconceptionId: string,
    feedbackType: string,
    success: boolean,
    notes?: string,
    interventionData?: any
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('misconception_feedback_sessions')
        .insert({
          student_misconception_id: misconceptionId,
          feedback_type: feedbackType,
          success,
          notes,
          intervention_data: interventionData
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording feedback session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in recordFeedbackSession:', error);
      return null;
    }
  }

  // Get student's misconception history
  static async getStudentMisconceptions(studentId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('student_misconceptions')
        .select(`
          id,
          confidence_score,
          context_data,
          detected_at,
          corrected,
          misconception_subtypes!inner(
            id,
            subtype_name,
            description,
            misconception_categories!inner(
              category_name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching student misconceptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getStudentMisconceptions:', error);
      return [];
    }
  }

  // Get student's persistence logs
  static async getStudentPersistenceLogs(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('misconception_persistence_logs')
        .select(`
          id,
          first_detected_at,
          last_detected_at,
          total_occurrences,
          resolved,
          resolution_date,
          misconception_subtypes!inner(
            subtype_name,
            misconception_categories!inner(
              category_name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('last_detected_at', { ascending: false });

      if (error) {
        console.error('Error fetching persistence logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getStudentPersistenceLogs:', error);
      return [];
    }
  }

  // Record affective response flag
  static async recordAffectiveFlag(
    studentId: string,
    flagType: string,
    intensityScore: number,
    behavioralData: any = {},
    questionId?: string,
    examId?: string,
    notes?: string
  ): Promise<AffectiveResponseFlag | null> {
    const { data, error } = await supabase
      .from('affective_response_flags')
      .insert({
        student_id: studentId,
        flag_type: flagType,
        intensity_score: intensityScore,
        behavioral_data: behavioralData,
        question_id: questionId,
        exam_id: examId,
        notes: notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording affective flag:', error);
      return null;
    }

    return data;
  }

  /**
   * NEW: Get auto-creation statistics for dashboard (using safe queries)
   */
  static async getAutoCreationStats(days: number = 30): Promise<{
    total_auto_created: number;
    pending_review: number;
    auto_creation_rate: number;
    confidence_distribution: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get auto-creation stats using the function
      const { data: statsData, error } = await supabase.functions.invoke('execute-sql', {
        body: {
          sql: `
            SELECT 
              (SELECT COUNT(*) FROM misconception_auto_creation_log WHERE auto_created_at >= $1) as total_auto_created,
              (SELECT COUNT(*) FROM misconception_review_queue WHERE status = 'pending_review') as pending_review,
              (SELECT COUNT(*) FROM student_misconceptions WHERE detected_at >= $1) as total_detections
          `,
          params: [startDate.toISOString()]
        }
      });

      if (error) {
        console.error('❌ Error getting auto-creation stats:', error);
        return {
          total_auto_created: 0,
          pending_review: 0,
          auto_creation_rate: 0,
          confidence_distribution: {}
        };
      }

      const stats = statsData?.data?.[0] || { total_auto_created: 0, pending_review: 0, total_detections: 0 };
      const autoCreationRate = stats.total_detections > 0 ? (stats.total_auto_created / stats.total_detections) * 100 : 0;

      return {
        total_auto_created: stats.total_auto_created,
        pending_review: stats.pending_review,
        auto_creation_rate: autoCreationRate,
        confidence_distribution: {
          'High (0.8-1.0)': 0,
          'Medium (0.6-0.8)': 0,
          'Low (0.0-0.6)': 0
        }
      };
    } catch (error) {
      console.error('❌ Exception in getAutoCreationStats:', error);
      return {
        total_auto_created: 0,
        pending_review: 0,
        auto_creation_rate: 0,
        confidence_distribution: {}
      };
    }
  }
}
