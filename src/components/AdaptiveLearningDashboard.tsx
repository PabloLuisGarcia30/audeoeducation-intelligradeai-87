
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  Target,
  Clock,
  Zap,
  BarChart3,
  Lightbulb,
  Users,
  Award
} from "lucide-react";
import { useAdaptiveLearning } from "@/hooks/useAdaptiveLearning";
import { AdaptiveLearningProfile, LearningTrajectoryEvent } from "@/services/adaptiveLearningService";

interface AdaptiveLearningDashboardProps {
  studentId: string;
}

export function AdaptiveLearningDashboard({ studentId }: AdaptiveLearningDashboardProps) {
  const {
    profile,
    recentEvents,
    learningPatterns,
    loading,
    error
  } = useAdaptiveLearning(studentId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading adaptive learning data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error || 'Unable to load adaptive learning data'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Learning Profile Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Velocity</CardTitle>
            <Zap className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.learning_velocity.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground">
              {profile.learning_velocity > 1 ? 'Above average' : profile.learning_velocity < 1 ? 'Thoughtful learner' : 'Average pace'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile.confidence_trend}</div>
            <Badge variant={
              profile.confidence_trend === 'improving' ? 'default' :
              profile.confidence_trend === 'declining' ? 'destructive' : 'secondary'
            }>
              {profile.confidence_trend}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(profile.engagement_score * 100)}%</div>
            <Progress value={profile.engagement_score * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Learning Profile</TabsTrigger>
          <TabsTrigger value="trajectory">Learning Journey</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Cognitive Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cognitive Load Tolerance</span>
                  <Badge variant="outline">{profile.cognitive_load_tolerance}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Help Seeking</span>
                  <Badge variant="outline">{profile.help_seeking_frequency}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Recovery Style</span>
                  <Badge variant="outline">{profile.mistake_recovery_style}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Optimal Session Length</span>
                  <Badge variant="outline">{profile.optimal_session_length_minutes} min</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Fatigue Threshold</span>
                  <Badge variant="outline">{profile.fatigue_threshold_minutes} min</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Difficulty Progression</span>
                  <Badge variant="outline">{profile.optimal_difficulty_progression}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trajectory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Learning Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {recentEvents.slice(0, 5).map((event, index) => (
                    <LearningEventCard key={event.id || index} event={event} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent learning events recorded
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Learning Patterns Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {learningPatterns ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Predominant Pattern</span>
                    <Badge variant="outline" className="capitalize">
                      {learningPatterns.predominant_pattern}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pattern Confidence</span>
                    <span className="text-sm">{Math.round(learningPatterns.confidence * 100)}%</span>
                  </div>
                  <Progress value={learningPatterns.confidence * 100} />
                  
                  {learningPatterns.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {learningPatterns.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Analyzing learning patterns...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Modalities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Preferred Explanation Style</span>
                  <Badge variant="outline">{profile.preferred_explanation_style}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Learning Modality</span>
                  <Badge variant="outline">{profile.learning_modality}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scaffolding Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Hints</span>
                  <Badge variant={profile.scaffolding_preferences.hints ? "default" : "secondary"}>
                    {profile.scaffolding_preferences.hints ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Examples</span>
                  <Badge variant={profile.scaffolding_preferences.examples ? "default" : "secondary"}>
                    {profile.scaffolding_preferences.examples ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Step-by-Step</span>
                  <Badge variant={profile.scaffolding_preferences.step_by_step ? "default" : "secondary"}>
                    {profile.scaffolding_preferences.step_by_step ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Zone of Proximal Development</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Lower Bound</span>
                  <span>{Math.round(profile.zone_of_proximal_development.lower_bound * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Upper Bound</span>
                  <span>{Math.round(profile.zone_of_proximal_development.upper_bound * 100)}%</span>
                </div>
                <div className="mt-4">
                  <div className="h-3 bg-gray-200 rounded-full relative">
                    <div 
                      className="h-3 bg-green-500 rounded-full absolute"
                      style={{
                        left: `${profile.zone_of_proximal_development.lower_bound * 100}%`,
                        width: `${(profile.zone_of_proximal_development.upper_bound - profile.zone_of_proximal_development.lower_bound) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Optimal challenge zone for this student
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LearningEventCard({ event }: { event: LearningTrajectoryEvent }) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'breakthrough': return <Award className="h-4 w-4 text-green-600" />;
      case 'struggle': return <Target className="h-4 w-4 text-red-600" />;
      case 'plateau': return <BarChart3 className="h-4 w-4 text-yellow-600" />;
      case 'confusion': return <Brain className="h-4 w-4 text-orange-600" />;
      case 'mastery': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'breakthrough': return 'border-l-green-500';
      case 'struggle': return 'border-l-red-500';
      case 'plateau': return 'border-l-yellow-500';
      case 'confusion': return 'border-l-orange-500';
      case 'mastery': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div className={`border-l-4 ${getEventColor(event.event_type)} pl-4 py-2`}>
      <div className="flex items-center gap-2 mb-1">
        {getEventIcon(event.event_type)}
        <span className="font-medium capitalize">{event.event_type}</span>
        <Badge variant="outline" className="text-xs">
          {event.skill_name}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground">
        {event.difficulty_level} difficulty • {event.created_at ? new Date(event.created_at).toLocaleDateString() : 'Recent'}
      </div>
      {event.successful_explanation_type && (
        <div className="text-xs text-muted-foreground mt-1">
          Effective style: {event.successful_explanation_type}
        </div>
      )}
    </div>
  );
}
