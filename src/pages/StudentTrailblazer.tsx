
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Compass, 
  ArrowLeft, 
  Star, 
  Trophy, 
  Target, 
  Zap, 
  Map, 
  Award,
  ChevronRight,
  PlayCircle,
  Brain,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrailblazer } from "@/hooks/useTrailblazer";
import { TrailblazerStats } from "@/components/TrailblazerStats";
import { ConceptMasteryDisplay } from "@/components/ConceptMasteryDisplay";
import { TrailblazerAchievements } from "@/components/TrailblazerAchievements";

const StudentTrailblazer = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { streak, recentSessions, isLoading } = useTrailblazer();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/student-dashboard')}
            className="text-green-700 hover:text-green-800 hover:bg-green-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full w-24 h-24 flex items-center justify-center">
            <Compass className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Trailblazer Learner
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Forge your own path through advanced learning challenges and unlock your full potential
          </p>
          
          {!isLoading && streak && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                🔥 {streak.current_streak_days} day streak
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                🎯 {streak.total_sessions} sessions completed
              </Badge>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="mb-12">
          <TrailblazerStats />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Concept Mastery */}
          <ConceptMasteryDisplay />
          
          {/* Achievements */}
          <TrailblazerAchievements />
        </div>

        {/* Quick Action Features */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Start New Session */}
          <Card className="relative overflow-hidden border-green-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Start Session</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Begin a focused learning session with personalized challenges and real-time feedback.
              </p>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Learning
              </Button>
            </CardContent>
          </Card>

          {/* Concept Exploration */}
          <Card className="relative overflow-hidden border-blue-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Explore Concepts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Dive deep into specific concepts and track your mastery progress over time.
              </p>
              <Button variant="outline" className="w-full border-blue-300 text-blue-600 hover:bg-blue-50">
                <Brain className="h-4 w-4 mr-2" />
                Browse Concepts
              </Button>
            </CardContent>
          </Card>

          {/* Progress Analytics */}
          <Card className="relative overflow-hidden border-purple-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">View Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Get detailed insights into your learning patterns and improvement trends.
              </p>
              <Button variant="outline" className="w-full border-purple-300 text-purple-600 hover:bg-purple-50">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Progress
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Features */}
        <Card className="max-w-6xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="text-center">More Features Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Advanced Learning Paths */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Map className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium mb-2">Advanced Paths</h4>
                <p className="text-sm text-gray-600">Customized learning journeys</p>
              </div>

              {/* Challenge Modes */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <h4 className="font-medium mb-2">Challenge Modes</h4>
                <p className="text-sm text-gray-600">Time-based learning challenges</p>
              </div>

              {/* AI Tutor */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="font-medium mb-2">AI Tutor</h4>
                <p className="text-sm text-gray-600">Personalized AI guidance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-8 text-center">
            <Compass className="h-16 w-16 mx-auto mb-4 text-white/90" />
            <h2 className="text-2xl font-bold mb-4">Ready to Blaze Your Trail?</h2>
            <p className="text-green-50 mb-6 leading-relaxed">
              Start your personalized learning journey today and track your progress as you master new concepts.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full bg-white text-green-600 hover:bg-green-50"
                size="lg"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Your First Session
              </Button>
              <Button 
                onClick={() => navigate('/student-dashboard/main')}
                variant="ghost"
                className="w-full text-green-100 hover:text-white hover:bg-white/20"
                size="lg"
              >
                Explore Traditional Dashboard
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentTrailblazer;
