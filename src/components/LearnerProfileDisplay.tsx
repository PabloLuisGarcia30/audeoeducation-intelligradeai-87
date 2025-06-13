
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearningStyleProgressBar } from "@/components/LearningStyleProgressBar";
import { LearningStyleBySubject } from "@/components/LearningStyleBySubject";
import { StudentTestResults } from "@/components/StudentTestResults";
import { StudentContentSkills } from "@/components/StudentContentSkills";
import { StudentSubjectSkills } from "@/components/StudentSubjectSkills";
import { StudentProgressChart } from "@/components/StudentProgressChart";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useAuthenticatedStudentData } from "@/hooks/useAuthenticatedStudentData";
import { useAuth } from "@/contexts/AuthContext";

interface LearnerProfileDisplayProps {
  studentId: string;
  classId?: string;
  className?: string;
  onBack: () => void;
}

// Mock learning style data - in a real app, this would come from the database
const getLearningStyles = (studentName: string) => {
  const profiles = {
    "Pablo Luis Garcia": [
      { type: "Visual Learner", strength: 85, color: "hsl(221, 83%, 53%)" },
      { type: "Logical Learner", strength: 78, color: "hsl(262, 83%, 58%)" },
      { type: "Reading/Writing", strength: 72, color: "hsl(142, 76%, 36%)" },
      { type: "Kinaesthetic", strength: 45, color: "hsl(25, 95%, 53%)" },
      { type: "Auditory Learner", strength: 38, color: "hsl(0, 84%, 60%)" },
      { type: "Social Learner", strength: 65, color: "hsl(280, 81%, 60%)" },
      { type: "Solitary Learner", strength: 82, color: "hsl(45, 84%, 55%)" },
    ],
    default: [
      { type: "Visual Learner", strength: 70, color: "hsl(221, 83%, 53%)" },
      { type: "Auditory Learner", strength: 60, color: "hsl(0, 84%, 60%)" },
      { type: "Reading/Writing", strength: 75, color: "hsl(142, 76%, 36%)" },
      { type: "Kinaesthetic", strength: 55, color: "hsl(25, 95%, 53%)" },
      { type: "Logical Learner", strength: 65, color: "hsl(262, 83%, 58%)" },
      { type: "Social Learner", strength: 80, color: "hsl(280, 81%, 60%)" },
      { type: "Solitary Learner", strength: 45, color: "hsl(45, 84%, 55%)" },
    ]
  };
  
  return profiles[studentName as keyof typeof profiles] || profiles.default;
};

export function LearnerProfileDisplay({ studentId, classId, className, onBack }: LearnerProfileDisplayProps) {
  const { user, profile } = useAuth();
  
  // Determine if this is for the current authenticated user
  const isCurrentUser = user?.id === studentId;
  
  // Use authenticated data hook for current user, mock data hook for others
  const authenticatedData = useAuthenticatedStudentData({ 
    classId: classId || undefined 
  });
  
  const mockData = useStudentProfileData({ 
    studentId, 
    classId: classId || '', 
    className: className || '' 
  });

  // Choose which data source to use
  const {
    student,
    studentLoading,
    testResults,
    testResultsLoading,
    contentSkillScores,
    contentSkillsLoading,
    subjectSkillScores,
    subjectSkillsLoading,
    classContentSkills,
    classSubjectSkills,
    enrolledClasses,
    isClassView,
    classData
  } = isCurrentUser ? {
    // For authenticated user, use authenticated data with profile info
    student: profile ? {
      id: user.id,
      name: profile.full_name || user.email || 'Current User',
      email: user.email,
      year: null,
      major: null,
      gpa: null,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    } : null,
    studentLoading: authenticatedData.isLoading,
    testResults: authenticatedData.testResults,
    testResultsLoading: authenticatedData.testResultsLoading,
    contentSkillScores: authenticatedData.contentSkillScores,
    contentSkillsLoading: authenticatedData.contentSkillsLoading,
    subjectSkillScores: authenticatedData.subjectSkillScores,
    subjectSkillsLoading: authenticatedData.subjectSkillsLoading,
    classContentSkills: [], // Not implemented for authenticated users yet
    classSubjectSkills: [], // Not implemented for authenticated users yet
    enrolledClasses: authenticatedData.enrolledClasses,
    isClassView: !!classId,
    classData: authenticatedData.classData
  } : {
    // For other students, use mock data
    student: mockData.student,
    studentLoading: mockData.studentLoading,
    testResults: mockData.testResults,
    testResultsLoading: mockData.testResultsLoading,
    contentSkillScores: mockData.contentSkillScores,
    contentSkillsLoading: mockData.contentSkillsLoading,
    subjectSkillScores: mockData.subjectSkillScores,
    subjectSkillsLoading: mockData.subjectSkillsLoading,
    classContentSkills: mockData.classContentSkills,
    classSubjectSkills: mockData.classSubjectSkills,
    enrolledClasses: mockData.enrolledClasses,
    isClassView: mockData.isClassView,
    classData: mockData.classData
  };

  if (studentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading student profile...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">
          {isCurrentUser ? 'User profile not found' : 'Student not found'}
        </div>
      </div>
    );
  }

  const learningStyles = getLearningStyles(student.name);
  const dominantStyle = learningStyles.reduce((prev, current) => 
    (prev.strength > current.strength) ? prev : current
  );

  // Placeholder function for practice test generation
  const handleGeneratePracticeTest = (skillName?: string) => {
    console.log('Generate practice test for:', skillName);
    // TODO: Implement practice test generation
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Student Directory
          </Button>
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">
                    {student.name}
                    {isCurrentUser && <span className="text-sm text-blue-600 ml-2">(You)</span>}
                  </CardTitle>
                  <p className="text-muted-foreground">{student.email || 'No email available'}</p>
                  <div className="flex gap-2 mt-2">
                    {isCurrentUser && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        Authenticated User
                      </span>
                    )}
                    {student.year && (
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                        {student.year}
                      </span>
                    )}
                    {student.major && (
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                        {student.major}
                      </span>
                    )}
                    {className && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {className}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="learning-style" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="learning-style">Learning Style</TabsTrigger>
            <TabsTrigger value="test-results">Test Results</TabsTrigger>
            <TabsTrigger value="content-skills">Content Skills</TabsTrigger>
            <TabsTrigger value="subject-skills">Subject Skills</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="learning-style" className="space-y-8">
            {/* Dominant Learning Style */}
            <Card>
              <CardHeader>
                <CardTitle>Dominant Learning Style</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: dominantStyle.color }}
                  >
                    {dominantStyle.strength}%
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{dominantStyle.type}</h3>
                    <p className="text-muted-foreground">Primary learning preference</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Learning Styles */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Learning Style Profile</CardTitle>
                <p className="text-muted-foreground">General learning preferences across all subjects</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-4 pr-4">
                    {learningStyles.map((style, index) => (
                      <LearningStyleProgressBar
                        key={index}
                        type={style.type}
                        strength={style.strength}
                        color={style.color}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Learning Style Profile per Subject */}
            <LearningStyleBySubject 
              studentName={student.name}
              enrolledClasses={enrolledClasses}
            />
          </TabsContent>

          <TabsContent value="test-results">
            <StudentTestResults 
              testResults={testResults}
              testResultsLoading={testResultsLoading}
            />
          </TabsContent>

          <TabsContent value="content-skills">
            <StudentContentSkills
              contentSkillScores={contentSkillScores}
              contentSkillsLoading={contentSkillsLoading}
              onGeneratePracticeTest={handleGeneratePracticeTest}
              subjectSkillScores={subjectSkillScores}
              classContentSkills={classContentSkills}
              classSubjectSkills={classSubjectSkills}
              isClassView={isClassView}
              classData={classData}
            />
          </TabsContent>

          <TabsContent value="subject-skills">
            <StudentSubjectSkills
              comprehensiveSubjectSkillData={subjectSkillScores}
              subjectSkillsLoading={subjectSkillsLoading}
              classSubjectSkillsLoading={false}
              isClassView={isClassView}
              classSubjectSkills={[]}
              onGeneratePracticeTest={handleGeneratePracticeTest}
            />
          </TabsContent>

          <TabsContent value="progress">
            <StudentProgressChart
              studentId={studentId}
              timeRange={30}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
