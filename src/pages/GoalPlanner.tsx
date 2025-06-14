
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
import { shouldUseDevAuth } from "@/config/devConfig";
import { toast } from "sonner";

export default function GoalPlanner() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, isDevMode } = useAuth();
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'calendar' | 'achievements' | 'insights'>('overview');
  const [goalOperationLoading, setGoalOperationLoading] = useState(false);

  // Enhanced authentication debug logging
  useEffect(() => {
    const devAuthActive = shouldUseDevAuth();
    console.log('🔍 GoalPlanner Auth Debug:', {
      isDevMode,
      devAuthActive,
      userId: user?.id,
      userEmail: user?.email,
      profileRole: profile?.role,
      profileName: profile?.full_name,
      authLoading,
      hasUser: !!user,
      hasProfile: !!profile
    });

    // Log authentication method being used
    if (devAuthActive) {
      console.log('🔧 Using development authentication bypass');
    } else {
      console.log('🔐 Using Supabase authentication');
    }
  }, [user, profile, authLoading, isDevMode]);

  useEffect(() => {
    if (user?.id && !authLoading) {
      loadGoals();
    }
  }, [user?.id, authLoading]);

  const loadGoals = async () => {
    if (!user?.id) {
      console.error('❌ No authenticated user found for loading goals');
      return;
    }

    try {
      setLoading(true);
      console.log('🎯 Loading goals for user:', user.id);
      const studentGoals = await SmartGoalService.getStudentGoals(user.id);
      console.log('✅ Successfully loaded goals:', studentGoals.length);
      setGoals(studentGoals);
    } catch (error) {
      console.error('❌ Failed to load goals:', error);
      toast.error('Failed to load your goals. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalCreated = async (newGoal: StudentGoal) => {
    try {
      setGoalOperationLoading(true);
      console.log('🎯 Goal created successfully:', newGoal.goal_title);
      setGoals(prev => [newGoal, ...prev]);
      setShowWizard(false);
      toast.success('🎯 Goal created successfully! You\'re on your way to success!');
    } catch (error) {
      console.error('❌ Failed to handle goal creation:', error);
      toast.error('Something went wrong while saving your goal. Please try again.');
    } finally {
      setGoalOperationLoading(false);
    }
  };

  const handleGoalError = (error: any) => {
    console.error('❌ Goal operation error:', error);
    
    // Enhanced error handling with dev mode context
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error?.message?.includes('row-level security')) {
      if (isDevMode) {
        errorMessage = 'RLS policy error detected in dev mode. This suggests the authentication bypass is not working properly.';
        console.log('🔧 Dev mode RLS error details:', {
          devModeActive: shouldUseDevAuth(),
          currentUserId: user?.id,
          expectedPabloId: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26',
          errorDetails: error
        });
      } else {
        errorMessage = 'Authentication issue detected. Please try signing out and back in.';
      }
    } else if (error?.message?.includes('duplicate')) {
      errorMessage = 'A goal with this title already exists. Please choose a different title.';
    } else if (error?.message?.includes('network')) {
      errorMessage = 'Connection issue. Please check your internet and try again.';
    } else if (error?.message?.includes('permission')) {
      errorMessage = 'Permission denied. Please contact support if this continues.';
    } else if (error?.code === 'PGRST116') {
      errorMessage = 'Database connection issue. Please try again in a moment.';
    } else if (error?.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    toast.error(errorMessage);
  };

  // Show loading if auth is still loading or we don't have user data yet
  if (authLoading || !user?.id || loading) {
    return (
      <ProtectedRoute requiredRole={shouldUseDevAuth() ? undefined : "student"}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-slate-600">
              {authLoading ? 'Authenticating...' : 'Loading your goals...'}
            </p>
            {isDevMode && (
              <p className="text-sm text-blue-600 mt-2">
                Dev Mode: Using Mock Authentication
              </p>
            )}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get the display name from profile or fallback to user email
  const displayName = profile?.full_name || user.email || 'Student';
  const firstName = displayName.split(' ')[0];

  return (
    <ProtectedRoute requiredRole={shouldUseDevAuth() ? undefined : "student"}>
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
              {isDevMode && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Dev Mode: {displayName}
                </Badge>
              )}
            </div>
            
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">
                {getGreeting()}, {firstName}! 🎯
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
                      disabled={goalOperationLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {goalOperationLoading ? 'Creating...' : 'Set New Goal'}
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
                      disabled={goalOperationLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {goalOperationLoading ? 'Creating...' : 'Set Your First Goal'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* AI Recommendations */}
              <AIGoalRecommendations 
                studentId={user.id} 
                onGoalCreated={handleGoalCreated}
                onError={handleGoalError}
              />

              {/* Monthly Activity Tracker */}
              <MonthlyActivityTracker />
            </div>
          )}

          {selectedView === 'calendar' && (
            <GoalCalendar goals={goals} />
          )}

          {selectedView === 'achievements' && (
            <AchievementCenter studentId={user.id} />
          )}

          {selectedView === 'insights' && (
            <GoalInsightsPanel studentId={user.id} />
          )}

          {/* Goal Creation Wizard */}
          {showWizard && (
            <GoalCreationWizard
              studentId={user.id}
              onGoalCreated={handleGoalCreated}
              onCancel={() => setShowWizard(false)}
              onError={handleGoalError}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
