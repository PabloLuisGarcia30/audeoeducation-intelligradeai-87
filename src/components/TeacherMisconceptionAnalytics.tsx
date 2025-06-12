
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Users,
  Search,
  Filter,
  BarChart3,
  Target
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface MisconceptionAlert {
  id: string;
  studentName: string;
  concept: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  frequency: number;
  className: string;
  subject: string;
  detectedAt: string;
  validated: boolean;
}

interface ClassMisconceptionTrend {
  concept: string;
  affectedStudents: number;
  totalStudents: number;
  averageFrequency: number;
  subject: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export function TeacherMisconceptionAnalytics() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['misconceptionAlerts'],
    queryFn: async () => {
      // Mock data for misconception alerts
      const mockAlerts: MisconceptionAlert[] = [
        {
          id: '1',
          studentName: 'Pablo Luis Garcia',
          concept: 'Quadratic Function Vertex',
          description: 'Student consistently mistakes vertex form identification',
          severity: 'high',
          frequency: 8,
          className: 'Math Grade 11A',
          subject: 'Mathematics',
          detectedAt: '2 hours ago',
          validated: false
        },
        {
          id: '2',
          studentName: 'Sarah Johnson',
          concept: 'Map Scale Reading',
          description: 'Confusion between different scale representations',
          severity: 'medium',
          frequency: 4,
          className: 'Geography Grade 11B',
          subject: 'Geography',
          detectedAt: '1 day ago',
          validated: true
        },
        {
          id: '3',
          studentName: 'Michael Chen',
          concept: 'Literary Device Analysis',
          description: 'Mixing metaphors with similes in analysis',
          severity: 'low',
          frequency: 2,
          className: 'English Grade 11A',
          subject: 'English',
          detectedAt: '3 days ago',
          validated: false
        }
      ];
      return mockAlerts;
    },
  });

  const { data: classTrends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['classMisconceptionTrends'],
    queryFn: async () => {
      // Mock data for class-wide trends
      const mockTrends: ClassMisconceptionTrend[] = [
        {
          concept: 'Quadratic Function Vertex',
          affectedStudents: 12,
          totalStudents: 25,
          averageFrequency: 6.2,
          subject: 'Mathematics',
          trend: 'increasing'
        },
        {
          concept: 'Geographic Scale Analysis',
          affectedStudents: 8,
          totalStudents: 30,
          averageFrequency: 3.5,
          subject: 'Geography',
          trend: 'stable'
        },
        {
          concept: 'Literary Device Identification',
          affectedStudents: 5,
          totalStudents: 28,
          averageFrequency: 2.1,
          subject: 'English',
          trend: 'decreasing'
        }
      ];
      return mockTrends;
    },
  });

  const handleValidateAlert = (alertId: string) => {
    console.log(`Validating alert: ${alertId}`);
    // This would update the alert validation status
  };

  const handleGenerateIntervention = (alertId: string) => {
    console.log(`Generating intervention for alert: ${alertId}`);
    // This would generate targeted intervention strategies
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.concept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || alert.subject === filterSubject;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    return matchesSearch && matchesSubject && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Misconception Detection Alerts
          </CardTitle>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search students or concepts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Geography">Geography</SelectItem>
                <SelectItem value="English">English</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertsLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Alerts</h3>
              <p className="text-gray-500">All misconceptions are being addressed or resolved.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{alert.studentName}</h4>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.subject}</Badge>
                      {alert.validated && (
                        <Badge className="bg-blue-100 text-blue-800">Validated</Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm text-gray-800 mb-1">{alert.concept}</p>
                    <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Frequency: {alert.frequency} times</span>
                      <span>Class: {alert.className}</span>
                      <span>Detected: {alert.detectedAt}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!alert.validated && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleValidateAlert(alert.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Validate
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => handleGenerateIntervention(alert.id)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Intervene
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Class-wide Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Class-wide Misconception Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trendsLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            classTrends.map((trend, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{trend.concept}</h4>
                    <Badge variant="outline">{trend.subject}</Badge>
                    {getTrendIcon(trend.trend)}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {trend.affectedStudents}/{trend.totalStudents} students
                    </div>
                    <div className="text-xs text-gray-500">
                      Avg frequency: {trend.averageFrequency}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(trend.affectedStudents / trend.totalStudents) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
