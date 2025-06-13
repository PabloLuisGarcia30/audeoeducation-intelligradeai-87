
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Brain, Target, BookOpen } from 'lucide-react';
import { AdaptiveLearningProfile, LearningTrajectoryEvent } from '@/services/adaptiveLearningService';

interface AdaptiveLearningInsightsProps {
  profile: AdaptiveLearningProfile | null;
  recentEvents: LearningTrajectoryEvent[];
  learningPatterns: {
    predominant_pattern: string;
    confidence: number;
    recommendations: string[];
  } | null;
  className?: string;
}

export function AdaptiveLearningInsights({
  profile,
  recentEvents,
  learningPatterns,
  className = ''
}: AdaptiveLearningInsightsProps) {
  if (!profile) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Learning Insights
          </CardTitle>
          <CardDescription>
            Complete some exercises to see your personalized learning insights!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getConfidenceTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600 bg-green-50';
      case 'declining': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getLearningVelocityLevel = (velocity: number) => {
    if (velocity > 1.5) return { label: 'Fast', color: 'bg-green-500' };
    if (velocity > 0.8) return { label: 'Normal', color: 'bg-blue-500' };
    return { label: 'Steady', color: 'bg-orange-500' };
  };

  const velocityInfo = getLearningVelocityLevel(profile.learning_velocity);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Learning Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Learning Progress
          </CardTitle>
          <CardDescription>
            Adaptive insights based on your learning patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Learning Velocity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Learning Velocity</span>
              <Badge variant="secondary" className={velocityInfo.color + ' text-white'}>
                {velocityInfo.label}
              </Badge>
            </div>
            <Progress value={Math.min(profile.learning_velocity * 50, 100)} className="h-2" />
            <p className="text-xs text-gray-600">
              You're learning {profile.learning_velocity > 1 ? 'faster' : profile.learning_velocity < 0.8 ? 'more steadily' : 'at a normal pace'} compared to typical students
            </p>
          </div>

          {/* Confidence Trend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence Trend</span>
              <Badge className={getConfidenceTrendColor(profile.confidence_trend)}>
                {profile.confidence_trend}
              </Badge>
            </div>
            <p className="text-xs text-gray-600">
              Your confidence in new topics is {profile.confidence_trend === 'improving' ? 'growing stronger' : 
              profile.confidence_trend === 'declining' ? 'needing support' : 'staying consistent'}
            </p>
          </div>

          {/* Engagement Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Engagement Level</span>
              <span className="text-sm text-gray-600">{Math.round(profile.engagement_score * 100)}%</span>
            </div>
            <Progress value={profile.engagement_score * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Learning Style Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your Learning Style
          </CardTitle>
          <CardDescription>
            Personalized insights about how you learn best
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-sm font-medium">Explanation Style</span>
              <Badge variant="outline" className="capitalize">
                {profile.preferred_explanation_style.replace('_', ' ')}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Learning Modality</span>
              <Badge variant="outline" className="capitalize">
                {profile.learning_modality.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm font-medium">Optimal Session Length</span>
            <p className="text-sm text-gray-600">
              {profile.optimal_session_length_minutes} minutes (you focus best in shorter sessions)
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Learning Preferences</span>
            <div className="flex flex-wrap gap-1">
              {profile.scaffolding_preferences.hints && (
                <Badge variant="secondary" className="text-xs">Hints</Badge>
              )}
              {profile.scaffolding_preferences.examples && (
                <Badge variant="secondary" className="text-xs">Examples</Badge>
              )}
              {profile.scaffolding_preferences.step_by_step && (
                <Badge variant="secondary" className="text-xs">Step-by-step</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Learning Patterns */}
      {learningPatterns && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Patterns
            </CardTitle>
            <CardDescription>
              AI-detected patterns in your recent learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Pattern</span>
              <Badge variant="outline" className="capitalize">
                {learningPatterns.predominant_pattern}
              </Badge>
            </div>
            
            {learningPatterns.recommendations.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">AI Recommendations</span>
                <ul className="space-y-1">
                  {learningPatterns.recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-blue-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Events Summary */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Learning Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentEvents.slice(0, 3).map((event, index) => (
                <div key={event.id || index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={event.event_type === 'breakthrough' ? 'default' : 
                              event.event_type === 'struggle' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {event.event_type}
                    </Badge>
                    <span className="text-gray-600">{event.skill_name}</span>
                  </div>
                  <span className="text-gray-500">
                    {new Date(event.created_at || '').toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
