
import { BaseBatchGrader } from '../BatchGrader';
import { QuestionInput, BatchGradingResult, GradedAnswer } from '../types';
import { WasmDistilBertService } from '../../wasmDistilBertService';

export class DistilBERTGraderAdapter extends BaseBatchGrader {
  constructor() {
    super({
      maxBatchSize: 10, // DistilBERT can handle larger batches efficiently
      timeoutMs: 30000,
      retryAttempts: 2
    });
  }

  async gradeBatch(questions: QuestionInput[]): Promise<BatchGradingResult> {
    const startTime = Date.now();
    const chunks = this.chunkQuestions(questions);
    const allResults: GradedAnswer[] = [];
    
    let totalProcessingTime = 0;
    let fallbackCount = 0;

    for (const chunk of chunks) {
      try {
        const chunkResults = await this.processChunk(chunk);
        allResults.push(...chunkResults);
        totalProcessingTime += chunkResults.reduce((sum, r) => sum + (r.qualityFlags?.processingTime || 0), 0);
      } catch (error) {
        console.error('DistilBERT chunk processing failed:', error);
        
        // Add fallback results for failed chunk
        const fallbackResults = chunk.map(q => this.createFallbackResult(q, error.message));
        allResults.push(...fallbackResults);
        fallbackCount += chunk.length;
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      results: allResults,
      metadata: {
        totalQuestions: questions.length,
        processingTime,
        batchSize: questions.length,
        averageConfidence: allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length,
        failureCount: fallbackCount,
        fallbackUsed: fallbackCount > 0,
        correlationId: `distilbert_${Date.now()}`
      }
    };
  }

  private async processChunk(questions: QuestionInput[]): Promise<GradedAnswer[]> {
    const wasmQuestions = questions.map(q => ({
      studentAnswer: q.studentAnswer,
      correctAnswer: q.correctAnswer || '',
      questionNumber: parseInt(q.id) || 1,
      questionClassification: {
        complexity: this.classifyComplexity(q),
        type: q.questionType || 'short-answer'
      }
    }));

    const wasmResults = await WasmDistilBertService.batchGradeWithLargeWasm(wasmQuestions);

    return wasmResults.map((result, index) => {
      const question = questions[index];
      const pointsPossible = question.pointsPossible || 1;
      const pointsEarned = result.isCorrect ? pointsPossible : 0;

      return {
        questionId: question.id,
        score: result.isCorrect ? 100 : 0,
        pointsEarned,
        pointsPossible,
        isCorrect: result.isCorrect,
        rationale: result.reasoning,
        model: 'distilbert',
        confidence: result.confidence,
        gradingMethod: result.method,
        complexityScore: this.getComplexityScore(question),
        reasoningDepth: this.getReasoningDepth(result.confidence),
        skillMappings: question.skillTags.map(skill => ({
          skill_name: skill,
          confidence: result.confidence
        })),
        qualityFlags: {
          wasmProcessed: result.method === 'wasm_distilbert_large',
          localAIProcessed: true,
          processingTime: result.processingTime,
          semanticMatchingUsed: result.similarity > 0.5
        }
      };
    });
  }

  private createFallbackResult(question: QuestionInput, reason: string): GradedAnswer {
    // Enhanced pattern matching fallback
    const studentAnswer = question.studentAnswer.toLowerCase().trim();
    const correctAnswer = (question.correctAnswer || '').toLowerCase().trim();
    
    const isExactMatch = studentAnswer === correctAnswer;
    const isPartialMatch = studentAnswer.includes(correctAnswer) || correctAnswer.includes(studentAnswer);
    
    let isCorrect = false;
    let confidence = 0.3;
    
    if (isExactMatch) {
      isCorrect = true;
      confidence = 0.9;
    } else if (isPartialMatch && correctAnswer.length > 0) {
      isCorrect = true;
      confidence = 0.6;
    }

    const pointsPossible = question.pointsPossible || 1;
    const pointsEarned = isCorrect ? pointsPossible : 0;

    return {
      questionId: question.id,
      score: isCorrect ? 100 : 0,
      pointsEarned,
      pointsPossible,
      isCorrect,
      rationale: `DistilBERT fallback: ${reason}. Using pattern matching - ${isCorrect ? 'Match found' : 'No match'}.`,
      model: 'rule',
      confidence,
      gradingMethod: 'distilbert_pattern_fallback',
      qualityFlags: {
        requiresManualReview: !isCorrect,
        wasmProcessed: false,
        localAIProcessed: false
      }
    };
  }

  private classifyComplexity(question: QuestionInput): 'simple' | 'medium' | 'complex' {
    const prompt = question.prompt.toLowerCase();
    const answerLength = question.studentAnswer.length;
    
    if (prompt.includes('explain') || prompt.includes('analyze') || answerLength > 50) {
      return 'complex';
    } else if (prompt.includes('compare') || prompt.includes('describe') || answerLength > 20) {
      return 'medium';
    }
    return 'simple';
  }

  private getComplexityScore(question: QuestionInput): number {
    const complexity = this.classifyComplexity(question);
    switch (complexity) {
      case 'simple': return 0.3;
      case 'medium': return 0.6;
      case 'complex': return 0.9;
      default: return 0.5;
    }
  }

  private getReasoningDepth(confidence: number): 'shallow' | 'medium' | 'deep' {
    if (confidence >= 0.8) return 'deep';
    if (confidence >= 0.6) return 'medium';
    return 'shallow';
  }
}
