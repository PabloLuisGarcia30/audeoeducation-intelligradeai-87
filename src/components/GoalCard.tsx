
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Play, 
  Pause, 
  CheckCircle2,
  Clock,
  Star,
  Brain,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { type StudentGoal } from "@/services/smartGoalService";
import { SmartGoalService } from "@/services/smartGoalService";

interface GoalCardProps {
  goal: StudentGoal;
  onUpdate: () => void;
}

export function GoalCard({ goal, onUpdate }: GoalCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'skill_mastery': return Target;
      case 'consistency': return Calendar;
      case 'learning_velocity': return Zap;
      case 'misconception_resolution': return Brain;
      default: return Star;
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'skill_mastery': return 'blue';
      case 'consistency': return 'green';
      case 'learning_velocity': return 'purple';
      case 'misconception_resolution': return 'yellow';
      default: return 'gray';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getDaysRemaining = () => {
    if (!goal.target_date) return null;
    const today = new Date();
    const targetDate = new Date(goal.target_date);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleQuickProgress = async () => {
    try {
      setIsUpdating(true);
      const increment = goal.goal_type === 'consistency' ? 1 : 10;
      const newValue = Math.min(goal.target_value, goal.current_value + increment);
      
      await SmartGoalService.updateGoalProgress(goal.id, newValue);
      toast.success('Progress updated! 🎉');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update progress');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusToggle = async () => {
    try {
      setIsUpdating(true);
      const newStatus = goal.status === 'active' ? 'paused' : 'active';
      await SmartGoalService.updateGoalStatus(goal.id, newStatus);
      toast.success(`Goal ${newStatus}!`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update goal status');
    } finally {
      setIsUpdating(false);
    }
  };

  const daysRemaining = getDaysRemaining();
  const GoalIcon = getGoalTypeIcon(goal.goal_type);
  const color = getGoalTypeColor(goal.goal_type);
  const isNearDeadline = daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;
  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  return (
    <Card className={`hover:shadow-lg transition-shadow ${goal.status === 'paused' ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <GoalIcon className={`h-5 w-5 text-${color}-600`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{goal.goal_title}</CardTitle>
              <p className="text-sm text-gray-600 line-clamp-2">{goal.goal_description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            {goal.is_ai_suggested && (
              <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">
                <Brain className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={`text-xs ${getDifficultyColor(goal.difficulty_level)}`}
            >
              {goal.difficulty_level}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span className={`font-bold ${getProgressColor(goal.progress_percentage)}`}>
              {Math.round(goal.progress_percentage)}%
            </span>
          </div>
          <Progress value={goal.progress_percentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{goal.current_value} / {goal.target_value}{goal.goal_type === 'skill_mastery' ? '%' : ''}</span>
            {goal.progress_percentage >= 100 && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Complete!</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        {goal.target_date && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Due:</span>
            <span className={`font-medium ${
              isOverdue ? 'text-red-600' : 
              isNearDeadline ? 'text-amber-600' : 
              'text-gray-800'
            }`}>
              {new Date(goal.target_date).toLocaleDateString()}
              {daysRemaining !== null && (
                <span className="ml-1">
                  ({daysRemaining > 0 ? `${daysRemaining} days left` : 
                    daysRemaining === 0 ? 'Due today' : 
                    `${Math.abs(daysRemaining)} days overdue`})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Milestones */}
        {goal.milestones.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Next Milestone</span>
            {goal.milestones.map((milestone, index) => {
              const isAchieved = goal.current_value >= milestone.value;
              const isNext = !isAchieved && goal.milestones.slice(0, index).every(m => goal.current_value >= m.value);
              
              if (isNext || (index === 0 && !goal.milestones.some(m => goal.current_value < m.value))) {
                return (
                  <div key={index} className={`p-2 rounded-lg border ${
                    isAchieved ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isAchieved ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Star className="h-4 w-4 text-blue-600" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{milestone.title}</div>
                        <div className="text-xs text-gray-600">{milestone.description}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {milestone.value}{goal.goal_type === 'skill_mastery' ? '%' : ''}
                      </Badge>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            onClick={handleQuickProgress}
            disabled={isUpdating || goal.status === 'paused' || goal.progress_percentage >= 100}
            className="flex-1"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Quick +{goal.goal_type === 'consistency' ? '1' : '10'}
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleStatusToggle}
            disabled={isUpdating}
          >
            {goal.status === 'active' ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
