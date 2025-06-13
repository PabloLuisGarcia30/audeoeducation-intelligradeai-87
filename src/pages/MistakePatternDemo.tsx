import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useEnhancedMistakeAnalytics } from "@/hooks/useEnhancedMistakeAnalytics";
import { BarChart, Brain, TrendingUp, AlertTriangle, Target, Users, ArrowLeft, Activity, Shield, Clock } from "lucide-react";

// Mock student IDs for demo purposes
const DEMO_STUDENTS = [
  { id: "demo-student-1", name: "Alex Johnson" },
  { id: "demo-student-2", name: "Sarah Chen" },
  { id: "demo-student-3", name: "Michael Davis" }
];

const DEMO_SKILLS = [
  "Algebraic Expressions",
  "Linear Equations", 
  "Quadratic Functions",
  "Geometric Proofs",
  "Trigonometry"
];

// Enhanced mock data for misconceptions
const DEMO_MISCONCEPTIONS = [
  {
    id: "misc-1",
    student_id: "demo-student-1",
    type: "Sign Error in Algebra",
    skill: "Algebraic Expressions",
    severity: "high",
    confidence: 0.92,
    detected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    session_type: "practice",
    persistence_count: 3,
    resolved: false
  },
  {
    id: "misc-2",
    student_id: "demo-student-1",
    type: "Fraction Operations",
    skill: "Linear Equations",
    severity: "medium",
    confidence: 0.87,
    detected_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    session_type: "class_session",
    persistence_count: 1,
    resolved: true
  },
  {
    id: "misc-3",
    student_id: "demo-student-2",
    type: "Order of Operations",
    skill: "Algebraic Expressions",
    severity: "high",
    confidence: 0.95,
    detected_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    session_type: "trailblazer",
    persistence_count: 2,
    resolved: false
  }
];

// Mock validation and performance data
const DEMO_VALIDATION_STATS = {
  total_validations: 156,
  average_time: 324,
  success_rate: 94.2,
  recent_failures: 3
};

const DEMO_ACTION_ANALYTICS = {
  total_actions: 428,
  active_students: 12,
  actions_by_type: {
    "practice_started": 89,
    "misconception_detected": 34,
    "exercise_completed": 156,
    "validation_performed": 149
  },
  actions_by_session: {
    "practice": 198,
    "class_session": 134,
    "trailblazer": 96
  }
};

export default function MistakePatternDemo() {
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState(DEMO_STUDENTS[0].id);
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  
  const { 
    mistakeAnalysis, 
    commonPatterns, 
    loading, 
    error,
    getTopMisconceptions,
    getCriticalSkills,
    getRemediationRecommendations
  } = useEnhancedMistakeAnalytics(selectedStudent, selectedSkill === "all" ? undefined : selectedSkill);

  const topMisconceptions = getTopMisconceptions(3);
  const criticalSkills = getCriticalSkills();
  const remediationRecommendations = getRemediationRecommendations();

  // Filter misconceptions for selected student
  const studentMisconceptions = DEMO_MISCONCEPTIONS.filter(
    misc => misc.student_id === selectedStudent
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'fundamental': 
      case 'high': return 'destructive';
      case 'major': 
      case 'medium': return 'secondary';
      case 'moderate': 
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'fundamental':
      case 'major':
      case 'high': 
        return <AlertTriangle className="h-4 w-4" />;
      case 'moderate':
      case 'medium': 
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
              Advanced error analysis with enhanced misconception tracking and real-time monitoring
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <Badge variant="secondary">AI-Powered Analytics</Badge>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Demo Controls
          </CardTitle>
          <CardDescription>
            Select a student and optionally filter by skill to see enhanced mistake pattern analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {DEMO_STUDENTS.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filter by Skill (Optional)</label>
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
        </CardContent>
      </Card>

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
            <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
            <TabsTrigger value="patterns">Common Patterns</TabsTrigger>
            <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
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
                            <p className="text-xs text-muted-foreground mt-1">
                              Avg persistence: {misconception.averagePersistence}
                            </p>
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

              {/* Critical Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Critical Skills</CardTitle>
                  <CardDescription>Skills requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {criticalSkills.length > 0 ? (
                    <div className="space-y-3">
                      {criticalSkills.map((skill, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{skill.skillName}</span>
                            <Badge variant="destructive">{skill.errorSeverity}</Badge>
                          </div>
                          <Progress value={(skill.errorCount / 10) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {skill.errorCount} critical errors identified
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No critical skills identified
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analysis Summary</CardTitle>
                  <CardDescription>Overall pattern insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Skills Analyzed:</span>
                      <Badge variant="outline">{mistakeAnalysis.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Critical Issues:</span>
                      <Badge variant="destructive">{criticalSkills.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Remediation Areas:</span>
                      <Badge variant="secondary">{remediationRecommendations.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Analysis Status:</span>
                      <Badge variant="default">Complete</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            {mistakeAnalysis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Mistake Analysis</CardTitle>
                  <CardDescription>Comprehensive breakdown by skill and error type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mistakeAnalysis.map((analysis, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{analysis.skillName}</h4>
                          <div className="flex gap-2">
                            <Badge variant={getSeverityColor(analysis.errorSeverity)}>
                              {analysis.errorSeverity}
                            </Badge>
                            <Badge variant="outline">{analysis.errorCount} errors</Badge>
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div>
                            <span className="font-medium">Misconception:</span> {analysis.misconceptionCategory}
                          </div>
                          <div>
                            <span className="font-medium">Avg Persistence:</span> {analysis.averagePersistence}
                          </div>
                          {analysis.remediationThemes.length > 0 && (
                            <div>
                              <span className="font-medium">Remediation Themes:</span>
                              <div className="flex gap-1 mt-1">
                                {analysis.remediationThemes.map((theme, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {theme}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="misconceptions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Student Misconceptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Student Misconceptions
                  </CardTitle>
                  <CardDescription>
                    Enhanced misconception tracking with confidence scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {studentMisconceptions.length > 0 ? (
                    <div className="space-y-4">
                      {studentMisconceptions.map((misconception) => (
                        <div key={misconception.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{misconception.type}</h4>
                            <div className="flex gap-2">
                              <Badge variant={getSeverityColor(misconception.severity)}>
                                {misconception.severity}
                              </Badge>
                              <Badge variant="outline">
                                {Math.round(misconception.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm">
                            <div>
                              <span className="font-medium">Skill:</span> {misconception.skill}
                            </div>
                            <div>
                              <span className="font-medium">Session Type:</span> {misconception.session_type}
                            </div>
                            <div>
                              <span className="font-medium">Persistence Count:</span> {misconception.persistence_count}
                            </div>
                            <div>
                              <span className="font-medium">Status:</span>
                              <Badge 
                                variant={misconception.resolved ? "default" : "destructive"} 
                                className="ml-2"
                              >
                                {misconception.resolved ? "Resolved" : "Active"}
                              </Badge>
                            </div>
                            <div>
                              <span className="font-medium">Detected:</span> {misconception.detected_at.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No misconceptions detected for this student
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Misconception Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Misconception Analytics
                  </CardTitle>
                  <CardDescription>Real-time misconception tracking insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Misconceptions:</span>
                      <Badge variant="outline">{studentMisconceptions.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Misconceptions:</span>
                      <Badge variant="destructive">
                        {studentMisconceptions.filter(m => !m.resolved).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Resolved This Week:</span>
                      <Badge variant="default">
                        {studentMisconceptions.filter(m => m.resolved).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Avg Confidence:</span>
                      <Badge variant="secondary">
                        {Math.round(studentMisconceptions.reduce((sum, m) => sum + m.confidence, 0) / studentMisconceptions.length * 100) || 0}%
                      </Badge>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h5 className="font-medium mb-2">Severity Distribution</h5>
                      <div className="space-y-2">
                        {['high', 'medium', 'low'].map(severity => {
                          const count = studentMisconceptions.filter(m => m.severity === severity).length;
                          const percentage = studentMisconceptions.length > 0 ? (count / studentMisconceptions.length) * 100 : 0;
                          return (
                            <div key={severity} className="flex items-center gap-2">
                              <span className="text-sm capitalize w-16">{severity}:</span>
                              <Progress value={percentage} className="flex-1 h-2" />
                              <span className="text-xs text-muted-foreground w-8">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Common Error Patterns
                </CardTitle>
                <CardDescription>
                  System-wide error patterns identified across multiple students
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
                          {pattern.commonMisconceptions.length > 0 && (
                            <div>
                              <span className="font-medium">Common Misconceptions:</span>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {pattern.commonMisconceptions.map((misconception, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {misconception}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {pattern.suggestedInterventions.length > 0 && (
                            <div>
                              <span className="font-medium">Suggested Interventions:</span>
                              <ul className="mt-1 ml-4 text-xs">
                                {pattern.suggestedInterventions.map((intervention, i) => (
                                  <li key={i} className="list-disc">{intervention}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No common error patterns detected yet. Patterns emerge as more student data is collected.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Validation Monitoring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Validation Monitoring
                  </CardTitle>
                  <CardDescription>Real-time validation performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Validations:</span>
                      <Badge variant="outline">{DEMO_VALIDATION_STATS.total_validations}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Time:</span>
                      <Badge variant="secondary">{DEMO_VALIDATION_STATS.average_time}ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Success Rate:</span>
                      <Badge variant="default">{DEMO_VALIDATION_STATS.success_rate}%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Recent Failures:</span>
                      <Badge variant={DEMO_VALIDATION_STATS.recent_failures > 5 ? "destructive" : "outline"}>
                        {DEMO_VALIDATION_STATS.recent_failures}
                      </Badge>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Progress value={DEMO_VALIDATION_STATS.success_rate} className="h-3" />
                      <p className="text-xs text-muted-foreground mt-1">
                        System performing at {DEMO_VALIDATION_STATS.success_rate}% efficiency
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Action Analytics
                  </CardTitle>
                  <CardDescription>Student activity and system performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Actions:</span>
                      <Badge variant="outline">{DEMO_ACTION_ANALYTICS.total_actions}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Students:</span>
                      <Badge variant="default">{DEMO_ACTION_ANALYTICS.active_students}</Badge>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h5 className="font-medium mb-2">Actions by Type</h5>
                      <div className="space-y-2">
                        {Object.entries(DEMO_ACTION_ANALYTICS.actions_by_type).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="capitalize">{type.replace('_', ' ')}:</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h5 className="font-medium mb-2">Sessions by Type</h5>
                      <div className="space-y-2">
                        {Object.entries(DEMO_ACTION_ANALYTICS.actions_by_session).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="capitalize">{type.replace('_', ' ')}:</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle>System Health Overview</CardTitle>
                <CardDescription>Real-time monitoring of enhanced logging services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-muted-foreground">Misconception Detection Uptime</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">245ms</div>
                    <div className="text-sm text-muted-foreground">Average Response Time</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">1,247</div>
                    <div className="text-sm text-muted-foreground">Actions Logged Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Personalized Recommendations
                </CardTitle>
                <CardDescription>
                  AI-generated learning recommendations based on mistake pattern analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {remediationRecommendations.length > 0 ? (
                  <div className="space-y-4">
                    <Alert>
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        These recommendations are generated based on {mistakeAnalysis.length} analyzed skills 
                        and {mistakeAnalysis.reduce((sum, analysis) => sum + analysis.errorCount, 0)} total error patterns.
                      </AlertDescription>
                    </Alert>
                    <div className="grid gap-3">
                      {remediationRecommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                          <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">{recommendation}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Priority: High • Based on recurring error patterns
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
                      No specific recommendations available. 
                      {mistakeAnalysis.length === 0 
                        ? " Complete some exercises to generate personalized recommendations."
                        : " Current performance shows no critical areas requiring immediate attention."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demo Information */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Demo Note:</strong> This is a demonstration of the enhanced mistake pattern analytics system. 
                In a production environment, this would show real student data and generate actionable insights 
                for personalized learning paths.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
