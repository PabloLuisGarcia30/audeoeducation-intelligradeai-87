
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  BarChart3, 
  FileText, 
  Upload, 
  Link,
  Target,
  Brain,
  Zap,
  TrendingUp,
  Play,
  Star,
  ArrowRight
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const demoApps = [
    {
      id: "home-learner",
      title: "HomeLearner: AI-Powered Practice",
      description: "Experience personalized AI tutoring with adaptive difficulty, real-time misconception detection, and intelligent feedback loops.",
      icon: <Brain className="h-6 w-6" />,
      features: ["AI Tutoring", "Adaptive Learning", "Real-time Feedback", "Misconception Detection"],
      path: "/home-learner",
      color: "bg-blue-50 border-blue-200",
      badge: "AI-Powered"
    },
    {
      id: "mistake-pattern",
      title: "Basic Mistake Pattern Analytics",
      description: "Explore fundamental mistake pattern recognition and basic analytics for educational insights.",
      icon: <BarChart3 className="h-6 w-6" />,
      features: ["Pattern Recognition", "Basic Analytics", "Student Insights", "Error Tracking"],
      path: "/mistake-pattern-demo",
      color: "bg-gray-50 border-gray-200",
      badge: "Basic"
    },
    {
      id: "enhanced-mistake-pattern",
      title: "Enhanced Mistake Pattern Analytics",
      description: "Advanced misconception tracking with real-time logging, cross-session analytics, and AI-powered recommendations.",
      icon: <TrendingUp className="h-6 w-6" />,
      features: ["Real-time Logging", "Cross-session Analytics", "AI Recommendations", "Performance Monitoring"],
      path: "/enhanced-mistake-pattern-demo",
      color: "bg-purple-50 border-purple-200",
      badge: "Enhanced"
    }
  ];

  const teacherTools = [
    {
      title: "Class Management",
      description: "Manage classes, students, and assignments",
      icon: <Users className="h-5 w-5" />,
      path: "/dashboard"
    },
    {
      title: "Upload & Analyze Tests",
      description: "AI-powered test analysis and grading",
      icon: <Upload className="h-5 w-5" />,
      path: "/upload-test"
    },
    {
      title: "Lesson Planner",
      description: "Create adaptive lesson plans",
      icon: <FileText className="h-5 w-5" />,
      path: "/lesson-planner"
    },
    {
      title: "Create Quiz Links",
      description: "Generate shareable quiz links",
      icon: <Link className="h-5 w-5" />,
      path: "/create-quiz-link"
    },
    {
      title: "Live Class Runner",
      description: "Run live interactive classes",
      icon: <Play className="h-5 w-5" />,
      path: "/class-runner"
    },
    {
      title: "Test Creator",
      description: "AI-assisted test creation",
      icon: <Target className="h-5 w-5" />,
      path: "/test-creator"
    }
  ];

  const studentTools = [
    {
      title: "Student Dashboard",
      description: "View your progress and assignments",
      icon: <GraduationCap className="h-5 w-5" />,
      path: "/dashboard"
    },
    {
      title: "Learner Profile",
      description: "Track your learning journey",
      icon: <Users className="h-5 w-5" />,
      path: "/student-profile"
    },
    {
      title: "Trailblazer Learning",
      description: "Personalized learning paths",
      icon: <Star className="h-5 w-5" />,
      path: "/trailblazer"
    },
    {
      title: "Lesson Tracker",
      description: "Track your lesson progress",
      icon: <BookOpen className="h-5 w-5" />,
      path: "/lesson-tracker"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Education Platform
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the future of education with AI-powered learning, adaptive analytics, and personalized insights.
          </p>
        </div>

        {/* Demo Applications */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Demo Applications</h2>
            <p className="text-gray-600">Explore our cutting-edge educational AI technologies</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {demoApps.map((demo) => (
              <Card 
                key={demo.id} 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${demo.color} ${
                  selectedDemo === demo.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedDemo(demo.id)}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {demo.icon}
                    </div>
                    <Badge variant="secondary">{demo.badge}</Badge>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{demo.title}</CardTitle>
                    <CardDescription className="text-sm mt-2">
                      {demo.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {demo.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(demo.path);
                    }}
                    className="w-full group"
                  >
                    Launch Demo
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-12" />

        {/* Authentication & Tools */}
        <section className="space-y-8">
          {!user ? (
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle>Get Started</CardTitle>
                <CardDescription>
                  Sign in to access the full platform with personalized features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/auth")} 
                  className="w-full"
                  size="lg"
                >
                  Sign In / Sign Up
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Welcome back, {profile?.full_name || user.email}!
                </h2>
                <p className="text-gray-600 mt-1">
                  Role: <Badge variant="outline">{profile?.role || 'student'}</Badge>
                </p>
              </div>

              {profile?.role === 'teacher' ? (
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-center">Teacher Tools</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teacherTools.map((tool, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              {tool.icon}
                            </div>
                            <h4 className="font-semibold">{tool.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
                          <Button 
                            onClick={() => navigate(tool.path)}
                            variant="outline" 
                            size="sm"
                            className="w-full"
                          >
                            Open Tool
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-center">Student Tools</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {studentTools.map((tool, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              {tool.icon}
                            </div>
                            <h4 className="font-semibold">{tool.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
                          <Button 
                            onClick={() => navigate(tool.path)}
                            variant="outline" 
                            size="sm"
                            className="w-full"
                          >
                            Open Tool
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Platform Features */}
        <section className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Platform Capabilities</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Learning</h3>
              <p className="text-sm text-gray-600">
                Advanced AI algorithms provide personalized learning experiences and intelligent tutoring.
              </p>
            </Card>
            <Card className="p-6">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-sm text-gray-600">
                Live monitoring and analytics provide instant insights into learning progress and system performance.
              </p>
            </Card>
            <Card className="p-6">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-4">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Adaptive Assessment</h3>
              <p className="text-sm text-gray-600">
                Intelligent assessment tools that adapt to student needs and provide targeted feedback.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
