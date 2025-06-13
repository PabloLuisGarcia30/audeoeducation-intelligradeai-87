
import type { 
  UnifiedQuestionContext, 
  GradingContext, 
  UnifiedGradingResult 
} from '../types/UnifiedGradingTypes';

export class OpenAIGradingProcessor {
  private processingStats = {
    totalProcessed: 0,
    singleRequests: 0,
    batchRequests: 0,
    avgProcessingTime: 0,
    totalCost: 0
  };

  async processSingle(
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<UnifiedGradingResult> {
    const startTime = Date.now();

    try {
      // Import the existing OpenAI service
      const { OpenAIComplexGradingService } = await import('../../openAIComplexGradingService');
      
      const mockQuestion = {
        questionNumber: question.questionNumber,
        detectedAnswer: { selectedOption: question.studentAnswer },
        questionText: question.questionText,
        options: question.options
      };

      const mockAnswerKey = {
        question_number: question.questionNumber,
        correct_answer: question.correctAnswer,
        points: question.pointsPossible,
        acceptable_answers: question.acceptableAnswers
      };

      const openaiResult = await OpenAIComplexGradingService.gradeComplexQuestion(
        mockQuestion,
        mockAnswerKey,
        question.skillContext || []
      );

      const processingTime = Date.now() - startTime;
      this.updateStats('single', processingTime, openaiResult.estimatedCost || 0);

      return {
        questionId: question.questionId,
        questionNumber: question.questionNumber,
        isCorrect: openaiResult.isCorrect,
        pointsEarned: openaiResult.pointsEarned,
        pointsPossible: question.pointsPossible,
        confidence: openaiResult.confidence,
        gradingMethod: 'openai_single',
        reasoning: openaiResult.reasoning,
        feedback: openaiResult.feedback,
        processingTimeMs: processingTime,
        skillMappings: question.skillContext || [],
        misconceptionAnalysis: openaiResult.misconceptionAnalysis ? {
          categoryName: openaiResult.misconceptionAnalysis.categoryName,
          subtypeName: openaiResult.misconceptionAnalysis.subtypeName,
          confidence: openaiResult.misconceptionAnalysis.confidence,
          reasoning: openaiResult.misconceptionAnalysis.reasoning
        } : undefined,
        openAIUsage: {
          promptTokens: openaiResult.promptTokens || 0,
          completionTokens: openaiResult.completionTokens || 0,
          totalTokens: (openaiResult.promptTokens || 0) + (openaiResult.completionTokens || 0),
          estimatedCost: openaiResult.estimatedCost || 0
        }
      };

    } catch (error) {
      console.error(`OpenAI single processing error for Q${question.questionNumber}:`, error);
      return this.createErrorResult(question, error, Date.now() - startTime);
    }
  }

  async processBatch(
    questions: UnifiedQuestionContext[],
    context: GradingContext
  ): Promise<UnifiedGradingResult[]> {
    const startTime = Date.now();

    try {
      // Import the existing batch service
      const { EnhancedBatchGradingService } = await import('../../enhancedBatchGradingService');
      
      const mockQuestions = questions.map(q => ({
        questionNumber: q.questionNumber,
        detectedAnswer: { selectedOption: q.studentAnswer },
        questionText: q.questionText,
        options: q.options
      }));

      const mockAnswerKeys = questions.map(q => ({
        question_number: q.questionNumber,
        correct_answer: q.correctAnswer,
        points: q.pointsPossible,
        acceptable_answers: q.acceptableAnswers
      }));

      const batchResults = await EnhancedBatchGradingService.gradeComplexQuestions(
        mockQuestions,
        mockAnswerKeys,
        context.examId || 'unified',
        context.studentId || 'student'
      );

      const processingTime = Date.now() - startTime;
      const totalCost = batchResults.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
      this.updateStats('batch', processingTime, totalCost);

      return questions.map((question, index) => {
        const result = batchResults[index];
        if (!result) {
          return this.createErrorResult(question, new Error('No result from batch'), processingTime);
        }

        return {
          questionId: question.questionId,
          questionNumber: question.questionNumber,
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
          pointsPossible: question.pointsPossible,
          confidence: result.confidence,
          gradingMethod: 'openai_batch',
          reasoning: result.reasoning,
          feedback: result.feedback,
          processingTimeMs: processingTime / questions.length, // Distribute batch time
          skillMappings: question.skillContext || [],
          misconceptionAnalysis: result.misconceptionAnalysis ? {
            categoryName: result.misconceptionAnalysis.categoryName,
            subtypeName: result.misconceptionAnalysis.subtypeName,
            confidence: result.misconceptionAnalysis.confidence,
            reasoning: result.misconceptionAnalysis.reasoning
          } : undefined,
          openAIUsage: {
            promptTokens: result.promptTokens || 0,
            completionTokens: result.completionTokens || 0,
            totalTokens: (result.promptTokens || 0) + (result.completionTokens || 0),
            estimatedCost: result.estimatedCost || 0
          }
        };
      });

    } catch (error) {
      console.error('OpenAI batch processing error:', error);
      return questions.map(q => this.createErrorResult(q, error, Date.now() - startTime));
    }
  }

  private createErrorResult(
    question: UnifiedQuestionContext,
    error: any,
    processingTime: number
  ): UnifiedGradingResult {
    return {
      questionId: question.questionId,
      questionNumber: question.questionNumber,
      isCorrect: false,
      pointsEarned: 0,
      pointsPossible: question.pointsPossible,
      confidence: 0.1,
      gradingMethod: 'openai_single',
      reasoning: `OpenAI processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTimeMs: processingTime,
      skillMappings: question.skillContext || [],
      qualityFlags: {
        fallbackUsed: true,
        reviewRequired: true
      }
    };
  }

  private updateStats(type: 'single' | 'batch', processingTime: number, cost: number): void {
    this.processingStats.totalProcessed++;
    this.processingStats.avgProcessingTime = 
      (this.processingStats.avgProcessingTime + processingTime) / 2;
    this.processingStats.totalCost += cost;

    if (type === 'single') {
      this.processingStats.singleRequests++;
    } else {
      this.processingStats.batchRequests++;
    }
  }

  getStats() {
    return { ...this.processingStats };
  }
}
