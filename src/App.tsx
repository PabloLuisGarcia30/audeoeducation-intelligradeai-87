import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentLanding from "./pages/StudentLanding";
import StudentTrailblazer from "./pages/StudentTrailblazer";
import StudentResultsHistory from "./pages/StudentResultsHistory";
import HomeLearner from "./pages/HomeLearner";
import StudentClassScores from "./pages/StudentClassScores";
import StudentPracticeExercise from "./pages/StudentPracticeExercise";
import MistakePatternDemo from "./pages/MistakePatternDemo";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DevRoleProvider, useDevRole } from "./contexts/DevRoleContext";
import { MultiSkillSelectionProvider } from "./contexts/MultiSkillSelectionContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import TestCreator from "./pages/TestCreator";
import UploadTest from "./pages/UploadTest";
import StudentUpload from "./pages/StudentUpload";
import CreateQuizLink from "./pages/CreateQuizLink";
import StudentLessonTracker from "./pages/StudentLessonTracker";
import StudentLearnerProfile from "./pages/StudentLearnerProfile";
import StudentQuiz from "./pages/StudentQuiz";
import ClassRunner from "./pages/ClassRunner";
import LessonPlanner from "./pages/LessonPlanner";
import TrailblazerSession from "./pages/TrailblazerSession";
import GoalPlanner from "./pages/GoalPlanner";
import { DEV_CONFIG } from "./config/devConfig";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const { currentRole, isDevMode } = useDevRole();
  
  console.log('🔍 AppRoutes render:', { user: user?.id, profile: profile?.role, loading, currentRole, isDevMode });

  // Determine current role for routing (but don't enforce it)
  let effectiveRole: 'teacher' | 'student' = 'teacher';
  if (isDevMode) {
    effectiveRole = currentRole;
  } else if (profile?.role) {
    effectiveRole = profile.role;
  }

  console.log('🎯 Effective role for routing:', effectiveRole);

  // Skip loading check when FORCE_NO_AUTH is true
  if (loading && !DEV_CONFIG.FORCE_NO_AUTH) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/quiz/:token" element={<StudentQuiz />} />
      
      {/* Protected Routes - but no actual protection when FORCE_NO_AUTH is true */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            {effectiveRole === 'student' ? <Navigate to="/student-dashboard" replace /> : <Index />}
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard" 
        element={
          <ProtectedRoute>
            <StudentLanding />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/main" 
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/goal-planner" 
        element={
          <ProtectedRoute>
            <GoalPlanner />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/student-dashboard/results-history" 
        element={
          <ProtectedRoute>
            <StudentResultsHistory />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/trailblazer" 
        element={
          <ProtectedRoute>
            <StudentTrailblazer />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/student-dashboard/trailblazer/session/:sessionId" 
        element={
          <ProtectedRoute>
            <TrailblazerSession />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/home-learner" 
        element={
          <ProtectedRoute>
            <HomeLearner />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/class/:classId" 
        element={
          <ProtectedRoute>
            <StudentClassScores />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/practice/:classId/:skillName" 
        element={
          <ProtectedRoute>
            <StudentPracticeExercise />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/test-creator" 
        element={
          <ProtectedRoute>
            <TestCreator />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/upload-test" 
        element={
          <ProtectedRoute>
            <UploadTest />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-upload" 
        element={
          <ProtectedRoute>
            <StudentUpload />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/create-quiz-link" 
        element={
          <ProtectedRoute>
            <CreateQuizLink />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-lesson-tracker" 
        element={
          <ProtectedRoute>
            <StudentLessonTracker />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-learner-profile" 
        element={
          <ProtectedRoute>
            <StudentLearnerProfile />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/class-runner" 
        element={
          <ProtectedRoute>
            <ClassRunner />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/lesson-planner" 
        element={
          <ProtectedRoute>
            <LessonPlanner />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/mistake-pattern-demo" 
        element={
          <ProtectedRoute>
            <MistakePatternDemo />
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  console.log('🚀 App component mounting');
  
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <DevRoleProvider>
          <AuthProvider>
            <MultiSkillSelectionProvider>
              <TooltipProvider>
                <Toaster />
                <AppRoutes />
              </TooltipProvider>
            </MultiSkillSelectionProvider>
          </AuthProvider>
        </DevRoleProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
