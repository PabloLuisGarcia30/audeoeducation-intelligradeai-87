import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trailblazerService } from '@/services/trailblazerService';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useTrailblazer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Initialize user data when they first visit
  useEffect(() => {
    if (user) {
      trailblazerService.initializeUser().catch(console.error);
    }
  }, [user]);

  // Get user streak data
  const { data: streak, isLoading: streakLoading } = useQuery({
    queryKey: ['trailblazer', 'streak'],
    queryFn: trailblazerService.getUserStreak,
    enabled: !!user,
  });

  // Get concept mastery data
  const { data: concepts = [], isLoading: conceptsLoading } = useQuery({
    queryKey: ['trailblazer', 'concepts'],
    queryFn: trailblazerService.getConceptMastery,
    enabled: !!user,
  });

  // Get recent sessions
  const { data: recentSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['trailblazer', 'sessions'],
    queryFn: () => trailblazerService.getRecentSessions(5),
    enabled: !!user,
  });

  // Get achievements
  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ['trailblazer', 'achievements'],
    queryFn: trailblazerService.getAchievements,
    enabled: !!user,
  });

  // Get student's enrolled classes
  const { data: enrolledClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['trailblazer', 'enrolledClasses'],
    queryFn: trailblazerService.getEnrolledClasses,
    enabled: !!user,
  });

  // Get class concepts for a specific class
  const getClassConcepts = (classId: string) => {
    return useQuery({
      queryKey: ['trailblazer', 'classConcepts', classId],
      queryFn: () => trailblazerService.getClassConcepts(classId),
      enabled: !!classId,
    });
  };

  // NEW: Get current active session
  const { data: activeSession, isLoading: activeSessionLoading } = useQuery({
    queryKey: ['trailblazer', 'activeSession'],
    queryFn: trailblazerService.getCurrentActiveSession,
    enabled: !!user,
  });

  // NEW: Get session misconceptions
  const getSessionMisconceptions = (sessionId: string) => {
    return useQuery({
      queryKey: ['trailblazer', 'sessionMisconceptions', sessionId],
      queryFn: () => trailblazerService.getSessionMisconceptions(sessionId),
      enabled: !!sessionId,
    });
  };

  // Enhanced start session mutation with misconception tracking preparation
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
    },
  });

  // NEW: Record misconception during session
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
  });

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
