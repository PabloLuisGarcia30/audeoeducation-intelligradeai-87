
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { SupercoachService } from '@/services/supercoachService';

interface PredictiveAlertsProps {
  className?: string;
}

export function SupercoachPredictiveAlerts({ className = '' }: PredictiveAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await SupercoachService.getPredictiveAlerts(false, 10);
      setAlerts(data);
    } catch (error) {
      console.error('Error loading predictive alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (
    alertId: string, 
    resolutionType: 'false_positive' | 'mini_lesson_helped' | 'student_self_corrected' | 'teacher_intervention'
  ) => {
    setResolving(alertId);
    try {
      await SupercoachService.resolvePredictiveAlert(alertId, resolutionType);
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setResolving(null);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="mt-2 text-gray-600">Loading predictive alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          AI Predictive Alerts
        </CardTitle>
        <CardDescription>
          Real-time misconception risk detection for your students
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No active predictive alerts. All students are performing well!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={`border ${getRiskColor(alert.risk_level)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={getRiskColor(alert.risk_level)}
                        >
                          {alert.risk_level.toUpperCase()} RISK
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Confidence: {Math.round(alert.confidence_score * 100)}%
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="font-medium">
                          <User className="h-4 w-4 inline mr-1" />
                          Student ID: {alert.student_id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Question: {alert.question_id}
                        </p>
                        {alert.misconception_subtypes && (
                          <p className="text-sm font-medium text-gray-800">
                            Predicted: {alert.misconception_subtypes.misconception_categories.category_name} - {alert.misconception_subtypes.subtype_name}
                          </p>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center gap-4">
                          <span>Time: {alert.behavioral_signals?.time_spent || 'N/A'}s</span>
                          <span>Changes: {alert.behavioral_signals?.answer_changes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id, 'teacher_intervention')}
                        disabled={resolving === alert.id}
                      >
                        Intervene
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resolveAlert(alert.id, 'false_positive')}
                        disabled={resolving === alert.id}
                      >
                        False Positive
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
