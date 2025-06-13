import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, CheckCircle, Clock } from 'lucide-react';
import { AdaptiveLearningProfile } from '@/services/adaptiveLearningService';

interface Goal {
  id: string;
  title: string;
  targetScore: number;
  currentScore: number;
  skillName: string;
  deadline: string;
  aiSuggested: boolean;
  status: 'active' | 'completed' | 'overdue';
}

interface AdaptiveGoalSettingProps {
  profile: AdaptiveLearningProfile | null;
  studentContext: any;
  onGoalSet?: (goal: Goal) => void;
  className?: string;
}

export function AdaptiveGoalSetting({
  profile,
  studentContext,
  onGoalSet,
  className = ''
}: AdaptiveGoalSettingProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('85');

  // Generate AI-suggested goals based on profile and context
  useEffect(() => {
    if (profile && studentContext && goals.length === 0) {
      generateAISuggestedGoals();
    }
  }, [profile, studentContext]);

  const generateAISuggestedGoals = () => {
    if (!profile || !studentContext) return;

    const suggestedGoals: Goal[] = [];
    
    // Analyze weak skills for improvement goals
    const allScores = [...studentContext.contentSkillScores, ...studentContext.subjectSkillScores];
    const weakSkills = allScores.filter(skill => skill.score < 70).slice(0, 2);
    
    weakSkills.forEach((skill, index) => {
      const targetImprovement = Math.min(skill.score + 20, 85); // Realistic 20-point improvement
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (profile.optimal_session_length_minutes > 30 ? 14 : 21)); // Adjust based on learning velocity
      
      suggestedGoals.push({
        id: `ai-goal-${index + 1}`,
        title: `Improve ${skill.skill_name}`,
        targetScore: targetImprovement,
        currentScore: skill.score,
        skillName: skill.skill_name,
        deadline: deadline.toISOString().split('T')[0],
        aiSuggested: true,
        status: 'active'
      });
    });

    // Add a challenge goal for strong skills
    const strongSkills = allScores.filter(skill => skill.score >= 80).slice(0, 1);
    strongSkills.forEach((skill, index) => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 10); // Shorter timeline for mastery
      
      suggestedGoals.push({
        id: `ai-challenge-${index + 1}`,
        title: `Master ${skill.skill_name}`,
        targetScore: 95,
        currentScore: skill.score,
        skillName: skill.skill_name,
        deadline: deadline.toISOString().split('T')[0],
        aiSuggested: true,
        status: 'active'
      });
    });

    setGoals(suggestedGoals);
  };

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) return;

    const newGoal: Goal = {
      id: `user-goal-${Date.now()}`,
      title: newGoalTitle,
      targetScore: parseInt(newGoalTarget),
      currentScore: 60, // Default starting score
      skillName: newGoalTitle,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks
      aiSuggested: false,
      status: 'active'
    };

    setGoals(prev => [...prev, newGoal]);
    setNewGoalTitle('');
    setNewGoalTarget('85');
    setShowNewGoal(false);
    onGoalSet?.(newGoal);
  };

  const calculateProgress = (goal: Goal): number => {
    if (goal.currentScore >= goal.targetScore) return 100;
    const progress = (goal.currentScore / goal.targetScore) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Smart Learning Goals
        </CardTitle>
        <CardDescription>
          AI-suggested goals based on your learning patterns and progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Goals */}
        {goals.length > 0 ? (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{goal.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Target: {goal.targetScore}%</span>
                      <span>•</span>
                      <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {goal.aiSuggested && (
                      <Badge variant="secondary" className="text-xs">
                        AI Suggested
                      </Badge>
                    )}
                    <Badge className={`text-xs ${getStatusColor(goal.status)}`}>
                      {goal.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Progress</span>
                    <span>{Math.round(calculateProgress(goal))}%</span>
                  </div>
                  <Progress value={calculateProgress(goal)} className="h-2" />
                </div>
                
                {goal.status === 'completed' && (
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Goal achieved!</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-4">
            Complete some exercises to get AI-suggested learning goals!
          </div>
        )}

        {/* Add New Goal */}
        {showNewGoal ? (
          <div className="border rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm">Create New Goal</h4>
            <div className="space-y-2">
              <Input
                placeholder="Goal title (e.g., 'Improve Algebra')"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Target score (%)"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                min="1"
                max="100"
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateGoal} disabled={!newGoalTitle.trim()}>
                Create Goal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewGoal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewGoal(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Goal
          </Button>
        )}

        {/* AI Recommendations */}
        {profile && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">AI Recommendation</span>
            </div>
            <p className="text-xs text-blue-700">
              Based on your learning velocity ({profile.learning_velocity.toFixed(1)}x), 
              focus on {profile.optimal_session_length_minutes}-minute sessions with {' '}
              {profile.preferred_explanation_style} explanations for best results.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
