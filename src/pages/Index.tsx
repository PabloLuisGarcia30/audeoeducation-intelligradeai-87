
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StudentDashboard } from "@/components/StudentDashboard";
import { StudentSearch } from "@/components/StudentSearch";
import { LearnerProfileDisplay } from "@/components/LearnerProfileDisplay";
import { ClassView } from "@/components/ClassView";
import { StudentPortals } from "@/components/StudentPortals";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useDevRole } from "@/contexts/DevRoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { DEV_CONFIG } from "@/config/devConfig";
import { EnhancedTeacherAnalytics } from "@/components/EnhancedTeacherAnalytics";

const Index = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'search' | 'classes' | 'analytics' | 'portals' | 'student-lesson-tracker' | 'learner-profiles'>('dashboard');
  
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Get current role (dev or actual)
  let currentRole: 'teacher' | 'student' = 'teacher';
  let isDevMode = false;
  try {
    const { currentRole: devRole, isDevMode: devModeFlag } = useDevRole();
    isDevMode = devModeFlag;
    if (isDevMode) {
      currentRole = devRole;
    } else if (profile?.role) {
      currentRole = profile.role;
    }
  } catch {
    currentRole = profile?.role || 'teacher';
  }

  console.log('📊 Index page - Current role:', currentRole, 'Dev mode:', isDevMode);

  // Only navigate to student dashboard when role changes to student AND we're not in FORCE_NO_AUTH mode
  useEffect(() => {
    if (!DEV_CONFIG.FORCE_NO_AUTH && isDevMode && currentRole === 'student') {
      console.log('🔄 Navigating to student dashboard for role:', currentRole);
      navigate('/student-dashboard');
    }
  }, [currentRole, isDevMode, navigate]);

  const handleSelectStudent = (studentId: string, classId?: string, className?: string) => {
    setSelectedStudent(studentId);
    if (classId && className) {
      setSelectedClass({ id: classId, name: className });
    } else {
      setSelectedClass(null);
    }
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setSelectedClass(null);
  };

  const renderContent = () => {
    if (selectedStudent) {
      return (
        <LearnerProfileDisplay 
          studentId={selectedStudent} 
          classId={selectedClass?.id}
          className={selectedClass?.name}
          onBack={handleBack} 
        />
      );
    }

    switch (activeView) {
      case 'search':
        return (
          <div className="p-6">
            <StudentSearch onSelectStudent={handleSelectStudent} />
          </div>
        );
      case 'classes':
        return (
          <div className="p-6">
            <ClassView onSelectStudent={handleSelectStudent} />
          </div>
        );
      case 'analytics':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600 mb-4">Comprehensive class performance insights and trends</p>
            
            {/* Enhanced Analytics for each class */}
            <div className="space-y-8">
              {/* This would typically loop through user's classes */}
              <EnhancedTeacherAnalytics 
                classId="sample-class-id" 
                className="Grade 11 Mathematics"
              />
            </div>
          </div>
        );
      case 'portals':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Portals</h1>
            <p className="text-gray-600 mb-4">Manage student access and assignments</p>
            <StudentPortals />
          </div>
        );
      case 'student-lesson-tracker':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Lesson Tracker</h1>
            <p className="text-gray-600 mb-4">Track lesson progress and completion</p>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        );
      case 'learner-profiles':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Learner Profiles</h1>
            <p className="text-gray-600 mb-4">Detailed student learning analytics</p>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <StudentDashboard onSelectStudent={handleSelectStudent} />
          </div>
        );
    }
  };

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50">
          <DashboardSidebar activeView={activeView} onViewChange={setActiveView} />
          <main className="flex-1 overflow-auto">
            {/* Role indicator when in dev mode */}
            {DEV_CONFIG.FORCE_NO_AUTH && (
              <div className="bg-blue-100 border-b border-blue-200 px-6 py-2">
                <p className="text-sm text-blue-800">
                  🔧 Dev Mode: Currently viewing as <strong>{currentRole}</strong>
                  {currentRole === 'teacher' && ' (Mr. Cullen)'}
                  {currentRole === 'student' && ' (Pablo Luis Garcia)'}
                </p>
              </div>
            )}
            {renderContent()}
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default Index;
