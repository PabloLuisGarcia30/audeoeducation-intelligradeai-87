
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { MisconceptionTrendData } from '@/services/studentResultsHistoryService';

interface MisconceptionTimelineProps {
  misconceptions: MisconceptionTrendData[];
  className?: string;
}

export function MisconceptionTimeline({ misconceptions, className = '' }: MisconceptionTimelineProps) {
  const getStatusIcon = (isResolved: boolean, resolutionRate: number) => {
    if (isResolved) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (resolutionRate > 50) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (isResolved: boolean, resolutionRate: number) => {
    if (isResolved) return 'bg-green-100 text-green-800 border-green-200';
    if (resolutionRate > 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getProgressColor = (resolutionRate: number) => {
    if (resolutionRate === 100) return 'bg-green-500';
    if (resolutionRate > 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Misconception Resolution Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {misconceptions.length > 0 ? (
          <div className="space-y-4">
            {misconceptions.map((misconception, index) => (
              <div key={index} className="relative">
                {/* Timeline line */}
                {index < misconceptions.length - 1 && (
                  <div className="absolute left-4 top-8 w-0.5 h-12 bg-gray-200"></div>
                )}
                
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                    {getStatusIcon(misconception.is_resolved, misconception.resolution_rate)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`p-4 rounded-lg border ${getStatusColor(misconception.is_resolved, misconception.resolution_rate)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{misconception.misconception_type}</h4>
                        <Badge variant="outline" className="text-xs">
                          {misconception.misconception_category}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Resolution Progress</span>
                          <span>{misconception.resolution_rate.toFixed(0)}%</span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(misconception.resolution_rate)}`}
                            style={{ width: `${misconception.resolution_rate}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>First detected: {new Date(misconception.first_detected).toLocaleDateString()}</span>
                          <span>Last seen: {new Date(misconception.last_detected).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-gray-600">
                            Total occurrences: {misconception.occurrences_over_time.reduce((sum, occ) => sum + occ.count, 0)}
                          </span>
                          {misconception.is_resolved && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✓ Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Misconceptions Detected</h3>
            <p>Great! No misconceptions have been identified in your recent work.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
