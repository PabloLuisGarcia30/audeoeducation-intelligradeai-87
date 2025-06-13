
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, GraduationCap, Compass, PlayCircle, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const StudentLanding = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {profile?.full_name || 'Student'}!
          </h1>
          <p className="text-xl text-gray-600">
            Choose how you'd like to learn today
          </p>
        </div>

        {/* Four Card Options */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Dashboard Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <LayoutDashboard className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                Access your traditional learning dashboard with assignments, progress tracking, and study tools.
              </p>
              <Button 
                onClick={() => navigate('/student-dashboard/main')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                Open Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Goal Calendar Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Goal Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                Track your learning goals with our smart calendar and celebrate your achievements.
              </p>
              <Button 
                onClick={() => navigate('/goal-planner?tab=calendar')}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Trailblazer Learner Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Compass className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Trailblazer Learner
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                Explore advanced learning paths and unlock new challenges with personalized education.
              </p>
              <Button 
                onClick={() => navigate('/student-dashboard/trailblazer')}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Journey
              </Button>
            </CardContent>
          </Card>

          {/* HomeLearner Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <GraduationCap className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                HomeLearner
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                Experience personalized learning with adaptive content and AI-powered study assistance.
              </p>
              <Button 
                onClick={() => navigate('/student-dashboard/home-learner')}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                Start Learning
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentLanding;
