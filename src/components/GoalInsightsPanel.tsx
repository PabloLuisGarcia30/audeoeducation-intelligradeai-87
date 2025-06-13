
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Target, 
  Calendar,
  Award,
  BarChart3,
  Clock,
  Brain,
  CheckCircle2
} from "lucide-react";
import { StudentGoal, GoalAchievement, GoalAnalytics } from "@/services/smartGoalService";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface GoalInsightsPanelProps {
  analytics: GoalAnalytics | null;
  goals: StudentGoal[];
  achievements: GoalAchievement[];
}

export function GoalInsightsPanel({ analytics, goals, achievements }: GoalInsightsPanelProps) {
  // Calculate insights
  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const pausedGoals = goals.filter(g => g.status === 'paused').length;

  // Goal completion rate over time
  const completionTimeline = achievements
    .filter(a => a.achievement_type === 'goal_completion')
    .reduce((acc, achievement) => {
      const date = achievement.achieved_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const timelineData = Object.entries(completionTimeline)
    .map(([date, count]) => ({ date, completions: count }))
    .slice(-7); // Last 7 days

  // Goal type distribution
  const goalTypeData = goals.reduce((acc, goal) => {
    const type = goal.goal_type.replace('_', ' ');
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(goalTypeData).map(([type, count]) => ({
    name: type,
    value: count,
    percentage: Math.round((count / totalGoals) * 100)
  }));

  // Success metrics by difficulty
  const difficultyStats = goals.reduce((acc, goal) => {
    const level = goal.difficulty_level;
    if (!acc[level]) {
      acc[level] = { total: 0, completed: 0, avgProgress: 0 };
    }
    acc[level].total++;
    if (goal.status === 'completed') acc[level].completed++;
    acc[level].avgProgress += goal.progress_percentage;
    return acc;
  }, {} as Record<string, { total: number; completed: number; avgProgress: number }>);

  Object.keys(difficultyStats).forEach(level => {
    difficultyStats[level].avgProgress = 
      Math.round(difficultyStats[level].avgProgress / difficultyStats[level].total);
  });

  const difficultyChartData = Object.entries(difficultyStats).map(([level, stats]) => ({
    difficulty: level,
    successRate: Math.round((stats.completed / stats.total) * 100),
    avgProgress: stats.avgProgress,
    total: stats.total
  }));

  // Current streak calculation
  const sortedCompletions = achievements
    .filter(a => a.achievement_type === 'goal_completion')
    .sort((a, b) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime());

  let currentStreak = 0;
  let lastDate = new Date();
  
  for (const completion of sortedCompletions) {
    const completionDate = new Date(completion.achieved_at);
    const daysDiff = Math.floor((lastDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) { // Within a week
      currentStreak++;
      lastDate = completionDate;
    } else {
      break;
    }
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Goal Insights & Analytics</h2>
        <p className="text-gray-600">Understand your goal-setting patterns and success metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">
                  {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold">{currentStreak}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg. Completion</p>
                <p className="text-2xl font-bold">
                  {analytics?.avg_completion_time_days ? `${Math.round(analytics.avg_completion_time_days)}d` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Achievements</p>
                <p className="text-2xl font-bold">{achievements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goal Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Goal Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No goals to analyze yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            {difficultyChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={difficultyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="difficulty" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value, name) => [`${value}%`, 'Success Rate']} />
                    <Bar dataKey="successRate" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No difficulty data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-500" />
                Learning Patterns
              </h4>
              
              <div className="space-y-3 text-sm">
                {analytics?.most_successful_goal_type && analytics.most_successful_goal_type !== 'none' && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                    <span>Most successful goal type:</span>
                    <Badge className="bg-green-100 text-green-800 capitalize">
                      {analytics.most_successful_goal_type.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <span>Goal completion rate:</span>
                  <span className="font-medium">
                    {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                  <span>Active goal focus:</span>
                  <span className="font-medium">
                    {activeGoals > 0 ? `${activeGoals} active goals` : 'No active goals'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Recent Progress
              </h4>
              
              <div className="space-y-3">
                {goals.filter(g => g.status === 'active').slice(0, 3).map(goal => (
                  <div key={goal.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{goal.goal_title}</span>
                      <span className="text-sm text-gray-600">
                        {Math.round(goal.progress_percentage)}%
                      </span>
                    </div>
                    <Progress value={goal.progress_percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {totalGoals > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedGoals === 0 && activeGoals > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Focus on completion:</strong> You have {activeGoals} active goals. 
                    Consider focusing on completing one before starting new ones.
                  </p>
                </div>
              )}

              {pausedGoals > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Revisit paused goals:</strong> You have {pausedGoals} paused goals. 
                    Consider reviewing them and either resuming or archiving them.
                  </p>
                </div>
              )}

              {completedGoals > 0 && completedGoals / totalGoals > 0.7 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Great success rate!</strong> You're completing {Math.round((completedGoals / totalGoals) * 100)}% 
                    of your goals. Consider setting more ambitious targets.
                  </p>
                </div>
              )}

              {analytics?.avg_completion_time_days && analytics.avg_completion_time_days < 7 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <p className="text-sm text-purple-800">
                    <strong>Quick achiever:</strong> You complete goals quickly! 
                    Consider setting longer-term or more challenging objectives.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
