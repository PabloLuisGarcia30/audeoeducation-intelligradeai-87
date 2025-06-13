
import { useState, useEffect } from 'react';
import { AdaptiveLearningService, AdaptiveLearningProfile, LearningTrajectoryEvent } from '@/services/adaptiveLearningService';

export function useAdaptiveLearning(studentId: string | null) {
  const [profile, setProfile] = useState<AdaptiveLearningProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<LearningTrajectoryEvent[]>([]);
  const [learningPatterns, setLearningPatterns] = useState<{
    predominant_pattern: string;
    confidence: number;
    recommendations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    loadAdaptiveLearningData();
  }, [studentId]);

  const loadAdaptiveLearningData = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      setError(null);

      // Load profile and recent events in parallel
      const [profileData, eventsData, patternsData] = await Promise.all([
        AdaptiveLearningService.getOrCreateProfile(studentId),
        AdaptiveLearningService.getRecentEvents(studentId, 10),
        AdaptiveLearningService.detectLearningPatterns(studentId)
      ]);

      setProfile(profileData);
      setRecentEvents(eventsData);
      setLearningPatterns(patternsData);
    } catch (err) {
      console.error('Error loading adaptive learning data:', err);
      setError('Failed to load adaptive learning data');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AdaptiveLearningProfile>) => {
    if (!studentId || !profile) return false;

    try {
      const success = await AdaptiveLearningService.updateProfile(studentId, updates);
      if (success) {
        setProfile(prev => prev ? { ...prev, ...updates } : null);
      }
      return success;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
  };

  const logLearningEvent = async (event: Omit<LearningTrajectoryEvent, 'student_id'>) => {
    if (!studentId) return null;

    try {
      const eventId = await AdaptiveLearningService.logLearningEvent({
        ...event,
        student_id: studentId
      });

      if (eventId) {
        // Reload recent events to include the new one
        const updatedEvents = await AdaptiveLearningService.getRecentEvents(studentId, 10);
        setRecentEvents(updatedEvents);
      }

      return eventId;
    } catch (err) {
      console.error('Error logging learning event:', err);
      return null;
    }
  };

  const updateLearningVelocity = async (performanceChange: number) => {
    if (!studentId) return false;

    try {
      const success = await AdaptiveLearningService.updateLearningVelocity(studentId, performanceChange);
      if (success) {
        // Reload profile to get updated velocity
        const updatedProfile = await AdaptiveLearningService.getOrCreateProfile(studentId);
        setProfile(updatedProfile);
      }
      return success;
    } catch (err) {
      console.error('Error updating learning velocity:', err);
      return false;
    }
  };

  const getAdaptiveRecommendations = async (context: {
    skill_name: string;
    skill_type: 'content' | 'subject';
    current_performance: number;
    current_confidence: number;
    session_duration_minutes: number;
    recent_interactions: string[];
  }) => {
    if (!studentId) return [];

    try {
      return await AdaptiveLearningService.analyzeAndRecommend(studentId, context);
    } catch (err) {
      console.error('Error getting recommendations:', err);
      return [];
    }
  };

  return {
    profile,
    recentEvents,
    learningPatterns,
    loading,
    error,
    updateProfile,
    logLearningEvent,
    updateLearningVelocity,
    getAdaptiveRecommendations,
    refreshData: loadAdaptiveLearningData
  };
}
