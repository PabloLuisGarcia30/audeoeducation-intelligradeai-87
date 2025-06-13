
import { useState, useEffect, useCallback } from 'react';
import { SupercoachService } from '@/services/supercoachService';
import type { BehaviorSignals, PredictiveMisconceptionResult } from '@/services/supercoachService';

export function useSupercoachIntegration(studentId?: string) {
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [miniLessons, setMiniLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Track behavioral signals for predictive detection
  const [behaviorSignals, setBehaviorSignals] = useState<Partial<BehaviorSignals>>({
    answerChanges: 0,
    hesitationPatterns: {
      longPauses: 0,
      rapidChanges: 0,
      backtracking: false
    }
  });

  // Load student's data
  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const loadStudentData = async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const [alerts, lessons] = await Promise.all([
        SupercoachService.getPredictiveAlerts(false, 5),
        SupercoachService.getStudentMiniLessons(studentId, 10)
      ]);
      
      setPredictiveAlerts(alerts.filter(alert => alert.student_id === studentId));
      setMiniLessons(lessons);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Track answer changes for behavioral analysis
  const trackAnswerChange = useCallback(() => {
    setBehaviorSignals(prev => ({
      ...prev,
      answerChanges: (prev.answerChanges || 0) + 1
    }));
  }, []);

  // Track time spent on question
  const trackTimeSpent = useCallback((seconds: number) => {
    setBehaviorSignals(prev => ({
      ...prev,
      timeSpentSeconds: seconds
    }));
  }, []);

  // Run predictive detection
  const runPredictiveDetection = useCallback(async (
    questionId: string,
    questionContext: any,
    exerciseId?: string,
    examId?: string
  ): Promise<PredictiveMisconceptionResult | null> => {
    if (!studentId || !behaviorSignals.timeSpentSeconds) return null;

    try {
      const fullSignals: BehaviorSignals = {
        timeSpentSeconds: behaviorSignals.timeSpentSeconds,
        answerChanges: behaviorSignals.answerChanges || 0,
        hesitationPatterns: behaviorSignals.hesitationPatterns || {
          longPauses: 0,
          rapidChanges: 0,
          backtracking: false
        },
        questionDifficulty: 'medium', // Default or derive from context
        studentHistoricalPerformance: 0.7 // Default or get from profile
      };

      const result = await SupercoachService.detectPredictiveMisconception(
        studentId,
        questionId,
        fullSignals,
        questionContext,
        exerciseId,
        examId
      );

      // If high risk detected, refresh alerts
      if (result?.predicted && result.riskLevel === 'high') {
        loadStudentData();
      }

      return result;
    } catch (error) {
      console.error('Error in predictive detection:', error);
      return null;
    }
  }, [studentId, behaviorSignals]);

  // Generate adaptive mini-lesson
  const generateAdaptiveMiniLesson = useCallback(async (
    misconceptionSubtypeId: string,
    requestContext?: any
  ) => {
    if (!studentId) return null;

    try {
      const learningProfile = {
        preferredExplanationStyle: 'textual' as const,
        difficultyPreference: 'standard' as const,
        learningPace: 'normal' as const,
        commonMisconceptionPatterns: [],
        strengths: [],
        weaknesses: []
      };

      const lesson = await SupercoachService.generateAdaptiveMiniLesson(
        studentId,
        misconceptionSubtypeId,
        learningProfile,
        requestContext
      );

      if (lesson) {
        // Refresh mini-lessons list
        const updatedLessons = await SupercoachService.getStudentMiniLessons(studentId);
        setMiniLessons(updatedLessons);
      }

      return lesson;
    } catch (error) {
      console.error('Error generating adaptive mini-lesson:', error);
      return null;
    }
  }, [studentId]);

  // Reset behavioral signals (call when starting new question)
  const resetBehaviorTracking = useCallback(() => {
    setBehaviorSignals({
      answerChanges: 0,
      hesitationPatterns: {
        longPauses: 0,
        rapidChanges: 0,
        backtracking: false
      }
    });
  }, []);

  return {
    // Data
    predictiveAlerts,
    miniLessons,
    loading,
    
    // Behavior tracking
    behaviorSignals,
    trackAnswerChange,
    trackTimeSpent,
    resetBehaviorTracking,
    
    // Actions
    runPredictiveDetection,
    generateAdaptiveMiniLesson,
    refreshData: loadStudentData
  };
}
