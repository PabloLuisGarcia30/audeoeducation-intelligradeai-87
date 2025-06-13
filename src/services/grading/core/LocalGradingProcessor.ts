
import type { UnifiedQuestionContext, GradingContext, UnifiedGradingResult, GradingMethod } from '../types/UnifiedGradingTypes';

export class LocalGradingProcessor {
  private processingStats = {
    totalProcessed: 0,
    exactMatches: 0,
    flexibleMatches: 0,
    distilbertProcessed: 0,
    avgProcessingTime: 0
  };

  async processBasic(
    question: UnifiedQuestionContext, 
    method: GradingMethod
  ): Promise<UnifiedGradingResult> {
    const startTime = Date.now();
    
    try {
      const result = method === 'exact_match' 
        ? this.processExactMatch(question)
        : this.processFlexibleMatch(question);

      const processingTime = Date.now() - startTime;
      this.updateStats(method, processingTime);

      return {
        ...result,
        processingTimeMs: processingTime,
        skillMappings: question.skillContext || []
      };

    } catch (error) {
      console.error(`Local processing error for Q${question.questionNumber}:`, error);
      return this.createErrorResult(question, error, Date.now() - startTime);
    }
  }

  async processWithDistilBERT(
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<UnifiedGradingResult> {
    const startTime = Date.now();

    try {
      // Import the existing DistilBERT service
      const { EnhancedLocalGradingService } = await import('../../enhancedLocalGradingService');
      
      const mockQuestion = {
        questionNumber: question.questionNumber,
        detectedAnswer: { selectedOption: question.studentAnswer }
      };

      const mockAnswerKey = {
        question_number: question.questionNumber,
        correct_answer: question.correctAnswer,
        points: question.pointsPossible
      };

      const distilbertResult = await EnhancedLocalGradingService.gradeQuestionWithDistilBert(
        mockQuestion,
        mockAnswerKey,
        question.skillContext || []
      );

      const processingTime = Date.now() - startTime;
      this.updateStats('distilbert_local', processingTime);

      return {
        questionId: question.questionId,
        questionNumber: question.questionNumber,
        isCorrect: distilbertResult.isCorrect,
        pointsEarned: distilbertResult.pointsEarned,
        pointsPossible: question.pointsPossible,
        confidence: distilbertResult.confidence,
        gradingMethod: 'distilbert_local',
        reasoning: distilbertResult.reasoning,
        processingTimeMs: processingTime,
        skillMappings: question.skillContext || [],
        complexityScore: 0.6 // Medium complexity for DistilBERT processing
      };

    } catch (error) {
      console.error(`DistilBERT processing error for Q${question.questionNumber}:`, error);
      return this.createErrorResult(question, error, Date.now() - startTime);
    }
  }

  private processExactMatch(question: UnifiedQuestionContext): Omit<UnifiedGradingResult, 'processingTimeMs' | 'skillMappings'> {
    const cleanStudent = question.studentAnswer.toLowerCase().trim();
    const cleanCorrect = question.correctAnswer.toLowerCase().trim();
    const isCorrect = cleanStudent === cleanCorrect;

    return {
      questionId: question.questionId,
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned: isCorrect ? question.pointsPossible : 0,
      pointsPossible: question.pointsPossible,
      confidence: 0.99,
      gradingMethod: 'exact_match',
      reasoning: `Exact string comparison: "${question.studentAnswer}" ${isCorrect ? 'matches' : 'does not match'} "${question.correctAnswer}"`
    };
  }

  private processFlexibleMatch(question: UnifiedQuestionContext): Omit<UnifiedGradingResult, 'processingTimeMs' | 'skillMappings'> {
    const cleanStudent = question.studentAnswer.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const cleanCorrect = question.correctAnswer.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    let isCorrect = false;
    let confidence = 0.3;
    let reasoning = '';

    // Check exact match after cleaning
    if (cleanStudent === cleanCorrect) {
      isCorrect = true;
      confidence = 0.95;
      reasoning = 'Exact match after text normalization';
    }
    // Check if acceptable answers are provided
    else if (question.acceptableAnswers && question.acceptableAnswers.length > 0) {
      const normalizedAcceptable = question.acceptableAnswers.map(ans => 
        ans.toLowerCase().trim().replace(/[^\w\s]/g, '')
      );
      
      if (normalizedAcceptable.includes(cleanStudent)) {
        isCorrect = true;
        confidence = 0.90;
        reasoning = 'Match found in acceptable answers list';
      }
    }
    // Check partial matches for multiple choice
    else if (question.questionType === 'multiple-choice' && question.options) {
      const optionMatch = question.options.find(opt => 
        opt.toLowerCase().trim() === cleanStudent
      );
      
      if (optionMatch) {
        isCorrect = optionMatch.toLowerCase().trim() === cleanCorrect;
        confidence = 0.85;
        reasoning = `Multiple choice option selected: ${optionMatch}`;
      }
    }

    if (!isCorrect && !reasoning) {
      reasoning = `No match found: "${question.studentAnswer}" vs "${question.correctAnswer}"`;
    }

    return {
      questionId: question.questionId,
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned: isCorrect ? question.pointsPossible : 0,
      pointsPossible: question.pointsPossible,
      confidence,
      gradingMethod: 'flexible_match',
      reasoning
    };
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
      gradingMethod: 'exact_match',
      reasoning: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTimeMs: processingTime,
      skillMappings: question.skillContext || [],
      qualityFlags: {
        fallbackUsed: true,
        reviewRequired: true
      }
    };
  }

  private updateStats(method: GradingMethod, processingTime: number): void {
    this.processingStats.totalProcessed++;
    this.processingStats.avgProcessingTime = 
      (this.processingStats.avgProcessingTime + processingTime) / 2;

    switch (method) {
      case 'exact_match':
        this.processingStats.exactMatches++;
        break;
      case 'flexible_match':
        this.processingStats.flexibleMatches++;
        break;
      case 'distilbert_local':
        this.processingStats.distilbertProcessed++;
        break;
    }
  }

  getStats() {
    return { ...this.processingStats };
  }
}
