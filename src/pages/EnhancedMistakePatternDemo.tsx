import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useEnhancedMistakeAnalytics } from "@/hooks/useEnhancedMistakeAnalytics";
import { EnhancedMisconceptionLoggingService } from "@/services/enhancedMisconceptionLoggingService";
import { EnhancedValidationMonitoringService } from "@/services/enhancedValidationMonitoringService";
import { EnhancedCacheLoggingService } from "@/services/enhancedCacheLoggingService";
import { MisconceptionFeedback } from "@/components/MisconceptionFeedback";
import { 
  BarChart, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Users, 
  ArrowLeft, 
  Activity,
  Zap,
  Clock,
  CheckCircle,
  Play,
  Pause
} from "lucide-react";

// Enhanced demo students with more realistic data
const DEMO_STUDENTS = [
  { id: "demo-student-1", name: "Alex Johnson", grade: "Grade 10", classId: "math-algebra-1" },
  { id: "demo-student-2", name: "Sarah Chen", grade: "Grade 10", classId: "math-algebra-1" },
  { id: "demo-student-3", name: "Michael Davis", grade: "Grade 11", classId: "math-geometry-1" },
  { id: "demo-student-4", name: "Emma Wilson", grade: "Grade 9", classId: "math-basics-1" }
];

const DEMO_SKILLS = [
  "Algebraic Expressions",
  "Linear Equations", 
  "Quadratic Functions",
  "Geometric Proofs",
  "Trigonometry",
  "Polynomial Operations",
  "System of Equations"
];

const DEMO_SESSION_TYPES = [
  { value: "all", label: "All Sessions" },
  { value: "practice", label: "Practice Exercises" },
  { value: "class_session", label: "Class Sessions" },
  { value: "trailblazer", label: "Trailblazer" },
  { value: "exam", label: "Assessments" }
];

export default function EnhancedMistakePatternDemo() {
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState(DEMO_STUDENTS[0].id);
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [selectedSessionType, setSelectedSessionType] = useState<string>("all");
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  
  const { 
    mistakeAnalysis, 
    commonPatterns, 
    loading, 
    error,
    getTopMisconceptions,
    getCriticalSkills,
    getRemediationRecommendations
  } = useEnhancedMistakeAnalytics(selectedStudent, selectedSkill === "all" ? undefined : selectedSkill);

  // Enhanced analytics data
  const [enhancedAnalytics, setEnhancedAnalytics] = useState({
    misconceptionAnalytics: EnhancedMisconceptionLoggingService.getMisconceptionAnalytics([selectedStudent]),
    validationAnalytics: EnhancedValidationMonitoringService.getValidationAnalytics(),
    cacheAnalytics: EnhancedCacheLoggingService.getTeacherCacheAnalytics([selectedStudent])
  });

  const topMisconceptions = getTopMisconceptions(5);
  const criticalSkills = getCriticalSkills();
  const remediationRecommendations = getRemediationRecommendations();

  // Simulate real-time misconception detection
  const startSimulation = async () => {
    setIsSimulationRunning(true);
    const student = DEMO_STUDENTS.find(s => s.id === selectedStudent);
    
    // Simulate misconception events
    const simulatedEvents = [
      {
        type: 'misconception_detected',
        student: student?.name,
        skill: 'Linear Equations',
        misconception: 'Sign Error in Equation Solving',
        severity: 'medium' as const,
        sessionType: 'practice' as const
      },
      {
        type: 'practice_completed',
        student: student?.name,
        skill: 'Algebraic Expressions',
        score: 0.75,
        sessionType: 'practice' as const
      },
      {
        type: 'validation_success',
        operation: 'misconception_validation',
        time: 145,
        successRate: 0.92
      }
    ];

    for (const event of simulatedEvents) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (event.type === 'misconception_detected') {
        await EnhancedMisconceptionLoggingService.logMisconception({
          student_id: selectedStudent,
          misconception_type: event.misconception,
          skill_name: event.skill,
          severity: event.severity,
          session_type: event.sessionType,
          context_data: { simulated: true, timestamp: Date.now() }
        });
      }
      
      // Update analytics in real-time
      setEnhancedAnalytics(prev => ({
        ...prev,
        misconceptionAnalytics: EnhancedMisconceptionLoggingService.getMisconceptionAnalytics([selectedStudent])
      }));
      
      setSimulationData(event);
    }
    
    setIsSimulationRunning(false);
  };

  const stopSimulation = () => {
    setIsSimulationRunning(false);
    setSimulationData(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'fundamental': case 'major': return 'destructive';
      case 'moderate': return 'secondary';
      case 'minor': case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'fundamental': case 'major': case 'high': 
        return <AlertTriangle className="h-4 w-4" />;
      case 'moderate': case 'medium': 
        return <TrendingUp className="h-4 w-4" />;
      default: 
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Enhanced Mistake Pattern Analytics Demo</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive misconception tracking, real-time logging, and system performance analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <Badge variant="secondary">AI-Powered Enhanced Analytics</Badge>
        </div>
      </div>

      {/* Enhanced Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Enhanced Demo Controls
          </CardTitle>
          <CardDescription>
            Configure student, skill, and session type filters. Start real-time simulation to see live misconception tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_STUDENTS.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Skill</label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger>
                  <SelectValue placeholder="All skills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {DEMO_SKILLS.map((skill) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Session Type</label>
              <Select value={selectedSessionType} onValueChange={setSelectedSessionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_SESSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Real-time Simulation Controls */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium">Real-time Misconception Simulation</h4>
              <p className="text-sm text-muted-foreground">
                Simulate live misconception detection and logging across different session types
              </p>
            </div>
            <Button 
              onClick={isSimulationRunning ? stopSimulation : startSimulation}
              variant={isSimulationRunning ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isSimulationRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  Stop Simulation
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Simulation
                </>
              )}
            </Button>
          </div>

          {/* Live Simulation Display */}
          {simulationData && (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <strong>Live Event:</strong> {simulationData.type === 'misconception_detected' && 
                  `Misconception detected for ${simulationData.student}: ${simulationData.misconception} in ${simulationData.skill}`}
                {simulationData.type === 'practice_completed' && 
                  `${simulationData.student} completed practice in ${simulationData.skill} with score ${(simulationData.score * 100).toFixed(0)}%`}
                {simulationData.type === 'validation_success' && 
                  `System validation completed: ${simulationData.operation} in ${simulationData.time}ms (${(simulationData.successRate * 100).toFixed(0)}% success rate)`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Total Misconceptions</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {enhancedAnalytics.misconceptionAnalytics.totalMisconceptions}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all session types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Validation Rate</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {enhancedAnalytics.validationAnalytics.totalValidations > 0 
                ? `${((1 - enhancedAnalytics.validationAnalytics.recentFailures.length / enhancedAnalytics.validationAnalytics.totalValidations) * 100).toFixed(1)}%`
                : '100%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              System reliability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Cache Efficiency</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {(enhancedAnalytics.cacheAnalytics.overallHitRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              ${enhancedAnalytics.cacheAnalytics.totalCostSavings.toFixed(2)} saved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Avg Response Time</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {enhancedAnalytics.validationAnalytics.averageValidationTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              System performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Display */}
      {loading && (
        <Alert>
          <AlertDescription>Loading enhanced mistake pattern analytics...</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <Tabs defaultValue="student-analysis" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="student-analysis">Student Analysis</TabsTrigger>
            <TabsTrigger value="misconception-tracking">Live Tracking</TabsTrigger>
            <TabsTrigger value="patterns">Common Patterns</TabsTrigger>
            <TabsTrigger value="system-performance">Performance</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="student-analysis" className="space-y-4">
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Top Misconceptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Misconceptions</CardTitle>
                  <CardDescription>Most frequent error patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  {topMisconceptions.length > 0 ? (
                    <div className="space-y-3">
                      {topMisconceptions.map((misconception, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(misconception.errorSeverity)}
                              <span className="font-medium">{misconception.skillName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {misconception.misconceptionCategory}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={getSeverityColor(misconception.errorSeverity)}>
                              {misconception.errorCount} errors
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No mistake data available for this student{selectedSkill !== "all" && ` in ${selectedSkill}`}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Session Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Type Breakdown</CardTitle>
                  <CardDescription>Misconceptions by learning context</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(enhancedAnalytics.misconceptionAnalytics.severityDistribution).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(severity)}
                          <span className="font-medium capitalize">{severity}</span>
                        </div>
                        <Badge variant={getSeverityColor(severity)}>{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Real-time Metrics</CardTitle>
                  <CardDescription>Live system performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Cache Hit Rate:</span>
                      <Badge variant="default">
                        {(enhancedAnalytics.cacheAnalytics.overallHitRate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Validations Today:</span>
                      <Badge variant="outline">{enhancedAnalytics.validationAnalytics.totalValidations}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost Savings:</span>
                      <Badge variant="secondary">
                        ${enhancedAnalytics.cacheAnalytics.totalCostSavings.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="misconception-tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Misconception Tracking
                </CardTitle>
                <CardDescription>
                  Real-time misconception detection and logging across all session types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Recent Misconceptions</h4>
                    {enhancedAnalytics.misconceptionAnalytics.mostCommonTypes.map(({ type, count }, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{type}</span>
                        <Badge variant="destructive">{count}</Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Session Type Distribution</h4>
                    {DEMO_SESSION_TYPES.slice(1).map((sessionType, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{sessionType.label}</span>
                          <span>{Math.floor(Math.random() * 20)}%</span>
                        </div>
                        <Progress value={Math.floor(Math.random() * 100)} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Misconception Feedback Demo */}
                <div className="mt-6">
                  <h4 className="font-medium mb-4">Interactive Misconception Feedback</h4>
                  <MisconceptionFeedback
                    questionId="demo-question-1"
                    selectedOption="B"
                    isIncorrect={true}
                    misconceptionData={{
                      misconceptionCategory: "Procedural Errors",
                      misconceptionSubtype: "Sign Error in Equation Solving",
                      description: "Student incorrectly applied the distributive property, forgetting to change the sign when distributing a negative.",
                      confidence: 0.85
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Common Error Patterns
                </CardTitle>
                <CardDescription>
                  System-wide error patterns identified across multiple students and session types
                </CardDescription>
              </CardHeader>
              <CardContent>
                {commonPatterns.length > 0 ? (
                  <div className="space-y-4">
                    {commonPatterns.map((pattern, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">Pattern ID: {pattern.errorPatternId}</h4>
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {pattern.patternFrequency} occurrences
                            </Badge>
                            <Badge variant={getSeverityColor(pattern.averageSeverity)}>
                              {pattern.averageSeverity}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div>
                            <span className="font-medium">Affected Skills:</span>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {pattern.affectedSkills.map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No common error patterns detected yet. Patterns emerge as more student data is collected across different session types.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system-performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Cache Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Hit Rate</span>
                      <Badge variant="default">
                        {(enhancedAnalytics.cacheAnalytics.overallHitRate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Cost Savings</span>
                      <Badge variant="outline">
                        ${enhancedAnalytics.cacheAnalytics.totalCostSavings.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cache Events</span>
                      <Badge variant="secondary">
                        {enhancedAnalytics.cacheAnalytics.totalStudentEvents}
                      </Badge>
                    </div>
                    <Progress value={enhancedAnalytics.cacheAnalytics.overallHitRate * 100} className="mt-4" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Validation Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Validations</span>
                      <Badge variant="outline">
                        {enhancedAnalytics.validationAnalytics.totalValidations}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Response Time</span>
                      <Badge variant="default">
                        {enhancedAnalytics.validationAnalytics.averageValidationTime.toFixed(0)}ms
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Recent Failures</span>
                      <Badge variant={enhancedAnalytics.validationAnalytics.recentFailures.length > 0 ? "destructive" : "default"}>
                        {enhancedAnalytics.validationAnalytics.recentFailures.length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Operations Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>System Operations Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {Object.entries(enhancedAnalytics.validationAnalytics.operationBreakdown).map(([operation, count]) => (
                    <div key={operation} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm capitalize">{operation.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  AI-Powered Recommendations
                </CardTitle>
                <CardDescription>
                  Personalized learning recommendations based on enhanced misconception analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {remediationRecommendations.length > 0 ? (
                  <div className="space-y-4">
                    <Alert>
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        These recommendations are generated based on {mistakeAnalysis.length} analyzed skills, 
                        {enhancedAnalytics.misconceptionAnalytics.totalMisconceptions} misconceptions, and real-time system performance data.
                      </AlertDescription>
                    </Alert>
                    <div className="grid gap-3">
                      {remediationRecommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                          <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">{recommendation}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Priority: High • Based on cross-session misconception patterns
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Enhanced recommendations will appear as more misconception data is collected across practice, class sessions, and trailblazer activities.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Demo Information */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Enhanced Demo Features:</strong> This demo now showcases real-time misconception logging, 
                cross-session analytics, system performance monitoring, and AI-powered recommendations. 
                The enhanced logging system captures detailed student interactions across HomeLearner practice, 
                active class sessions, and Trailblazer learning paths.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
