import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  TrendingUp, 
  Calendar,
  Award,
  Brain,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock
} from "lucide-react";
import { SmartGoalService, StudentGoal, AIGoalRecommendation, GoalAchievement, GoalAnalytics } from "@/services/smartGoalService";
import { AIGoalRecommendations } from "@/components/AIGoalRecommendations";
import { GoalProgressTracker } from "@/components/GoalProgressTracker";
import { GoalAchievementCelebration } from "@/components/GoalAchievementCelebration";
import { GoalInsightsPanel } from "@/components/GoalInsightsPanel";
import { useAuth } from "@/contexts/AuthContext";

export function SmartGoalsManager() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [achievements, setAchievements] = useState<GoalAchievement[]>([]);
  const [recommendations, setRecommendations] = useState<AIGoalRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<GoalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    if (user?.id) {
      loadGoalsData();
    }
  }, [user?.id]);

  const loadGoalsData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [goalsData, achievementsData, analyticsData] = await Promise.all([
        SmartGoalService.getStudentGoals(user.id),
        SmartGoalService.getGoalAchievements(user.id),
        SmartGoalService.getGoalAnalytics(user.id)
      ]);

      setGoals(goalsData);
      setAchievements(achievementsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load goals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!user?.id) return;

    try {
      setLoadingRecommendations(true);
      const recommendationsData = await SmartGoalService.generateGoalRecommendations(user.id);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAcceptGoal = async (recommendation: AIGoalRecommendation) => {
    if (!user?.id) return;

    const newGoal = await SmartGoalService.createGoalFromRecommendation(user.id, recommendation);
    if (newGoal) {
      setGoals(prev => [newGoal, ...prev]);
      setRecommendations(prev => prev.filter(r => r.goal_title !== recommendation.goal_title));
    }
  };

  const handleGoalCreated = (newGoal: StudentGoal) => {
    setGoals(prev => [newGoal, ...prev]);
  };

  const handleUpdateGoalStatus = async (goalId: string, status: StudentGoal['status']) => {
    await SmartGoalService.updateGoalStatus(goalId, status);
    setGoals(prev => prev.map(goal => 
      goal.id === goalId ? { ...goal, status } : goal
    ));
  };

  const getGoalTypeIcon = (type: StudentGoal['goal_type']) => {
    switch (type) {
      case 'skill_mastery': return <Target className="h-4 w-4" />;
      case 'misconception_resolution': return <Brain className="h-4 w-4" />;
      case 'learning_velocity': return <TrendingUp className="h-4 w-4" />;
      case 'consistency': return <Calendar className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getGoalTypeColor = (type: StudentGoal['goal_type']) => {
    switch (type) {
      case 'skill_mastery': return 'bg-blue-100 text-blue-800';
      case 'misconception_resolution': return 'bg-purple-100 text-purple-800';
      case 'learning_velocity': return 'bg-green-100 text-green-800';
      case 'consistency': return 'bg-orange-100 text-orange-800';
      case 'time_based': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const recentAchievements = achievements.filter(a => !a.celebration_shown).slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading your goals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Goals</h1>
          <p className="text-gray-600">AI-powered personalized learning goals</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadRecommendations}
            disabled={loadingRecommendations}
          >
            <Brain className="h-4 w-4 mr-2" />
            {loadingRecommendations ? 'Generating...' : 'Get AI Suggestions'}
          </Button>
          <Button variant="outline" onClick={loadGoalsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Active Goals</p>
                  <p className="text-2xl font-bold">{analytics.active_goals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{analytics.completed_goals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Avg. Completion</p>
                  <p className="text-2xl font-bold">
                    {analytics.avg_completion_time_days ? `${Math.round(analytics.avg_completion_time_days)}d` : '-'}
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
                  <p className="text-sm text-gray-600">Best Type</p>
                  <p className="text-sm font-semibold capitalize">
                    {analytics.most_successful_goal_type.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <GoalAchievementCelebration 
          achievements={recentAchievements}
          onMarkShown={SmartGoalService.markAchievementShown}
        />
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current Goals</TabsTrigger>
          <TabsTrigger value="recommendations">AI Suggestions</TabsTrigger>
          <TabsTrigger value="progress">Progress Tracker</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="grid gap-4">
            {activeGoals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Goals</h3>
                  <p className="text-gray-600 mb-4">Get started with AI-powered goal recommendations!</p>
                  <Button onClick={loadRecommendations} disabled={loadingRecommendations}>
                    <Brain className="h-4 w-4 mr-2" />
                    Get AI Suggestions
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeGoals.map(goal => (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getGoalTypeIcon(goal.goal_type)}
                        <div>
                          <CardTitle className="text-lg">{goal.goal_title}</CardTitle>
                          <p className="text-sm text-gray-600">{goal.goal_description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getGoalTypeColor(goal.goal_type)}>
                          {goal.goal_type.replace('_', ' ')}
                        </Badge>
                        {goal.is_ai_suggested && (
                          <Badge variant="outline">
                            <Brain className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span>{Math.round(goal.progress_percentage)}%</span>
                        </div>
                        <Progress value={goal.progress_percentage} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Current: {goal.current_value} / Target: {goal.target_value}
                        </span>
                        {goal.target_date && (
                          <span className="text-gray-600">
                            Due: {new Date(goal.target_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {goal.milestones.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Milestones:</p>
                          {goal.milestones.map((milestone, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 
                                className={`h-4 w-4 ${
                                  goal.current_value >= milestone.value 
                                    ? 'text-green-500' 
                                    : 'text-gray-300'
                                }`} 
                              />
                              <span className={
                                goal.current_value >= milestone.value 
                                  ? 'text-green-700' 
                                  : 'text-gray-600'
                              }>
                                {milestone.title} ({milestone.value})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateGoalStatus(goal.id, 'paused')}
                        >
                          Pause
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateGoalStatus(goal.id, 'completed')}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <AIGoalRecommendations 
            studentId={user?.id || ''}
            onGoalCreated={handleGoalCreated}
            recommendations={recommendations}
            onAcceptGoal={handleAcceptGoal}
            onRefresh={loadRecommendations}
            loading={loadingRecommendations}
          />
        </TabsContent>

        <TabsContent value="progress">
          <GoalProgressTracker 
            goals={goals}
            achievements={achievements}
          />
        </TabsContent>

        <TabsContent value="insights">
          <GoalInsightsPanel 
            studentId={user?.id || ''}
            analytics={analytics}
            goals={goals}
            achievements={achievements}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
