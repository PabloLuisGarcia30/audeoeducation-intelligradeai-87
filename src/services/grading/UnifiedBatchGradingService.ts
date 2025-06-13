
import { QuestionInput, BatchGradingResult, GradedAnswer } from './types';
import { DistilBERTGraderAdapter } from './adapters/DistilBERTGraderAdapter';
import { OpenAIGraderAdapter } from './adapters/OpenAIGraderAdapter';
import { getCachedResults, writeResults } from './cache/GradingCache';
import { BatchGrader } from './BatchGrader';

// Initialize graders
const distilbert: BatchGrader = new DistilBERTGraderAdapter();
const openai: BatchGrader = new OpenAIGraderAdapter();

// Configuration
const CONFIDENCE_THRESHOLD = parseFloat(process.env.GRADING_CONFIDENCE_THRESHOLD || '0.85');
const ENABLE_CACHE = process.env.GRADING_CACHE_ENABLED !== 'false';
const ENABLE_HYBRID_GRADING = process.env.HYBRID_GRADING_ENABLED !== 'false';

/**
 * Main entry point for unified batch grading
 * Implements intelligent routing: Cache -> DistilBERT -> OpenAI
 */
export async function gradeBatchUnified(questions: QuestionInput[]): Promise<BatchGradingResult> {
  const startTime = Date.now();
  console.log(`🎯 Starting unified batch grading for ${questions.length} questions`);

  /** 1. Short-circuit cache hits */
  const cacheHits = ENABLE_CACHE ? await getCachedResults(questions) : {};
  const uncached = questions.filter(q => !cacheHits[q.id]);
  
  console.log(`📊 Cache: ${Object.keys(cacheHits).length} hits, ${uncached.length} uncached`);

  let distilbertResults: GradedAnswer[] = [];
  let confident: GradedAnswer[] = [];
  let needsOpenAI: QuestionInput[] = [];

  /** 2. Fast pass with DistilBERT for uncached questions */
  if (uncached.length > 0 && ENABLE_HYBRID_GRADING) {
    console.log(`🤖 Processing ${uncached.length} questions with DistilBERT`);
    const distilbertBatch = await distilbert.gradeBatch(uncached);
    distilbertResults = distilbertBatch.results;

    /** 3. Identify low-confidence answers for OpenAI escalation */
    for (const result of distilbertResults) {
      if (result.confidence < CONFIDENCE_THRESHOLD) {
        const question = questions.find(q => q.id === result.questionId);
        if (question) {
          needsOpenAI.push(question);
        }
      } else {
        confident.push(result);
      }
    }

    console.log(`✅ DistilBERT: ${confident.length} confident, ${needsOpenAI.length} need OpenAI review`);
  } else {
    // Skip DistilBERT if hybrid grading is disabled
    needsOpenAI = uncached;
  }

  /** 4. Second pass with OpenAI for low-confidence or all questions */
  let openaiResults: GradedAnswer[] = [];
  if (needsOpenAI.length > 0) {
    console.log(`🧠 Processing ${needsOpenAI.length} questions with OpenAI`);
    const openaiBatch = await openai.gradeBatch(needsOpenAI);
    openaiResults = openaiBatch.results;
  }

  /** 5. Merge results from all sources */
  const merged: GradedAnswer[] = [
    ...Object.values(cacheHits),
    ...confident,
    ...openaiResults,
  ];

  // Ensure we have results for all questions
  const missingQuestions = questions.filter(q => !merged.find(r => r.questionId === q.id));
  if (missingQuestions.length > 0) {
    console.warn(`⚠️ Missing results for ${missingQuestions.length} questions, adding fallbacks`);
    const fallbacks = missingQuestions.map(q => createFallbackResult(q));
    merged.push(...fallbacks);
  }

  /** 6. Write new results to cache */
  if (ENABLE_CACHE) {
    const newResults = [...confident, ...openaiResults];
    const newQuestions = questions.filter(q => 
      newResults.find(r => r.questionId === q.id)
    );
    
    if (newResults.length > 0) {
      await writeResults(newResults, newQuestions);
      console.log(`💾 Cached ${newResults.length} new results`);
    }
  }

  const processingTime = Date.now() - startTime;
  const avgConfidence = merged.reduce((sum, r) => sum + r.confidence, 0) / merged.length;

  console.log(`✅ Unified grading complete: ${merged.length} results in ${processingTime}ms, avg confidence: ${avgConfidence.toFixed(3)}`);

  /** 7. Return unified result */
  return {
    results: merged,
    metadata: {
      totalQuestions: questions.length,
      processingTime,
      batchSize: questions.length,
      averageConfidence: avgConfidence,
      failureCount: merged.filter(r => r.model === 'rule').length,
      fallbackUsed: merged.some(r => r.model === 'rule'),
      correlationId: `unified_${Date.now()}`
    },
    usage: calculateTotalUsage(openaiResults)
  };
}

/**
 * Helper function to create fallback results
 */
function createFallbackResult(question: QuestionInput): GradedAnswer {
  return {
    questionId: question.id,
    score: 0,
    pointsEarned: 0,
    pointsPossible: question.pointsPossible || 1,
    isCorrect: false,
    rationale: 'Unified grading fallback - manual review required',
    model: 'rule',
    confidence: 0.2,
    gradingMethod: 'unified_fallback',
    qualityFlags: {
      requiresManualReview: true
    }
  };
}

/**
 * Helper function to calculate total usage from OpenAI results
 */
function calculateTotalUsage(openaiResults: GradedAnswer[]) {
  // This is a simplified calculation
  // In a real implementation, you'd track usage more precisely
  const totalQuestions = openaiResults.length;
  const estimatedTokensPerQuestion = 150;
  const totalTokens = totalQuestions * estimatedTokensPerQuestion;
  
  return {
    promptTokens: Math.floor(totalTokens * 0.7),
    completionTokens: Math.floor(totalTokens * 0.3),
    totalTokens,
    estimatedCost: totalTokens * 0.002 / 1000
  };
}

/**
 * Legacy compatibility function
 * Maps the old interface to the new unified system
 */
export async function gradeComplexQuestions(
  questions: any[],
  answerKeys: any[],
  examId: string,
  studentName: string,
  skillMappings: any
): Promise<any[]> {
  console.log(`🔄 Legacy compatibility: Converting ${questions.length} questions for unified grading`);

  // Convert legacy format to new QuestionInput format
  const unifiedQuestions: QuestionInput[] = questions.map((q, index) => {
    const answerKey = answerKeys[index];
    const questionSkills = skillMappings[q.questionNumber] || [];
    
    return {
      id: q.questionNumber.toString(),
      prompt: answerKey?.question_text || `Question ${q.questionNumber}`,
      studentAnswer: q.detectedAnswer?.selectedOption?.trim() || '',
      skillTags: questionSkills.map((s: any) => s.skill_name) || [],
      correctAnswer: answerKey?.correct_answer?.trim() || '',
      pointsPossible: answerKey?.points || 1,
      questionType: 'short-answer',
      metadata: {
        examId,
        studentName,
        originalQuestion: q,
        originalAnswerKey: answerKey
      }
    };
  });

  // Grade using unified system
  const result = await gradeBatchUnified(unifiedQuestions);

  // Convert back to legacy format
  const legacyResults = result.results.map((gradedAnswer, index) => {
    const originalQuestion = questions[index];
    const questionSkillMappings = skillMappings[originalQuestion.questionNumber] || [];
    
    return {
      questionNumber: originalQuestion.questionNumber,
      questionId: gradedAnswer.questionId,
      isCorrect: gradedAnswer.isCorrect,
      score: gradedAnswer.score,
      pointsEarned: gradedAnswer.pointsEarned,
      pointsPossible: gradedAnswer.pointsPossible,
      confidence: gradedAnswer.confidence,
      model: gradedAnswer.model,
      gradingMethod: gradedAnswer.gradingMethod,
      rationale: gradedAnswer.rationale,
      skillMappings: questionSkillMappings,
      complexityScore: gradedAnswer.complexityScore,
      reasoningDepth: gradedAnswer.reasoningDepth,
      qualityFlags: {
        ...gradedAnswer.qualityFlags,
        unifiedProcessing: true
      },
      // Legacy OpenAI usage format
      openAIUsage: result.usage ? {
        promptTokens: Math.floor(result.usage.promptTokens / result.results.length),
        completionTokens: Math.floor(result.usage.completionTokens / result.results.length),
        totalTokens: Math.floor(result.usage.totalTokens / result.results.length),
        estimatedCost: result.usage.estimatedCost / result.results.length
      } : undefined
    };
  });

  console.log(`✅ Legacy compatibility: Converted ${legacyResults.length} results back to legacy format`);
  return legacyResults;
}

// Export for use in other services
export { CONFIDENCE_THRESHOLD, ENABLE_CACHE, ENABLE_HYBRID_GRADING };
