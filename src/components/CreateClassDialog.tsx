
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CreateClassDialogProps {
  onCreateClass: (classData: {
    name: string;
    subject: string;
    grade: string;
    teacher: string;
    dayOfWeek?: string[];
    classTime?: string;
    endTime?: string;
  }) => void;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const SUBJECTS = ['Math', 'Science', 'English', 'History', 'Art', 'Music', 'Physical Education'];
const GRADES = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

export function CreateClassDialog({ onCreateClass }: CreateClassDialogProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    grade: '',
    teacher: profile?.full_name || '',
    dayOfWeek: [] as string[],
    classTime: '',
    endTime: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.subject || !formData.grade) {
      return;
    }

    // Use the authenticated user's profile name for the teacher field
    const classData = {
      ...formData,
      teacher: profile?.full_name || formData.teacher || 'Unknown Teacher'
    };

    onCreateClass(classData);
    
    // Reset form
    setFormData({
      name: '',
      subject: '',
      grade: '',
      teacher: profile?.full_name || '',
      dayOfWeek: [],
      classTime: '',
      endTime: ''
    });
    
    setOpen(false);
  };

  const handleDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        dayOfWeek: [...prev.dayOfWeek, day]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dayOfWeek: prev.dayOfWeek.filter(d => d !== day)
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Class
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Class Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Algebra 1 - Period 3"
              required
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Select 
              value={formData.subject} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="grade">Grade Level *</Label>
            <Select 
              value={formData.grade} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="teacher">Teacher</Label>
            <Input
              id="teacher"
              value={formData.teacher}
              onChange={(e) => setFormData(prev => ({ ...prev, teacher: e.target.value }))}
              placeholder="Teacher name"
              disabled={!!profile?.full_name}
            />
            {profile?.teacher_id && (
              <p className="text-xs text-gray-500 mt-1">
                Teacher ID: {profile.teacher_id}
              </p>
            )}
          </div>

          <div>
            <Label>Days of Week (Optional)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={formData.dayOfWeek.includes(day)}
                    onCheckedChange={(checked) => handleDayChange(day, checked as boolean)}
                  />
                  <Label htmlFor={day} className="text-sm">{day.slice(0, 3)}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="classTime">Start Time</Label>
              <Input
                id="classTime"
                type="time"
                value={formData.classTime}
                onChange={(e) => setFormData(prev => ({ ...prev, classTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name || !formData.subject || !formData.grade}
            >
              Create Class
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
