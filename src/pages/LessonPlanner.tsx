
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ChevronUp, ChevronDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { ClassStudentList } from "@/components/ClassStudentList";
import { MisconceptionAnalyticsDashboard } from "@/components/MisconceptionAnalyticsDashboard";
import { useQuery } from "@tanstack/react-query";
import { getActiveClassByIdWithDuration, getAllActiveStudents } from "@/services/examService";
import { getClassMisconceptionTrends } from "@/services/enhancedLessonPlanService";
import { useState } from "react";

export default function LessonPlanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const className = searchParams.get('class') || 'Unknown Class';
  const classId = searchParams.get('classId');
  
  // Automatically show student list when classId is present
  const [showStudentList, setShowStudentList] = useState(!!classId);
  const [showMisconceptionAnalytics, setShowMisconceptionAnalytics] = useState(false);

  // Fetch class data if classId is available - using WithDuration version for calendar
  const { data: classData, isLoading: isLoadingClass } = useQuery({
    queryKey: ['activeClassWithDuration', classId],
    queryFn: () => getActiveClassByIdWithDuration(classId!),
    enabled: !!classId,
  });

  // Fetch all active students to get their names
  const { data: allStudents = [] } = useQuery({
    queryKey: ['allActiveStudents'],
    queryFn: getAllActiveStudents,
    enabled: !!classId
  });

  // Fetch misconception trends for the class
  const { data: misconceptionTrends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['classMisconceptionTrends', classId],
    queryFn: () => getClassMisconceptionTrends(classId!, 30),
    enabled: !!classId,
  });

  const handleToggleStudentList = () => {
    setShowStudentList(!showStudentList);
  };

  const handleToggleMisconceptionAnalytics = () => {
    setShowMisconceptionAnalytics(!showMisconceptionAnalytics);
  };

  const handleSelectStudent = (studentId: string, studentName: string) => {
    console.log('Selected student for lesson planning:', { studentId, studentName });
    // TODO: Navigate to individualized lesson planning for this student
    // navigate(`/lesson-planner/student/${studentId}?class=${className}&classId=${classId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/class-runner')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to ClassRunner
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-blue-800 bg-clip-text text-transparent">
            Lesson Planner
          </h1>
          <p className="text-lg text-slate-600 mt-2">Plan lessons for {className}</p>
        </div>

        {/* Enhanced Action Buttons and Calendar */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              <Button 
                onClick={handleToggleStudentList}
                className="flex flex-col items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-auto min-h-[3rem] relative"
                size="lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">Individualized Lesson Plan</span>
                  {showStudentList ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
                <span className="text-sm">for your next class</span>
              </Button>

              <Button 
                onClick={handleToggleMisconceptionAnalytics}
                variant="outline"
                className="flex items-center gap-2 px-6 py-3"
                size="lg"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Misconception Analytics</span>
                {showMisconceptionAnalytics ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>
            
            {/* Weekly Calendar */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Next 7 Days</h3>
              <WeeklyCalendar 
                classData={classData} 
                isLoading={isLoadingClass}
              />
            </div>
          </div>
        </div>

        {/* Misconception Trends Summary */}
        {classId && misconceptionTrends && (
          <div className="mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Class Misconception Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{misconceptionTrends.totalLessonPlans}</div>
                    <div className="text-sm text-gray-600">Total Lesson Plans</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{misconceptionTrends.misconceptionAnnotatedPlans}</div>
                    <div className="text-sm text-gray-600">With Misconception Tracking</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {misconceptionTrends.totalLessonPlans > 0 
                        ? Math.round((misconceptionTrends.misconceptionAnnotatedPlans / misconceptionTrends.totalLessonPlans) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Coverage Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Misconception Analytics Dashboard */}
        {showMisconceptionAnalytics && classId && (
          <div className="mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Detailed Misconception Analytics for {className}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MisconceptionAnalyticsDashboard 
                  classId={classId}
                  timeframe={30}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student List - Shows by default when classId is present */}
        {showStudentList && classId && (
          <div className="mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Plan Enhanced Lessons for {className}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (with misconception tracking)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClassStudentList 
                  classId={classId}
                  className={className}
                  onSelectStudent={handleSelectStudent}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content - Only show if no classId (fallback) */}
        {!classId && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Enhanced Lesson Planning Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Select a Class to Plan Lessons
                </h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  Navigate to ClassRunner and select a class to begin enhanced lesson planning with misconception tracking and personalized exercises for each student.
                </p>
                <Button 
                  onClick={() => navigate('/class-runner')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to ClassRunner
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
