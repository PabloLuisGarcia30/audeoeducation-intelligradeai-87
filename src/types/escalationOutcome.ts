
export interface EscalationOutcome {
  id?: string;
  student_id?: string;
  exam_id?: string;
  question_id?: string;
  session_id?: string;
  escalation_type: 'skill_ambiguity' | 'fallback_triggered' | 'model_escalation' | 'validation_failure';
  original_service: string;
  ambiguity_description: string;
  selected_solution: string;
  fallback_path?: string;
  original_confidence?: number;
  final_confidence?: number;
  models_used?: string[];
  processing_time_ms?: number;
  success?: boolean;
  quality_score?: number;
  cost_impact?: number;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface EscalationAnalytics {
  total_escalations: number;
  escalations_by_type: Record<string, number>;
  escalations_by_service: Record<string, number>;
  average_processing_time: number;
  success_rate: number;
  average_quality_score: number;
  total_cost_impact: number;
  recent_escalations: EscalationOutcome[];
}

export interface EscalationTrend {
  date: string;
  escalation_count: number;
  success_rate: number;
  average_quality: number;
}

export interface EscalationPattern {
  pattern_type: string;
  frequency: number;
  common_solutions: string[];
  success_rate: number;
  services_affected: string[];
}
