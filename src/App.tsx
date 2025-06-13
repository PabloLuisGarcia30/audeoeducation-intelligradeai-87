
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DevRoleProvider } from "./contexts/DevRoleContext";
import { MultiSkillSelectionProvider } from "./contexts/MultiSkillSelectionContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentLanding from "./pages/StudentLanding";
import StudentClassScores from "./pages/StudentClassScores";
import UploadTest from "./pages/UploadTest";
import LessonPlanner from "./pages/LessonPlanner";
import CreateQuizLink from "./pages/CreateQuizLink";
import StudentQuiz from "./pages/StudentQuiz";
import StudentUpload from "./pages/StudentUpload";
import ClassRunner from "./pages/ClassRunner";
import StudentLearnerProfile from "./pages/StudentLearnerProfile";
import StudentTrailblazer from "./pages/StudentTrailblazer";
import TrailblazerSession from "./pages/TrailblazerSession";
import StudentPracticeExercise from "./pages/StudentPracticeExercise";
import TestCreator from "./pages/TestCreator";
import StudentLessonTracker from "./pages/StudentLessonTracker";
import HomeLearner from "./pages/HomeLearner";
import MistakePatternDemo from "./pages/MistakePatternDemo";
import EnhancedMistakePatternDemo from "./pages/EnhancedMistakePatternDemo";
import NotFound from "./pages/NotFound";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DevRoleProvider>
            <MultiSkillSelectionProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Index />} />
                  <Route path="/student/:token" element={<StudentLanding />} />
                  <Route path="/student-class-scores/:token" element={<StudentClassScores />} />
                  <Route path="/quiz/:token" element={<StudentQuiz />} />
                  <Route path="/upload/:token" element={<StudentUpload />} />
                  <Route path="/home-learner" element={<HomeLearner />} />
                  <Route path="/mistake-pattern-demo" element={<MistakePatternDemo />} />
                  <Route path="/enhanced-mistake-pattern-demo" element={<EnhancedMistakePatternDemo />} />
                  
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <StudentDashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/upload-test" element={
                    <ProtectedRoute requiredRole="teacher">
                      <UploadTest />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/lesson-planner" element={
                    <ProtectedRoute requiredRole="teacher">
                      <LessonPlanner />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/create-quiz-link" element={
                    <ProtectedRoute requiredRole="teacher">
                      <CreateQuizLink />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/class-runner" element={
                    <ProtectedRoute requiredRole="teacher">
                      <ClassRunner />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/test-creator" element={
                    <ProtectedRoute requiredRole="teacher">
                      <TestCreator />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/student-profile" element={
                    <ProtectedRoute>
                      <StudentLearnerProfile />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/trailblazer" element={
                    <ProtectedRoute>
                      <StudentTrailblazer />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/trailblazer-session/:sessionId" element={
                    <ProtectedRoute>
                      <TrailblazerSession />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/practice/:sessionId" element={
                    <ProtectedRoute>
                      <StudentPracticeExercise />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/lesson-tracker" element={
                    <ProtectedRoute>
                      <StudentLessonTracker />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </MultiSkillSelectionProvider>
          </DevRoleProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
