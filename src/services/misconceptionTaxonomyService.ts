
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
}

export class MisconceptionTaxonomyService {
  // Get all misconception categories
  static async getCategories(): Promise<MisconceptionCategory[]> {
    const { data, error } = await supabase
      .from('misconception_categories')
      .select('*')
      .order('category_name');

    if (error) {
      console.error('Error fetching misconception categories:', error);
      throw error;
    }

    return data || [];
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
  static async getAllSubtypesWithCategories(): Promise<(MisconceptionSubtype & { category: MisconceptionCategory })[]> {
    const { data, error } = await supabase
      .from('misconception_subtypes')
      .select(`
        *,
        category:misconception_categories(*)
      `)
      .order('subtype_name');

    if (error) {
      console.error('Error fetching subtypes with categories:', error);
      throw error;
    }

    return data || [];
  }

  // Analyze student answer for misconceptions
  static async analyzeMisconception(
    studentAnswer: string,
    correctAnswer: string,
    questionContext: string,
    subject: string,
    questionType: string = 'open-ended'
  ): Promise<MisconceptionAnalysisResult | null> {
    try {
      // Get all subtypes for analysis
      const subtypes = await this.getAllSubtypesWithCategories();
      
      // Analyze based on different error patterns
      const analysis = this.detectMisconceptionPattern(
        studentAnswer,
        correctAnswer,
        questionContext,
        subject,
        questionType,
        subtypes
      );

      return analysis;
    } catch (error) {
      console.error('Error analyzing misconception:', error);
      return null;
    }
  }

  // Core detection logic for different misconception types
  private static detectMisconceptionPattern(
    studentAnswer: string,
    correctAnswer: string,
    questionContext: string,
    subject: string,
    questionType: string,
    subtypes: (MisconceptionSubtype & { category: MisconceptionCategory })[]
  ): MisconceptionAnalysisResult | null {
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();
    const contextLower = questionContext.toLowerCase();

    // Procedural Error Detection
    const proceduralAnalysis = this.analyzeProceduralErrors(studentLower, correctLower, contextLower, subtypes);
    if (proceduralAnalysis) return proceduralAnalysis;

    // Conceptual Error Detection
    const conceptualAnalysis = this.analyzeConceptualErrors(studentLower, correctLower, contextLower, subject, subtypes);
    if (conceptualAnalysis) return conceptualAnalysis;

    // Interpretive Error Detection
    const interpretiveAnalysis = this.analyzeInterpretiveErrors(studentLower, correctLower, contextLower, questionType, subtypes);
    if (interpretiveAnalysis) return interpretiveAnalysis;

    // Expression Error Detection
    const expressionAnalysis = this.analyzeExpressionErrors(studentLower, correctLower, contextLower, subtypes);
    if (expressionAnalysis) return expressionAnalysis;

    // Strategic Error Detection
    const strategicAnalysis = this.analyzeStrategicErrors(studentLower, correctLower, contextLower, subtypes);
    if (strategicAnalysis) return strategicAnalysis;

    // Meta-Cognitive Error Detection
    const metacognitiveAnalysis = this.analyzeMetacognitiveErrors(studentLower, correctLower, contextLower, subtypes);
    if (metacognitiveAnalysis) return metacognitiveAnalysis;

    return null;
  }

  // Procedural error analysis
  private static analyzeProceduralErrors(
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    subtypes: (MisconceptionSubtype & { category: MisconceptionCategory })[]
  ): MisconceptionAnalysisResult | null {
    const proceduralSubtypes = subtypes.filter(s => s.category.category_name === 'Procedural Errors');
    
    // Step Omission Detection
    if (studentAnswer.length < correctAnswer.length * 0.5 && context.includes('step')) {
      const subtype = proceduralSubtypes.find(s => s.subtype_name === 'Step Omission');
      if (subtype) {
        return {
          subtypeId: subtype.id,
          subtypeName: subtype.subtype_name,
          categoryName: subtype.category.category_name,
          confidence: 0.8,
          reasoning: 'Student response is significantly shorter than expected, suggesting skipped steps',
          remediationSuggestions: [
            'Break down the problem into smaller steps',
            'Provide a step-by-step checklist',
            'Use guided practice with explicit step identification'
          ]
        };
      }
    }

    // Symbol Confusion Detection
    if (this.hasSymbolErrors(studentAnswer, correctAnswer)) {
      const subtype = proceduralSubtypes.find(s => s.subtype_name === 'Symbol Confusion');
      if (subtype) {
        return {
          subtypeId: subtype.id,
          subtypeName: subtype.subtype_name,
          categoryName: subtype.category.category_name,
          confidence: 0.9,
          reasoning: 'Student appears to have confused mathematical symbols or operations',
          remediationSuggestions: [
            'Review symbol meanings with visual aids',
            'Practice symbol identification exercises',
            'Use color-coding for different operations'
          ]
        };
      }
    }

    return null;
  }

  // Conceptual error analysis
  private static analyzeConceptualErrors(
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    subject: string,
    subtypes: (MisconceptionSubtype & { category: MisconceptionCategory })[]
  ): MisconceptionAnalysisResult | null {
    const conceptualSubtypes = subtypes.filter(s => s.category.category_name === 'Conceptual Errors');
    
    // Overgeneralization Detection
    if (this.isOvergeneralization(studentAnswer, correctAnswer, context)) {
      const subtype = conceptualSubtypes.find(s => s.subtype_name === 'Overgeneralization');
      if (subtype) {
        return {
          subtypeId: subtype.id,
          subtypeName: subtype.subtype_name,
          categoryName: subtype.category.category_name,
          confidence: 0.7,
          reasoning: 'Student appears to be applying a rule or concept too broadly',
          remediationSuggestions: [
            'Provide counterexamples to show rule boundaries',
            'Practice with edge cases',
            'Explicitly discuss when rules apply and when they don\'t'
          ]
        };
      }
    }

    return null;
  }

  // Interpretive error analysis
  private static analyzeInterpretiveErrors(
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    questionType: string,
    subtypes: (MisconceptionSubtype & { category: MisconceptionCategory })[]
  ): MisconceptionAnalysisResult | null {
    const interpretiveSubtypes = subtypes.filter(s => s.category.category_name === 'Interpretive Errors');
    
    // Task Misread Detection
    if (this.isTaskMisread(studentAnswer, correctAnswer, context)) {
      const subtype = interpretiveSubtypes.find(s => s.subtype_name === 'Task Misread');
      if (subtype) {
        return {
          subtypeId: subtype.id,
          subtypeName: subtype.subtype_name,
          categoryName: subtype.category.category_name,
          confidence: 0.8,
          reasoning: 'Student appears to have answered a different question than what was asked',
          remediationSuggestions: [
            'Highlight key instruction words',
            'Practice reading comprehension with similar questions',
            'Encourage restating the question in their own words'
          ]
        };
      }
    }

    return null;
  }

  // Expression error analysis
  private static analyzeExpressionErrors(
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    subtypes: (MisconceptionSubtype & { category: MisconceptionCategory })[]
  ): MisconceptionAnalysisResult | null {
    const expressionSubtypes = subtypes.filter(s => s.category.category_name === 'Expression Errors');
    
    // Communication Breakdown Detection
    if (this.isCommunicationBreakdown(studentAnswer)) {
      const subtype = expressionSubtypes.find(s => s.subtype_name === 'Communication Breakdown');
      if (subtype) {
        return {
          subtypeId: subtype.id,
          subtypeName: subtype.subtype_name,
          categoryName: subtype.category.category_name,
          confidence: 0.7,
          reasoning: 'Student response is unclear or incoherent',
          remediationSuggestions: [
            'Provide sentence starters for explanations',
            'Practice organizing thoughts before writing',
            'Use graphic organizers for response structure'
          ]
        };
      }
    }

    return null;
  }

  // Strategic error analysis
  private static analyzeStrategicErrors(
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    subtypes: (MisconceptionSubtype & { category: MisconceptionCategory })[]
  ): MisconceptionAnalysisResult | null {
    const strategicSubtypes = subtypes.filter(s => s.category.category_name === 'Strategic Errors');
    
    // Guess-and-Check Default Detection
    if (this.isGuessAndCheck(studentAnswer, context)) {
      const subtype = strategicSubtypes.find(s => s.subtype_name === 'Guess-and-Check Default');
      if (subtype) {
        return {
          subtypeId: subtype.id,
          subtypeName: subtype.subtype_name,
          categoryName: subtype.category.category_name,
          confidence: 0.6,
          reasoning: 'Student appears to be using trial and error instead of systematic approach',
          remediationSuggestions: [
            'Teach systematic problem-solving strategies',
            'Provide decision trees for approach selection',
            'Practice identifying problem types'
          ]
        };
      }
    }

    return null;
  }

  // Meta-cognitive error analysis
  private static analyzeMetacognitiveErrors(
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    subtypes: (MisconceptionSubtype & { category: MisconceptionCategory })[]
  ): MisconceptionAnalysisResult | null {
    const metacognitiveSubtypes = subtypes.filter(s => s.category.category_name === 'Meta-Cognitive Errors');
    
    // This would typically require additional behavioral data
    // For now, we'll use basic heuristics
    
    return null;
  }

  // Helper methods for pattern detection
  private static hasSymbolErrors(studentAnswer: string, correctAnswer: string): boolean {
    const symbolPairs = [
      ['+', '-'], ['*', '/'], ['<', '>'], ['=', '≠']
    ];
    
    for (const [sym1, sym2] of symbolPairs) {
      if (correctAnswer.includes(sym1) && studentAnswer.includes(sym2)) {
        return true;
      }
    }
    return false;
  }

  private static isOvergeneralization(studentAnswer: string, correctAnswer: string, context: string): boolean {
    // Check if student applied a general rule to a specific case where it doesn't apply
    const generalRuleKeywords = ['always', 'all', 'every', 'never', 'none'];
    return generalRuleKeywords.some(keyword => studentAnswer.includes(keyword)) &&
           !correctAnswer.includes('all') && !correctAnswer.includes('every');
  }

  private static isTaskMisread(studentAnswer: string, correctAnswer: string, context: string): boolean {
    // Simple heuristic: completely different response types
    const hasNumbers = /\d/.test(studentAnswer);
    const correctHasNumbers = /\d/.test(correctAnswer);
    const hasWords = /[a-zA-Z]{3,}/.test(studentAnswer.replace(/\d/g, ''));
    const correctHasWords = /[a-zA-Z]{3,}/.test(correctAnswer.replace(/\d/g, ''));
    
    return (hasNumbers !== correctHasNumbers) || (hasWords !== correctHasWords);
  }

  private static isCommunicationBreakdown(studentAnswer: string): boolean {
    // Check for very short, unclear, or repetitive responses
    return studentAnswer.length < 10 || 
           studentAnswer.split(' ').length < 3 ||
           /(.{2,})\1{2,}/.test(studentAnswer); // Repetitive patterns
  }

  private static isGuessAndCheck(studentAnswer: string, context: string): boolean {
    const guessKeywords = ['try', 'guess', 'maybe', 'probably', 'think'];
    return guessKeywords.some(keyword => studentAnswer.includes(keyword));
  }

  // Record a misconception
  static async recordMisconception(
    studentId: string,
    misconceptionSubtypeId: string,
    confidenceScore: number,
    contextData: any = {},
    questionId?: string,
    skillId?: string,
    examId?: string
  ): Promise<StudentMisconception | null> {
    const { data, error } = await supabase
      .from('student_misconceptions')
      .insert({
        student_id: studentId,
        misconception_subtype_id: misconceptionSubtypeId,
        confidence_score: confidenceScore,
        context_data: contextData,
        question_id: questionId,
        skill_id: skillId,
        exam_id: examId
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording misconception:', error);
      return null;
    }

    // Update persistence log
    await supabase.rpc('update_misconception_persistence', {
      p_student_id: studentId,
      p_subtype_id: misconceptionSubtypeId
    });

    return data;
  }

  // Record feedback session
  static async recordFeedbackSession(
    studentMisconceptionId: string,
    feedbackType: string,
    success: boolean,
    notes?: string,
    interventionData: any = {}
  ): Promise<MisconceptionFeedbackSession | null> {
    const { data, error } = await supabase
      .from('misconception_feedback_sessions')
      .insert({
        student_misconception_id: studentMisconceptionId,
        feedback_type: feedbackType,
        success: success,
        notes: notes,
        intervention_data: interventionData
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording feedback session:', error);
      return null;
    }

    return data;
  }

  // Get student's misconception history
  static async getStudentMisconceptions(studentId: string): Promise<(StudentMisconception & { subtype: MisconceptionSubtype & { category: MisconceptionCategory } })[]> {
    const { data, error } = await supabase
      .from('student_misconceptions')
      .select(`
        *,
        subtype:misconception_subtypes(
          *,
          category:misconception_categories(*)
        )
      `)
      .eq('student_id', studentId)
      .order('detected_at', { ascending: false });

    if (error) {
      console.error('Error fetching student misconceptions:', error);
      throw error;
    }

    return data || [];
  }

  // Get persistence logs for a student
  static async getStudentPersistenceLogs(studentId: string): Promise<(MisconceptionPersistenceLog & { subtype: MisconceptionSubtype & { category: MisconceptionCategory } })[]> {
    const { data, error } = await supabase
      .from('misconception_persistence_logs')
      .select(`
        *,
        subtype:misconception_subtypes(
          *,
          category:misconception_categories(*)
        )
      `)
      .eq('student_id', studentId)
      .order('total_occurrences', { ascending: false });

    if (error) {
      console.error('Error fetching persistence logs:', error);
      throw error;
    }

    return data || [];
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
}
