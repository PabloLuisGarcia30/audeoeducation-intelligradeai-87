
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Brain
} from "lucide-react";
import { ProgressAnalyticsService, type ClassProgressAnalytics } from "@/services/progressAnalyticsService";

interface ClassProgressHeatmapProps {
  classId: string;
  className?: string;
}

export function ClassProgressHeatmap({ classId, className }: ClassProgressHeatmapProps) {
  const [progressData, setProgressData] = useState<ClassProgressAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(30);
  const [selectedSkill, setSelectedSkill] = useState<string>('all');

  useEffect(() => {
    loadClassProgressData();
  }, [classId, timeRange]);

  const loadClassProgressData = async () => {
    try {
      setLoading(true);
      const data = await ProgressAnalyticsService.getClassProgressAnalytics(classId, timeRange);
      setProgressData(data);
    } catch (error) {
      console.error('Error loading class progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group data by student
  const studentGroups = progressData.reduce((acc, item) => {
    if (!acc[item.student_id]) {
      acc[item.student_id] = {
        student_name: item.student_name,
        skills: []
      };
    }
    acc[item.student_id].skills.push(item);
    return acc;
  }, {} as Record<string, { student_name: string; skills: ClassProgressAnalytics[] }>);

  // Get unique skills
  const allSkills = Array.from(new Set(progressData.map(item => item.skill_name)));
  const filteredData = selectedSkill === 'all' 
    ? progressData 
    : progressData.filter(item => item.skill_name === selectedSkill);

  // Calculate class statistics
  const classStats = {
    totalStudents: Object.keys(studentGroups).length,
    avgAccuracy: progressData.length > 0 ? progressData.reduce((sum, item) => sum + item.accuracy, 0) / progressData.length : 0,
    strugglingStudents: Object.values(studentGroups).filter(student => 
      student.skills.some(skill => skill.accuracy < 60)
    ).length,
    excellingStudents: Object.values(studentGroups).filter(student => 
      student.skills.every(skill => skill.accuracy >= 80)
    ).length
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-500';
    if (accuracy >= 80) return 'bg-green-400';
    if (accuracy >= 70) return 'bg-yellow-400';
    if (accuracy >= 60) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getAccuracyLevel = (accuracy: number) => {
    if (accuracy >= 90) return 'Excellent';
    if (accuracy >= 80) return 'Good';
    if (accuracy >= 70) return 'Fair';
    if (accuracy >= 60) return 'Needs Practice';
    return 'Struggling';
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
      {/* Class Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{classStats.totalStudents}</div>
            <div className="text-sm text-slate-600">Total Students</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{classStats.avgAccuracy.toFixed(1)}%</div>
            <div className="text-sm text-slate-600">Class Average</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{classStats.excellingStudents}</div>
            <div className="text-sm text-slate-600">Excelling (80%+)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-800">{classStats.strugglingStudents}</div>
            <div className="text-sm text-slate-600">Need Support</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Class Progress Heatmap {className && `- ${className}`}
            </CardTitle>
            <div className="flex gap-4">
              <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(parseInt(value))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {allSkills.map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Heatmap Grid */}
          <div className="space-y-4">
            {Object.values(studentGroups).map((student) => (
              <div key={student.student_name} className="space-y-2">
                <h4 className="font-medium text-slate-800">{student.student_name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {student.skills
                    .filter(skill => selectedSkill === 'all' || skill.skill_name === selectedSkill)
                    .map((skill, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-white text-xs ${getAccuracyColor(skill.accuracy)} hover:opacity-80 transition-opacity cursor-pointer`}
                      title={`${skill.skill_name}: ${skill.accuracy}% accuracy (${skill.attempts_count} attempts)`}
                    >
                      <div className="font-medium truncate">{skill.skill_name}</div>
                      <div className="text-xs opacity-90">{skill.accuracy}%</div>
                      <Badge variant="outline" className="mt-1 text-xs bg-white/20 border-white/30">
                        {skill.skill_type}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                {/* Student Summary */}
                <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                  <span>
                    Avg: {student.skills.length > 0 
                      ? (student.skills.reduce((sum, skill) => sum + skill.accuracy, 0) / student.skills.length).toFixed(1)
                      : 0}%
                  </span>
                  <span>Skills: {student.skills.length}</span>
                  <span>
                    Misconceptions: {student.skills.reduce((sum, skill) => sum + skill.misconceptions_count, 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <h5 className="font-medium mb-3">Performance Levels</h5>
            <div className="flex flex-wrap gap-4">
              {[
                { range: '90-100%', level: 'Excellent', color: 'bg-green-500' },
                { range: '80-89%', level: 'Good', color: 'bg-green-400' },
                { range: '70-79%', level: 'Fair', color: 'bg-yellow-400' },
                { range: '60-69%', level: 'Needs Practice', color: 'bg-orange-400' },
                { range: '0-59%', level: 'Struggling', color: 'bg-red-400' }
              ].map((item) => (
                <div key={item.range} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${item.color}`}></div>
                  <span className="text-sm">{item.level} ({item.range})</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {progressData.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No Progress Data</h3>
            <p className="text-slate-600">Students haven't completed any exercises yet for this class.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
