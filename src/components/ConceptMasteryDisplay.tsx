
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, TrendingUp } from "lucide-react";
import { useTrailblazer } from "@/hooks/useTrailblazer";

export const ConceptMasteryDisplay = () => {
  const { concepts, isLoading } = useTrailblazer();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Concept Mastery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (concepts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Concept Mastery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Start practicing to see your concept mastery progress!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMasteryColor = (score: number) => {
    if (score >= 80) return 'text-green-600 border-green-300';
    if (score >= 60) return 'text-yellow-600 border-yellow-300';
    return 'text-red-600 border-red-300';
  };

  const getMasteryLevel = (score: number) => {
    if (score >= 90) return 'Expert';
    if (score >= 80) return 'Advanced';
    if (score >= 60) return 'Intermediate';
    if (score >= 40) return 'Beginner';
    return 'Learning';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Concept Mastery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {concepts.slice(0, 5).map((concept) => (
            <div key={`${concept.user_id}-${concept.concept}`} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{concept.concept}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getMasteryColor(concept.mastery_score)}`}
                    >
                      {getMasteryLevel(concept.mastery_score)}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {concept.time_spent_minutes}m
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingUp className="h-3 w-3" />
                      {concept.practice_count} sessions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {Math.round(concept.mastery_score)}%
                  </div>
                </div>
              </div>
              <Progress 
                value={concept.mastery_score} 
                className="h-2"
              />
            </div>
          ))}
          
          {concepts.length > 5 && (
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-500">
                And {concepts.length - 5} more concepts...
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
