import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AIChatbox } from "@/components/AIChatbox";
import { SupercoachIntegrationWidget } from "@/components/SupercoachIntegrationWidget";
import { useSupercoachIntegration } from "@/hooks/useSupercoachIntegration";
import { AdaptiveLearningInsights } from "@/components/AdaptiveLearningInsights";
import { AdaptiveGoalSetting } from "@/components/AdaptiveGoalSetting";
import { useAdaptiveLearning } from "@/hooks/useAdaptiveLearning";

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  // Add adaptive learning hook
  const {
    profile: adaptiveProfile,
    recentEvents,
    learningPatterns,
    loading: adaptiveLoading
  } = useAdaptiveLearning(user?.id || null);

  const {
    predictiveAlerts,
    miniLessons,
    loading: supercoachLoading,
    runPredictiveDetection,
    generateAdaptiveMiniLesson
  } = useSupercoachIntegration(user?.id);

  useEffect(() => {
    if (!user) {
      // If not logged in, redirect to login page
      router.push('/login');
    } else {
      // Fetch student data
      fetchStudentData();
    }
  }, [user, router]);

  const fetchStudentData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch student profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch content skill scores
      const { data: contentScores, error: contentError } = await supabase
        .from('content_skill_scores')
        .select('*')
        .eq('student_id', user.id);

      if (contentError) {
        console.error('Error fetching content skill scores:', contentError);
      }

      // Fetch subject skill scores
      const { data: subjectScores, error: subjectError } = await supabase
        .from('subject_skill_scores')
        .select('*')
        .eq('student_id', user.id);

      if (subjectError) {
        console.error('Error fetching subject skill scores:', subjectError);
      }

      // Fetch test results
      const { data: testResults, error: testError } = await supabase
        .from('test_results')
        .select('*')
        .eq('student_id', user.id);

      if (testError) {
        console.error('Error fetching test results:', testError);
      }

      // Group skills by category
      const groupedSkills = {
        math: contentScores?.filter(skill => skill.category === 'math') || [],
        science: contentScores?.filter(skill => skill.category === 'science') || [],
        english: contentScores?.filter(skill => skill.category === 'english') || []
      };

      setStudentData({
        profile: profileData,
        contentSkillScores: contentScores || [],
        subjectSkillScores: subjectScores || [],
        testResults: testResults || [],
        groupedSkills: groupedSkills
      });
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <h1 className="text-2xl font-bold text-gray-900 text-center">Authentication Required</h1>
            <div className="py-8 text-base leading-normal text-gray-500 text-center">
              Please sign in to access your dashboard.
            </div>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              session={null}
              providers={['google', 'github']}
            />
          </div>
        </div>
      </div>
    );
  }

  // In the JSX return, add the adaptive learning components
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">Student Dashboard</h1>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={`https://avatars.dicebear.com/api/open-peeps/${user?.email}.svg`} />
                <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Welcome, {user?.user_metadata?.full_name || user?.email || 'Student'}!</h2>
          <p className="text-gray-600">Here's a snapshot of your learning journey. Let's make today productive!</p>
        </section>

        {/* Add Adaptive Learning Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <section className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Learning Assistant</CardTitle>
                  <CardDescription>Get personalized help and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <AIChatbox
                    studentContext={{
                      studentName: user?.user_metadata?.full_name || user?.email || 'Student',
                      className: studentData?.profile?.class_name || 'N/A',
                      classSubject: studentData?.profile?.class_subject || 'General',
                      classGrade: studentData?.profile?.class_grade || 'N/A',
                      teacher: studentData?.profile?.teacher_name || 'N/A',
                      contentSkillScores: studentData?.contentSkillScores || [],
                      subjectSkillScores: studentData?.subjectSkillScores || [],
                      testResults: studentData?.testResults || [],
                      groupedSkills: studentData?.groupedSkills || {},
                      classId: studentData?.profile?.class_id
                    }}
                  />
                </CardContent>
              </Card>
            </section>
            
            {/* Test Results and Progress sections go here */}
          </div>
          
          {/* Adaptive Learning Sidebar */}
          <div className="space-y-6">
            <AdaptiveLearningInsights
              profile={adaptiveProfile}
              recentEvents={recentEvents}
              learningPatterns={learningPatterns}
            />
            
            <AdaptiveGoalSetting
              profile={adaptiveProfile}
              studentContext={{
                studentName: user?.user_metadata?.full_name || user?.email || 'Student',
                contentSkillScores: studentData?.contentSkillScores || [],
                subjectSkillScores: studentData?.subjectSkillScores || []
              }}
            />
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
                <CardDescription>Your average score across all subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">78%</div>
                <Progress value={78} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Math Score</CardTitle>
                <CardDescription>Your current standing in mathematics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">85%</div>
                <Progress value={85} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Science Score</CardTitle>
                <CardDescription>How you're performing in science</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">72%</div>
                <Progress value={72} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
