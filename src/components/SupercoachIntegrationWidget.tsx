
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SupercoachMiniLesson } from './SupercoachMiniLesson';
import { SupercoachAIContentGenerator } from './SupercoachAIContentGenerator';
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react';

interface SupercoachIntegrationWidgetProps {
  studentId: string;
  exerciseResults?: any;
  supercoachRecommendations?: any[];
  misconceptionsDetected?: string[];
  className?: string;
}

export function SupercoachIntegrationWidget({
  studentId,
  exerciseResults,
  supercoachRecommendations = [],
  misconceptionsDetected = [],
  className = ''
}: SupercoachIntegrationWidgetProps) {
  const [showMiniLesson, setShowMiniLesson] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [selectedMisconception, setSelectedMisconception] = useState<string | null>(null);

  // Auto-show recommendations if there are high-risk alerts
  useEffect(() => {
    const hasHighRisk = supercoachRecommendations.some(rec => rec.riskLevel === 'high');
    if (hasHighRisk && supercoachRecommendations.length > 0) {
      setSelectedMisconception(supercoachRecommendations[0].misconceptionSubtypeId);
    }
  }, [supercoachRecommendations]);

  const hasRecommendations = supercoachRecommendations.length > 0 || misconceptionsDetected.length > 0;
  const needsHelp = exerciseResults?.overallScore < 60 || supercoachRecommendations.some(rec => rec.riskLevel === 'high');

  if (!hasRecommendations && !needsHelp) {
    return null; // Don't show widget if no recommendations
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main recommendation card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Brain className="h-5 w-5" />
            AI Supercoach Recommendations
          </CardTitle>
          <CardDescription className="text-blue-700">
            Personalized help based on your performance and learning patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Performance summary */}
          {exerciseResults && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  Score: {Math.round(exerciseResults.overallScore)}%
                </span>
              </div>
              {needsHelp && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs attention
                </Badge>
              )}
            </div>
          )}

          {/* High-risk alerts */}
          {supercoachRecommendations.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-800">
                AI detected {supercoachRecommendations.length} area(s) where you might benefit from additional help.
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          <div className="space-y-3">
            {supercoachRecommendations.map((rec, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={rec.riskLevel === 'high' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {rec.riskLevel} risk
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round(rec.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-sm font-medium">Question {rec.questionId}</p>
                    <p className="text-sm text-gray-600">{rec.reasoning}</p>
                    {rec.suggestedIntervention && (
                      <p className="text-sm text-blue-700 font-medium">
                        💡 {rec.suggestedIntervention}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedMisconception(rec.misconceptionSubtypeId);
                      setShowMiniLesson(true);
                    }}
                  >
                    Get Help
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {selectedMisconception && (
              <>
                <Button
                  variant="default"
                  onClick={() => setShowMiniLesson(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Get Adaptive Mini-Lesson
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAIGenerator(true)}
                >
                  Generate AI Content
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mini-lesson component */}
      {showMiniLesson && selectedMisconception && (
        <SupercoachMiniLesson
          misconceptionSubtypeId={selectedMisconception}
          studentId={studentId}
          onLessonGenerated={() => setShowMiniLesson(false)}
        />
      )}

      {/* AI content generator */}
      {showAIGenerator && selectedMisconception && (
        <SupercoachAIContentGenerator
          misconceptionSubtypeId={selectedMisconception}
          requestedBy="student"
          studentId={studentId}
          onContentGenerated={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  );
}
