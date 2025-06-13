
import { ClassificationStrategy, ClassificationResult, ClassificationContext } from '../types';
import { skillClassificationConfig } from '@/config/skillClassificationConfig';

export class PatternMatchingStrategy implements ClassificationStrategy {
  name = 'pattern-matching';

  async classify(context: ClassificationContext): Promise<ClassificationResult | null> {
    const { skillName, subject } = context;
    const skillLower = skillName.toLowerCase();
    
    let bestMatch: { type: 'content' | 'subject'; confidence: number } | null = null;
    
    // Check content skill patterns
    for (const pattern of skillClassificationConfig.contentSkillPatterns) {
      if (skillLower.includes(pattern.pattern.toLowerCase())) {
        // Boost confidence if subject matches
        const confidence = pattern.subject === subject 
          ? Math.min(pattern.confidence + 0.1, 1.0)
          : pattern.confidence;
          
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { type: 'content', confidence };
        }
      }
    }
    
    // Check subject skill patterns
    for (const pattern of skillClassificationConfig.subjectSkillPatterns) {
      if (skillLower.includes(pattern.pattern.toLowerCase())) {
        if (!bestMatch || pattern.confidence > bestMatch.confidence) {
          bestMatch = { type: 'subject', confidence: pattern.confidence };
        }
      }
    }
    
    if (bestMatch && bestMatch.confidence >= skillClassificationConfig.defaultConfidenceThreshold) {
      console.log(`📊 Pattern match for "${skillName}": ${bestMatch.type} (confidence: ${bestMatch.confidence})`);
      return {
        skillType: bestMatch.type,
        confidence: bestMatch.confidence,
        strategy: this.name,
        metadata: { patternBased: true }
      };
    }
    
    return null;
  }
}
