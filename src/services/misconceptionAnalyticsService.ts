
import { supabase } from "@/integrations/supabase/client";
import { MisconceptionTaxonomyService } from "./misconceptionTaxonomyService";

export interface MisconceptionInsight {
  categoryName: string;
  subtypeName: string;
  occurrences: number;
  averageConfidence: number;
  persistenceRate: number;
  resolutionRate: number;
  commonContexts: string[];
  remediationEffectiveness: number;
}

export interface StudentMisconceptionProfile {
  studentId: string;
  studentName: string;
  totalMisconceptions: number;
  persistentMisconceptions: number;
  resolvedMisconceptions: number;
  topMisconceptionTypes: MisconceptionInsight[];
  affectiveFlags: {
    frustrationEvents: number;
    avoidancePatterns: number;
    disengagementSignals: number;
  };
  interventionSuccess: number;
}

export interface ClassMisconceptionSummary {
  className: string;
  totalStudents: number;
  commonMisconceptions: MisconceptionInsight[];
  interventionEffectiveness: {
    [interventionType: string]: {
      totalAttempts: number;
      successRate: number;
    };
  };
  affectivePatterns: {
    [flagType: string]: number;
  };
}

export class MisconceptionAnalyticsService {
  // Get comprehensive misconception insights for a student
  static async getStudentMisconceptionProfile(studentId: string): Promise<StudentMisconceptionProfile | null> {
    try {
      // Get misconceptions with subtypes
      const misconceptions = await MisconceptionTaxonomyService.getStudentMisconceptions(studentId);
      
      // Get persistence logs
      const persistenceLogs = await MisconceptionTaxonomyService.getStudentPersistenceLogs(studentId);
      
      // Get affective flags
      const { data: affectiveFlags } = await supabase
        .from('affective_response_flags')
        .select('flag_type, intensity_score')
        .eq('student_id', studentId);

      // Get feedback sessions for intervention success calculation
      const { data: feedbackSessions } = await supabase
        .from('misconception_feedback_sessions')
        .select('success, feedback_type')
        .in('student_misconception_id', misconceptions.map(m => m.id));

      // Calculate metrics
      const totalMisconceptions = misconceptions.length;
      const persistentMisconceptions = persistenceLogs.filter(log => !log.resolved && log.total_occurrences > 2).length;
      const resolvedMisconceptions = persistenceLogs.filter(log => log.resolved).length;

      // Calculate top misconception types
      const misconceptionCounts = new Map<string, { count: number; confidence: number[]; subtype: any }>();
      
      misconceptions.forEach(m => {
        const key = `${m.subtype.category.category_name}:${m.subtype.subtype_name}`;
        if (!misconceptionCounts.has(key)) {
          misconceptionCounts.set(key, { count: 0, confidence: [], subtype: m.subtype });
        }
        const entry = misconceptionCounts.get(key)!;
        entry.count++;
        entry.confidence.push(m.confidence_score);
      });

      const topMisconceptionTypes: MisconceptionInsight[] = Array.from(misconceptionCounts.entries())
        .map(([key, data]) => {
          const [categoryName, subtypeName] = key.split(':');
          const persistenceLog = persistenceLogs.find(log => log.misconception_subtype_id === data.subtype.id);
          
          return {
            categoryName,
            subtypeName,
            occurrences: data.count,
            averageConfidence: data.confidence.reduce((a, b) => a + b, 0) / data.confidence.length,
            persistenceRate: persistenceLog ? persistenceLog.total_occurrences / data.count : 0,
            resolutionRate: persistenceLog?.resolved ? 1 : 0,
            commonContexts: [], // Would need to extract from context_data
            remediationEffectiveness: 0 // Would calculate from feedback sessions
          };
        })
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5);

      // Calculate affective metrics
      const affectiveMetrics = {
        frustrationEvents: affectiveFlags?.filter(f => f.flag_type === 'frustration_spike').length || 0,
        avoidancePatterns: affectiveFlags?.filter(f => f.flag_type === 'avoidance_patterns').length || 0,
        disengagementSignals: affectiveFlags?.filter(f => f.flag_type === 'disengagement').length || 0
      };

      // Calculate intervention success rate
      const interventionSuccess = feedbackSessions?.length ? 
        feedbackSessions.filter(fs => fs.success).length / feedbackSessions.length : 0;

      return {
        studentId,
        studentName: '', // Would need to join with student profiles
        totalMisconceptions,
        persistentMisconceptions,
        resolvedMisconceptions,
        topMisconceptionTypes,
        affectiveFlags: affectiveMetrics,
        interventionSuccess
      };
    } catch (error) {
      console.error('Error generating student misconception profile:', error);
      return null;
    }
  }

  // Get class-level misconception summary
  static async getClassMisconceptionSummary(classId: string): Promise<ClassMisconceptionSummary | null> {
    try {
      // Get students in the class
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select(`
          student_profile_id,
          student_profiles(id, student_name)
        `)
        .eq('class_id', classId)
        .eq('is_active', true);

      if (!enrollments) return null;

      const studentIds = enrollments.map(e => e.student_profile_id);

      // Get all misconceptions for class students
      const { data: misconceptions } = await supabase
        .from('student_misconceptions')
        .select(`
          *,
          subtype:misconception_subtypes(
            *,
            category:misconception_categories(*)
          )
        `)
        .in('student_id', studentIds);

      // Get feedback sessions for intervention analysis
      const { data: feedbackSessions } = await supabase
        .from('misconception_feedback_sessions')
        .select('feedback_type, success')
        .in('student_misconception_id', misconceptions?.map(m => m.id) || []);

      // Get affective flags
      const { data: affectiveFlags } = await supabase
        .from('affective_response_flags')
        .select('flag_type')
        .in('student_id', studentIds);

      // Analyze common misconceptions
      const misconceptionCounts = new Map<string, { count: number; subtypeName: string; categoryName: string }>();
      
      misconceptions?.forEach(m => {
        const key = m.misconception_subtype_id;
        if (!misconceptionCounts.has(key)) {
          misconceptionCounts.set(key, {
            count: 0,
            subtypeName: m.subtype.subtype_name,
            categoryName: m.subtype.category.category_name
          });
        }
        misconceptionCounts.get(key)!.count++;
      });

      const commonMisconceptions: MisconceptionInsight[] = Array.from(misconceptionCounts.entries())
        .map(([subtypeId, data]) => ({
          categoryName: data.categoryName,
          subtypeName: data.subtypeName,
          occurrences: data.count,
          averageConfidence: 0, // Would calculate from individual records
          persistenceRate: 0, // Would calculate from persistence logs
          resolutionRate: 0, // Would calculate from persistence logs
          commonContexts: [],
          remediationEffectiveness: 0
        }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 10);

      // Analyze intervention effectiveness
      const interventionEffectiveness: { [type: string]: { totalAttempts: number; successRate: number } } = {};
      
      if (feedbackSessions) {
        const groupedSessions = new Map<string, { total: number; successes: number }>();
        
        feedbackSessions.forEach(session => {
          if (!groupedSessions.has(session.feedback_type)) {
            groupedSessions.set(session.feedback_type, { total: 0, successes: 0 });
          }
          const group = groupedSessions.get(session.feedback_type)!;
          group.total++;
          if (session.success) group.successes++;
        });

        groupedSessions.forEach((data, type) => {
          interventionEffectiveness[type] = {
            totalAttempts: data.total,
            successRate: data.successes / data.total
          };
        });
      }

      // Analyze affective patterns
      const affectivePatterns: { [flagType: string]: number } = {};
      affectiveFlags?.forEach(flag => {
        affectivePatterns[flag.flag_type] = (affectivePatterns[flag.flag_type] || 0) + 1;
      });

      return {
        className: '', // Would need to join with class data
        totalStudents: studentIds.length,
        commonMisconceptions,
        interventionEffectiveness,
        affectivePatterns
      };
    } catch (error) {
      console.error('Error generating class misconception summary:', error);
      return null;
    }
  }

  // Get trending misconceptions across the system
  static async getTrendingMisconceptions(timeframe: 'week' | 'month' | 'semester' = 'month'): Promise<MisconceptionInsight[]> {
    try {
      const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 120;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: recentMisconceptions } = await supabase
        .from('student_misconceptions')
        .select(`
          misconception_subtype_id,
          confidence_score,
          subtype:misconception_subtypes(
            subtype_name,
            category:misconception_categories(category_name)
          )
        `)
        .gte('detected_at', cutoffDate.toISOString());

      if (!recentMisconceptions) return [];

      const misconceptionCounts = new Map<string, { count: number; confidence: number[]; data: any }>();
      
      recentMisconceptions.forEach(m => {
        const key = m.misconception_subtype_id;
        if (!misconceptionCounts.has(key)) {
          misconceptionCounts.set(key, { count: 0, confidence: [], data: m.subtype });
        }
        const entry = misconceptionCounts.get(key)!;
        entry.count++;
        entry.confidence.push(m.confidence_score);
      });

      return Array.from(misconceptionCounts.entries())
        .map(([subtypeId, data]) => ({
          categoryName: data.data.category.category_name,
          subtypeName: data.data.subtype_name,
          occurrences: data.count,
          averageConfidence: data.confidence.reduce((a, b) => a + b, 0) / data.confidence.length,
          persistenceRate: 0, // Would need additional query
          resolutionRate: 0, // Would need additional query
          commonContexts: [],
          remediationEffectiveness: 0
        }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 15);
    } catch (error) {
      console.error('Error getting trending misconceptions:', error);
      return [];
    }
  }

  // Get intervention recommendations based on misconception patterns
  static async getInterventionRecommendations(studentId: string): Promise<{
    highPriorityMisconceptions: string[];
    recommendedInterventions: {
      misconceptionId: string;
      interventionType: string;
      reasoning: string;
      expectedEffectiveness: number;
    }[];
    affectiveConsiderations: string[];
  }> {
    try {
      const profile = await this.getStudentMisconceptionProfile(studentId);
      
      if (!profile) {
        return {
          highPriorityMisconceptions: [],
          recommendedInterventions: [],
          affectiveConsiderations: []
        };
      }

      // Identify high priority misconceptions (persistent + high occurrence)
      const highPriorityMisconceptions = profile.topMisconceptionTypes
        .filter(m => m.persistenceRate > 0.6 || m.occurrences > 3)
        .map(m => m.subtypeName);

      // Generate intervention recommendations
      const recommendedInterventions = profile.topMisconceptionTypes
        .slice(0, 3)
        .map(misconception => {
          let interventionType = 'guided_practice';
          let reasoning = 'General guided practice';
          let expectedEffectiveness = 0.6;

          // Customize based on misconception category
          if (misconception.categoryName === 'Procedural Errors') {
            interventionType = 'step_by_step_practice';
            reasoning = 'Procedural errors benefit from explicit step-by-step practice';
            expectedEffectiveness = 0.8;
          } else if (misconception.categoryName === 'Conceptual Errors') {
            interventionType = 'conceptual_exploration';
            reasoning = 'Conceptual errors require deeper understanding through exploration';
            expectedEffectiveness = 0.7;
          } else if (misconception.categoryName === 'Interpretive Errors') {
            interventionType = 'reading_comprehension_practice';
            reasoning = 'Interpretive errors need focused reading comprehension work';
            expectedEffectiveness = 0.75;
          }

          return {
            misconceptionId: misconception.subtypeName,
            interventionType,
            reasoning,
            expectedEffectiveness
          };
        });

      // Generate affective considerations
      const affectiveConsiderations: string[] = [];
      
      if (profile.affectiveFlags.frustrationEvents > 2) {
        affectiveConsiderations.push('Student shows signs of frustration - consider shorter practice sessions');
      }
      if (profile.affectiveFlags.avoidancePatterns > 1) {
        affectiveConsiderations.push('Student may be avoiding certain topics - use motivational strategies');
      }
      if (profile.affectiveFlags.disengagementSignals > 2) {
        affectiveConsiderations.push('Student shows disengagement - consider gamification or choice-based activities');
      }

      return {
        highPriorityMisconceptions,
        recommendedInterventions,
        affectiveConsiderations
      };
    } catch (error) {
      console.error('Error generating intervention recommendations:', error);
      return {
        highPriorityMisconceptions: [],
        recommendedInterventions: [],
        affectiveConsiderations: []
      };
    }
  }
}
