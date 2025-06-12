
import { SubjectSpecificMisconceptionService } from './subjectSpecificMisconceptionService';
import { MisconceptionTaxonomyService, MisconceptionAnalysisResult } from './misconceptionTaxonomyService';

export class EnhancedMisconceptionIntegrationService {
  // Integrate legacy misconception detection with new taxonomy
  static async analyzeMisconceptionWithTaxonomy(
    subject: string,
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[]
  ): Promise<MisconceptionAnalysisResult | null> {
    try {
      // First, use the existing subject-specific analysis
      const legacyCategory = SubjectSpecificMisconceptionService.analyzeMisconceptionBySubject(
        subject,
        questionType,
        studentAnswer,
        correctAnswer,
        questionContext,
        options
      );

      // Then, use the new taxonomy analysis
      const taxonomyAnalysis = await MisconceptionTaxonomyService.analyzeMisconception(
        studentAnswer,
        correctAnswer,
        questionContext || '',
        subject,
        questionType
      );

      // Combine the results, prioritizing the new taxonomy but using legacy as fallback
      if (taxonomyAnalysis) {
        return taxonomyAnalysis;
      }

      // If new taxonomy didn't find anything, try to map legacy category to new taxonomy
      if (legacyCategory && legacyCategory !== 'unclassified') {
        const mappedAnalysis = await this.mapLegacyCategoryToTaxonomy(
          legacyCategory,
          subject,
          studentAnswer,
          correctAnswer,
          questionContext
        );
        
        if (mappedAnalysis) {
          return mappedAnalysis;
        }
      }

      return null;
    } catch (error) {
      console.error('Error in integrated misconception analysis:', error);
      return null;
    }
  }

  // Map legacy categories to new taxonomy
  private static async mapLegacyCategoryToTaxonomy(
    legacyCategory: string,
    subject: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string
  ): Promise<MisconceptionAnalysisResult | null> {
    // Get all subtypes to find best match
    const subtypes = await MisconceptionTaxonomyService.getAllSubtypesWithCategories();
    
    // Define mapping rules from legacy categories to new taxonomy
    const categoryMappings: { [key: string]: { category: string; subtype: string; confidence: number } } = {
      'algebraic_sign_error': { category: 'Procedural Errors', subtype: 'Symbol Confusion', confidence: 0.8 },
      'fraction_operations_error': { category: 'Procedural Errors', subtype: 'Flawed Memorized Routine', confidence: 0.8 },
      'order_of_operations_error': { category: 'Procedural Errors', subtype: 'Step Order Error', confidence: 0.9 },
      'proportional_reasoning_error': { category: 'Conceptual Errors', subtype: 'False Assumption', confidence: 0.7 },
      'geometric_property_confusion': { category: 'Conceptual Errors', subtype: 'Category Confusion', confidence: 0.8 },
      'function_concept_error': { category: 'Conceptual Errors', subtype: 'Model Misuse', confidence: 0.7 },
      
      'physics_force_misconception': { category: 'Conceptual Errors', subtype: 'Causal Misunderstanding', confidence: 0.8 },
      'chemistry_bonding_error': { category: 'Conceptual Errors', subtype: 'False Assumption', confidence: 0.8 },
      'biology_evolution_misconception': { category: 'Conceptual Errors', subtype: 'Overgeneralization', confidence: 0.7 },
      'scientific_method_error': { category: 'Strategic Errors', subtype: 'Misapplied Prior Knowledge', confidence: 0.7 },
      'energy_conservation_misconception': { category: 'Conceptual Errors', subtype: 'Causal Misunderstanding', confidence: 0.8 },
      
      'grammar_structure_error': { category: 'Procedural Errors', subtype: 'Flawed Memorized Routine', confidence: 0.7 },
      'reading_comprehension_error': { category: 'Interpretive Errors', subtype: 'Task Misread', confidence: 0.8 },
      'writing_organization_error': { category: 'Expression Errors', subtype: 'Poor Organization', confidence: 0.9 },
      'literary_analysis_misconception': { category: 'Conceptual Errors', subtype: 'Model Misuse', confidence: 0.7 },
      
      'historical_causation_error': { category: 'Conceptual Errors', subtype: 'Causal Misunderstanding', confidence: 0.8 },
      'geographic_concept_confusion': { category: 'Conceptual Errors', subtype: 'Category Confusion', confidence: 0.7 },
      'civic_process_misconception': { category: 'Conceptual Errors', subtype: 'False Assumption', confidence: 0.7 },
      'economic_principle_error': { category: 'Conceptual Errors', subtype: 'Model Misuse', confidence: 0.7 },
      
      'adjacent_confusion': { category: 'Interpretive Errors', subtype: 'Ambiguity Blindness', confidence: 0.6 },
      'conceptual_misunderstanding': { category: 'Conceptual Errors', subtype: 'False Assumption', confidence: 0.6 },
      'procedural_error': { category: 'Procedural Errors', subtype: 'Step Omission', confidence: 0.6 },
      'incomplete_understanding': { category: 'Expression Errors', subtype: 'Omitted Justification', confidence: 0.7 },
      'inverse_reasoning': { category: 'Conceptual Errors', subtype: 'Causal Misunderstanding', confidence: 0.7 },
      'conceptual_gap': { category: 'Conceptual Errors', subtype: 'False Assumption', confidence: 0.5 }
    };

    const mapping = categoryMappings[legacyCategory];
    if (!mapping) return null;

    // Find the corresponding subtype in the new taxonomy
    const matchingSubtype = subtypes.find(
      s => s.category.category_name === mapping.category && s.subtype_name === mapping.subtype
    );

    if (!matchingSubtype) return null;

    // Get remediation suggestions based on legacy category details
    const legacyDetails = SubjectSpecificMisconceptionService.getMisconceptionDetails(subject, legacyCategory);
    const remediationSuggestions = legacyDetails?.remediationStrategies || [
      'Review the concept with additional examples',
      'Practice with guided exercises',
      'Seek clarification on confusing points'
    ];

    return {
      subtypeId: matchingSubtype.id,
      subtypeName: matchingSubtype.subtype_name,
      categoryName: matchingSubtype.category.category_name,
      confidence: mapping.confidence,
      reasoning: `Mapped from legacy analysis: ${legacyCategory}`,
      remediationSuggestions
    };
  }

  // Enhanced misconception recording that uses both systems
  static async recordEnhancedMisconception(
    studentId: string,
    questionId: string,
    skillId: string,
    examId: string,
    subject: string,
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[]
  ): Promise<{ success: boolean; misconceptionId?: string; analysis?: MisconceptionAnalysisResult }> {
    try {
      // Perform enhanced analysis
      const analysis = await this.analyzeMisconceptionWithTaxonomy(
        subject,
        questionType,
        studentAnswer,
        correctAnswer,
        questionContext,
        options
      );

      if (!analysis) {
        return { success: false };
      }

      // Record in the new taxonomy system
      const misconceptionRecord = await MisconceptionTaxonomyService.recordMisconception(
        studentId,
        analysis.subtypeId,
        analysis.confidence,
        {
          question_context: questionContext,
          student_answer: studentAnswer,
          correct_answer: correctAnswer,
          subject: subject,
          question_type: questionType,
          analysis_reasoning: analysis.reasoning
        },
        questionId,
        skillId,
        examId
      );

      if (!misconceptionRecord) {
        return { success: false };
      }

      return {
        success: true,
        misconceptionId: misconceptionRecord.id,
        analysis
      };
    } catch (error) {
      console.error('Error recording enhanced misconception:', error);
      return { success: false };
    }
  }

  // Get comprehensive misconception insights for a student using both systems
  static async getComprehensiveMisconceptionInsights(studentId: string): Promise<{
    taxonomyInsights: any;
    legacyPatterns: any;
    combinedRecommendations: string[];
  }> {
    try {
      // Get insights from new taxonomy
      const taxonomyMisconceptions = await MisconceptionTaxonomyService.getStudentMisconceptions(studentId);
      const persistenceLogs = await MisconceptionTaxonomyService.getStudentPersistenceLogs(studentId);

      // Get legacy patterns (this would require adapting existing mistake pattern queries)
      // For now, we'll structure it for future integration
      const legacyPatterns = {
        commonPatterns: [],
        persistentErrors: [],
        improvementAreas: []
      };

      // Combine recommendations from both systems
      const combinedRecommendations = [
        ...taxonomyMisconceptions.slice(0, 3).map(m => 
          `Address ${m.subtype.subtype_name} through targeted practice`
        ),
        ...persistenceLogs.filter(log => !log.resolved).slice(0, 2).map(log => 
          `Focus on resolving persistent ${log.subtype.subtype_name} pattern`
        )
      ];

      return {
        taxonomyInsights: {
          recentMisconceptions: taxonomyMisconceptions.slice(0, 5),
          persistentPatterns: persistenceLogs.filter(log => !log.resolved)
        },
        legacyPatterns,
        combinedRecommendations
      };
    } catch (error) {
      console.error('Error getting comprehensive insights:', error);
      return {
        taxonomyInsights: null,
        legacyPatterns: null,
        combinedRecommendations: []
      };
    }
  }
}
