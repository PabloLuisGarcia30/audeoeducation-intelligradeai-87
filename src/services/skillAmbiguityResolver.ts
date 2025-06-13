import { supabase } from "@/integrations/supabase/client";
import { EscalationLogger } from "./escalationLogger";

export interface SkillAmbiguityResult {
  questionNumber: number;
  matchedSkills: string[];
  confidence: number;
  isAmbiguous: boolean;
  escalated: boolean;
  reasoning: string;
  originalSkills: string[];
}

export interface SkillAmbiguityConfig {
  maxSkillsPerQuestion: number;
  minSkillsRequired: number;
  ambiguityThreshold: number;
  escalationModel: 'gpt-4.1-2025-04-14' | 'gpt-4o-mini';
}

const DEFAULT_SKILL_CONFIG: SkillAmbiguityConfig = {
  maxSkillsPerQuestion: 2, // Maximum skills allowed before escalation
  minSkillsRequired: 1,    // Minimum skills required
  ambiguityThreshold: 0.7, // Confidence threshold for skill matching
  escalationModel: 'gpt-4.1-2025-04-14'
};

export class SkillAmbiguityResolver {
  private config: SkillAmbiguityConfig;

  constructor(config: Partial<SkillAmbiguityConfig> = {}) {
    this.config = { ...DEFAULT_SKILL_CONFIG, ...config };
  }

  analyzeSkillAmbiguity(
    questionNumber: number,
    questionText: string,
    studentAnswer: string,
    preClassifiedSkills: { contentSkills: any[]; subjectSkills: any[] },
    detectedSkills: string[],
    confidence: number
  ): { isAmbiguous: boolean; reason: string } {
    // With pre-classified skills, we primarily validate against the pre-classification
    const totalPreClassifiedSkills = preClassifiedSkills.contentSkills.length + preClassifiedSkills.subjectSkills.length;
    
    if (totalPreClassifiedSkills === 0) {
      return {
        isAmbiguous: true,
        reason: 'No pre-classified skills available for this question'
      };
    }

    // Check if detected skills exceed pre-classified skills significantly
    if (detectedSkills.length > totalPreClassifiedSkills + 1) {
      return {
        isAmbiguous: true,
        reason: `Detected skills (${detectedSkills.length}) exceed pre-classified skills (${totalPreClassifiedSkills})`
      };
    }

    // Check confidence threshold
    if (confidence < this.config.ambiguityThreshold) {
      return {
        isAmbiguous: true,
        reason: `Low confidence in skill matching (${confidence} < ${this.config.ambiguityThreshold})`
      };
    }

    return { isAmbiguous: false, reason: 'Skills align with pre-classification' };
  }

  async escalateAmbiguousSkillMatch(
    questionNumber: number,
    questionText: string,
    studentAnswer: string,
    preClassifiedSkills: { contentSkills: any[]; subjectSkills: any[] },
    originalDetection: string[]
  ): Promise<SkillAmbiguityResult> {
    const startTime = Date.now();
    let escalationId: string | null = null;

    try {
      // Use pre-classified skills as the authority for skill matching
      const availableSkills = [
        ...preClassifiedSkills.contentSkills.map(s => s.name),
        ...preClassifiedSkills.subjectSkills.map(s => s.name)
      ];

      const escalationPrompt = this.createEscalationPromptWithPreClassification(
        questionText,
        studentAnswer,
        availableSkills,
        preClassifiedSkills,
        originalDetection
      );

      // Log the escalation
      escalationId = await EscalationLogger.logSkillAmbiguity({
        questionId: `q${questionNumber}`,
        originalService: 'SkillAmbiguityResolver',
        ambiguityDescription: `Skill ambiguity for question ${questionNumber}: detected ${originalDetection.length} skills`,
        selectedSolution: 'GPT escalation with pre-classified authority',
        originalConfidence: 0.5, // Default low confidence triggering escalation
        context: {
          question_text: questionText,
          student_answer: studentAnswer,
          original_detection: originalDetection,
          pre_classified_skills: preClassifiedSkills,
          available_skills: availableSkills
        }
      });

      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          escalationMode: true,
          questionNumber,
          questionText,
          studentAnswer,
          preClassifiedSkills,
          escalationPrompt,
          model: this.config.escalationModel
        }
      });

      const processingTime = Date.now() - startTime;

      if (error) {
        console.error('Skill escalation failed:', error);
        
        // Update escalation with failure result
        if (escalationId) {
          await EscalationLogger.updateEscalationResult(escalationId, false, 0.3);
        }
        
        return this.createFallbackResultWithPreClassification(questionNumber, originalDetection, preClassifiedSkills);
      }

      const result = data.skillEscalation || {};
      const finalConfidence = result.confidence || 0.8;
      
      // Update escalation with success result
      if (escalationId) {
        await EscalationLogger.updateEscalationResult(
          escalationId, 
          true, 
          finalConfidence,
          undefined,
          {
            processing_time_ms: processingTime,
            final_confidence: finalConfidence,
            matched_skills: result.matchedSkills
          }
        );
      }

      return {
        questionNumber,
        matchedSkills: result.matchedSkills || availableSkills,
        confidence: finalConfidence,
        isAmbiguous: false,
        escalated: true,
        reasoning: result.reasoning || 'Escalated with pre-classified skills authority',
        originalSkills: originalDetection
      };

    } catch (error) {
      console.error('Skill escalation error:', error);
      
      // Update escalation with error result
      if (escalationId) {
        await EscalationLogger.updateEscalationResult(escalationId, false, 0.2, undefined, {
          error: error instanceof Error ? error.message : 'Unknown error',
          processing_time_ms: Date.now() - startTime
        });
      }
      
      return this.createFallbackResultWithPreClassification(questionNumber, originalDetection, preClassifiedSkills);
    }
  }

  private createEscalationPromptWithPreClassification(
    questionText: string,
    studentAnswer: string,
    availableSkills: string[],
    preClassifiedSkills: { contentSkills: any[]; subjectSkills: any[] },
    originalDetection: string[]
  ): string {
    return `SKILL MATCHING ESCALATION WITH PRE-CLASSIFIED AUTHORITY

Question: ${questionText}
Student Answer: ${studentAnswer}

PRE-CLASSIFIED SKILLS (AUTHORITY):
Content Skills: ${preClassifiedSkills.contentSkills.map(s => s.name).join(', ')}
Subject Skills: ${preClassifiedSkills.subjectSkills.map(s => s.name).join(', ')}

Original Detection: ${originalDetection.join(', ')}

INSTRUCTIONS:
1. Use the pre-classified skills as the primary authority
2. The pre-classified skills were determined by expert analysis
3. Only deviate from pre-classified skills if there's strong evidence
4. Provide confidence based on alignment with pre-classification

REQUIRED OUTPUT FORMAT (JSON):
{
  "matchedSkills": ["skill1", "skill2"],
  "confidence": 0.95,
  "reasoning": "Detailed explanation using pre-classified skills as authority",
  "alignsWithPreClassification": true
}`;
  }

  private createFallbackResultWithPreClassification(
    questionNumber: number,
    originalSkills: string[],
    preClassifiedSkills: { contentSkills: any[]; subjectSkills: any[] }
  ): SkillAmbiguityResult {
    // Use pre-classified skills as fallback
    const fallbackSkills = [
      ...preClassifiedSkills.contentSkills.map(s => s.name),
      ...preClassifiedSkills.subjectSkills.map(s => s.name)
    ];
    
    return {
      questionNumber,
      matchedSkills: fallbackSkills.length > 0 ? fallbackSkills : ['General'],
      confidence: 0.7,
      isAmbiguous: false,
      escalated: true,
      reasoning: 'Fallback using pre-classified skills authority',
      originalSkills
    };
  }

  async processQuestionSkills(questions: Array<{
    questionNumber: number;
    questionText: string;
    studentAnswer: string;
    preClassifiedSkills: { contentSkills: any[]; subjectSkills: any[] };
    detectedSkills: string[];
    confidence: number;
  }>): Promise<SkillAmbiguityResult[]> {
    const results: SkillAmbiguityResult[] = [];

    for (const question of questions) {
      const ambiguityCheck = this.analyzeSkillAmbiguity(
        question.questionNumber,
        question.questionText,
        question.studentAnswer,
        question.preClassifiedSkills,
        question.detectedSkills,
        question.confidence
      );

      if (ambiguityCheck.isAmbiguous) {
        console.log(`🎯 Escalating ambiguous skill match for Q${question.questionNumber}: ${ambiguityCheck.reason}`);
        
        const escalatedResult = await this.escalateAmbiguousSkillMatch(
          question.questionNumber,
          question.questionText,
          question.studentAnswer,
          question.preClassifiedSkills,
          question.detectedSkills
        );
        
        results.push(escalatedResult);
      } else {
        results.push({
          questionNumber: question.questionNumber,
          matchedSkills: question.detectedSkills,
          confidence: question.confidence,
          isAmbiguous: false,
          escalated: false,
          reasoning: ambiguityCheck.reason,
          originalSkills: question.detectedSkills
        });
      }
    }

    return results;
  }

  updateConfiguration(config: Partial<SkillAmbiguityConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🎯 Skill ambiguity resolver configuration updated:', this.config);
  }

  getConfiguration(): SkillAmbiguityConfig {
    return { ...this.config };
  }
}
