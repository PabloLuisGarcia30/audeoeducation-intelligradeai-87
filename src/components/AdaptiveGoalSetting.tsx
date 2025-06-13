
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Brain,
  Star,
  Calendar
} from "lucide-react";
import { useAdaptiveLearning } from "@/hooks/useAdaptiveLearning";

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  category: 'skill_mastery' | 'time_based' | 'performance_improvement';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  isAiSuggested: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'paused';
}

interface AdaptiveGoalSettingProps {
  studentId: string;
}

export function AdaptiveGoalSetting({ studentId }: AdaptiveGoalSettingProps) {
  const { profile, recentEvents, learningPatterns } = useAdaptiveLearning(studentId);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock goals data based on student context
  useEffect(() => {
    const mockGoals: LearningGoal[] = [
      {
        id: '1',
        title: 'Master Quadratic Functions',
        description: 'Achieve 90% accuracy in quadratic function problems',
        category: 'skill_mastery',
        targetValue: 90,
        currentValue: 85,
        unit: '%',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isAiSuggested: true,
        priority: 'high',
        status: 'active'
      },
      {
        id: '2',
        title: 'Reduce Problem Solving Time',
        description: 'Complete math problems 20% faster',
        category: 'time_based',
        targetValue: 20,
        currentValue: 12,
        unit: '% faster',
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        isAiSuggested: true,
        priority: 'medium',
        status: 'active'
      },
      {
        id: '3',
        title: 'Geography Consistency',
        description: 'Maintain 85%+ average across all geography topics',
        category: 'performance_improvement',
        targetValue: 85,
        currentValue: 87,
        unit: '%',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isAiSuggested: false,
        priority: 'medium',
        status: 'active'
      }
    ];
    setGoals(mockGoals);
  }, []);

  const getAiSuggestedGoals = () => {
    if (!profile || !learningPatterns) return [];

    const suggestions: Partial<LearningGoal>[] = [];

    // Suggest goals based on learning patterns
    if (learningPatterns.predominant_pattern === 'struggle') {
      suggestions.push({
        title: 'Build Confidence in Problem Solving',
        description: 'Complete practice exercises with 75% accuracy',
        category: 'skill_mastery',
        targetValue: 75,
        currentValue: 60,
        unit: '%',
        isAiSuggested: true,
        priority: 'high'
      });
    }

    if (profile.learning_velocity < 0.8) {
      suggestions.push({
        title: 'Improve Learning Pace',
        description: 'Increase learning velocity by 25%',
        category: 'performance_improvement',
        targetValue: 25,
        currentValue: 0,
        unit: '% improvement',
        isAiSuggested: true,
        priority: 'medium'
      });
    }

    return suggestions;
  };

  const filteredGoals = goals.filter(goal => 
    selectedCategory === 'all' || goal.category === selectedCategory
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'skill_mastery': return Brain;
      case 'time_based': return Clock;
      case 'performance_improvement': return TrendingUp;
      default: return Target;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDeadline = (date: Date) => {
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Smart Learning Goals</h2>
          <p className="text-slate-600">AI-powered goal setting and progress tracking</p>
        </div>
        <Button onClick={() => setShowCreateGoal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {/* Goal Categories Filter */}
      <div className="flex gap-2">
        <Badge 
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('all')}
        >
          All Goals
        </Badge>
        <Badge 
          variant={selectedCategory === 'skill_mastery' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('skill_mastery')}
        >
          <Brain className="h-3 w-3 mr-1" />
          Skill Mastery
        </Badge>
        <Badge 
          variant={selectedCategory === 'time_based' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('time_based')}
        >
          <Clock className="h-3 w-3 mr-1" />
          Time-based
        </Badge>
        <Badge 
          variant={selectedCategory === 'performance_improvement' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('performance_improvement')}
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          Performance
        </Badge>
      </div>

      {/* AI Suggestions */}
      {getAiSuggestedGoals().length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Brain className="h-5 w-5" />
              AI Suggested Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getAiSuggestedGoals().map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <p className="text-sm text-slate-600">{suggestion.description}</p>
                </div>
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
                  Add Goal
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGoals.map((goal) => {
          const IconComponent = getCategoryIcon(goal.category);
          const progressPercentage = (goal.currentValue / goal.targetValue) * 100;
          
          return (
            <Card key={goal.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.title}</h3>
                      <p className="text-sm text-slate-600">{goal.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getPriorityColor(goal.priority)}>
                      {goal.priority}
                    </Badge>
                    {goal.isAiSuggested && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        <Star className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-slate-600">
                      {goal.currentValue}{goal.unit} / {goal.targetValue}{goal.unit}
                    </span>
                  </div>
                  <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Calendar className="h-3 w-3" />
                    {formatDeadline(goal.deadline)}
                  </div>
                  {goal.status === 'completed' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Edit Goal
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredGoals.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No goals yet</h3>
            <p className="text-slate-600 mb-4">Set your first learning goal to track your progress</p>
            <Button onClick={() => setShowCreateGoal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
