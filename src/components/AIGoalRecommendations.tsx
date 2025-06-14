
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  Plus
} from "lucide-react";
import { SmartGoalService, type AIGoalRecommendation, type StudentGoal } from "@/services/smartGoalService";
import { toast } from "sonner";

interface AIGoalRecommendationsProps {
  /** ID of the learner for whom we are recommending goals */
  studentId: string;
  onGoalCreated: (newGoal: StudentGoal) => void;
  /** Optional: Error handler */
  onError?: (error: any) => void;
  /** Optional: Pre-loaded recommendations */
  recommendations?: AIGoalRecommendation[];
  /** Optional: Accept goal handler */
  onAcceptGoal?: (recommendation: AIGoalRecommendation) => Promise<void>;
  /** Optional: Refresh handler */
  onRefresh?: () => Promise<void>;
  /** Optional: Loading state */
  loading?: boolean;
}

export function AIGoalRecommendations({ 
  studentId, 
  onGoalCreated,
  onError,
  recommendations: propRecommendations,
  onAcceptGoal: propOnAcceptGoal,
  onRefresh: propOnRefresh,
  loading: propLoading
}: AIGoalRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AIGoalRecommendation[]>(propRecommendations || []);
  const [loading, setLoading] = useState(propLoading || false);

  useEffect(() => {
    if (propRecommendations) {
      setRecommendations(propRecommendations);
    } else {
      loadRecommendations();
    }
  }, [studentId, propRecommendations]);

  useEffect(() => {
    if (propLoading !== undefined) {
      setLoading(propLoading);
    }
  }, [propLoading]);

  const loadRecommendations = async () => {
    if (propOnRefresh) {
      await propOnRefresh();
      return;
    }

    try {
      setLoading(true);
      const recs = await SmartGoalService.generateGoalRecommendations(studentId);
      setRecommendations(recs);
    } catch (error: any) {
      console.error('Failed to load AI recommendations:', error);
      setRecommendations([]);
      
      // Parse the error to provide specific user feedback
      let errorMessage = 'Failed to load recommendations. Please try again.';
      
      if (error?.message?.includes('network')) {
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
      setLoading(false);
    }
  };

  const handleAcceptGoal = async (recommendation: AIGoalRecommendation) => {
    if (propOnAcceptGoal) {
      await propOnAcceptGoal(recommendation);
      return;
    }

    try {
      const newGoal = await SmartGoalService.createGoalFromRecommendation(studentId, recommendation);
      toast.success('Goal created successfully! 🎯');
      onGoalCreated(newGoal);
      // Remove the accepted recommendation from the list
      setRecommendations(prev => prev.filter(r => r !== recommendation));
    } catch (error: any) {
      console.error('Error creating goal from recommendation:', error);
      
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
    }
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'skill_mastery': return Target;
      case 'consistency': return Calendar;
      case 'learning_velocity': return TrendingUp;
      case 'misconception_resolution': return Brain;
      default: return Target;
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating AI Recommendations</h3>
          <p className="text-gray-600">Analyzing your performance data to create personalized goals...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Goal Recommendations
          </CardTitle>
          <Button variant="outline" onClick={loadRecommendations} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => {
              const Icon = getGoalTypeIcon(recommendation.goal_type);
              const color = getGoalTypeColor(recommendation.goal_type);
              
              return (
                <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${color}-100`}>
                        <Icon className={`h-5 w-5 text-${color}-600`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{recommendation.goal_title}</h4>
                        <p className="text-sm text-gray-600">{recommendation.goal_description}</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Suggested
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Target:</span>
                      <span className="ml-2 font-medium">{recommendation.target_value}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Difficulty:</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {recommendation.difficulty_level}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg mb-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">Why this goal?</p>
                    <p className="text-sm text-blue-800">{recommendation.reasoning}</p>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleAcceptGoal(recommendation)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Accept This Goal
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
            <p className="text-gray-600 mb-4">
              Complete some practice exercises to help our AI generate personalized goal recommendations for you!
            </p>
            <Button onClick={loadRecommendations}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
