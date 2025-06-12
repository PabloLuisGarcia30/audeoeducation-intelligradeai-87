
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTrailblazer } from '@/hooks/useTrailblazer';

interface Props {
  sessionId: string;
}

export function TrailblazerSessionAnalytics({ sessionId }: Props) {
  const { getSessionMisconceptions } = useTrailblazer();
  const { data: misconceptions = [], isLoading } = getSessionMisconceptions(sessionId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMisconceptions = misconceptions.length;
  const resolvedCount = misconceptions.filter(m => m.resolution_status === 'resolved').length;
  const persistentCount = misconceptions.filter(m => m.resolution_status === 'persistent').length;
  const resolutionRate = totalMisconceptions > 0 ? (resolvedCount / totalMisconceptions) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Learning Session Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalMisconceptions}</div>
              <div className="text-sm text-muted-foreground">Learning Opportunities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
              <div className="text-sm text-muted-foreground">Concepts Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{persistentCount}</div>
              <div className="text-sm text-muted-foreground">Needs More Practice</div>
            </div>
          </div>

          {totalMisconceptions > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Mastery Progress</span>
                <span className="text-sm text-muted-foreground">{resolutionRate.toFixed(0)}%</span>
              </div>
              <Progress value={resolutionRate} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {misconceptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Learning Journey Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {misconceptions.map((misconception, index) => (
                <div key={misconception.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      Q{misconception.question_sequence || index + 1}
                    </div>
                    <div className="text-sm">
                      Learning opportunity detected
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {misconception.resolution_status === 'resolved' ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mastered
                      </Badge>
                    ) : misconception.resolution_status === 'persistent' ? (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Practice More
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalMisconceptions === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Perfect Session!</h3>
            <p className="text-muted-foreground">
              No learning opportunities detected. You demonstrated strong mastery throughout this session.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
