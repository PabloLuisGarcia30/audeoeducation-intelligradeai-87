
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Star, 
  Target, 
  TrendingUp, 
  Calendar,
  Award,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { SmartGoalService, type GoalAchievement, type GoalAnalytics } from "@/services/smartGoalService";
import { GoalAchievementCelebration } from "@/components/GoalAchievementCelebration";

interface AchievementCenterProps {
  studentId: string;
}

export function AchievementCenter({ studentId }: AchievementCenterProps) {
  const [achievements, setAchievements] = useState<GoalAchievement[]>([]);
  const [analytics, setAnalytics] = useState<GoalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [unshownAchievements, setUnshownAchievements] = useState<GoalAchievement[]>([]);

  useEffect(() => {
    loadAchievements();
    loadAnalytics();
  }, [studentId]);

  const loadAchievements = async () => {
    try {
      const data = await SmartGoalService.getGoalAchievements(studentId);
      setAchievements(data);
      
      // Filter unshown achievements for celebration
      const unshown = data.filter(achievement => !achievement.celebration_shown);
      setUnshownAchievements(unshown);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await SmartGoalService.getGoalAnalytics(studentId);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkShown = async (achievementId: string) => {
    try {
      await SmartGoalService.markAchievementShown(achievementId);
      setUnshownAchievements(prev => prev.filter(a => a.id !== achievementId));
    } catch (error) {
      console.error('Failed to mark achievement as shown:', error);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'milestone': return CheckCircle2;
      case 'goal_completion': return Trophy;
      case 'streak': return TrendingUp;
      default: return Star;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'blue';
      case 'goal_completion': return 'yellow';
      case 'streak': return 'green';
      default: return 'purple';
    }
  };

  const getBadgeLevel = (completedGoals: number) => {
    if (completedGoals >= 20) return { name: 'Master Achiever', color: 'purple', icon: '🏆' };
    if (completedGoals >= 10) return { name: 'Goal Crusher', color: 'yellow', icon: '⭐' };
    if (completedGoals >= 5) return { name: 'Rising Star', color: 'blue', icon: '🌟' };
    if (completedGoals >= 1) return { name: 'Goal Getter', color: 'green', icon: '🎯' };
    return { name: 'Getting Started', color: 'gray', icon: '🚀' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const badge = analytics ? getBadgeLevel(analytics.completed_goals) : null;

  return (
    <div className="space-y-6">
      {/* Achievement Celebrations */}
      {unshownAchievements.length > 0 && (
        <GoalAchievementCelebration 
          achievements={unshownAchievements}
          onMarkShown={handleMarkShown}
        />
      )}

      {/* Achievement Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{analytics.completed_goals}</div>
              <div className="text-sm opacity-90">Goals Completed</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{analytics.active_goals}</div>
              <div className="text-sm opacity-90">Active Goals</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {analytics.avg_completion_time_days ? Math.round(analytics.avg_completion_time_days) : 0}
              </div>
              <div className="text-sm opacity-90">Avg Days to Complete</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{achievements.length}</div>
              <div className="text-sm opacity-90">Total Achievements</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Achievement Badge */}
      {badge && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="p-6 text-center">
            <div className="text-6xl mb-4">{badge.icon}</div>
            <h3 className="text-2xl font-bold text-indigo-800 mb-2">{badge.name}</h3>
            <p className="text-indigo-600 mb-4">
              {analytics && analytics.completed_goals > 0 
                ? `You've completed ${analytics.completed_goals} goals! Keep up the amazing work!`
                : "Ready to earn your first achievement? Set a goal and start your journey!"
              }
            </p>
            {analytics && analytics.completed_goals > 0 && (
              <Badge className={`bg-${badge.color}-100 text-${badge.color}-700 border-${badge.color}-300`}>
                Level {Math.floor(analytics.completed_goals / 5) + 1}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="space-y-4">
              {achievements.slice(0, 10).map(achievement => {
                const Icon = getAchievementIcon(achievement.achievement_type);
                const color = getAchievementColor(achievement.achievement_type);
                
                return (
                  <div 
                    key={achievement.id}
                    className={`p-4 rounded-lg border-l-4 border-${color}-400 bg-${color}-50`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-${color}-100`}>
                        <Icon className={`h-5 w-5 text-${color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">
                          {achievement.achievement_title}
                        </h4>
                        {achievement.achievement_description && (
                          <p className="text-gray-600 text-sm mt-1">
                            {achievement.achievement_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline" className="capitalize text-xs">
                            {achievement.achievement_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(achievement.achieved_at).toLocaleDateString()}
                          </span>
                          {achievement.value_achieved && (
                            <span className="text-xs text-gray-500">
                              Value: {achievement.value_achieved}
                            </span>
                          )}
                        </div>
                      </div>
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No achievements yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start working on your goals to earn your first achievement!
              </p>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Target className="h-4 w-4 mr-2" />
                Set Your First Goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievement Types */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-800">Milestones</h4>
              <p className="text-sm text-blue-600">
                Earned for reaching goal milestones
              </p>
              <div className="text-2xl font-bold text-blue-800 mt-2">
                {achievements.filter(a => a.achievement_type === 'milestone').length}
              </div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <h4 className="font-semibold text-yellow-800">Completions</h4>
              <p className="text-sm text-yellow-600">
                Earned for completing goals
              </p>
              <div className="text-2xl font-bold text-yellow-800 mt-2">
                {achievements.filter(a => a.achievement_type === 'goal_completion').length}
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-green-800">Streaks</h4>
              <p className="text-sm text-green-600">
                Earned for consistency streaks
              </p>
              <div className="text-2xl font-bold text-green-800 mt-2">
                {achievements.filter(a => a.achievement_type === 'streak').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
