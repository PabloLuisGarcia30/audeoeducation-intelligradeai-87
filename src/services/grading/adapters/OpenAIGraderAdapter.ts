
import { BaseBatchGrader } from '../BatchGrader';
import { QuestionInput, BatchGradingResult, GradedAnswer } from '../types';
import { supabase } from "@/integrations/supabase/client";

export class OpenAIGraderAdapter extends BaseBatchGrader {
  private readonly systemPrompt = `You are an expert educational grading assistant. Grade each question independently and provide detailed feedback.

CRITICAL PROCESSING RULES:
1. Process each question as a completely separate task
2. Do NOT let answers from one question influence another
3. Provide accurate scoring based on correctness
4. Include detailed reasoning for each grade
5. Match skills only from the provided list for each question

Always respond with valid JSON matching the requested format.`;

  constructor() {
    super({
      maxBatchSize: 4, // Conservative batch size for quality
      timeoutMs: 60000,
      retryAttempts: 2
    });
  }

  async gradeBatch(questions: QuestionInput[]): Promise<BatchGradingResult> {
    const startTime = Date.now();
    const allResults: GradedAnswer[] = [];
    const chunks = this.chunkQuestions(questions);
    
    let totalTokens = 0;
    let totalCost = 0;
    let fallbackUsed = false;

    for (const chunk of chunks) {
      try {
        const chunkResults = await this.processChunk(chunk);
        allResults.push(...chunkResults.results);
        
        if (chunkResults.usage) {
          totalTokens += chunkResults.usage.totalTokens;
          totalCost += chunkResults.usage.estimatedCost;
        }
      } catch (error) {
        console.error('OpenAI chunk processing failed:', error);
        fallbackUsed = true;
        
        // Add fallback results for failed chunk
        const fallbackResults = chunk.map(q => this.createFallbackResult(q, error.message));
        allResults.push(...fallbackResults);
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
        failureCount: allResults.filter(r => r.model === 'rule').length, // Fallback results use 'rule' model
        fallbackUsed,
        correlationId: `openai_${Date.now()}`
      },
      usage: {
        promptTokens: Math.floor(totalTokens * 0.7), // Estimate
        completionTokens: Math.floor(totalTokens * 0.3), // Estimate
        totalTokens,
        estimatedCost: totalCost
      }
    };
  }

  private async processChunk(questions: QuestionInput[]): Promise<BatchGradingResult> {
    const prompt = this.createBatchPrompt(questions);

    const { data, error } = await supabase.functions.invoke('grade-complex-question', {
      body: {
        batchMode: true,
        questions: questions.map(q => ({
          questionNumber: parseInt(q.id) || 1,
          questionText: q.prompt,
          studentAnswer: q.studentAnswer,
          correctAnswer: q.correctAnswer || '',
          pointsPossible: q.pointsPossible || 1,
          skillContext: q.skillTags.join(', ')
        })),
        enhancedBatchPrompt: prompt
      }
    });

    if (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }

    const results = this.parseOpenAIResponse(data.results || [], questions);
    
    return {
      results,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
        estimatedCost: (data.usage.total_tokens || 0) * 0.002 / 1000 // Rough estimate
      } : undefined
    };
  }

  private createBatchPrompt(questions: QuestionInput[]): string {
    const questionCount = questions.length;
    
    return `Grade ${questionCount} test questions with enhanced cross-question isolation. Process each question INDEPENDENTLY.

QUESTIONS TO GRADE:
${questions.map((q, index) => `
Question ${index + 1} (ID: ${q.id}):
Question Text: ${q.prompt}
Student Answer: "${q.studentAnswer}"
Correct Answer: "${q.correctAnswer || 'Not provided'}"
Points Possible: ${q.pointsPossible || 1}
Skills: ${q.skillTags.join(', ') || 'General'}
---`).join('\n')}

REQUIRED OUTPUT FORMAT (JSON object with results array):
{
  "results": [
    {
      "questionNumber": 1,
      "isCorrect": true,
      "pointsEarned": 2,
      "confidence": 0.95,
      "reasoning": "Detailed explanation focusing on this question only",
      "complexityScore": 0.6,
      "reasoningDepth": "medium",
      "matchedSkills": ["skill1"],
      "skillConfidence": 0.9
    }
  ]
}

Return exactly ${questionCount} results. Process each question independently.`;
  }

  private parseOpenAIResponse(apiResults: any[], questions: QuestionInput[]): GradedAnswer[] {
    return questions.map((question, index) => {
      const apiResult = apiResults[index];
      
      if (!apiResult) {
        return this.createFallbackResult(question, 'Missing API result');
      }

      const pointsEarned = apiResult.pointsEarned || 0;
      const pointsPossible = question.pointsPossible || 1;

      return {
        questionId: question.id,
        score: (pointsEarned / pointsPossible) * 100,
        pointsEarned,
        pointsPossible,
        isCorrect: apiResult.isCorrect || false,
        rationale: apiResult.reasoning || apiResult.rationale || 'OpenAI grading result',
        feedback: apiResult.feedback,
        model: 'openai',
        confidence: apiResult.confidence || 0.8,
        gradingMethod: 'openai_batch_unified',
        complexityScore: apiResult.complexityScore || 0.5,
        reasoningDepth: apiResult.reasoningDepth || 'medium',
        skillMappings: apiResult.matchedSkills ? 
          apiResult.matchedSkills.map((skill: string) => ({
            skill_name: skill,
            confidence: apiResult.skillConfidence || 0.8
          })) : [],
        qualityFlags: {
          openAIProcessed: true,
          batchProcessed: true,
          enhancedProcessing: true,
          qualityFirst: true
        }
      };
    });
  }

  private createFallbackResult(question: QuestionInput, reason: string): GradedAnswer {
    return {
      questionId: question.id,
      score: 0,
      pointsEarned: 0,
      pointsPossible: question.pointsPossible || 1,
      isCorrect: false,
      rationale: `OpenAI grading failed: ${reason}. Manual review required.`,
      model: 'rule', // Using 'rule' to indicate fallback
      confidence: 0.3,
      gradingMethod: 'openai_fallback',
      qualityFlags: {
        requiresManualReview: true,
        openAIProcessed: false
      }
    };
  }
}
