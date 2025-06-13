
import { SubjectSpecificMisconceptionService } from './subjectSpecificMisconceptionService';
import { MisconceptionTaxonomyService, MisconceptionAnalysisResult, MisconceptionSubtypeWithCategory } from './misconceptionTaxonomyService';

export class EnhancedMisconceptionIntegrationService {
  // Integrate legacy misconception detection with new taxonomy - ENHANCED with auto-creation
  static async analyzeMisconceptionWithTaxonomy(
    subject: string,
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[]
  ): Promise<MisconceptionAnalysisResult | null> {
    try {
      // First, use the enhanced taxonomy analysis with auto-creation
      const taxonomyAnalysis = await MisconceptionTaxonomyService.analyzeMisconception(
        studentAnswer,
        correctAnswer,
        questionContext || '',
        subject,
        questionType
      );

      if (taxonomyAnalysis) {
        console.log(`🧠 Taxonomy analysis successful: ${taxonomyAnalysis.subtypeName}${taxonomyAnalysis.isNewSubtype ? ' (AUTO-CREATED)' : ''}`);
        return taxonomyAnalysis;
      }

      // Fallback to legacy analysis if new taxonomy doesn't find anything
      const legacyCategory = SubjectSpecificMisconceptionService.analyzeMisconceptionBySubject(
        subject,
        questionType,
        studentAnswer,
        correctAnswer,
        questionContext,
        options
      );

      // If legacy analysis found something, try to map it to taxonomy
      if (legacyCategory && legacyCategory !== 'unclassified') {
        const mappedAnalysis = await this.mapLegacyCategoryToTaxonomy(
          legacyCategory,
          subject,
          studentAnswer,
          correctAnswer,
          questionContext
        );
        
        if (mappedAnalysis) {
          console.log(`🔄 Mapped legacy category to taxonomy: ${legacyCategory} -> ${mappedAnalysis.subtypeName}`);
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

  // Enhanced misconception recording that uses both systems with auto-creation support
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
  ): Promise<{ success: boolean; misconceptionId?: string; analysis?: MisconceptionAnalysisResult; isNewSubtype?: boolean }> {
    try {
      // Perform enhanced analysis with auto-creation
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
          analysis_reasoning: analysis.reasoning,
          auto_created: analysis.isNewSubtype || false
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
        analysis,
        isNewSubtype: analysis.isNewSubtype
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
          `Address ${m.misconception_subtypes.subtype_name} through targeted practice`
        ),
        ...persistenceLogs.filter(log => !log.resolved).slice(0, 2).map(log => 
          `Focus on resolving persistent ${log.misconception_subtypes.subtype_name} pattern`
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
