
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ArrowRight, 
  Target, 
  Brain, 
  Calendar,
  Star,
  CheckCircle2,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import { SmartGoalService, type StudentGoal } from "@/services/smartGoalService";

interface GoalCreationWizardProps {
  studentId: string;
  onGoalCreated: (goal: StudentGoal) => void;
  onCancel: () => void;
  onError?: (error: any) => void;
}

interface GoalFormData {
  goal_title: string;
  goal_description: string;
  goal_type: 'skill_mastery' | 'misconception_resolution' | 'learning_velocity' | 'consistency' | 'time_based';
  target_value: number;
  target_skill_name?: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  target_date?: string;
  milestones: Array<{ value: number; title: string; description: string }>;
}

const goalTemplates = [
  {
    type: 'skill_mastery' as const,
    title: 'Master a Skill',
    description: 'Achieve proficiency in a specific academic skill',
    icon: Target,
    color: 'blue',
    example: 'Achieve 85% accuracy in Quadratic Functions'
  },
  {
    type: 'consistency' as const,
    title: 'Build Consistency',
    description: 'Establish regular learning habits',
    icon: Calendar,
    color: 'green',
    example: 'Practice math for 7 consecutive days'
  },
  {
    type: 'learning_velocity' as const,
    title: 'Accelerate Learning',
    description: 'Improve your learning speed and efficiency',
    icon: Brain,
    color: 'purple',
    example: 'Reduce time to solve problems by 20%'
  },
  {
    type: 'misconception_resolution' as const,
    title: 'Fix Understanding',
    description: 'Resolve specific misconceptions',
    icon: Lightbulb,
    color: 'yellow',
    example: 'Overcome fraction multiplication errors'
  }
];

export function GoalCreationWizard({ studentId, onGoalCreated, onCancel, onError }: GoalCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<GoalFormData>({
    goal_title: '',
    goal_description: '',
    goal_type: 'skill_mastery',
    target_value: 85,
    difficulty_level: 'medium',
    milestones: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleTemplateSelect = (template: typeof goalTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      goal_type: template.type,
      goal_title: template.title,
      goal_description: template.description
    }));
    handleNext();
  };

  const generateMilestones = () => {
    const milestones = [];
    const targetValue = formData.target_value;
    
    if (formData.goal_type === 'skill_mastery') {
      milestones.push(
        { value: targetValue * 0.5, title: 'Halfway There!', description: 'You\'re making great progress!' },
        { value: targetValue * 0.8, title: 'Almost There!', description: 'You\'re so close to your goal!' }
      );
    } else if (formData.goal_type === 'consistency') {
      milestones.push(
        { value: Math.ceil(targetValue * 0.4), title: 'Building Momentum!', description: 'Great start on your streak!' },
        { value: Math.ceil(targetValue * 0.8), title: 'Strong Streak!', description: 'You\'re developing a solid habit!' }
      );
    } else {
      milestones.push(
        { value: Math.ceil(targetValue * 0.6), title: 'Making Progress!', description: 'You\'re on the right track!' },
        { value: Math.ceil(targetValue * 0.9), title: 'Almost Done!', description: 'The finish line is in sight!' }
      );
    }
    
    setFormData(prev => ({ ...prev, milestones }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const goalData = {
        ...formData,
        is_ai_suggested: false,
        ai_confidence_score: 0.8,
        status: 'active' as const,
        current_value: 0,
        progress_percentage: 0,
        context_data: {
          created_via: 'wizard',
          template_used: formData.goal_type
        }
      };

      const newGoal = await SmartGoalService.createGoal(studentId, goalData);
      
      toast.success('Goal created successfully! 🎯');
      onGoalCreated(newGoal);
    } catch (error: any) {
      console.error('Error creating goal:', error);
      
      // Parse the error to provide specific user feedback
      let errorMessage = 'Failed to create goal. Please try again.';
      
      if (error?.message?.includes('row-level security')) {
        errorMessage = 'Authentication issue. Please try signing out and back in.';
      } else if (error?.message?.includes('duplicate')) {
        errorMessage = 'A goal with this title already exists. Please choose a different title.';
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Connection issue. Please check your internet and try again.';
      } else if (error?.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please contact support if this continues.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      if (onError) {
        onError(error);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Choose Your Goal Type</h3>
              <p className="text-gray-600">What kind of goal would you like to set?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goalTemplates.map((template) => (
                <Card 
                  key={template.type}
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-full bg-${template.color}-100 flex items-center justify-center mx-auto mb-3`}>
                      <template.icon className={`h-6 w-6 text-${template.color}-600`} />
                    </div>
                    <h4 className="font-semibold mb-2">{template.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {template.example}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Customize Your Goal</h3>
              <p className="text-gray-600">Make it specific and meaningful to you</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="goal_title">Goal Title</Label>
                <Input
                  id="goal_title"
                  value={formData.goal_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_title: e.target.value }))}
                  placeholder="Give your goal a catchy title"
                />
              </div>

              <div>
                <Label htmlFor="goal_description">Description</Label>
                <Textarea
                  id="goal_description"
                  value={formData.goal_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_description: e.target.value }))}
                  placeholder="Describe what you want to achieve"
                  rows={3}
                />
              </div>

              {formData.goal_type === 'skill_mastery' && (
                <div>
                  <Label htmlFor="target_skill">Target Skill</Label>
                  <Input
                    id="target_skill"
                    value={formData.target_skill_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_skill_name: e.target.value }))}
                    placeholder="e.g., Quadratic Functions, Essay Writing"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Set Your Target</h3>
              <p className="text-gray-600">Define what success looks like</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="target_value">
                  Target Value 
                  {formData.goal_type === 'skill_mastery' && ' (Accuracy %)'}
                  {formData.goal_type === 'consistency' && ' (Days)'}
                </Label>
                <Input
                  id="target_value"
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_value: Number(e.target.value) }))}
                  min={1}
                  max={formData.goal_type === 'skill_mastery' ? 100 : 365}
                />
              </div>

              <div>
                <Label htmlFor="difficulty_level">Difficulty Level</Label>
                <Select 
                  value={formData.difficulty_level} 
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setFormData(prev => ({ ...prev, difficulty_level: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy - Gentle challenge</SelectItem>
                    <SelectItem value="medium">Medium - Good stretch</SelectItem>
                    <SelectItem value="hard">Hard - Big challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target_date">Target Date (Optional)</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Review & Confirm</h3>
              <p className="text-gray-600">Everything looks good? Let's make it happen!</p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-lg">{formData.goal_title}</h4>
                    <p className="text-gray-600">{formData.goal_description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Type:</span>
                      <Badge variant="outline" className="ml-2">
                        {formData.goal_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Target:</span>
                      <span className="ml-2">{formData.target_value}{formData.goal_type === 'skill_mastery' ? '%' : ''}</span>
                    </div>
                    <div>
                      <span className="font-medium">Difficulty:</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${
                          formData.difficulty_level === 'easy' ? 'border-green-300 text-green-700' :
                          formData.difficulty_level === 'medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-red-300 text-red-700'
                        }`}
                      >
                        {formData.difficulty_level}
                      </Badge>
                    </div>
                    {formData.target_date && (
                      <div>
                        <span className="font-medium">Due:</span>
                        <span className="ml-2">{new Date(formData.target_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={generateMilestones}
              variant="outline"
              className="w-full"
            >
              <Star className="h-4 w-4 mr-2" />
              Generate Milestones
            </Button>

            {formData.milestones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Milestones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{milestone.title}</div>
                        <div className="text-xs text-gray-600">{milestone.description}</div>
                      </div>
                      <Badge variant="outline">{milestone.value}{formData.goal_type === 'skill_mastery' ? '%' : ''}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Create Your Goal - Step {step} of {totalSteps}
          </DialogTitle>
          <Progress value={progress} className="h-2" />
        </DialogHeader>

        <div className="py-4">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={step === 1 ? onCancel : handleBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < totalSteps ? (
            <Button 
              onClick={handleNext}
              disabled={
                (step === 1 && !formData.goal_type) ||
                (step === 2 && (!formData.goal_title || !formData.goal_description))
              }
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.goal_title || !formData.goal_description}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Goal'}
              <Target className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
