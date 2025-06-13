
export interface ClassificationResult {
  skillType: 'content' | 'subject';
  confidence: number;
  strategy: string;
  metadata?: Record<string, any>;
}

export interface ClassificationContext {
  skillName: string;
  studentId?: string;
  subject?: string;
  grade?: string;
  exerciseData?: any;
}

export interface ClassificationStrategy {
  name: string;
  classify(context: ClassificationContext): Promise<ClassificationResult | null>;
}
