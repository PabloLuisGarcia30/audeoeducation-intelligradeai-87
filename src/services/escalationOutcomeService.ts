
import { supabase } from "@/integrations/supabase/client";
import type { EscalationOutcome, EscalationAnalytics, EscalationTrend, EscalationPattern } from "@/types/escalationOutcome";

export class EscalationOutcomeService {
  /**
   * Log an escalation outcome to the database
   */
  static async logEscalationOutcome(outcome: EscalationOutcome): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('escalation_outcomes')
        .insert(outcome)
        .select('id')
        .single();

      if (error) {
        console.error('Error logging escalation outcome:', error);
        return null;
      }

      console.log(`📊 Escalation outcome logged: ${outcome.escalation_type} from ${outcome.original_service}`);
      return data.id;
    } catch (error) {
      console.error('Failed to log escalation outcome:', error);
      return null;
    }
  }

  /**
   * Get escalation outcomes for a specific student
   */
  static async getStudentEscalations(studentId: string, limit: number = 50): Promise<EscalationOutcome[]> {
    try {
      const { data, error } = await supabase
        .from('escalation_outcomes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching student escalations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch student escalations:', error);
      return [];
    }
  }

  /**
   * Get escalation analytics for a specific time period
   */
  static async getEscalationAnalytics(days: number = 30): Promise<EscalationAnalytics> {
    try {
      const { data, error } = await supabase
        .from('escalation_outcomes')
        .select('*')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching escalation analytics:', error);
        return this.getEmptyAnalytics();
      }

      const escalations = data || [];
      
      // Calculate analytics
      const escalationsByType: Record<string, number> = {};
      const escalationsByService: Record<string, number> = {};
      let totalProcessingTime = 0;
      let processingTimeCount = 0;
      let successCount = 0;
      let totalQualityScore = 0;
      let qualityScoreCount = 0;
      let totalCostImpact = 0;

      escalations.forEach(escalation => {
        // Count by type
        escalationsByType[escalation.escalation_type] = (escalationsByType[escalation.escalation_type] || 0) + 1;
        
        // Count by service
        escalationsByService[escalation.original_service] = (escalationsByService[escalation.original_service] || 0) + 1;
        
        // Processing time
        if (escalation.processing_time_ms) {
          totalProcessingTime += escalation.processing_time_ms;
          processingTimeCount++;
        }
        
        // Success rate
        if (escalation.success === true) successCount++;
        
        // Quality score
        if (escalation.quality_score) {
          totalQualityScore += escalation.quality_score;
          qualityScoreCount++;
        }
        
        // Cost impact
        if (escalation.cost_impact) {
          totalCostImpact += escalation.cost_impact;
        }
      });

      return {
        total_escalations: escalations.length,
        escalations_by_type: escalationsByType,
        escalations_by_service: escalationsByService,
        average_processing_time: processingTimeCount > 0 ? totalProcessingTime / processingTimeCount : 0,
        success_rate: escalations.length > 0 ? (successCount / escalations.length) * 100 : 0,
        average_quality_score: qualityScoreCount > 0 ? totalQualityScore / qualityScoreCount : 0,
        total_cost_impact: totalCostImpact,
        recent_escalations: escalations.slice(0, 10)
      };
    } catch (error) {
      console.error('Failed to calculate escalation analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get escalation trends over time
   */
  static async getEscalationTrends(days: number = 30): Promise<EscalationTrend[]> {
    try {
      const { data, error } = await supabase.rpc('get_escalation_trends', {
        p_days: days
      });

      if (error) {
        console.error('Error fetching escalation trends:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch escalation trends:', error);
      return [];
    }
  }

  /**
   * Identify common escalation patterns
   */
  static async getEscalationPatterns(days: number = 30): Promise<EscalationPattern[]> {
    try {
      const { data, error } = await supabase
        .from('escalation_outcomes')
        .select('escalation_type, original_service, selected_solution, success')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching escalation patterns:', error);
        return [];
      }

      const escalations = data || [];
      const patterns: Record<string, any> = {};

      escalations.forEach(escalation => {
        const patternKey = `${escalation.escalation_type}-${escalation.original_service}`;
        
        if (!patterns[patternKey]) {
          patterns[patternKey] = {
            pattern_type: patternKey,
            frequency: 0,
            common_solutions: [],
            successes: 0,
            total: 0,
            services_affected: new Set([escalation.original_service])
          };
        }

        patterns[patternKey].frequency++;
        patterns[patternKey].total++;
        
        if (escalation.success === true) {
          patterns[patternKey].successes++;
        }
        
        if (escalation.selected_solution && !patterns[patternKey].common_solutions.includes(escalation.selected_solution)) {
          patterns[patternKey].common_solutions.push(escalation.selected_solution);
        }
      });

      return Object.values(patterns).map((pattern: any) => ({
        pattern_type: pattern.pattern_type,
        frequency: pattern.frequency,
        common_solutions: pattern.common_solutions.slice(0, 5), // Top 5 solutions
        success_rate: pattern.total > 0 ? (pattern.successes / pattern.total) * 100 : 0,
        services_affected: Array.from(pattern.services_affected)
      }));
    } catch (error) {
      console.error('Failed to identify escalation patterns:', error);
      return [];
    }
  }

  /**
   * Update escalation outcome with results
   */
  static async updateEscalationOutcome(
    id: string, 
    updates: Partial<Pick<EscalationOutcome, 'success' | 'quality_score' | 'cost_impact' | 'final_confidence' | 'metadata'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('escalation_outcomes')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating escalation outcome:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update escalation outcome:', error);
      return false;
    }
  }

  /**
   * Helper method to create empty analytics object
   */
  private static getEmptyAnalytics(): EscalationAnalytics {
    return {
      total_escalations: 0,
      escalations_by_type: {},
      escalations_by_service: {},
      average_processing_time: 0,
      success_rate: 0,
      average_quality_score: 0,
      total_cost_impact: 0,
      recent_escalations: []
    };
  }
}
