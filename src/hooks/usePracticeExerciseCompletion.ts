
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
      classId,
      sessionType = 'practice_exercise',
      sessionId
    }: { 
      exerciseId: string; 
      score: number; 
      skillName: string; 
      exerciseData: any;
      classId?: string;
      sessionType?: 'practice_exercise' | 'trailblazer' | 'class_session';
      sessionId?: string;
    }) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to complete practice exercises');
      }

      console.log('🎯 Completing practice exercise with unified integration:', {
        userId: user.id,
        exerciseId,
        score,
        skillName,
        classId,
        sessionType,
        sessionId,
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
      console.log('🔄 Processing skill score updates with unified integration...');
      
      const skillUpdateResult = await practiceExerciseSkillService.processPracticeExerciseCompletion({
        studentId: user.id,
        exerciseId,
        skillName,
        exerciseScore: score,
        classId: classId,
        exerciseData: exerciseData,
        sessionType: sessionType,
        sessionId: sessionId
      });

      // Trigger callback with skill improvements if provided
      if (onSkillUpdated && skillUpdateResult.skillUpdates) {
        onSkillUpdated(skillUpdateResult.skillUpdates);
      }
      
      // Record in unified student results for cross-session analytics
      if (sessionType && sessionId) {
        try {
          const skillType = exerciseData?.skillType || 
                           exerciseData?.skillMetadata?.skillType || 
                           'content'; // fallback

          console.log(`🔗 Recording unified result for ${sessionType} session:`, {
            sessionType,
            sessionId,
            skillName,
            skillType,
            score
          });

          switch (sessionType) {
            case 'trailblazer':
              // Record trailblazer session completion
              await UnifiedHomeLearnerIntegration.recordPracticeCompletion(
                user.id,
                sessionId,
                skillName,
                skillType,
                score,
                Math.round(score * (exerciseData?.totalPoints || 10) / 100),
                exerciseData?.totalPoints || 10,
                {
                  exercise_type: 'trailblazer_practice',
                  overall_score: score,
                  grading_method: 'unified_ai',
                  session_type: 'trailblazer'
                }
              );
              break;
              
            case 'class_session':
              // Record class session completion
              await UnifiedHomeLearnerIntegration.recordPracticeCompletion(
                user.id,
                sessionId,
                skillName,
                skillType,
                score,
                Math.round(score * (exerciseData?.totalPoints || 10) / 100),
                exerciseData?.totalPoints || 10,
                {
                  exercise_type: 'class_practice',
                  overall_score: score,
                  grading_method: 'unified_ai',
                  session_type: 'class_session',
                  class_id: classId
                }
              );
              break;
              
            default: // practice_exercise
              // Record home learner practice completion
              await UnifiedHomeLearnerIntegration.recordPracticeCompletion(
                user.id,
                sessionId,
                skillName,
                skillType,
                score,
                Math.round(score * (exerciseData?.totalPoints || 10) / 100),
                exerciseData?.totalPoints || 10,
                {
                  exercise_type: 'home_practice',
                  overall_score: score,
                  grading_method: 'unified_ai',
                  session_type: 'home_learner'
                }
              );
              break;
          }
          
          console.log('✅ Unified session result recorded successfully');
        } catch (error) {
          console.warn('⚠️ Failed to record unified session result:', error);
          // Don't fail the completion process if unified recording fails
        }
      }

      setIsUpdatingSkills(false);
      console.log('✅ Practice exercise completion processed successfully');
      
      return skillUpdateResult;
    },
    onError: (error) => {
      setIsUpdatingSkills(false);
      console.error('❌ Error completing practice exercise:', error);
      toast.error('Failed to complete exercise. Please try again.');
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contentSkillScores'] });
      queryClient.invalidateQueries({ queryKey: ['subjectSkillScores'] });
      queryClient.invalidateQueries({ queryKey: ['studentExercises'] });
      queryClient.invalidateQueries({ queryKey: ['practiceAnalytics'] });
    }
  });

  return {
    completeExercise: completeExerciseMutation.mutate,
    isCompleting: completeExerciseMutation.isPending,
    isUpdatingSkills,
    error: completeExerciseMutation.error
  };
}
