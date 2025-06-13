
import { supabase } from "@/integrations/supabase/client";
import { UnifiedStudentResultsService } from "./unifiedStudentResultsService";

export class UnifiedDataMigrationService {
  /**
   * Migrate existing practice exercise data to unified results
   */
  static async migratePracticeExerciseData(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    try {
      console.log('🔄 Starting migration of practice exercise data to unified results...');

      // Get all content skill scores with authenticated student IDs
      const { data: contentSkills, error: contentError } = await supabase
        .from('content_skill_scores')
        .select(`
          *,
          test_results!inner(authenticated_student_id, class_id, created_at)
        `)
        .not('test_results.authenticated_student_id', 'is', null);

      if (contentError) {
        throw new Error(`Failed to fetch content skills: ${contentError.message}`);
      }

      // Get all subject skill scores with authenticated student IDs
      const { data: subjectSkills, error: subjectError } = await supabase
        .from('subject_skill_scores')
        .select(`
          *,
          test_results!inner(authenticated_student_id, class_id, created_at)
        `)
        .not('test_results.authenticated_student_id', 'is', null);

      if (subjectError) {
        throw new Error(`Failed to fetch subject skills: ${subjectError.message}`);
      }

      const allSkills = [
        ...(contentSkills || []).map(skill => ({ ...skill, skill_type: 'content' as const })),
        ...(subjectSkills || []).map(skill => ({ ...skill, skill_type: 'subject' as const }))
      ];

      console.log(`📊 Found ${allSkills.length} skill records to migrate`);

      const unifiedResults = allSkills.map(skill => ({
        student_id: skill.test_results.authenticated_student_id,
        session_type: skill.practice_exercise_id ? 'home_learner' as const : 'practice' as const,
        session_id: skill.practice_exercise_id || skill.test_result_id,
        skill_name: skill.skill_name,
        skill_type: skill.skill_type,
        score: skill.score,
        points_earned: skill.points_earned,
        points_possible: skill.points_possible,
        exercise_data: {
          migrated_from: skill.skill_type === 'content' ? 'content_skill_scores' : 'subject_skill_scores',
          original_id: skill.id,
          test_result_id: skill.test_result_id,
          practice_exercise_id: skill.practice_exercise_id
        },
        created_at: skill.test_results.created_at
      }));

      // Batch insert into unified results
      if (unifiedResults.length > 0) {
        const { error: insertError } = await supabase
          .from('unified_student_results')
          .insert(unifiedResults);

        if (insertError) {
          throw new Error(`Failed to insert unified results: ${insertError.message}`);
        }
      }

      console.log(`✅ Successfully migrated ${unifiedResults.length} skill records to unified results`);

      return {
        success: true,
        migratedCount: unifiedResults.length
      };
    } catch (error) {
      console.error('❌ Error migrating practice exercise data:', error);
      return {
        success: false,
        migratedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Migrate existing misconception data to unified misconceptions
   */
  static async migrateMisconceptionData(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    try {
      console.log('🔄 Starting migration of misconception data to unified misconceptions...');

      // Get all student misconceptions with related data
      const { data: misconceptions, error: misconceptionError } = await supabase
        .from('student_misconceptions')
        .select(`
          *,
          misconception_subtypes!inner(
            subtype_name,
            misconception_categories!inner(category_name)
          )
        `);

      if (misconceptionError) {
        throw new Error(`Failed to fetch misconceptions: ${misconceptionError.message}`);
      }

      console.log(`📊 Found ${misconceptions?.length || 0} misconception records to migrate`);

      if (!misconceptions || misconceptions.length === 0) {
        return { success: true, migratedCount: 0 };
      }

      const unifiedMisconceptions = misconceptions.map(misconception => ({
        student_id: misconception.student_id,
        session_type: 'practice' as const, // Default to practice for existing data
        session_id: misconception.exam_id,
        skill_name: 'Unknown Skill', // We don't have skill mapping in old data
        misconception_type: misconception.misconception_subtypes.subtype_name,
        misconception_category: misconception.misconception_subtypes.misconception_categories.category_name,
        severity: 'medium' as const, // Default severity
        confidence_score: misconception.confidence_score,
        question_id: misconception.question_id,
        context_data: misconception.context_data,
        resolved: misconception.corrected,
        persistence_count: misconception.retry_count + 1,
        detected_at: misconception.detected_at,
        created_at: misconception.created_at
      }));

      // Batch insert into unified misconceptions
      const { error: insertError } = await supabase
        .from('unified_student_misconceptions')
        .insert(unifiedMisconceptions);

      if (insertError) {
        throw new Error(`Failed to insert unified misconceptions: ${insertError.message}`);
      }

      console.log(`✅ Successfully migrated ${unifiedMisconceptions.length} misconception records`);

      return {
        success: true,
        migratedCount: unifiedMisconceptions.length
      };
    } catch (error) {
      console.error('❌ Error migrating misconception data:', error);
      return {
        success: false,
        migratedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Migrate exam skill mappings to include auto-creation data
   */
  static async migrateExamSkillMappings(): Promise<{
    success: boolean;
    migratedCount: number;
    error?: string;
  }> {
    try {
      console.log('🔄 Starting migration of exam skill mappings with auto-creation support...');

      // Get existing mappings that might need auto-creation flags
      const { data: mappings, error: mappingsError } = await supabase
        .from('exam_skill_mappings')
        .select('*')
        .is('auto_created_skill', null); // Only get mappings that haven't been updated yet

      if (mappingsError) {
        throw new Error(`Failed to fetch exam skill mappings: ${mappingsError.message}`);
      }

      if (!mappings || mappings.length === 0) {
        console.log('No exam skill mappings found to migrate');
        return { success: true, migratedCount: 0 };
      }

      // Update existing mappings to set auto_created_skill = false (they were created before auto-creation)
      const { error: updateError } = await supabase
        .from('exam_skill_mappings')
        .update({ auto_created_skill: false })
        .is('auto_created_skill', null);

      if (updateError) {
        throw new Error(`Failed to update exam skill mappings: ${updateError.message}`);
      }

      console.log(`✅ Successfully updated ${mappings.length} exam skill mappings with auto-creation flags`);

      return {
        success: true,
        migratedCount: mappings.length
      };
    } catch (error) {
      console.error('❌ Error migrating exam skill mappings:', error);
      return {
        success: false,
        migratedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run complete data migration including new auto-creation features
   */
  static async runCompleteMigration(): Promise<{
    success: boolean;
    totalMigrated: number;
    details: {
      skillResults: number;
      misconceptions: number;
      examMappings: number;
    };
    error?: string;
  }> {
    try {
      console.log('🚀 Starting complete data migration to unified system with auto-creation support...');

      const [skillMigration, misconceptionMigration, mappingMigration] = await Promise.all([
        this.migratePracticeExerciseData(),
        this.migrateMisconceptionData(),
        this.migrateExamSkillMappings()
      ]);

      const totalMigrated = skillMigration.migratedCount + misconceptionMigration.migratedCount + mappingMigration.migratedCount;
      const success = skillMigration.success && misconceptionMigration.success && mappingMigration.success;

      if (!success) {
        const errors = [
          skillMigration.error && `Skills: ${skillMigration.error}`,
          misconceptionMigration.error && `Misconceptions: ${misconceptionMigration.error}`,
          mappingMigration.error && `Mappings: ${mappingMigration.error}`
        ].filter(Boolean);

        throw new Error(`Migration failed: ${errors.join(', ')}`);
      }

      console.log(`✅ Complete migration successful: ${totalMigrated} total records migrated`);

      return {
        success: true,
        totalMigrated,
        details: {
          skillResults: skillMigration.migratedCount,
          misconceptions: misconceptionMigration.migratedCount,
          examMappings: mappingMigration.migratedCount
        }
      };
    } catch (error) {
      console.error('❌ Complete migration failed:', error);
      return {
        success: false,
        totalMigrated: 0,
        details: {
          skillResults: 0,
          misconceptions: 0,
          examMappings: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
