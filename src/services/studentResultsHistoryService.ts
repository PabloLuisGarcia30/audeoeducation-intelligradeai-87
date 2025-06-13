
import { UnifiedStudentResultsService, UnifiedPerformanceData, UnifiedMisconceptionAnalysis } from './unifiedStudentResultsService';

export interface SkillProgressData {
  skill_name: string;
  skill_type: string;
  dates: string[];
  scores: number[];
  attempts: number[];
  improvement_percentage: number;
  latest_score: number;
  best_score: number;
}

export interface MisconceptionTrendData {
  misconception_type: string;
  misconception_category: string;
  occurrences_over_time: { date: string; count: number }[];
  resolution_rate: number;
  first_detected: string;
  last_detected: string;
  is_resolved: boolean;
}

export interface ImprovementSummary {
  total_skills_practiced: number;
  skills_improved: number;
  average_improvement: number;
  misconceptions_resolved: number;
  total_misconceptions: number;
  most_improved_skill: string;
  most_problematic_misconception: string;
}

export class StudentResultsHistoryService {
  /**
   * Get skill progression data over time for charts
   */
  static async getSkillProgressionData(studentId: string, days: number = 90): Promise<SkillProgressData[]> {
    try {
      const performanceData = await UnifiedStudentResultsService.getStudentPerformance(studentId, days);
      
      // Transform data for charting
      const skillProgress: SkillProgressData[] = performanceData.map(skill => ({
        skill_name: skill.skill_name,
        skill_type: skill.skill_type,
        dates: [skill.last_practiced_at], // Simplified - in real implementation would get historical dates
        scores: [skill.latest_score],
        attempts: [skill.total_attempts],
        improvement_percentage: this.calculateImprovement(skill.latest_score, skill.best_score),
        latest_score: skill.latest_score,
        best_score: skill.best_score
      }));

      return skillProgress;
    } catch (error) {
      console.error('Error fetching skill progression data:', error);
      return [];
    }
  }

  /**
   * Get misconception trends over time
   */
  static async getMisconceptionTrends(studentId: string, days: number = 90): Promise<MisconceptionTrendData[]> {
    try {
      const misconceptionData = await UnifiedStudentResultsService.getStudentMisconceptions(studentId, days);
      
      const trends: MisconceptionTrendData[] = misconceptionData.map(misconception => ({
        misconception_type: misconception.misconception_type,
        misconception_category: misconception.misconception_category,
        occurrences_over_time: [{ 
          date: misconception.latest_detection, 
          count: misconception.total_occurrences 
        }],
        resolution_rate: (misconception.resolved_count / misconception.total_occurrences) * 100,
        first_detected: misconception.latest_detection, // Simplified
        last_detected: misconception.latest_detection,
        is_resolved: misconception.resolved_count === misconception.total_occurrences
      }));

      return trends;
    } catch (error) {
      console.error('Error fetching misconception trends:', error);
      return [];
    }
  }

  /**
   * Get overall improvement summary
   */
  static async getImprovementSummary(studentId: string, days: number = 90): Promise<ImprovementSummary> {
    try {
      const [performanceData, misconceptionData] = await Promise.all([
        UnifiedStudentResultsService.getStudentPerformance(studentId, days),
        UnifiedStudentResultsService.getStudentMisconceptions(studentId, days)
      ]);

      const skillsImproved = performanceData.filter(skill => 
        this.calculateImprovement(skill.latest_score, skill.best_score) > 0
      ).length;

      const averageImprovement = performanceData.reduce((sum, skill) => 
        sum + this.calculateImprovement(skill.latest_score, skill.best_score), 0
      ) / performanceData.length || 0;

      const misconceptionsResolved = misconceptionData.reduce((sum, misconception) => 
        sum + misconception.resolved_count, 0
      );

      const totalMisconceptions = misconceptionData.reduce((sum, misconception) => 
        sum + misconception.total_occurrences, 0
      );

      const mostImprovedSkill = performanceData.reduce((best, skill) => {
        const improvement = this.calculateImprovement(skill.latest_score, skill.best_score);
        const bestImprovement = this.calculateImprovement(best.latest_score, best.best_score);
        return improvement > bestImprovement ? skill : best;
      }, performanceData[0])?.skill_name || 'None';

      const mostProblematicMisconception = misconceptionData.reduce((worst, misconception) => {
        return misconception.total_occurrences > worst.total_occurrences ? misconception : worst;
      }, misconceptionData[0])?.misconception_type || 'None';

      return {
        total_skills_practiced: performanceData.length,
        skills_improved: skillsImproved,
        average_improvement: averageImprovement,
        misconceptions_resolved: misconceptionsResolved,
        total_misconceptions: totalMisconceptions,
        most_improved_skill: mostImprovedSkill,
        most_problematic_misconception: mostProblematicMisconception
      };
    } catch (error) {
      console.error('Error calculating improvement summary:', error);
      return {
        total_skills_practiced: 0,
        skills_improved: 0,
        average_improvement: 0,
        misconceptions_resolved: 0,
        total_misconceptions: 0,
        most_improved_skill: 'None',
        most_problematic_misconception: 'None'
      };
    }
  }

  /**
   * Calculate improvement percentage
   */
  private static calculateImprovement(latestScore: number, bestScore: number): number {
    if (bestScore === 0) return 0;
    return ((latestScore - bestScore) / bestScore) * 100;
  }

  /**
   * Get filtered results based on date range and skill type
   */
  static async getFilteredResults(
    studentId: string,
    dateRange: { start: Date; end: Date },
    skillType?: 'content' | 'subject',
    sessionType?: string
  ): Promise<{ skills: SkillProgressData[]; misconceptions: MisconceptionTrendData[] }> {
    try {
      const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      
      const [skills, misconceptions] = await Promise.all([
        this.getSkillProgressionData(studentId, days),
        this.getMisconceptionTrends(studentId, days)
      ]);

      // Filter by skill type if specified
      const filteredSkills = skillType 
        ? skills.filter(skill => skill.skill_type === skillType)
        : skills;

      return {
        skills: filteredSkills,
        misconceptions
      };
    } catch (error) {
      console.error('Error fetching filtered results:', error);
      return { skills: [], misconceptions: [] };
    }
  }
}
