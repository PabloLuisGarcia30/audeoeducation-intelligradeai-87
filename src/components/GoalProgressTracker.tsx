
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  Clock,
  Award
} from "lucide-react";
import { StudentGoal, GoalAchievement } from "@/services/smartGoalService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface GoalProgressTrackerProps {
  goals: StudentGoal[];
  achievements: GoalAchievement[];
}

export function GoalProgressTracker({ goals, achievements }: GoalProgressTrackerProps) {
  // Prepare progress data for charts
  const progressData = goals
    .filter(g => g.status === 'active')
    .map(goal => ({
      name: goal.goal_title.substring(0, 20) + (goal.goal_title.length > 20 ? '...' : ''),
      progress: goal.progress_percentage,
      target: goal.target_value,
      current: goal.current_value
    }));

  // Prepare achievement timeline
  const achievementTimeline = achievements
    .slice(0, 10)
    .map(achievement => ({
      date: new Date(achievement.achieved_at).toLocaleDateString(),
      type: achievement.achievement_type,
      title: achievement.achievement_title,
      value: achievement.value_achieved || 0
    }));

  // Calculate completion stats by goal type
  const goalTypeStats = goals.reduce((acc, goal) => {
    const type = goal.goal_type;
    if (!acc[type]) {
      acc[type] = { total: 0, completed: 0, active: 0 };
    }
    acc[type].total++;
    if (goal.status === 'completed') acc[type].completed++;
    if (goal.status === 'active') acc[type].active++;
    return acc;
  }, {} as Record<string, { total: number; completed: number; active: number }>);

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'skill_mastery': return <Target className="h-4 w-4" />;
      case 'misconception_resolution': return <Target className="h-4 w-4" />;
      case 'learning_velocity': return <TrendingUp className="h-4 w-4" />;
      case 'consistency': return <Calendar className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'goal_completion': return <Award className="h-4 w-4 text-gold-500" />;
      case 'streak': return <TrendingUp className="h-4 w-4 text-green-500" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Goal Progress Tracker</h2>
        <p className="text-gray-600">Visual insights into your learning journey</p>
      </div>

      {/* Current Active Goals Progress */}
      {progressData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Goals Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value}${name === 'progress' ? '%' : ''}`, 
                      name === 'progress' ? 'Progress' : name === 'current' ? 'Current' : 'Target'
                    ]}
                  />
                  <Bar dataKey="progress" fill="#3b82f6" name="progress" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Type Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Goal Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(goalTypeStats).map(([type, stats]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getGoalTypeIcon(type)}
                  <div>
                    <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">
                      {stats.completed} completed, {stats.active} active
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="font-bold text-lg">
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Goal Details */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goals.filter(g => g.status === 'active').map(goal => (
              <div key={goal.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{goal.goal_title}</h3>
                  <Badge variant="outline">
                    {Math.round(goal.progress_percentage)}% Complete
                  </Badge>
                </div>
                
                <Progress value={goal.progress_percentage} className="mb-3" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Current:</span>
                    <div className="font-medium">{goal.current_value}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Target:</span>
                    <div className="font-medium">{goal.target_value}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <div className="font-medium">
                      {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No deadline'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Days Active:</span>
                    <div className="font-medium">
                      {Math.ceil((Date.now() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                  </div>
                </div>

                {goal.milestones.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Milestones:</p>
                    <div className="flex flex-wrap gap-2">
                      {goal.milestones.map((milestone, index) => (
                        <Badge 
                          key={index}
                          variant={goal.current_value >= milestone.value ? "default" : "outline"}
                          className={goal.current_value >= milestone.value ? "bg-green-500" : ""}
                        >
                          {milestone.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {achievements.slice(0, 5).map(achievement => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getAchievementIcon(achievement.achievement_type)}
                  <div className="flex-1">
                    <p className="font-medium">{achievement.achievement_title}</p>
                    {achievement.achievement_description && (
                      <p className="text-sm text-gray-600">{achievement.achievement_description}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {new Date(achievement.achieved_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
