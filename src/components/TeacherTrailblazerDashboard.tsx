
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTeacherTrailblazer } from '@/hooks/useTrailblazer';
import { 
  Users, 
  TrendingUp, 
  Flame, 
  Trophy, 
  Eye,
  Calendar,
  BarChart3
} from 'lucide-react';
import { TrailblazerStats } from './TrailblazerStats';
import { ConceptMasteryDisplay } from './ConceptMasteryDisplay';
import { TrailblazerAchievements } from './TrailblazerAchievements';

export const TeacherTrailblazerDashboard = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  
  const { studentsProgress, isLoading, getStudentData } = useTeacherTrailblazer();

  const { data: studentDetail, isLoading: studentDetailLoading } = selectedStudent 
    ? getStudentData(selectedStudent) 
    : { data: null, isLoading: false };

  const selectedStudentInfo = studentsProgress.find(s => s.student_id === selectedStudent);

  const handleViewStudent = (studentId: string) => {
    setSelectedStudent(studentId);
    setShowStudentDetail(true);
  };

  const calculateClassStats = () => {
    if (studentsProgress.length === 0) return null;

    const totalStudents = studentsProgress.length;
    const avgStreak = Math.round(
      studentsProgress.reduce((sum, s) => sum + s.current_streak_days, 0) / totalStudents
    );
    const totalSessions = studentsProgress.reduce((sum, s) => sum + s.total_sessions, 0);
    const avgMastery = Math.round(
      studentsProgress.reduce((sum, s) => sum + Number(s.avg_mastery_score), 0) / totalStudents
    );

    return { totalStudents, avgStreak, totalSessions, avgMastery };
  };

  const classStats = calculateClassStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Trailblazer Class Overview
        </h2>
        <p className="text-gray-600">
          Monitor your students' independent learning progress and engagement
        </p>
      </div>

      {/* Class Statistics */}
      {classStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm">Active Students</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {classStats.totalStudents}
              </div>
              <p className="text-xs text-gray-600">Using Trailblazer</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-sm">Avg Streak</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {classStats.avgStreak}
              </div>
              <p className="text-xs text-gray-600">Days</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <CardTitle className="text-sm">Total Sessions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {classStats.totalSessions}
              </div>
              <p className="text-xs text-gray-600">Completed</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-sm">Avg Mastery</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {classStats.avgMastery}%
              </div>
              <p className="text-xs text-gray-600">Class Average</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Student Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentsProgress.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No students have started using Trailblazer yet.</p>
              <p className="text-sm mt-2">Encourage your students to try the new learning system!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentsProgress.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{student.student_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {student.class_name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {student.current_streak_days} day streak
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {student.total_sessions} sessions
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round(Number(student.avg_mastery_score))}% mastery
                      </div>
                      {student.last_session_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last: {new Date(student.last_session_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewStudent(student.student_id)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Modal */}
      <Dialog open={showStudentDetail} onOpenChange={setShowStudentDetail}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudentInfo?.student_name} - Trailblazer Progress
            </DialogTitle>
          </DialogHeader>

          {studentDetailLoading ? (
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : studentDetail ? (
            <div className="space-y-6">
              {/* Student Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-orange-200">
                  <CardContent className="p-4 text-center">
                    <Flame className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <div className="text-2xl font-bold">{studentDetail.streak?.current_streak_days || 0}</div>
                    <div className="text-sm text-gray-600">Current Streak</div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{studentDetail.streak?.total_sessions || 0}</div>
                    <div className="text-sm text-gray-600">Total Sessions</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold">{studentDetail.streak?.longest_streak_days || 0}</div>
                    <div className="text-sm text-gray-600">Best Streak</div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-4 text-center">
                    <Badge className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">{studentDetail.achievements?.length || 0}</div>
                    <div className="text-sm text-gray-600">Achievements</div>
                  </CardContent>
                </Card>
              </div>

              {/* Concept Mastery */}
              {studentDetail.concepts && studentDetail.concepts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Concept Mastery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentDetail.concepts.slice(0, 6).map((concept, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <span className="font-medium">{concept.concept}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {Math.round(concept.mastery_score)}%
                            </span>
                            <div className="w-20 h-2 bg-gray-200 rounded">
                              <div 
                                className="h-full bg-blue-500 rounded"
                                style={{ width: `${concept.mastery_score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Sessions */}
              {studentDetail.sessions && studentDetail.sessions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {studentDetail.sessions.slice(0, 5).map((session) => (
                        <div key={session.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium">{session.focus_concept}</div>
                            <div className="text-sm text-gray-600">
                              {session.goal_type} • {session.duration_minutes} min
                              {session.subject && ` • ${session.subject}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={session.status === 'completed' ? 'default' : 'secondary'}
                            >
                              {session.status}
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(session.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No detailed data available for this student.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
