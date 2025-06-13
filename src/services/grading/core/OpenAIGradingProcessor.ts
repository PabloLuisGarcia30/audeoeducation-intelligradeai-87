
import type { UnifiedQuestionContext, GradingContext, UnifiedGradingResult } from '../types/UnifiedGradingTypes';
import { supabase } from '@/integrations/supabase/client';

export class OpenAIGradingProcessor {
  private processingStats = {
    totalProcessed: 0,
    totalBatches: 0,
    totalCost: 0,
    avgProcessingTime: 0,
    avgConfidence: 0
  };

  async processSingle(
    question: UnifiedQuestionContext,
    context: GradingContext
  ): Promise<UnifiedGradingResult> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          questionText: question.questionText,
          studentAnswer: question.studentAnswer,
          correctAnswer: question.correctAnswer,
          pointsPossible: question.pointsPossible,
          questionNumber: question.questionNumber,
          studentName: context.studentName,
          skillContext: question.skillContext?.map(s => s.skillName).join(', '),
          subject: context.subject,
          questionType: question.questionType
        }
      });

      if (error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }

      const processingTime = Date.now() - startTime;
      this.updateSingleStats(processingTime, data.confidence || 0.8, data.usage);

      return {
        questionId: question.questionId,
        questionNumber: question.questionNumber,
        isCorrect: data.isCorrect,
        pointsEarned: data.pointsEarned || 0,
        pointsPossible: question.pointsPossible,
        confidence: data.confidence || 0.8,
        gradingMethod: 'openai_single',
        reasoning: data.reasoning || 'OpenAI single question processing',
        processingTimeMs: processingTime,
        skillMappings: question.skillContext || [],
        complexityScore: data.complexityScore || 0.7,
        misconceptionAnalysis: data.misconceptionCategory ? {
          categoryName: data.misconceptionCategory,
          subtypeName: data.misconceptionSubtype,
          confidence: data.misconceptionConfidence,
          reasoning: data.misconceptionReasoning
        } : undefined,
        openAIUsage: {
          promptTokens: data.usage?.promptTokens || 0,
          completionTokens: data.usage?.completionTokens || 0,
          totalTokens: data.usage?.totalTokens || 0,
          estimatedCost: ((data.usage?.totalTokens || 0) * 0.002) / 1000
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
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          batchMode: true,
          questions: questions.map(q => ({
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            studentAnswer: q.studentAnswer,
            correctAnswer: q.correctAnswer,
            pointsPossible: q.pointsPossible,
            skillContext: q.skillContext?.map(s => s.skillName).join(', ')
          })),
          studentName: context.studentName,
          enhancedBatchPrompt: this.createBatchPrompt(questions, context)
        }
      });

      if (error) {
        throw new Error(`OpenAI batch API error: ${error.message}`);
      }

      const processingTime = Date.now() - startTime;
      const batchResults = data.results || [];

      // Convert batch results to unified format
      const results: UnifiedGradingResult[] = questions.map((question, index) => {
        const result = batchResults[index];
        
        if (!result) {
          return this.createErrorResult(question, new Error('Missing batch result'), processingTime);
        }

        return {
          questionId: question.questionId,
          questionNumber: question.questionNumber,
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned || 0,
          pointsPossible: question.pointsPossible,
          confidence: result.confidence || 0.8,
          gradingMethod: 'openai_batch',
          reasoning: result.reasoning || 'OpenAI batch processing',
          processingTimeMs: processingTime / questions.length,
          skillMappings: question.skillContext || [],
          complexityScore: result.complexityScore || 0.7,
          openAIUsage: {
            promptTokens: Math.floor((data.usage?.promptTokens || 0) / questions.length),
            completionTokens: Math.floor((data.usage?.completionTokens || 0) / questions.length),
            totalTokens: Math.floor((data.usage?.totalTokens || 0) / questions.length),
            estimatedCost: ((data.usage?.totalTokens || 0) * 0.002) / 1000 / questions.length
          }
        };
      });

      this.updateBatchStats(questions.length, processingTime, data.usage);

      return results;

    } catch (error) {
      console.error('OpenAI batch processing error:', error);
      
      // Return error results for all questions
      return questions.map(question => 
        this.createErrorResult(question, error, Date.now() - startTime)
      );
    }
  }

  private createBatchPrompt(questions: UnifiedQuestionContext[], context: GradingContext): string {
    return `Grade ${questions.length} questions for ${context.studentName || 'student'} in ${context.subject || 'unknown subject'}.

QUESTIONS:
${questions.map((q, index) => `
Q${q.questionNumber}: ${q.questionText}
Student Answer: "${q.studentAnswer}"
Correct Answer: "${q.correctAnswer}"
Points: ${q.pointsPossible}
Skills: ${q.skillContext?.map(s => s.skillName).join(', ') || 'General'}
`).join('\n---\n')}

Return JSON array with results for each question including isCorrect, pointsEarned, confidence, reasoning, and complexityScore.`;
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

  private updateSingleStats(processingTime: number, confidence: number, usage: any): void {
    this.processingStats.totalProcessed++;
    this.processingStats.avgProcessingTime = 
      (this.processingStats.avgProcessingTime + processingTime) / 2;
    this.processingStats.avgConfidence = 
      (this.processingStats.avgConfidence + confidence) / 2;
    
    if (usage?.totalTokens) {
      this.processingStats.totalCost += (usage.totalTokens * 0.002) / 1000;
    }
  }

  private updateBatchStats(batchSize: number, processingTime: number, usage: any): void {
    this.processingStats.totalBatches++;
    this.processingStats.totalProcessed += batchSize;
    this.processingStats.avgProcessingTime = 
      (this.processingStats.avgProcessingTime + processingTime) / 2;
    
    if (usage?.totalTokens) {
      this.processingStats.totalCost += (usage.totalTokens * 0.002) / 1000;
    }
  }

  getStats() {
    return { ...this.processingStats };
  }
}
