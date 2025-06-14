import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Calendar, 
  Trophy, 
  TrendingUp, 
  Plus,
  ArrowLeft,
  Brain,
  Star,
  CheckCircle2,
  Clock,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SmartGoalService, type StudentGoal } from "@/services/smartGoalService";
import { MonthlyGoalDashboard } from "@/components/MonthlyGoalDashboard";
import { GoalCreationWizard } from "@/components/GoalCreationWizard";
import { GoalCard } from "@/components/GoalCard";
import { GoalCalendar } from "@/components/GoalCalendar";
import { AchievementCenter } from "@/components/AchievementCenter";
import { AIGoalRecommendations } from "@/components/AIGoalRecommendations";
import { GoalInsightsPanel } from "@/components/GoalInsightsPanel";
import { GoalAchievementCelebration } from "@/components/GoalAchievementCelebration";
import { MonthlyActivityTracker } from "@/components/MonthlyActivityTracker";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DEV_CONFIG } from "@/config";

export default function GoalPlanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'calendar' | 'achievements' | 'insights'>('overview');

  // Pablo Luis Garcia test profile data
  const studentProfile = {
    id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26',
    name: 'Pablo Luis Garcia',
    email: 'PabloLuisAlegaGarcia@gmail.com'
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const studentGoals = await SmartGoalService.getStudentGoals(studentProfile.id);
      setGoals(studentGoals);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalCreated = (newGoal: StudentGoal) => {
    setGoals(prev => [newGoal, ...prev]);
    setShowWizard(false);
  };

  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-slate-600">Loading your goals...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/student-dashboard')}
                className="text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">
                {getGreeting()}, {studentProfile.name.split(' ')[0]}! 🎯
              </h1>
              <p className="text-xl text-slate-600">
                Let's make this {currentMonth} your most successful month yet!
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{activeGoals.length}</div>
                  <div className="text-sm opacity-90">Active Goals</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{completedGoals.length}</div>
                  <div className="text-sm opacity-90">Completed</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {activeGoals.length > 0 ? 
                      Math.round(activeGoals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / activeGoals.length) : 0
                    }%
                  </div>
                  <div className="text-sm opacity-90">Avg Progress</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{new Date().getDate()}</div>
                  <div className="text-sm opacity-90">Day of Month</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button 
              variant={selectedView === 'overview' ? 'default' : 'outline'}
              onClick={() => setSelectedView('overview')}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Overview
            </Button>
            <Button 
              variant={selectedView === 'calendar' ? 'default' : 'outline'}
              onClick={() => setSelectedView('calendar')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </Button>
            <Button 
              variant={selectedView === 'achievements' ? 'default' : 'outline'}
              onClick={() => setSelectedView('achievements')}
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Achievements
            </Button>
            <Button 
              variant={selectedView === 'insights' ? 'default' : 'outline'}
              onClick={() => setSelectedView('insights')}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Insights
            </Button>
          </div>

          {/* Main Content */}
          {selectedView === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => setShowWizard(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Set New Goal
                    </Button>
                    <Button variant="outline">
                      <Brain className="h-4 w-4 mr-2" />
                      Get AI Suggestions
                    </Button>
                    <Button variant="outline">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Progress
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Dashboard */}
              <MonthlyGoalDashboard goals={goals} />

              {/* Active Goals */}
              {activeGoals.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      Your Active Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeGoals.map(goal => (
                        <GoalCard key={goal.id} goal={goal} onUpdate={loadGoals} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Ready to start your learning journey?
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Set your first goal and watch your progress soar! Our AI can help you choose the perfect goal to start with.
                    </p>
                    <Button 
                      onClick={() => setShowWizard(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Set Your First Goal
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* AI Recommendations */}
              <AIGoalRecommendations 
                studentId={studentProfile.id} 
                onGoalCreated={handleGoalCreated}
              />

              {/* Monthly Activity Tracker */}
              <MonthlyActivityTracker />
            </div>
          )}

          {selectedView === 'calendar' && (
            <GoalCalendar goals={goals} />
          )}

          {selectedView === 'achievements' && (
            <AchievementCenter studentId={studentProfile.id} />
          )}

          {selectedView === 'insights' && (
            <GoalInsightsPanel studentId={studentProfile.id} />
          )}

          {/* Goal Creation Wizard */}
          {showWizard && (
            <GoalCreationWizard
              studentId={studentProfile.id}
              onGoalCreated={handleGoalCreated}
              onCancel={() => setShowWizard(false)}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
