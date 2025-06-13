
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  Target,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { type StudentGoal } from "@/services/smartGoalService";

interface MonthlyGoalDashboardProps {
  goals: StudentGoal[];
}

export function MonthlyGoalDashboard({ goals }: MonthlyGoalDashboardProps) {
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Filter goals for current month
  const monthlyGoals = goals.filter(goal => {
    const goalDate = new Date(goal.created_at);
    return goalDate >= startOfMonth && goalDate <= endOfMonth;
  });

  const activeGoals = monthlyGoals.filter(goal => goal.status === 'active');
  const completedGoals = monthlyGoals.filter(goal => goal.status === 'completed');
  const overallProgress = activeGoals.length > 0 ? 
    activeGoals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / activeGoals.length : 0;

  // Goals with upcoming deadlines
  const upcomingDeadlines = activeGoals.filter(goal => {
    if (!goal.target_date) return false;
    const deadlineDate = new Date(goal.target_date);
    const daysUntil = Math.ceil((deadlineDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil > 0;
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-800">
          <Calendar className="h-6 w-6" />
          {currentMonth} Progress Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-indigo-100">
            <Target className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-indigo-800">{monthlyGoals.length}</div>
            <div className="text-sm text-indigo-600">Total Goals</div>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg border border-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-800">{completedGoals.length}</div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
            <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getProgressColor(overallProgress)}`}>
              {Math.round(overallProgress)}%
            </div>
            <div className="text-sm text-purple-600">Avg Progress</div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white p-4 rounded-lg border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-indigo-800">Monthly Progress</h4>
            <span className={`font-bold ${getProgressColor(overallProgress)}`}>
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <p className="text-sm text-indigo-600 mt-2">
            {activeGoals.length > 0 
              ? `You're making great progress on ${activeGoals.length} active goals!`
              : completedGoals.length > 0 
                ? "Congratulations! You've completed all your goals for this month!"
                : "Ready to set some goals for this month?"
            }
          </p>
        </div>

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800">Upcoming Deadlines</h4>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.map(goal => {
                const daysUntil = Math.ceil((new Date(goal.target_date!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={goal.id} className="flex items-center justify-between">
                    <span className="text-amber-800 font-medium">{goal.goal_title}</span>
                    <Badge variant="outline" className="border-amber-300 text-amber-700">
                      {daysUntil} day{daysUntil !== 1 ? 's' : ''} left
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">
              {goals.filter(g => g.goal_type === 'skill_mastery').length}
            </div>
            <div className="text-xs text-blue-600">Skill Goals</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">
              {goals.filter(g => g.goal_type === 'consistency').length}
            </div>
            <div className="text-xs text-green-600">Consistency</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-700">
              {goals.filter(g => g.is_ai_suggested).length}
            </div>
            <div className="text-xs text-purple-600">AI Suggested</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-700">
              {goals.filter(g => g.difficulty_level === 'hard').length}
            </div>
            <div className="text-xs text-orange-600">Challenging</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
