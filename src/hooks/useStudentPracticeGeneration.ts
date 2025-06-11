import { useState } from 'react';
import { StudentPracticeService, type StudentPracticeRequest, type StudentPracticeExercise } from '@/services/studentPracticeService';
import { ProgressiveDifficultyService } from '@/services/progressiveDifficultyService';
import { toast } from 'sonner';

interface UseStudentPracticeGenerationProps {
  enableAutoRecovery?: boolean;
  showDetailedErrors?: boolean;
  maxRetryAttempts?: number;
}

export function useStudentPracticeGeneration({
  enableAutoRecovery = true,
  showDetailedErrors = false,
  maxRetryAttempts = 2
}: UseStudentPracticeGenerationProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const generatePracticeExercise = async (request: StudentPracticeRequest): Promise<StudentPracticeExercise | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🎯 Starting student practice exercise generation with progressive difficulty...');
      
      // Calculate difficulty before generation for better user feedback
      const difficultyRecommendation = ProgressiveDifficultyService.calculateDifficulty({
        studentScore: request.currentSkillScore,
        skillName: request.skillName,
        targetImprovement: Math.min(request.currentSkillScore + 15, 95),
        preferredDifficulty: request.preferredDifficulty
      });

      console.log('📊 Progressive difficulty analysis:', difficultyRecommendation.reasoning);
      
      const exercise = await StudentPracticeService.generatePracticeExercise(request);
      
      setRetryCount(0);
      
      // Enhanced success message with difficulty info
      const difficultyInfo = exercise.progressiveDifficulty ? 
        ` (${exercise.progressiveDifficulty.level.name} difficulty)` : '';
      
      toast.success(`Practice exercise generated for ${request.skillName}${difficultyInfo}!`, {
        description: exercise.progressiveDifficulty?.reasoning
      });
      
      return exercise;
    } catch (err) {
      console.error('❌ Error generating student practice exercise:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      if (enableAutoRecovery && retryCount < maxRetryAttempts) {
        console.log(`🔄 Retrying... Attempt ${retryCount + 1}/${maxRetryAttempts}`);
        setRetryCount(prev => prev + 1);
        
        // Retry with a slight delay
        setTimeout(() => {
          generatePracticeExercise(request);
        }, 1000 * (retryCount + 1));
        
        return null;
      }

      const displayError = showDetailedErrors 
        ? errorMessage 
        : 'Failed to generate practice exercise. Please try again.';
      
      toast.error(displayError);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSessionScore = async (sessionId: string, finalScore: number, improvementShown?: number): Promise<void> => {
    try {
      await StudentPracticeService.updatePracticeSessionScore(sessionId, finalScore, improvementShown);
      
      // Also update practice analytics
      // Note: We would need additional context (studentId, skillName) to do this properly
      // This could be improved by passing more context or restructuring the hook
    } catch (error) {
      console.error('❌ Error updating session score:', error);
      // Don't show toast for this - it's background operation
    }
  };

  const reset = () => {
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  };

  return {
    generatePracticeExercise,
    updateSessionScore: async (sessionId: string, finalScore: number, improvementShown?: number): Promise<void> => {
      try {
        await StudentPracticeService.updatePracticeSessionScore(sessionId, finalScore, improvementShown);
      } catch (error) {
        console.error('❌ Error updating session score:', error);
      }
    },
    isLoading,
    error,
    retryCount,
    reset: () => {
      setError(null);
      setRetryCount(0);
      setIsLoading(false);
    }
  };
}
