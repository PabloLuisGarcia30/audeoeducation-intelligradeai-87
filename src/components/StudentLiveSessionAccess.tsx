
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  PlayCircle, 
  Clock, 
  Users, 
  BookOpen,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getStudentExercises } from "@/services/classSessionService";
import { useNavigate } from "react-router-dom";

interface StudentLiveSessionAccessProps {
  studentId: string;
}

export function StudentLiveSessionAccess({ studentId }: StudentLiveSessionAccessProps) {
  const navigate = useNavigate();
  
  const { data: activeExercises = [], isLoading, refetch } = useQuery({
    queryKey: ['studentActiveExercises', studentId],
    queryFn: () => getStudentExercises(studentId),
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });

  const handleJoinSession = (exerciseId: string, skillName: string) => {
    // Navigate to the exercise interface
    navigate(`/student-dashboard/exercise/${exerciseId}`);
  };

  const handleStartExercise = (exerciseId: string) => {
    // Start the exercise and update status
    console.log(`Starting exercise: ${exerciseId}`);
    // This would call the API to update exercise status to 'in_progress'
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeExercises.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Live Class Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Sessions</h3>
            <p className="text-gray-500">
              When your teacher starts a class session, you'll see available exercises here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          Live Class Sessions
          <Badge className="bg-green-100 text-green-800">
            {activeExercises.length} Active
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Join live sessions and complete your personalized exercises
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeExercises.map((exercise) => (
          <div key={exercise.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-gray-900">{exercise.skill_name}</h4>
                  <Badge variant={
                    exercise.status === 'completed' ? 'default' :
                    exercise.status === 'in_progress' ? 'secondary' : 'outline'
                  }>
                    {exercise.status === 'completed' ? 'Completed' :
                     exercise.status === 'in_progress' ? 'In Progress' : 'Available'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Skill Score: {exercise.skill_score}% • Class Session Active
                </p>
                {exercise.status === 'completed' && exercise.score && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Score: {exercise.score}%</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {exercise.status === 'available' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleStartExercise(exercise.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Exercise
                  </Button>
                )}
                {exercise.status === 'in_progress' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleJoinSession(exercise.id, exercise.skill_name)}
                    variant="outline"
                    className="border-green-200 text-green-600"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Continue
                  </Button>
                )}
                {exercise.status === 'completed' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleJoinSession(exercise.id, exercise.skill_name)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                )}
              </div>
            </div>
            
            {exercise.status === 'in_progress' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progress</span>
                  <span>~50%</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
            )}
          </div>
        ))}
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <Users className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900 mb-1">Live Session Benefits</h4>
              <p className="text-sm text-green-800">
                Exercises are tailored to your current skill level. Complete them during 
                the live session for real-time feedback from your teacher.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
