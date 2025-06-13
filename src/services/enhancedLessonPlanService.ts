
import { supabase } from "@/integrations/supabase/client";
import { LessonPlanData, saveLessonPlan } from "./lessonPlanService";
import { EnhancedPracticeAnswerKeyService } from "./enhancedPracticeAnswerKeyService";

export interface EnhancedLessonPlanData extends LessonPlanData {
  includeMisconceptionTracking?: boolean;
  misconceptionAnalytics?: {
    classTrends: any[];
    studentPatterns: Record<string, any>;
  };
}

export async function saveEnhancedLessonPlan(lessonPlanData: EnhancedLessonPlanData) {
  try {
    console.log('💾 Saving enhanced lesson plan with misconception tracking');

    // Save the base lesson plan first
    const lessonPlan = await saveLessonPlan(lessonPlanData);

    // If misconception tracking is enabled, generate enhanced exercises
    if (lessonPlanData.includeMisconceptionTracking && lessonPlanData.exercisesData) {
      const enhancedExercises = await Promise.all(
        lessonPlanData.exercisesData.map(async (exercise) => {
          try {
            // Save each exercise with misconception tracking
            if (exercise.exerciseData?.questions) {
              await EnhancedPracticeAnswerKeyService.saveEnhancedAnswerKey(
                exercise.exerciseData.id || `lesson-${lessonPlan.id}-${exercise.studentId}`,
                exercise.exerciseData.questions,
                {
                  skillName: exercise.targetSkillName,
                  subject: lessonPlanData.subject,
                  grade: lessonPlanData.grade,
                  totalPoints: exercise.exerciseData.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0),
                  estimatedTime: exercise.exerciseData.questions.length * 2,
                  misconceptionAnnotated: true,
                  lessonPlanId: lessonPlan.id
                }
              );
            }
            return exercise;
          } catch (error) {
            console.error(`Error saving enhanced exercise for student ${exercise.studentId}:`, error);
            return exercise;
          }
        })
      );

      console.log(`✅ Enhanced lesson plan saved with ${enhancedExercises.length} misconception-tracked exercises`);
    }

    return lessonPlan;
  } catch (error) {
    console.error('❌ Error saving enhanced lesson plan:', error);
    throw error;
  }
}

export async function getLessonPlanMisconceptionAnalytics(lessonPlanId: string) {
  try {
    console.log('📊 Fetching misconception analytics for lesson plan:', lessonPlanId);

    // Get lesson plan details
    const { data: lessonPlan, error: planError } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('id', lessonPlanId)
      .single();

    if (planError) throw planError;

    // Get misconception statistics for this lesson plan's exercises
    const stats = await EnhancedPracticeAnswerKeyService.getMisconceptionStatistics({
      skillName: undefined, // Get all skills for this lesson
      timeframe: 7 // Last week
    });

    return {
      lessonPlan,
      misconceptionStats: stats,
      recommendations: generateLessonRecommendations(stats)
    };
  } catch (error) {
    console.error('❌ Error fetching lesson plan misconception analytics:', error);
    throw error;
  }
}

function generateLessonRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.questionsWithMisconceptions > 0) {
    const annotationRate = Math.round((stats.questionsWithMisconceptions / Math.max(stats.totalQuestions, 1)) * 100);
    
    if (annotationRate < 50) {
      recommendations.push("Consider adding more misconception annotations to improve student feedback quality");
    }

    // Analyze common misconception categories
    const categoryEntries = Object.entries(stats.misconceptionCategories || {});
    if (categoryEntries.length > 0) {
      const topCategory = categoryEntries.reduce((a, b) => (a[1] as number) > (b[1] as number) ? a : b);
      recommendations.push(`Focus on ${topCategory[0]} - this is the most common misconception type in your class`);
    }

    // Suggest targeted interventions
    if (stats.misconceptionSubtypes) {
      const subtypeEntries = Object.entries(stats.misconceptionSubtypes);
      if (subtypeEntries.length > 0) {
        const topSubtype = subtypeEntries.reduce((a, b) => (a[1] as number) > (b[1] as number) ? a : b);
        recommendations.push(`Plan targeted activities for "${topSubtype[0]}" - this misconception appears frequently`);
      }
    }
  } else {
    recommendations.push("Start adding misconception annotations to track student understanding patterns");
  }

  return recommendations;
}

export async function getClassMisconceptionTrends(classId: string, timeframe: number = 30) {
  try {
    console.log('📈 Fetching class misconception trends for:', classId);

    // This would integrate with the misconception analytics service
    // For now, return basic structure that can be enhanced
    const { data: lessonPlans, error } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('class_id', classId)
      .gte('created_at', new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate misconception data across lesson plans
    const trends = {
      totalLessonPlans: lessonPlans?.length || 0,
      misconceptionAnnotatedPlans: lessonPlans?.filter(plan => 
        plan.exercises_data && 
        JSON.stringify(plan.exercises_data).includes('choiceMisconceptions')
      ).length || 0,
      timeframe
    };

    return trends;
  } catch (error) {
    console.error('❌ Error fetching class misconception trends:', error);
    throw error;
  }
}
