import { UnifiedClassSessionIntegration } from "./unifiedClassSessionIntegration";
import { UnifiedTrailblazerIntegration } from "./unifiedTrailblazerIntegration";
import { UnifiedHomeLearnerIntegration } from "./unifiedHomeLearnerIntegration";
import { supabase } from "@/integrations/supabase/client";

export interface ActionLogEntry {
  id?: string;
  student_id: string;
  action_type: string;
  timestamp: string;
  reference_table?: string;
  reference_id?: string;
  context_summary?: Record<string, any>;
  session_type?: string;
}

/**
 * Enhanced action logger for tracking student activities and system events
 * Integrates with Supabase for persistent storage and real-time analytics
 */
export class EnhancedActionLogger {
  private static actionQueue: ActionLogEntry[] = [];
  private static isProcessing = false;

  /**
   * Log a student action or system event
   * @param actionData - Information about the action, including student ID, action type, and context
   */
  static logAction(actionData: {
    student_id: string;
    action_type: string;
    reference_table?: string;
    reference_id?: string;
    context_summary?: Record<string, any>;
    session_type?: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const logEntry: ActionLogEntry = {
        student_id: actionData.student_id,
        action_type: actionData.action_type,
        timestamp: new Date().toISOString(),
        reference_table: actionData.reference_table,
        reference_id: actionData.reference_id,
        context_summary: actionData.context_summary,
        session_type: actionData.session_type
      };

      EnhancedActionLogger.actionQueue.push(logEntry);
      EnhancedActionLogger.processQueue().then(resolve).catch(reject);
    });
  }

  /**
   * Processes the action queue, sending logs to Supabase in batches
   * Ensures that logs are processed in order and retries on failure
   */
  private static async processQueue(): Promise<void> {
    if (EnhancedActionLogger.isProcessing) {
      return;
    }

    EnhancedActionLogger.isProcessing = true;

    try {
      while (EnhancedActionLogger.actionQueue.length > 0) {
        const batch = EnhancedActionLogger.actionQueue.splice(0, 10); // Take up to 10 logs at a time
        const { data, error } = await supabase
          .from('action_logs')
          .insert(batch);

        if (error) {
          console.error('Error logging actions to Supabase:', error);
          // Re-add the batch to the beginning of the queue for retry
          EnhancedActionLogger.actionQueue.unshift(...batch);
          break; // Stop processing to avoid overwhelming the system
        } else {
          console.debug(`Batch of ${batch.length} actions logged successfully.`);
        }
      }
    } catch (error) {
      console.error('Unexpected error processing action queue:', error);
    } finally {
      EnhancedActionLogger.isProcessing = false;
      if (EnhancedActionLogger.actionQueue.length > 0) {
        // Ensure the queue is processed eventually
        setTimeout(() => {
          EnhancedActionLogger.processQueue();
        }, 1000); // Retry after 1 second
      }
    }
  }

  /**
   * Get action logs for a specific student
   * @param studentId - The ID of the student
   * @param limit - The maximum number of logs to return (default: 50)
   * @returns A promise that resolves with an array of action logs
   */
  static async getStudentActions(studentId: string, limit: number = 50): Promise<ActionLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching student actions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStudentActions:', error);
      return [];
    }
  }

  /**
   * Get recent system events
   * @param limit - The maximum number of events to return (default: 50)
   * @returns A promise that resolves with an array of action logs
   */
  static async getRecentSystemEvents(limit: number = 50): Promise<ActionLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .is('student_id', null)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching system events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentSystemEvents:', error);
      return [];
    }
  }

  /**
   * Analyze action patterns to identify common sequences or trends
   * This is a placeholder for more advanced analytics
   */
  static async analyzeActionPatterns(): Promise<any> {
    // Placeholder for advanced analytics logic
    console.log('Analyzing action patterns...');
    return Promise.resolve({ message: 'Action pattern analysis not implemented yet.' });
  }
}

/**
 * Enhanced action logger that automatically integrates with unified student results
 * This extends the existing service without changing its functionality
 */
export class EnhancedActionLoggerUnified {
  /**
   * Log action and determine if it should be recorded in unified system
   */
  static async logActionWithUnifiedIntegration(actionData: {
    student_id: string;
    action_type: string;
    session_type?: string;
    reference_id?: string;
    context_summary?: Record<string, any>;
  }): Promise<void> {
    try {
      // Call existing action logging (import from existing service)
      await EnhancedActionLogger.logAction(actionData);

      // Determine if this action represents a completion or misconception
      const { student_id, action_type, session_type, reference_id, context_summary } = actionData;

      if (action_type === 'exercise_completed' && context_summary) {
        await this.handleExerciseCompletion(student_id, session_type, reference_id, context_summary);
      } else if (action_type === 'misconception_detected' && context_summary) {
        await this.handleMisconceptionDetection(student_id, session_type, reference_id, context_summary);
      }

      console.log(`📊 Unified action logging completed: ${action_type}`);
    } catch (error) {
      console.error('Error in unified action logging:', error);
      // Don't throw - allow existing functionality to continue
    }
  }

  private static async handleExerciseCompletion(
    studentId: string,
    sessionType?: string,
    sessionId?: string,
    contextData?: Record<string, any>
  ): Promise<void> {
    if (!contextData) return;

    const { skill_name, skill_type, score, points_earned, points_possible } = contextData;
    
    if (!skill_name || score === undefined) return;

    switch (sessionType) {
      case 'class_session':
        await UnifiedClassSessionIntegration.recordClassSessionCompletion(
          sessionId || '',
          studentId,
          skill_name,
          skill_type || 'content',
          score,
          points_earned || 0,
          points_possible || 0,
          contextData
        );
        break;
      case 'trailblazer':
        await UnifiedTrailblazerIntegration.recordTrailblazerCompletion(
          studentId,
          skill_name,
          score,
          contextData.time_spent_minutes || 0,
          contextData
        );
        break;
      case 'practice':
        await UnifiedHomeLearnerIntegration.recordPracticeCompletion(
          studentId,
          sessionId || '',
          skill_name,
          skill_type || 'content',
          score,
          points_earned || 0,
          points_possible || 0,
          contextData
        );
        break;
    }
  }

  private static async handleMisconceptionDetection(
    studentId: string,
    sessionType?: string,
    sessionId?: string,
    contextData?: Record<string, any>
  ): Promise<void> {
    if (!contextData) return;

    const { 
      skill_name, 
      misconception_type, 
      misconception_category, 
      severity,
      question_id,
      student_answer,
      correct_answer
    } = contextData;
    
    if (!skill_name || !misconception_type) return;

    switch (sessionType) {
      case 'class_session':
        await UnifiedClassSessionIntegration.recordClassSessionMisconception(
          sessionId || '',
          studentId,
          skill_name,
          misconception_type,
          misconception_category || 'general',
          severity || 'medium',
          question_id,
          student_answer,
          correct_answer,
          contextData
        );
        break;
      case 'trailblazer':
        await UnifiedTrailblazerIntegration.recordTrailblazerMisconception(
          studentId,
          skill_name,
          misconception_type,
          severity || 'medium',
          contextData
        );
        break;
      case 'practice':
        await UnifiedHomeLearnerIntegration.recordPracticeMisconception(
          studentId,
          sessionId || '',
          skill_name,
          misconception_type,
          misconception_category || 'general',
          severity || 'medium',
          question_id,
          student_answer,
          correct_answer,
          contextData
        );
        break;
    }
  }
}
