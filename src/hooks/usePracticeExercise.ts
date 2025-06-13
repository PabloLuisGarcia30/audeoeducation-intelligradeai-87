
import { useState, useCallback } from 'react';
import { PracticeExerciseService, PracticeExerciseResult } from '@/services/practiceExerciseService';
import { toast } from 'sonner';

export interface PracticeExerciseState {
  isLoading: boolean;
  isCompleting: boolean;
  error: string | null;
  result: PracticeExerciseResult | null;
}

export function usePracticeExercise() {
  const [state, setState] = useState<PracticeExerciseState>({
    isLoading: false,
    isCompleting: false,
    error: null,
    result: null
  });

  const completePracticeSession = useCallback(async (
    sessionId: string,
    finalScore: number,
    improvement: number,
    questionsAnswered: number = 4,
    timeSpent: number = 300
  ): Promise<PracticeExerciseResult | null> => {
    try {
      setState(prev => ({ ...prev, isCompleting: true, error: null }));
      
      console.log('🎯 Starting practice session completion:', {
        sessionId,
        finalScore,
        improvement,
        questionsAnswered,
        timeSpent
      });

      const result = await PracticeExerciseService.completePracticeSession(
        sessionId,
        finalScore,
        improvement,
        questionsAnswered,
        timeSpent
      );

      setState(prev => ({ 
        ...prev, 
        isCompleting: false, 
        result,
        error: null 
      }));

      toast.success(`Practice completed! Your score: ${finalScore}%`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete practice session';
      
      setState(prev => ({ 
        ...prev, 
        isCompleting: false, 
        error: errorMessage 
      }));
      
      console.error('❌ Error completing practice session:', error);
      toast.error(`Failed to save practice results: ${errorMessage}`);
      
      return null;
    }
  }, []);

  const createPracticeSession = useCallback(async (
    studentId: string,
    studentName: string,
    skillName: string,
    classId: string,
    className: string,
    subject: string,
    grade: string,
    currentSkillScore: number,
    difficultyLevel: string = 'adaptive',
    questionCount: number = 4
  ): Promise<string | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const sessionId = await PracticeExerciseService.createPracticeSession(
        studentId,
        studentName,
        skillName,
        classId,
        className,
        subject,
        grade,
        currentSkillScore,
        difficultyLevel,
        questionCount
      );

      setState(prev => ({ ...prev, isLoading: false }));
      
      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create practice session';
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      console.error('❌ Error creating practice session:', error);
      toast.error(`Failed to create practice session: ${errorMessage}`);
      
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearResult = useCallback(() => {
    setState(prev => ({ ...prev, result: null }));
  }, []);

  return {
    ...state,
    completePracticeSession,
    createPracticeSession,
    clearError,
    clearResult
  };
}
