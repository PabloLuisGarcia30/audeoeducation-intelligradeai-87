
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useTrailblazer } from '@/hooks/useTrailblazer';
import { useQuery } from '@tanstack/react-query';
import { trailblazerService } from '@/services/trailblazerService';
import { PlayCircle, BookOpen, Target, Clock } from 'lucide-react';

interface SessionCreationModalProps {
  children: React.ReactNode;
  onSessionCreated?: () => void;
}

export const SessionCreationModal = ({ children, onSessionCreated }: SessionCreationModalProps) => {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('independent');
  const [goalType, setGoalType] = useState<string>('');
  const [focusConcept, setFocusConcept] = useState<string>('');
  const [customConcept, setCustomConcept] = useState<string>('');
  const [duration, setDuration] = useState<number>(25);

  const navigate = useNavigate();
  const { enrolledClasses, startSession, isStartingSession } = useTrailblazer();

  // Get class concepts when a class is selected
  const { data: classConcepts = [] } = useQuery({
    queryKey: ['trailblazer', 'classConcepts', selectedClass],
    queryFn: () => trailblazerService.getClassConcepts(selectedClass),
    enabled: !!selectedClass && selectedClass !== 'independent',
  });

  const selectedClassData = enrolledClasses.find(c => c.class_id === selectedClass);

  const handleStartSession = async () => {
    try {
      const concept = focusConcept === 'custom' ? customConcept : focusConcept;
      
      if (!concept || !goalType) {
        return;
      }

      const session = await startSession({
        goalType,
        focusConcept: concept,
        durationMinutes: duration,
        classId: selectedClass === 'independent' ? undefined : selectedClass,
        subject: selectedClassData?.subject,
        grade: selectedClassData?.grade,
      });

      setOpen(false);
      onSessionCreated?.();
      
      // Navigate to the active session
      navigate(`/student-dashboard/trailblazer/session/${session.id}`);
      
      // Reset form
      setSelectedClass('independent');
      setGoalType('');
      setFocusConcept('');
      setCustomConcept('');
      setDuration(25);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Start New Learning Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label>Choose a Class (Optional)</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class or practice independently" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="independent">Independent Practice</SelectItem>
                {enrolledClasses.map((cls) => (
                  <SelectItem key={cls.class_id} value={cls.class_id}>
                    <div className="flex flex-col">
                      <span>{cls.class_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {cls.subject} - {cls.grade}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Class Info */}
          {selectedClassData && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{selectedClassData.class_name}</span>
                </div>
                <div className="text-sm text-blue-700">
                  {selectedClassData.subject} • {selectedClassData.grade} • {selectedClassData.teacher_name}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goal Type */}
          <div className="space-y-2">
            <Label>Learning Goal</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger>
                <SelectValue placeholder="What do you want to achieve?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concept_mastery">Master a Concept</SelectItem>
                <SelectItem value="skill_improvement">Improve a Skill</SelectItem>
                <SelectItem value="problem_solving">Practice Problem Solving</SelectItem>
                <SelectItem value="review">Review Previous Learning</SelectItem>
                <SelectItem value="exploration">Explore New Topics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Focus Concept */}
          <div className="space-y-2">
            <Label>Focus Concept</Label>
            <Select value={focusConcept} onValueChange={setFocusConcept}>
              <SelectTrigger>
                <SelectValue placeholder="What concept do you want to focus on?" />
              </SelectTrigger>
              <SelectContent>
                {selectedClass !== 'independent' && classConcepts.length > 0 ? (
                  <>
                    {classConcepts.map((concept, index) => (
                      <SelectItem key={index} value={concept.concept_name}>
                        <div className="flex flex-col">
                          <span>{concept.concept_name}</span>
                          <span className="text-xs text-muted-foreground">
                            Related to: {concept.skill_names.slice(0, 2).join(', ')}
                            {concept.skill_names.length > 2 && ` +${concept.skill_names.length - 2} more`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Concept...</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="algebra">Algebra</SelectItem>
                    <SelectItem value="geometry">Geometry</SelectItem>
                    <SelectItem value="calculus">Calculus</SelectItem>
                    <SelectItem value="statistics">Statistics</SelectItem>
                    <SelectItem value="custom">Custom Concept...</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Concept Input */}
          {focusConcept === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Concept</Label>
              <Textarea
                value={customConcept}
                onChange={(e) => setCustomConcept(e.target.value)}
                placeholder="Describe the concept you want to focus on..."
                rows={3}
              />
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Duration (minutes)
            </Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="25">25 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartSession}
              disabled={!goalType || (!focusConcept || (focusConcept === 'custom' && !customConcept)) || isStartingSession}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              {isStartingSession ? 'Starting...' : 'Start Session'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
