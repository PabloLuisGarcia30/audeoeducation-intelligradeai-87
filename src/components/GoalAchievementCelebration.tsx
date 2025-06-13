
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  CheckCircle2, 
  TrendingUp, 
  X,
  Sparkles,
  Trophy,
  Target
} from "lucide-react";
import { GoalAchievement } from "@/services/smartGoalService";

interface GoalAchievementCelebrationProps {
  achievements: GoalAchievement[];
  onMarkShown: (achievementId: string) => void;
}

export function GoalAchievementCelebration({ achievements, onMarkShown }: GoalAchievementCelebrationProps) {
  const [visibleAchievements, setVisibleAchievements] = useState<string[]>(
    achievements.map(a => a.id)
  );

  const handleDismiss = (achievementId: string) => {
    setVisibleAchievements(prev => prev.filter(id => id !== achievementId));
    onMarkShown(achievementId);
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <CheckCircle2 className="h-6 w-6 text-blue-500" />;
      case 'goal_completion': return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 'streak': return <TrendingUp className="h-6 w-6 text-green-500" />;
      default: return <Award className="h-6 w-6 text-purple-500" />;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'border-blue-200 bg-blue-50';
      case 'goal_completion': return 'border-yellow-200 bg-yellow-50';
      case 'streak': return 'border-green-200 bg-green-50';
      default: return 'border-purple-200 bg-purple-50';
    }
  };

  const getAchievementEmoji = (type: string) => {
    switch (type) {
      case 'milestone': return '🎯';
      case 'goal_completion': return '🏆';
      case 'streak': return '🔥';
      default: return '⭐';
    }
  };

  const visibleAchievementData = achievements.filter(a => visibleAchievements.includes(a.id));

  if (visibleAchievementData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {visibleAchievementData.map(achievement => (
        <Card 
          key={achievement.id} 
          className={`relative border-2 ${getAchievementColor(achievement.achievement_type)} animate-in slide-in-from-top-2 duration-500`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {getAchievementIcon(achievement.achievement_type)}
                  <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{getAchievementEmoji(achievement.achievement_type)}</span>
                    Congratulations!
                  </CardTitle>
                  <p className="text-sm text-gray-600">You've earned a new achievement!</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDismiss(achievement.id)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{achievement.achievement_title}</h3>
                {achievement.achievement_description && (
                  <p className="text-gray-600">{achievement.achievement_description}</p>
                )}
              </div>

              {achievement.value_achieved && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Achieved: <span className="font-medium">{achievement.value_achieved}</span>
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">
                  {achievement.achievement_type.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-gray-500">
                  {new Date(achievement.achieved_at).toLocaleDateString()}
                </span>
              </div>

              {/* Progress snapshot if available */}
              {achievement.progress_snapshot && (
                <div className="bg-white p-3 rounded border text-sm">
                  <p className="font-medium mb-1">Achievement Details:</p>
                  {achievement.progress_snapshot.completion_date && (
                    <p>Completed on: {new Date(achievement.progress_snapshot.completion_date).toLocaleDateString()}</p>
                  )}
                  {achievement.progress_snapshot.days_to_complete && (
                    <p>Time to complete: {Math.round(achievement.progress_snapshot.days_to_complete)} days</p>
                  )}
                  {achievement.progress_snapshot.final_progress && (
                    <p>Final progress: {achievement.progress_snapshot.final_progress}%</p>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleDismiss(achievement.id)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Awesome!
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
