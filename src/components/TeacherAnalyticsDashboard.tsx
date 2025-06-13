
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Clock, 
  Brain, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedActionLogger } from "@/services/enhancedActionLogger";
import { EnhancedValidationMonitoringService } from "@/services/enhancedValidationMonitoringService";
import { EnhancedMisconceptionLoggingService } from "@/services/enhancedMisconceptionLoggingService";
import { EnhancedCacheLoggingService } from "@/services/enhancedCacheLoggingService";
import { getAllActiveClassesWithDuration } from "@/services/examService";
import { useState } from "react";

export const TeacherAnalyticsDashboard = () => {
  const { profile } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(7);

  // Get teacher's students
  const { data: activeClasses = [] } = useQuery({
    queryKey: ['teacherClasses', profile?.id],
    queryFn: async () => {
      return await getAllActiveClassesWithDuration();
    },
    enabled: !!profile?.id,
  });

  // Extract student IDs from classes (this would need to be enhanced based on your class structure)
  const teacherStudentIds = activeClasses.flatMap(cls => cls.students || []);

  // Get activity analytics
  const { data: activityAnalytics } = useQuery({
    queryKey: ['activityAnalytics', teacherStudentIds, selectedTimeRange],
    queryFn: async () => {
      return await EnhancedActionLogger.getActivityAnalytics(teacherStudentIds, selectedTimeRange);
    },
    enabled: teacherStudentIds.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get validation analytics
  const validationAnalytics = EnhancedValidationMonitoringService.getValidationAnalytics();

  // Get misconception analytics
  const misconceptionAnalytics = EnhancedMisconceptionLoggingService.getMisconceptionAnalytics(teacherStudentIds);

  // Get cache analytics
  const cacheAnalytics = EnhancedCacheLoggingService.getTeacherCacheAnalytics(teacherStudentIds);

  const timeRangeOptions = [
    { value: 1, label: '24 Hours' },
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into student activity and system performance
          </p>
        </div>
        <div className="flex gap-2">
          {timeRangeOptions.map(option => (
            <Button
              key={option.value}
              variant={selectedTimeRange === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Actions</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {activityAnalytics?.totalActions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {selectedTimeRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Active Students</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {activityAnalytics?.activeStudents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {teacherStudentIds.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Misconceptions</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {misconceptionAnalytics.totalMisconceptions}
            </div>
            <p className="text-xs text-muted-foreground">
              Patterns detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Cache Hit Rate</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {(cacheAnalytics.overallHitRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              ${cacheAnalytics.totalCostSavings.toFixed(2)} saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Student Activity</TabsTrigger>
          <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
          <TabsTrigger value="performance">System Performance</TabsTrigger>
          <TabsTrigger value="validation">Validation Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Actions by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Actions by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(activityAnalytics?.actionsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sessions by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Session Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(activityAnalytics?.actionsBySession || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="misconceptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Most Common Misconceptions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Common Misconceptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {misconceptionAnalytics.mostCommonTypes.map(({ type, count }) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type}</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Most Affected Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Most Affected Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {misconceptionAnalytics.mostAffectedSkills.map(({ skill, count }) => (
                    <div key={skill} className="flex items-center justify-between">
                      <span className="text-sm">{skill}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cache Performance */}
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
                    <span className="text-sm">Hit Rate</span>
                    <Badge variant="default">
                      {(cacheAnalytics.overallHitRate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cost Savings</span>
                    <Badge variant="outline">
                      ${cacheAnalytics.totalCostSavings.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Events</span>
                    <Badge variant="outline">
                      {cacheAnalytics.totalStudentEvents}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Students (Cache) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top Cache Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cacheAnalytics.topPerformingStudents.slice(0, 5).map(({ studentId, hitRate, events }) => (
                    <div key={studentId} className="flex items-center justify-between">
                      <span className="text-sm">{studentId.slice(0, 8)}...</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {(hitRate * 100).toFixed(0)}%
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {events}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Validation Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Validation Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Validations</span>
                    <Badge variant="outline">
                      {validationAnalytics.totalValidations}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Response Time</span>
                    <Badge variant="outline">
                      {validationAnalytics.averageValidationTime.toFixed(0)}ms
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recent Failures</span>
                    <Badge variant={validationAnalytics.recentFailures.length > 0 ? "destructive" : "default"}>
                      {validationAnalytics.recentFailures.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operation Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Operations Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(validationAnalytics.operationBreakdown).map(([operation, count]) => (
                    <div key={operation} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{operation.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
