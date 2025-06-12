import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Search,
  ChevronRight,
  GraduationCap,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { 
  getAllActiveClasses,
  getAllActiveStudents,
  type ActiveClass,
  type ActiveStudent
} from "@/services/examService";
import { StartClassSession } from "@/components/StartClassSession";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ClassViewProps {
  onSelectStudent: (studentId: string, classId?: string, className?: string) => void;
}

export function ClassView({ onSelectStudent }: ClassViewProps) {
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [students, setStudents] = useState<ActiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const { user, profile } = useAuth();

  useEffect(() => {
    loadClassData();
  }, []);

  const loadClassData = async () => {
    try {
      setLoading(true);
      const [classesData, studentsData] = await Promise.all([
        getAllActiveClasses(),
        getAllActiveStudents()
      ]);
      
      setClasses(classesData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading class data:', error);
      toast.error('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getClassStudents = (classId: string) => {
    return students.filter(student => 
      classes.find(cls => cls.id === classId)?.students?.includes(student.id)
    );
  };

  const getStudentsWithSkills = async (classId: string) => {
    try {
      const classStudents = getClassStudents(classId);
      const studentsWithSkills = [];

      for (const student of classStudents) {
        // Get student's current skill scores using authenticated user ID
        const { data: skillScores } = await supabase.rpc('get_student_current_skill_scores', {
          student_uuid: user?.id || student.id // Use authenticated user ID if available
        });

        if (skillScores && skillScores.length > 0) {
          // Convert to expected format
          const skills = skillScores.map((skill: any) => ({
            skill_name: skill.skill_name,
            score: skill.current_score
          }));

          studentsWithSkills.push({
            studentId: student.id,
            studentName: student.name,
            skills: skills
          });
        }
      }

      return studentsWithSkills;
    } catch (error) {
      console.error('Error getting students with skills:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Management</h1>
        <p className="text-gray-600">Manage your classes and start interactive learning sessions</p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => {
          const classStudents = getClassStudents(cls.id);
          
          return (
            <Card key={cls.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{cls.name}</CardTitle>
                      <p className="text-sm text-gray-600">{cls.subject} • {cls.grade}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Class Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{classStudents.length} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <span>GPA: {cls.avg_gpa?.toFixed(1) || 'N/A'}</span>
                  </div>
                  {cls.class_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{cls.class_time}</span>
                    </div>
                  )}
                  {cls.day_of_week && cls.day_of_week.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{cls.day_of_week.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Students Preview */}
                {classStudents.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent Students:</p>
                    <div className="space-y-2">
                      {classStudents.slice(0, 3).map((student) => (
                        <div 
                          key={student.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                          onClick={() => onSelectStudent(student.id, cls.id, cls.name)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{student.name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                      {classStudents.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{classStudents.length - 3} more students
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <StartClassSession
                    classId={cls.id}
                    className={cls.name}
                    students={[]} // Will be populated by the component
                    onSessionStarted={(sessionId) => {
                      console.log('Session started:', sessionId);
                      toast.success('Class session started successfully!');
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Navigate to class details or show all students
                      console.log('View class details:', cls.id);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search criteria' : 'No classes are currently available'}
          </p>
        </div>
      )}
    </div>
  );
}
