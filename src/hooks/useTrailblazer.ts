
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trailblazerService } from '@/services/trailblazerService';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { DEV_CONFIG } from '@/config/devConfig';
import { toast } from 'sonner';

export const useTrailblazer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize user data when they first visit
  useEffect(() => {
    if (user || DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
      trailblazerService.initializeUser().catch((error) => {
        console.error('Failed to initialize user:', error);
        setAuthError(error.message);
      });
    }
  }, [user]);

  // Helper function to determine if queries should be enabled
  const shouldEnableQueries = () => {
    return !!(user || DEV_CONFIG.DISABLE_AUTH_FOR_DEV);
  };

  // Get user streak data
  const { data: streak, isLoading: streakLoading, error: streakError } = useQuery({
    queryKey: ['trailblazer', 'streak'],
    queryFn: trailblazerService.getUserStreak,
    enabled: shouldEnableQueries(),
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.message?.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Get concept mastery data
  const { data: concepts = [], isLoading: conceptsLoading, error: conceptsError } = useQuery({
    queryKey: ['trailblazer', 'concepts'],
    queryFn: trailblazerService.getConceptMastery,
    enabled: shouldEnableQueries(),
    retry: (failureCount, error) => {
      if (error.message?.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Get recent sessions
  const { data: recentSessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['trailblazer', 'sessions'],
    queryFn: () => trailblazerService.getRecentSessions(5),
    enabled: shouldEnableQueries(),
    retry: (failureCount, error) => {
      if (error.message?.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Get achievements
  const { data: achievements = [], isLoading: achievementsLoading, error: achievementsError } = useQuery({
    queryKey: ['trailblazer', 'achievements'],
    queryFn: trailblazerService.getAchievements,
    enabled: shouldEnableQueries(),
    retry: (failureCount, error) => {
      if (error.message?.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Get student's enrolled classes
  const { data: enrolledClasses = [], isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ['trailblazer', 'enrolledClasses'],
    queryFn: trailblazerService.getEnrolledClasses,
    enabled: shouldEnableQueries(),
    retry: (failureCount, error) => {
      if (error.message?.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Get class concepts for a specific class
  const getClassConcepts = (classId: string) => {
    return useQuery({
      queryKey: ['trailblazer', 'classConcepts', classId],
      queryFn: () => trailblazerService.getClassConcepts(classId),
      enabled: !!classId,
    });
  };

  // Get current active session
  const { data: activeSession, isLoading: activeSessionLoading, error: activeSessionError } = useQuery({
    queryKey: ['trailblazer', 'activeSession'],
    queryFn: trailblazerService.getCurrentActiveSession,
    enabled: shouldEnableQueries(),
    retry: (failureCount, error) => {
      if (error.message?.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Get session misconceptions
  const getSessionMisconceptions = (sessionId: string) => {
    return useQuery({
      queryKey: ['trailblazer', 'sessionMisconceptions', sessionId],
      queryFn: () => trailblazerService.getSessionMisconceptions(sessionId),
      enabled: !!sessionId,
    });
  };

  // Enhanced start session mutation with better error handling
  const startSessionMutation = useMutation({
    mutationFn: ({ goalType, focusConcept, durationMinutes, classId, subject, grade }: {
      goalType: string;
      focusConcept: string;
      durationMinutes: number;
      classId?: string;
      subject?: string;
      grade?: string;
    }) => trailblazerService.startSession(goalType, focusConcept, durationMinutes, classId, subject, grade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailblazer'] });
      setAuthError(null); // Clear any previous auth errors
    },
    onError: (error: Error) => {
      console.error('Failed to start session:', error);
      setAuthError(error.message);
      
      // Show user-friendly error message
      if (error.message.includes('not authenticated')) {
        if (DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
          toast.error('Dev mode authentication error. Check console for details.');
        } else {
          toast.error('Please log in to start a session.');
        }
      } else {
        toast.error('Failed to start session. Please try again.');
      }
    },
  });

  // Record misconception during session
  const recordMisconceptionMutation = useMutation({
    mutationFn: ({ sessionId, misconceptionId, questionSequence }: {
      sessionId: string;
      misconceptionId: string;
      questionSequence?: number;
    }) => trailblazerService.recordSessionMisconception(sessionId, misconceptionId, questionSequence),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trailblazer', 'sessionMisconceptions', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['trailblazer', 'activeSession'] });
    },
    onError: (error: Error) => {
      console.error('Failed to record misconception:', error);
      toast.error('Failed to record learning data.');
    },
  });

  // Enhanced complete session mutation with misconception support
  const completeSessionMutation = useMutation({
    mutationFn: ({ sessionId, actualDuration, scoreImprovement, misconceptionEvents }: {
      sessionId: string;
      actualDuration: number;
      scoreImprovement?: number;
      misconceptionEvents?: Array<{
        misconceptionId: string;
        questionSequence?: number;
        resolved: boolean;
      }>;
    }) => {
      if (misconceptionEvents) {
        return trailblazerService.completeSessionWithMisconceptions(
          sessionId, 
          actualDuration, 
          scoreImprovement, 
          misconceptionEvents
        );
      } else {
        return trailblazerService.completeSession(sessionId, actualDuration, scoreImprovement);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailblazer'] });
    },
    onError: (error: Error) => {
      console.error('Failed to complete session:', error);
      toast.error('Failed to complete session. Your progress may not be saved.');
    },
  });

  // Collect all query errors for debugging
  const queryErrors = [
    streakError,
    conceptsError,
    sessionsError,
    achievementsError,
    classesError,
    activeSessionError
  ].filter(Boolean);

  // Log authentication-related errors for debugging
  useEffect(() => {
    if (queryErrors.length > 0) {
      const authErrors = queryErrors.filter(error => 
        error.message?.includes('not authenticated')
      );
      
      if (authErrors.length > 0) {
        console.warn('Authentication errors detected:', {
          errors: authErrors,
          devMode: DEV_CONFIG.DISABLE_AUTH_FOR_DEV,
          hasUser: !!user,
          authError
        });
      }
    }
  }, [queryErrors, user, authError]);

  const isLoading = streakLoading || conceptsLoading || sessionsLoading || achievementsLoading || classesLoading || activeSessionLoading;

  return {
    // Data
    streak,
    concepts,
    recentSessions,
    achievements,
    enrolledClasses,
    getClassConcepts,
    activeSession,
    getSessionMisconceptions,
    
    // Loading states
    isLoading,
    
    // Error states
    authError,
    hasErrors: queryErrors.length > 0,
    
    // Mutations
    startSession: startSessionMutation.mutateAsync,
    recordSessionMisconception: recordMisconceptionMutation.mutateAsync,
    completeSession: completeSessionMutation.mutateAsync,
    
    // Mutation states
    isStartingSession: startSessionMutation.isPending,
    isRecordingMisconception: recordMisconceptionMutation.isPending,
    isCompletingSession: completeSessionMutation.isPending,
  };
};

// Hook for teachers to access student Trailblazer data
export const useTeacherTrailblazer = () => {
  const { user } = useAuth();

  // Get all students' progress for the teacher
  const { data: studentsProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['teacher', 'trailblazer', 'studentsProgress'],
    queryFn: trailblazerService.getTeacherStudentsProgress,
    enabled: !!user,
  });

  // Get specific student's Trailblazer data
  const getStudentData = (studentId: string) => {
    return useQuery({
      queryKey: ['teacher', 'trailblazer', 'student', studentId],
      queryFn: () => trailblazerService.getStudentTrailblazerData(studentId),
      enabled: !!studentId,
    });
  };

  return {
    studentsProgress,
    isLoading: progressLoading,
    getStudentData,
  };
};
