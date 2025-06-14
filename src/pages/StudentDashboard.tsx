import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  GraduationCap, 
  LineChart, 
  User, 
  TrendingUp, 
  Calendar, 
  Star,
  Clock,
  Target,
  Trophy,
  Brain,
  CheckCircle2,
  PlayCircle,
  BarChart3,
  Users,
  Award,
  Compass,
  MessageCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TailoredExercises } from "@/components/TailoredExercises";
import { DashboardHeader } from "@/components/DashboardHeader";
import { RoleToggle } from "@/components/RoleToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useDevRole } from "@/contexts/DevRoleContext";
import { AIChatbox } from "@/components/AIChatbox";
import { AdaptiveGoalSetting } from "@/components/AdaptiveGoalSetting";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { AdaptiveInsightsWidget } from "@/components/AdaptiveInsightsWidget";
import { EnhancedStudentProgressTab } from "@/components/EnhancedStudentProgressTab";
import { SmartGoalsManager } from "@/components/SmartGoalsManager";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DEV_CONFIG } from "@/config/devConfig";

interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  major?: string;
  year?: string;
}

// Pablo Luis Garcia test profile data
const testStudentProfile = {
  id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26',
  name: 'Pablo Luis Garcia',
  email: 'PabloLuisAlegaGarcia@gmail.com',
  major: 'Computer Science',
  year: 'Grade 11'
};

// Mock data based on Pablo's performance
const mockProgressData = [
  { subject: "Mathematics", progress: 85, grade: "A-", recentScore: 88 },
  { subject: "Science", progress: 90, grade: "A", recentScore: 92 },
  { subject: "Geography", progress: 87, grade: "A-", recentScore: 89 },
  { subject: "English", progress: 82, grade: "B+", recentScore: 85 },
];

const mockRecentActivities = [
  { title: "Geography Test - Grade 11", type: "assessment", score: 89, date: "2 days ago", status: "completed" },
  { title: "Algebra Practice Test", type: "assessment", score: 88, date: "5 days ago", status: "completed" },
  { title: "Science Lab Report", type: "assignment", score: 92, date: "1 week ago", status: "completed" },
  { title: "Literature Essay", type: "assignment", score: 85, date: "1 week ago", status: "completed" },
];

const mockUpcomingTasks = [
  { title: "Math Quiz - Functions", type: "quiz", dueDate: "Tomorrow", priority: "high" },
  { title: "Geography Project", type: "project", dueDate: "In 3 days", priority: "medium" },
  { title: "Science Homework", type: "homework", dueDate: "Next week", priority: "low" },
];

const mockLearningGoals = [
  { goal: "Master Quadratic Functions", progress: 85, target: "End of month" },
  { goal: "Improve Geographic Analysis", progress: 87, target: "Next quarter" },
  { goal: "Advanced Problem Solving", progress: 82, target: "This semester" },
];

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const { currentRole, isDevMode } = useDevRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Navigate to teacher dashboard when role changes to teacher
  useEffect(() => {
    if (isDevMode && currentRole === 'teacher') {
      navigate('/');
    }
  }, [currentRole, isDevMode, navigate]);

  // Initialize loading state
  useEffect(() => {
    setLoading(false);
  }, []);

  // Use Pablo's profile data for testing
  const studentProfile = testStudentProfile;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <User className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Required</h2>
          <p className="text-slate-600 mb-6">Please log in to access your student dashboard.</p>
          <Button onClick={() => window.location.href = '/auth'} className="bg-blue-600 hover:bg-blue-700">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const overallGPA = mockProgressData.reduce((sum, subject) => sum + subject.progress, 0) / mockProgressData.length;

  // Prepare student context for AI coach
  const studentContext = {
    studentName: studentProfile.name,
    className: 'Grade 11 Advanced',
    classSubject: 'Mathematics',
    classGrade: 'Grade 11',
    teacher: 'Ms. Johnson',
    contentSkillScores: mockProgressData.map(subject => ({
      skill_name: subject.subject,
      score: subject.progress,
      points_earned: Math.round(subject.progress * 0.9),
      points_possible: 90
    })),
    subjectSkillScores: mockProgressData.map(subject => ({
      skill_name: `${subject.subject} Analysis`,
      score: subject.recentScore,
      points_earned: Math.round(subject.recentScore * 0.8),
      points_possible: 80
    })),
    testResults: mockRecentActivities.filter(activity => activity.type === 'assessment').map(test => ({
      overall_score: test.score
    })),
    groupedSkills: {
      'Core Skills': mockProgressData.map(subject => ({
        skill_name: subject.subject,
        score: subject.progress
      })),
      'Advanced Skills': mockProgressData.map(subject => ({
        skill_name: `Advanced ${subject.subject}`,
        score: subject.recentScore
      }))
    },
    classId: 'test-class-id'
  };

  return (
    <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header with Role Toggle */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
              <p className="text-gray-600">
                Welcome back! Track your progress and continue learning.
              </p>
            </div>
            
            {/* Role Toggle */}
            <div className="flex-shrink-0">
              <RoleToggle />
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="practice">Practice</TabsTrigger>
              <TabsTrigger value="trailblazer">Trailblazer</TabsTrigger>
              <TabsTrigger value="home-learner">Home Learner</TabsTrigger>
              <TabsTrigger value="class-scores">Class Scores</TabsTrigger>
              <TabsTrigger value="progress">Progress Analytics</TabsTrigger>
              <TabsTrigger value="smart-goals">Smart Goals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Goal Planner Feature Card */}
              <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 cursor-pointer"
                onClick={() => navigate('/goal-planner')}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Goal Planner</h3>
                      <p className="text-blue-100 text-sm">Set & Track Your Learning Goals</p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-100 mb-3">
                    Create personalized learning goals, track your progress, and celebrate achievements with our AI-powered goal setting system.
                  </p>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-white/20 text-white border-0 hover:bg-white/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/goal-planner');
                    }}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Open Goal Planner
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subject Progress */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Subject Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockProgressData.map((subject, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="font-medium">{subject.subject}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{subject.grade}</Badge>
                            <span className="text-sm text-slate-600">{subject.progress}%</span>
                          </div>
                        </div>
                        <Progress value={subject.progress} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Upcoming Tasks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Upcoming Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockUpcomingTasks.map((task, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <p className="text-xs text-slate-600">{task.dueDate}</p>
                        </div>
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : 
                                 task.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockRecentActivities.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{activity.title}</h4>
                            <p className="text-sm text-slate-600 capitalize">{activity.type} • {activity.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{activity.score}%</div>
                          <Badge variant="outline" className="text-xs">
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="practice">
              <TailoredExercises />
            </TabsContent>

            <TabsContent value="trailblazer">
              <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Compass className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Trailblazer</h3>
                      <p className="text-green-100 text-sm">Learner</p>
                    </div>
                  </div>
                  <p className="text-sm text-green-100 mb-3">
                    Explore advanced learning paths and unlock new challenges
                  </p>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-white/20 text-white border-0 hover:bg-white/30"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Journey
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="home-learner">
              <Card>
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-800">{overallGPA.toFixed(1)}%</div>
                  <div className="text-sm text-slate-600">Overall Progress</div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="class-scores">
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-800">{mockRecentActivities.length}</div>
                  <div className="text-sm text-slate-600">Completed Tasks</div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Academic Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {mockProgressData.map((subject, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{subject.subject}</h4>
                            <span className="text-2xl font-bold text-slate-800">{subject.grade}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">Overall Progress</span>
                              <div className="font-medium">{subject.progress}%</div>
                            </div>
                            <div>
                              <span className="text-slate-600">Recent Score</span>
                              <div className="font-medium">{subject.recentScore}%</div>
                            </div>
                          </div>
                          <Progress value={subject.progress} className="h-3" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        <div>
                          <h4 className="font-medium">Honor Roll</h4>
                          <p className="text-sm text-slate-600">Maintained 85%+ average</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Star className="h-8 w-8 text-blue-500" />
                        <div>
                          <h4 className="font-medium">Geography Excellence</h4>
                          <p className="text-sm text-slate-600">Top performer in Geography</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Brain className="h-8 w-8 text-green-500" />
                        <div>
                          <h4 className="font-medium">Problem Solver</h4>
                          <p className="text-sm text-slate-600">Excels in mathematical reasoning</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="rich-progress">
              <EnhancedStudentProgressTab 
                studentId={studentProfile.id} 
                studentName={studentProfile.name}
              />
            </TabsContent>

            <TabsContent value="goals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Learning Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {mockLearningGoals.map((goal, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{goal.goal}</h4>
                        <span className="text-sm text-slate-600">Target: {goal.target}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={goal.progress} className="flex-1 h-3" />
                        <span className="text-sm font-medium w-12">{goal.progress}%</span>
                      </div>
                    </div>
                  ))}
                  
                  <Button className="w-full mt-4" variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Set New Goal
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="smart-goals">
              <SmartGoalsManager />
            </TabsContent>

            <TabsContent value="analytics">
              <MetricsDashboard studentId={studentProfile.id} />
            </TabsContent>

            <TabsContent value="insights">
              <AdaptiveInsightsWidget studentId={studentProfile.id} />
            </TabsContent>

            <TabsContent value="results-history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Your Learning History
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">
                        Explore Your Learning Journey
                      </h3>
                      <p className="text-slate-600 mb-6 max-w-md mx-auto">
                        View detailed progress tracking, skill improvements, and misconception resolution over time.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate('/student-dashboard/results-history')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Detailed Results History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-coach" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Your Personal AI Learning Coach
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AIChatbox studentContext={studentContext} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Student Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <p className="text-lg font-medium">{studentProfile.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <p className="text-lg font-medium">{studentProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Academic Year</label>
                        <p className="text-lg font-medium">{studentProfile.year}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Major</label>
                        <p className="text-lg font-medium">{studentProfile.major}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4">Academic Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{overallGPA.toFixed(1)}%</div>
                          <div className="text-sm text-slate-600">Overall Average</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{mockRecentActivities.length}</div>
                          <div className="text-sm text-slate-600">Completed Assessments</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{mockProgressData.length}</div>
                          <div className="text-sm text-slate-600">Active Subjects</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
