
import { ClassificationStrategy, ClassificationResult, ClassificationContext } from '../types';

export class MetadataClassificationStrategy implements ClassificationStrategy {
  name = 'metadata';

  async classify(context: ClassificationContext): Promise<ClassificationResult | null> {
    const { exerciseData } = context;
    
    // Check for direct skill type in exercise data
    if (exerciseData?.skillType) {
      console.log('✅ Using stored skill type from exercise data:', exerciseData.skillType);
      return {
        skillType: exerciseData.skillType,
        confidence: 1.0,
        strategy: this.name,
        metadata: { source: 'exerciseData.skillType' }
      };
    }
    
    // Check for skill type in metadata
    if (exerciseData?.skillMetadata?.skillType) {
      console.log('✅ Using skill type from metadata:', exerciseData.skillMetadata.skillType);
      return {
        skillType: exerciseData.skillMetadata.skillType,
        confidence: 0.95,
        strategy: this.name,
        metadata: { source: 'exerciseData.skillMetadata.skillType' }
      };
    }
    
    return null;
  }
}
