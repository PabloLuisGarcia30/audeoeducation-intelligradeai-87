
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateExerciseStatus } from '@/services/classSessionService';
import { practiceExerciseSkillService, type SkillScoreCalculation } from '@/services/practiceExerciseSkillService';
import { UnifiedHomeLearnerIntegration } from '@/services/unifiedHomeLearnerIntegration';
import { useAuth } from '@/contexts/AuthContext';

interface UsePracticeExerciseCompletionProps {
  onSkillUpdated?: (skillUpdates: SkillScoreCalculation[]) => void;
}

export function usePracticeExerciseCompletion({ 
  onSkillUpdated 
}: UsePracticeExerciseCompletionProps) {
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const completeExerciseMutation = useMutation({
    mutationFn: async ({ 
      exerciseId, 
      score, 
      skillName, 
      exerciseData,
      classId 
    }: { 
      exerciseId: string; 
      score: number; 
      skillName: string; 
      exerciseData: any;
      classId?: string;
    }) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to complete practice exercises');
      }

      console.log('🎯 Completing practice exercise for authenticated user:', {
        userId: user.id,
        exerciseId,
        score,
        skillName,
        classId,
        hasExerciseData: !!exerciseData
      });
      
      // Log skill metadata usage
      if (exerciseData?.skillType) {
        console.log('✅ Using stored skill type from exercise:', exerciseData.skillType);
      } else if (exerciseData?.skillMetadata?.skillType) {
        console.log('✅ Using skill type from metadata:', exerciseData.skillMetadata.skillType);
      } else {
        console.warn('⚠️ No skill type metadata found in exercise data, will use fallback detection');
      }
      
      // First update the exercise status
      console.log('📝 Updating exercise status to completed');
      await updateExerciseStatus(exerciseId, 'completed', score);
      
      // Then process skill score updates using authenticated user ID with class context
      setIsUpdatingSkills(true);
      console.log('🔄 Processing skill score updates...');
      
      const skillUpdateResult = await practiceExerciseSkillService.processPracticeExerciseCompletion({
        studentId: user.id,
        exerciseId,
        skillName,
        exerciseScore: score,
        exerciseData,
        classId
      });

      console.log('📊 Skill update result:', skillUpdateResult);

      // Integrate with unified results system
      try {
        const skillType = exerciseData?.skillType || exerciseData?.skillMetadata?.skillType || 'content';
        const pointsEarned = Math.round((score / 100) * 10); // Scale to 10 points max
        const pointsPossible = 10;

        await UnifiedHomeLearnerIntegration.recordPracticeCompletion(
          user.id,
          exerciseId,
          skillName,
          skillType,
          score,
          pointsEarned,
          pointsPossible,
          {
            exercise_type: 'practice',
            class_id: classId,
            total_questions: exerciseData?.totalQuestions || 4,
            grading_method: 'enhanced_ai'
          }
        );

        console.log('✅ Integrated practice exercise with unified results system');
      } catch (error) {
        console.warn('⚠️ Failed to integrate with unified results system:', error);
        // Don't fail the main operation if unified integration fails
      }

      if (!skillUpdateResult.success) {
        console.warn('⚠️ Skill score update failed:', skillUpdateResult.error);
        toast.error('Exercise completed but skill scores could not be updated');
      } else {
        console.log('✅ Skill scores updated successfully:', skillUpdateResult.skillUpdates);
        
        // Enhanced success message with skill type information
        const skillType = exerciseData?.skillType || exerciseData?.skillMetadata?.skillType;
        const improvementMessages = skillUpdateResult.skillUpdates
          .filter(update => update.updatedScore > update.currentScore)
          .map(update => `${update.skillName} (${update.skillType}): ${update.currentScore}% → ${update.updatedScore}%`);

        if (improvementMessages.length > 0) {
          const skillTypeMsg = skillType ? ` [${skillType === 'content' ? 'Content' : 'Subject'} Skill]` : '';
          toast.success(`Exercise completed!${skillTypeMsg} Skill improvements: ${improvementMessages.join(', ')}`);
        } else {
          const skillTypeMsg = skillType ? ` [${skillType === 'content' ? 'Content' : 'Subject'} Skill]` : '';
          toast.success(`Exercise completed successfully!${skillTypeMsg}`);
        }

        // Notify parent component
        if (onSkillUpdated) {
          onSkillUpdated(skillUpdateResult.skillUpdates);
        }
      }

      setIsUpdatingSkills(false);
      return { exerciseId, skillUpdates: skillUpdateResult.skillUpdates };
    },
    onSuccess: () => {
      if (!user?.id) return;
      
      console.log('🔄 Invalidating queries to refresh skill data');
      
      // Invalidate relevant queries to refresh skill data using authenticated user ID
      queryClient.invalidateQueries({ 
        queryKey: ['studentContentSkills'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['studentSubjectSkills'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['studentExercises'] 
      });
    },
    onError: (error) => {
      console.error('❌ Error completing practice exercise:', error);
      toast.error('Failed to complete exercise. Please try again.');
      setIsUpdatingSkills(false);
    }
  });

  return {
    completeExercise: completeExerciseMutation.mutate,
    isCompleting: completeExerciseMutation.isPending,
    isUpdatingSkills,
    error: completeExerciseMutation.error
  };
}
