
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
  Lock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const StudentTrailblazer = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

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
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Forge your own path through advanced learning challenges and unlock your full potential
          </p>
          <Badge variant="secondary" className="mt-4 bg-green-100 text-green-800">
            Beta Version - Coming Soon
          </Badge>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Advanced Learning Paths */}
          <Card className="relative overflow-hidden border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Map className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Advanced Paths</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Navigate through customized learning journeys that adapt to your pace and interests.
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Coming Soon
                </Badge>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Challenge Modes */}
          <Card className="relative overflow-hidden border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle className="text-lg">Challenge Modes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Test your skills with time-based challenges and competitive learning scenarios.
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Coming Soon
                </Badge>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Achievement System */}
          <Card className="relative overflow-hidden border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Achievements</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Earn badges and unlock new content as you master different learning milestones.
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Coming Soon
                </Badge>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Progress Tracking */}
          <Card className="relative overflow-hidden border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Smart Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Get detailed insights into your learning patterns and areas for improvement.
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Coming Soon
                </Badge>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Personalized Content */}
          <Card className="relative overflow-hidden border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Star className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-lg">AI Tutor</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Get personalized explanations and adaptive content powered by advanced AI.
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Coming Soon
                </Badge>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Community Features */}
          <Card className="relative overflow-hidden border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">Leaderboards</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Compete with peers and track your ranking in various skill categories.
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Coming Soon
                </Badge>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-8 text-center">
            <Compass className="h-16 w-16 mx-auto mb-4 text-white/90" />
            <h2 className="text-2xl font-bold mb-4">Ready to Blaze Your Trail?</h2>
            <p className="text-green-50 mb-6 leading-relaxed">
              The Trailblazer Learner experience is currently in development. We're working hard to bring you 
              innovative learning features that will transform how you study and grow.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/student-dashboard/main')}
                className="w-full bg-white text-green-600 hover:bg-green-50"
                size="lg"
              >
                Explore Current Dashboard
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-sm text-green-100">
                Or continue with the traditional learning experience for now
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentTrailblazer;
