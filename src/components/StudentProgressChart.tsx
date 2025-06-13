
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Brain,
  Award,
  BarChart3
} from "lucide-react";
import { ProgressAnalyticsService, type StudentProgressAnalytics } from "@/services/progressAnalyticsService";

interface StudentProgressChartProps {
  studentId: string;
  timeRange?: number;
}

export function StudentProgressChart({ studentId, timeRange = 30 }: StudentProgressChartProps) {
  const [progressData, setProgressData] = useState<StudentProgressAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadProgressData();
  }, [studentId, timeRange]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const data = await ProgressAnalyticsService.getStudentProgressAnalytics(studentId, timeRange);
      setProgressData(data);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return TrendingUp;
    if (trend < 0) return TrendingDown;
    return Target;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  const overallStats = {
    avgAccuracy: progressData.length > 0 ? progressData.reduce((sum, item) => sum + item.avg_accuracy, 0) / progressData.length : 0,
    totalSkills: progressData.length,
    improvingSkills: progressData.filter(item => item.improvement_trend > 0).length,
    totalTime: progressData.reduce((sum, item) => sum + item.total_time_spent, 0)
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{overallStats.avgAccuracy.toFixed(1)}%</div>
            <div className="text-sm text-slate-600">Average Accuracy</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{overallStats.totalSkills}</div>
            <div className="text-sm text-slate-600">Skills Practiced</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{overallStats.improvingSkills}</div>
            <div className="text-sm text-slate-600">Improving Skills</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{Math.round(overallStats.totalTime / 60)}</div>
            <div className="text-sm text-slate-600">Minutes Practiced</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy Trends</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skill Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={progressData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="skill_name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{label}</p>
                            <p className="text-blue-600">
                              Accuracy: {payload[0]?.value}%
                            </p>
                            <p className="text-green-600">
                              Confidence: {payload[1]?.value}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avg_accuracy" name="Accuracy" fill="#3b82f6" />
                  <Bar dataKey="avg_confidence" name="Confidence" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Skill List with Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Skill Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {progressData.map((skill, index) => {
                const TrendIcon = getTrendIcon(skill.improvement_trend);
                return (
                  <div key={index} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{skill.skill_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {skill.skill_type}
                          </Badge>
                          <span className="text-xs text-slate-600">
                            {skill.total_attempts} attempts
                          </span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 ${getTrendColor(skill.improvement_trend)}`}>
                        <TrendIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {skill.improvement_trend > 0 ? '+' : ''}{skill.improvement_trend}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accuracy</span>
                        <span>{skill.avg_accuracy}%</span>
                      </div>
                      <Progress value={skill.avg_accuracy} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Confidence</span>
                        <span>{skill.avg_confidence}%</span>
                      </div>
                      <Progress value={skill.avg_confidence} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accuracy">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="skill_name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="avg_accuracy" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confidence">
          <Card>
            <CardHeader>
              <CardTitle>Confidence Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="skill_name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avg_confidence" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
