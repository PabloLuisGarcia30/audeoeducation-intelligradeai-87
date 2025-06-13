
import { supabase } from "@/integrations/supabase/client";

export interface SkillAutoCreationStats {
  totalAutoCreated: number;
  totalQueuedForReview: number;
  recentCreations: Array<{
    id: string;
    skillName: string;
    skillType: 'content' | 'subject';
    confidence: number;
    examId: string;
    createdAt: string;
  }>;
}

export interface SkillReviewItem {
  id: string;
  skillName: string;
  skillType: 'content' | 'subject';
  skillDescription: string;
  topic?: string;
  subject: string;
  grade: string;
  confidence: number;
  reasoning: string;
  contextEvidence: string;
  examId: string;
  classId: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'merged';
  createdAt: string;
}

export class SkillAutoCreationService {
  /**
   * Get auto-creation statistics for monitoring
   */
  static async getAutoCreationStats(days: number = 30): Promise<SkillAutoCreationStats> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get auto-creation logs
      const { data: autoCreations, error: autoError } = await supabase
        .from('skill_auto_creation_log')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (autoError) throw autoError;

      // Get review queue stats
      const { data: reviewQueue, error: reviewError } = await supabase
        .from('skill_review_queue')
        .select('id, status')
        .gte('created_at', cutoffDate.toISOString());

      if (reviewError) throw reviewError;

      const totalQueuedForReview = reviewQueue?.filter(item => 
        item.status === 'pending_review'
      ).length || 0;

      const recentCreations = (autoCreations || []).slice(0, 10).map(creation => ({
        id: creation.id,
        skillName: creation.skill_name,
        skillType: creation.skill_type as 'content' | 'subject',
        confidence: creation.confidence,
        examId: creation.exam_id,
        createdAt: creation.created_at
      }));

      return {
        totalAutoCreated: autoCreations?.length || 0,
        totalQueuedForReview,
        recentCreations
      };

    } catch (error) {
      console.error('Error fetching auto-creation stats:', error);
      return {
        totalAutoCreated: 0,
        totalQueuedForReview: 0,
        recentCreations: []
      };
    }
  }

  /**
   * Get skills pending review
   */
  static async getSkillsForReview(limit: number = 50): Promise<SkillReviewItem[]> {
    try {
      const { data: reviewItems, error } = await supabase
        .from('skill_review_queue')
        .select('*')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (reviewItems || []).map(item => ({
        id: item.id,
        skillName: item.skill_name,
        skillType: item.skill_type as 'content' | 'subject',
        skillDescription: item.skill_description,
        topic: item.topic,
        subject: item.subject,
        grade: item.grade,
        confidence: item.confidence,
        reasoning: item.reasoning,
        contextEvidence: item.context_evidence,
        examId: item.exam_id,
        classId: item.class_id,
        status: item.status as 'pending_review' | 'approved' | 'rejected' | 'merged',
        createdAt: item.created_at
      }));

    } catch (error) {
      console.error('Error fetching skills for review:', error);
      return [];
    }
  }

  /**
   * Approve a skill from the review queue
   */
  static async approveSkill(
    reviewId: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; skillId?: string; error?: string }> {
    try {
      // Get the review item
      const { data: reviewItem, error: fetchError } = await supabase
        .from('skill_review_queue')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (fetchError || !reviewItem) {
        throw new Error('Review item not found');
      }

      // Create the skill
      const newSkillData = {
        skill_name: reviewItem.skill_name,
        skill_description: reviewItem.skill_description,
        subject: reviewItem.subject,
        grade: reviewItem.grade,
        ...(reviewItem.skill_type === 'content' && { topic: reviewItem.topic || 'Teacher Approved' })
      };

      const tableName = reviewItem.skill_type === 'content' ? 'content_skills' : 'subject_skills';
      const { data: newSkill, error: createError } = await supabase
        .from(tableName)
        .insert(newSkillData)
        .select()
        .single();

      if (createError) throw createError;

      // Link to class
      const linkTableName = reviewItem.skill_type === 'content' ? 'class_content_skills' : 'class_subject_skills';
      const linkColumnName = reviewItem.skill_type === 'content' ? 'content_skill_id' : 'subject_skill_id';
      
      await supabase
        .from(linkTableName)
        .insert({
          class_id: reviewItem.class_id,
          [linkColumnName]: newSkill.id
        });

      // Update review status
      await supabase
        .from('skill_review_queue')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
          created_skill_id: newSkill.id,
          created_skill_type: reviewItem.skill_type
        })
        .eq('id', reviewId);

      // Log the creation
      await supabase
        .from('skill_auto_creation_log')
        .insert({
          skill_id: newSkill.id,
          skill_name: reviewItem.skill_name,
          skill_type: reviewItem.skill_type,
          skill_description: reviewItem.skill_description,
          confidence: reviewItem.confidence,
          reasoning: `Teacher approved from review queue: ${reviewNotes || 'No notes provided'}`,
          exam_id: reviewItem.exam_id,
          class_id: reviewItem.class_id,
          context_data: { teacher_approved: true, review_id: reviewId }
        });

      console.log(`Approved skill: ${reviewItem.skill_name} (ID: ${newSkill.id})`);
      return { success: true, skillId: newSkill.id };

    } catch (error) {
      console.error('Error approving skill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reject a skill from the review queue
   */
  static async rejectSkill(
    reviewId: string,
    reviewNotes: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase
        .from('skill_review_queue')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', reviewId);

      console.log(`Rejected skill review: ${reviewId}`);
      return { success: true };

    } catch (error) {
      console.error('Error rejecting skill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get auto-creation logs for an exam
   */
  static async getExamAutoCreationLogs(examId: string) {
    try {
      const { data: logs, error } = await supabase
        .from('skill_auto_creation_log')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return logs || [];

    } catch (error) {
      console.error('Error fetching exam auto-creation logs:', error);
      return [];
    }
  }
}
