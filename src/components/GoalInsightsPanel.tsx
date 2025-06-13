
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Calendar,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";
import { SmartGoalService, type GoalAnalytics, type StudentGoal, type GoalAchievement } from "@/services/smartGoalService";

interface GoalInsightsPanelProps {
  /** Learner whose progress the panel should visualise */
  studentId: string;
}

export function GoalInsightsPanel({ studentId }: GoalInsightsPanelProps) {
  const [analytics, setAnalytics] = useState<GoalAnalytics | null>(null);
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [achievements, setAchievements] = useState<GoalAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsightsData();
  }, [studentId]);

  const loadInsightsData = async () => {
    try {
      setLoading(true);
      const [analyticsData, goalsData, achievementsData] = await Promise.all([
        SmartGoalService.getGoalAnalytics(studentId),
        SmartGoalService.getStudentGoals(studentId),
        SmartGoalService.getStudentAchievements(studentId)
      ]);
      
      setAnalytics(analyticsData);
      setGoals(goalsData);
      setAchievements(achievementsData);
    } catch (error) {
      console.error('Failed to load insights data:', error);
      // Set default values on error
      setAnalytics(null);
      setGoals([]);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const getInsights = () => {
    if (!analytics || goals.length === 0) return [];

    const insights = [];
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');

    // Completion rate insight
    if (goals.length > 0) {
      const completionRate = (completedGoals.length / goals.length) * 100;
      insights.push({
        type: completionRate >= 70 ? 'success' : completionRate >= 40 ? 'warning' : 'info',
        icon: completionRate >= 70 ? CheckCircle2 : completionRate >= 40 ? Clock : AlertCircle,
        title: 'Goal Completion Rate',
        description: `You've completed ${Math.round(completionRate)}% of your goals`,
        value: `${completedGoals.length}/${goals.length}`,
        progress: completionRate
      });
    }

    // Progress momentum insight
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / activeGoals.length;
      insights.push({
        type: avgProgress >= 70 ? 'success' : avgProgress >= 40 ? 'warning' : 'info',
        icon: TrendingUp,
        title: 'Current Momentum',
        description: `Average progress across active goals`,
        value: `${Math.round(avgProgress)}%`,
        progress: avgProgress
      });
    }

    // Goal type performance
    const goalTypePerformance = goals.reduce((acc, goal) => {
      if (!acc[goal.goal_type]) {
        acc[goal.goal_type] = { total: 0, completed: 0 };
      }
      acc[goal.goal_type].total++;
      if (goal.status === 'completed') {
        acc[goal.goal_type].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    const bestPerformingType = Object.entries(goalTypePerformance)
      .map(([type, data]) => ({
        type,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0
      }))
      .sort((a, b) => b.rate - a.rate)[0];

    if (bestPerformingType && bestPerformingType.rate > 0) {
      insights.push({
        type: 'success',
        icon: Trophy,
        title: 'Strongest Goal Type',
        description: `You excel at ${bestPerformingType.type.replace('_', ' ')} goals`,
        value: `${Math.round(bestPerformingType.rate)}% success`,
        progress: bestPerformingType.rate
      });
    }

    return insights;
  };

  const getRecommendations = () => {
    if (!analytics || goals.length === 0) return [];

    const recommendations = [];
    const activeGoals = goals.filter(g => g.status === 'active');

    // Too many active goals
    if (activeGoals.length > 5) {
      recommendations.push({
        type: 'warning',
        title: 'Focus Your Energy',
        description: 'Consider focusing on fewer goals for better success rates',
        action: 'Pause some goals to concentrate on your priorities'
      });
    }

    // No recent activity
    const recentGoals = goals.filter(g => {
      const createdDate = new Date(g.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    });

    if (recentGoals.length === 0 && goals.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Time for New Challenges',
        description: 'You haven\'t set any new goals recently',
        action: 'Consider setting a new goal to maintain momentum'
      });
    }

    // Stalled goals
    const stalledGoals = activeGoals.filter(g => g.progress_percentage < 20);
    if (stalledGoals.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Goals Need Attention',
        description: `${stalledGoals.length} goals have low progress`,
        action: 'Review and adjust these goals or break them into smaller steps'
      });
    }

    return recommendations;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-slate-600">Loading insights...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const insights = getInsights();
  const recommendations = getRecommendations();

  return (
    <div className="space-y-6">
      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Goal Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'success' ? 'bg-green-100' :
                      insight.type === 'warning' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        insight.type === 'success' ? 'text-green-600' :
                        insight.type === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      <div className="flex items-center gap-3">
                        <Progress value={insight.progress} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{insight.value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Set some goals to see performance insights!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  rec.type === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                  'border-blue-400 bg-blue-50'
                }`}>
                  <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                  <p className="text-sm font-medium text-gray-700">{rec.action}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">You're doing great!</h3>
              <p className="text-gray-600">No recommendations at the moment. Keep up the excellent work!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Analytics Summary */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Goal Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{analytics.total_goals}</div>
                <div className="text-sm text-blue-600">Total Goals</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{analytics.completed_goals}</div>
                <div className="text-sm text-green-600">Completed</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{analytics.active_goals}</div>
                <div className="text-sm text-purple-600">Active</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">
                  {analytics.avg_completion_time_days ? Math.round(analytics.avg_completion_time_days) : 0}
                </div>
                <div className="text-sm text-orange-600">Avg Days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
