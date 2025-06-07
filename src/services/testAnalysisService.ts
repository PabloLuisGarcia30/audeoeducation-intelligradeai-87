
import { supabase } from "@/integrations/supabase/client";

export interface ExtractTextRequest {
  fileContent: string;
  fileName: string;
}

export interface ExtractTextResponse {
  extractedText: string;
  examId: string | null;
  studentName: string | null;
  studentId?: string | null;
  fileName: string;
  structuredData: StructuredData;
}

export interface AnalyzeTestRequest {
  files: Array<{
    fileName: string;
    extractedText: string;
    structuredData: any;
  }>;
  examId: string;
  studentName: string;
  studentEmail?: string;
}

export interface AnalyzeTestResponse {
  overall_score: number;
  grade: string;
  total_points_earned: number;
  total_points_possible: number;
  feedback?: string;
  content_skill_scores?: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
  subject_skill_scores?: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
  // 🆕 Enhanced response with database storage info
  databaseStorage?: {
    testResultId: string;
    studentProfileId: string;
    classId: string | null;
    savedToDatabase: boolean;
    questionsStored: number;
    timestamp: string;
    error?: string;
  };
  processingMetrics?: {
    totalProcessingTime: number;
    studentIdDetectionEnabled: boolean;
    studentIdDetectionRate: number;
    aiOptimizationEnabled: boolean;
    batchProcessingUsed: boolean;
    studentIdGroupingUsed: boolean;
    answerKeyValidationEnabled: boolean;
    databasePersistenceEnabled: boolean;
  };
}

export interface StructuredData {
  documentMetadata?: {
    totalPages?: number;
    processingMethods?: string[];
    overallConfidence?: number;
  };
  pages?: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  questions?: any[];
  answers?: any[];
  validationResults?: {
    questionAnswerAlignment?: number;
    bubbleDetectionAccuracy?: number;
    textOcrAccuracy?: number;
    overallReliability?: number;
  };
}

export const extractTextFromFile = async (request: {
  fileContent: string;
  fileName: string;
}): Promise<ExtractTextResponse> => {
  try {
    console.log('🔍 Extracting text from file with handwriting-resilient processing:', request.fileName);
    
    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: {
        fileName: request.fileName,
        fileContent: request.fileContent,
      },
    });

    if (error) {
      console.error('❌ Handwriting-resilient text extraction failed:', error);
      throw new Error(`Text extraction failed: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error('Text extraction failed: Invalid response');
    }

    // Log handwriting resilience results
    if (data.handwritingResilience?.enabled) {
      console.log('✅ Handwriting-resilient processing completed for:', request.fileName);
      console.log(`🖋️ Handwriting marks filtered: ${data.handwritingResilience.marksFiltered}`);
      console.log(`🎯 Clean regions identified: ${data.handwritingResilience.cleanRegionsIdentified}`);
      console.log(`📊 Resilience score: ${(data.handwritingResilience.resilenceScore * 100).toFixed(1)}%`);
    }

    if (data.templateEnhanced) {
      console.log('✅ Template-aware processing completed for:', request.fileName);
      console.log(`📊 Enhanced confidence: ${(data.confidence * 100).toFixed(1)}%`);
      if (data.structuredData?.templateRecognition) {
        console.log(`📋 Template match: ${data.structuredData.templateRecognition.confidence * 100}%`);
      }
    } else {
      console.log('📝 Standard processing completed for:', request.fileName);
    }

    return {
      extractedText: data.extractedText || '',
      examId: data.examId || null,
      studentName: data.studentName || null,
      studentId: data.studentId || null,
      fileName: request.fileName,
      structuredData: data.structuredData || {},
    };
  } catch (error) {
    console.error('❌ Error in extractTextFromFile:', error);
    throw error;
  }
};

export const analyzeTest = async (request: {
  files: Array<{
    fileName: string;
    extractedText: string;
    structuredData: any;
  }>;
  examId: string;
  studentName: string;
  studentEmail?: string;
}): Promise<AnalyzeTestResponse> => {
  try {
    console.log('🔬 Analyzing test with enhanced database storage for exam:', request.examId);
    
    const { data, error } = await supabase.functions.invoke('analyze-test', {
      body: request,
    });

    if (error) {
      console.error('❌ Test analysis failed:', error);
      throw new Error(`Test analysis failed: ${error.message}`);
    }

    if (!data || typeof data.overallScore !== 'number') {
      throw new Error('Test analysis failed: Invalid response format');
    }

    // 🆕 Log database storage results
    if (data.databaseStorage?.savedToDatabase) {
      console.log('✅ Test results saved to database successfully');
      console.log(`💾 Test Result ID: ${data.databaseStorage.testResultId}`);
      console.log(`👤 Student Profile ID: ${data.databaseStorage.studentProfileId}`);
      console.log(`📚 Class ID: ${data.databaseStorage.classId || 'None'}`);
      console.log(`📊 Questions stored: ${data.databaseStorage.questionsStored}`);
    } else {
      console.warn('⚠️ Test results were not saved to database');
      if (data.databaseStorage?.error) {
        console.error('Database storage error:', data.databaseStorage.error);
      }
    }

    // Log processing metrics
    if (data.processingMetrics?.databasePersistenceEnabled) {
      console.log('📈 Enhanced processing metrics:');
      console.log(`• Student ID Detection: ${data.processingMetrics.studentIdDetectionRate}%`);
      console.log(`• Batch Processing: ${data.processingMetrics.batchProcessingUsed ? 'Enabled' : 'Disabled'}`);
      console.log(`• Database Persistence: ${data.processingMetrics.databasePersistenceEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`• Processing Time: ${data.processingMetrics.totalProcessingTime}ms`);
    }

    console.log('✅ Test analysis successful, score:', data.overallScore);
    
    // Return enhanced response with database storage info
    return {
      overall_score: data.overallScore,
      grade: data.grade || calculateGrade(data.overallScore),
      total_points_earned: data.total_points_earned || 0,
      total_points_possible: data.total_points_possible || 0,
      feedback: data.ai_feedback || data.feedback,
      content_skill_scores: data.content_skill_scores || [],
      subject_skill_scores: data.subject_skill_scores || [],
      databaseStorage: data.databaseStorage,
      processingMetrics: data.processingMetrics
    };
  } catch (error) {
    console.error('❌ Error in analyzeTest:', error);
    throw error;
  }
};

// Helper function to calculate grade from score
function calculateGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
