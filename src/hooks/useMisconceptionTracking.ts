
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MisconceptionTaxonomyService, MisconceptionAnalysisResult } from '@/services/misconceptionTaxonomyService';
import { MisconceptionAnalyticsService } from '@/services/misconceptionAnalyticsService';
import { MisconceptionRemediationService } from '@/services/misconceptionRemediationService';
import { EnhancedMisconceptionIntegrationService } from '@/services/enhancedMisconceptionIntegrationService';

export const useMisconceptionTracking = () => {
  const queryClient = useQueryClient();

  // Get misconception categories and subtypes
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['misconception', 'categories'],
    queryFn: MisconceptionTaxonomyService.getCategories,
  });

  const { data: allSubtypes, isLoading: subtypesLoading } = useQuery({
    queryKey: ['misconception', 'subtypes'],
    queryFn: MisconceptionTaxonomyService.getAllSubtypesWithCategories,
  });

  // Mutation for analyzing misconceptions
  const analyzeMisconceptionMutation = useMutation({
    mutationFn: async ({
      subject,
      questionType,
      studentAnswer,
      correctAnswer,
      questionContext,
      options
    }: {
      subject: string;
      questionType: string;
      studentAnswer: string;
      correctAnswer: string;
      questionContext?: string;
      options?: string[];
    }) => {
      return EnhancedMisconceptionIntegrationService.analyzeMisconceptionWithTaxonomy(
        subject,
        questionType,
        studentAnswer,
        correctAnswer,
        questionContext,
        options
      );
    },
  });

  // Mutation for recording misconceptions
  const recordMisconceptionMutation = useMutation({
    mutationFn: async ({
      studentId,
      questionId,
      skillId,
      examId,
      subject,
      questionType,
      studentAnswer,
      correctAnswer,
      questionContext,
      options
    }: {
      studentId: string;
      questionId: string;
      skillId: string;
      examId: string;
      subject: string;
      questionType: string;
      studentAnswer: string;
      correctAnswer: string;
      questionContext?: string;
      options?: string[];
    }) => {
      return EnhancedMisconceptionIntegrationService.recordEnhancedMisconception(
        studentId,
        questionId,
        skillId,
        examId,
        subject,
        questionType,
        studentAnswer,
        correctAnswer,
        questionContext,
        options
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['misconception'] });
    },
  });

  // Mutation for recording feedback sessions
  const recordFeedbackMutation = useMutation({
    mutationFn: async ({
      misconceptionId,
      feedbackType,
      success,
      notes,
      interventionData
    }: {
      misconceptionId: string;
      feedbackType: string;
      success: boolean;
      notes?: string;
      interventionData?: any;
    }) => {
      return MisconceptionTaxonomyService.recordFeedbackSession(
        misconceptionId,
        feedbackType,
        success,
        notes,
        interventionData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['misconception'] });
    },
  });

  return {
    // Data
    categories,
    allSubtypes,
    
    // Loading states
    isLoading: categoriesLoading || subtypesLoading,
    
    // Mutations
    analyzeMisconception: analyzeMisconceptionMutation.mutateAsync,
    recordMisconception: recordMisconceptionMutation.mutateAsync,
    recordFeedback: recordFeedbackMutation.mutateAsync,
    
    // Mutation states
    isAnalyzing: analyzeMisconceptionMutation.isPending,
    isRecording: recordMisconceptionMutation.isPending,
    isRecordingFeedback: recordFeedbackMutation.isPending,
  };
};

// Hook for student-specific misconception data
export const useStudentMisconceptions = (studentId: string) => {
  // Get student's misconception history
  const { data: misconceptions, isLoading: misconceptionsLoading } = useQuery({
    queryKey: ['misconception', 'student', studentId, 'history'],
    queryFn: () => MisconceptionTaxonomyService.getStudentMisconceptions(studentId),
    enabled: !!studentId,
  });

  // Get persistence logs
  const { data: persistenceLogs, isLoading: persistenceLoading } = useQuery({
    queryKey: ['misconception', 'student', studentId, 'persistence'],
    queryFn: () => MisconceptionTaxonomyService.getStudentPersistenceLogs(studentId),
    enabled: !!studentId,
  });

  // Get analytics profile
  const { data: analyticsProfile, isLoading: analyticsLoading } = useQuery({
    queryKey: ['misconception', 'student', studentId, 'analytics'],
    queryFn: () => MisconceptionAnalyticsService.getStudentMisconceptionProfile(studentId),
    enabled: !!studentId,
  });

  // Get intervention recommendations
  const { data: interventionRecommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['misconception', 'student', studentId, 'interventions'],
    queryFn: () => MisconceptionAnalyticsService.getInterventionRecommendations(studentId),
    enabled: !!studentId,
  });

  // Get comprehensive insights
  const { data: comprehensiveInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['misconception', 'student', studentId, 'comprehensive'],
    queryFn: () => EnhancedMisconceptionIntegrationService.getComprehensiveMisconceptionInsights(studentId),
    enabled: !!studentId,
  });

  return {
    // Data
    misconceptions,
    persistenceLogs,
    analyticsProfile,
    interventionRecommendations,
    comprehensiveInsights,
    
    // Loading states
    isLoading: misconceptionsLoading || persistenceLoading || analyticsLoading || recommendationsLoading || insightsLoading,
  };
};

// Hook for class-level misconception analytics
export const useClassMisconceptions = (classId: string) => {
  // Get class summary
  const { data: classSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['misconception', 'class', classId, 'summary'],
    queryFn: () => MisconceptionAnalyticsService.getClassMisconceptionSummary(classId),
    enabled: !!classId,
  });

  return {
    classSummary,
    isLoading: summaryLoading,
  };
};

// Hook for remediation functionality
export const useMisconceptionRemediation = () => {
  const queryClient = useQueryClient();

  // Get remediation effectiveness data
  const { data: effectivenessData } = useQuery({
    queryKey: ['misconception', 'remediation', 'effectiveness'],
    queryFn: () => MisconceptionRemediationService.getRemediationEffectiveness(),
  });

  // Mutation for starting remediation session
  const startRemediationMutation = useMutation({
    mutationFn: async ({
      studentId,
      misconceptionSubtypeId,
      strategyId,
      customParameters
    }: {
      studentId: string;
      misconceptionSubtypeId: string;
      strategyId: string;
      customParameters?: any;
    }) => {
      return MisconceptionRemediationService.conductRemediationSession(
        studentId,
        misconceptionSubtypeId,
        strategyId,
        customParameters
      );
    },
  });

  // Mutation for completing remediation session
  const completeRemediationMutation = useMutation({
    mutationFn: async ({
      sessionId,
      successful,
      engagement,
      notes
    }: {
      sessionId: string;
      successful: boolean;
      engagement: number;
      notes: string;
    }) => {
      return MisconceptionRemediationService.completeRemediationSession(
        sessionId,
        successful,
        engagement,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['misconception'] });
    },
  });

  // Get personalized interventions for a student
  const getPersonalizedInterventions = (studentId: string) => {
    return useQuery({
      queryKey: ['misconception', 'student', studentId, 'personalizedInterventions'],
      queryFn: () => MisconceptionRemediationService.getPersonalizedInterventions(studentId),
      enabled: !!studentId,
    });
  };

  return {
    // Data
    effectivenessData,
    getPersonalizedInterventions,
    
    // Mutations
    startRemediation: startRemediationMutation.mutateAsync,
    completeRemediation: completeRemediationMutation.mutateAsync,
    
    // Mutation states
    isStartingRemediation: startRemediationMutation.isPending,
    isCompletingRemediation: completeRemediationMutation.isPending,
  };
};

// Hook for trending misconceptions
export const useTrendingMisconceptions = (timeframe: 'week' | 'month' | 'semester' = 'month') => {
  const { data: trendingMisconceptions, isLoading } = useQuery({
    queryKey: ['misconception', 'trending', timeframe],
    queryFn: () => MisconceptionAnalyticsService.getTrendingMisconceptions(timeframe),
  });

  return {
    trendingMisconceptions,
    isLoading,
  };
};
