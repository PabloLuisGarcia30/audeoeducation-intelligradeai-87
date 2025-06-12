
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

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: ({ goalType, focusConcept, durationMinutes }: {
      goalType: string;
      focusConcept: string;
      durationMinutes: number;
    }) => trailblazerService.startSession(goalType, focusConcept, durationMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailblazer'] });
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: ({ sessionId, actualDuration, scoreImprovement }: {
      sessionId: string;
      actualDuration: number;
      scoreImprovement?: number;
    }) => trailblazerService.completeSession(sessionId, actualDuration, scoreImprovement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailblazer'] });
    },
  });

  const isLoading = streakLoading || conceptsLoading || sessionsLoading || achievementsLoading;

  return {
    // Data
    streak,
    concepts,
    recentSessions,
    achievements,
    
    // Loading states
    isLoading,
    
    // Mutations
    startSession: startSessionMutation.mutateAsync,
    completeSession: completeSessionMutation.mutateAsync,
    
    // Mutation states
    isStartingSession: startSessionMutation.isPending,
    isCompletingSession: completeSessionMutation.isPending,
  };
};
