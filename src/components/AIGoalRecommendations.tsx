
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
import { AIGoalRecommendation } from "@/services/smartGoalService";

interface AIGoalRecommendationsProps {
  recommendations: AIGoalRecommendation[];
  onAcceptGoal: (recommendation: AIGoalRecommendation) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function AIGoalRecommendations({ 
  recommendations, 
  onAcceptGoal, 
  onRefresh, 
  loading 
}: AIGoalRecommendationsProps) {
  const getGoalTypeIcon = (type: AIGoalRecommendation['goal_type']) => {
    switch (type) {
      case 'skill_mastery': return <Target className="h-4 w-4" />;
      case 'misconception_resolution': return <Brain className="h-4 w-4" />;
      case 'learning_velocity': return <TrendingUp className="h-4 w-4" />;
      case 'consistency': return <Calendar className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getGoalTypeColor = (type: AIGoalRecommendation['goal_type']) => {
    switch (type) {
      case 'skill_mastery': return 'bg-blue-100 text-blue-800';
      case 'misconception_resolution': return 'bg-purple-100 text-purple-800';
      case 'learning_velocity': return 'bg-green-100 text-green-800';
      case 'consistency': return 'bg-orange-100 text-orange-800';
      case 'time_based': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getDifficultyColor = (difficulty: AIGoalRecommendation['difficulty_level']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
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

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Yet</h3>
          <p className="text-gray-600 mb-4">
            Click the button below to get AI-powered goal suggestions based on your learning data.
          </p>
          <Button onClick={onRefresh}>
            <Brain className="h-4 w-4 mr-2" />
            Generate Recommendations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI-Powered Goal Recommendations</h2>
          <p className="text-gray-600">Personalized goals based on your learning analytics</p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {recommendations.map((recommendation, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getGoalTypeIcon(recommendation.goal_type)}
                  <div>
                    <CardTitle className="text-lg">{recommendation.goal_title}</CardTitle>
                    <p className="text-sm text-gray-600">{recommendation.goal_description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getGoalTypeColor(recommendation.goal_type)}>
                    {recommendation.goal_type.replace('_', ' ')}
                  </Badge>
                  <Badge className={getDifficultyColor(recommendation.difficulty_level)}>
                    {recommendation.difficulty_level}
                  </Badge>
                  <Badge variant="outline">
                    <Brain className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Goal Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Target:</span>
                    <div className="font-medium">{recommendation.target_value}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Target Date:</span>
                    <div className="font-medium">
                      {new Date(recommendation.target_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">AI Confidence:</span>
                    <div className={`font-medium ${getConfidenceColor(recommendation.ai_confidence_score)}`}>
                      {getConfidenceText(recommendation.ai_confidence_score)}
                    </div>
                  </div>
                </div>

                {/* Skill Focus */}
                {recommendation.target_skill_name && (
                  <div>
                    <span className="text-sm text-gray-600">Focus Skill:</span>
                    <Badge variant="outline" className="ml-2">
                      {recommendation.target_skill_name}
                    </Badge>
                  </div>
                )}

                {/* Milestones */}
                {recommendation.milestones.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Milestones:</p>
                    <div className="space-y-1">
                      {recommendation.milestones.map((milestone, mIndex) => (
                        <div key={mIndex} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="h-4 w-4 text-gray-300" />
                          <span>{milestone.title} ({milestone.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Reasoning */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Why this goal?</p>
                  <p className="text-sm text-blue-800">{recommendation.reasoning}</p>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => onAcceptGoal(recommendation)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Accept This Goal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
