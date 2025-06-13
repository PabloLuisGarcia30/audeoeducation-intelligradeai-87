
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BarChart3, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  examId: string;
  misconceptionStats: {
    totalQuestions: number;
    questionsWithMisconceptions: number;
    misconceptionCategories: Record<string, number>;
    questionTypes: Record<string, number>;
  };
}

export function MisconceptionInsights({ examId, misconceptionStats }: Props) {
  const annotationRate = misconceptionStats.totalQuestions > 0 
    ? Math.round((misconceptionStats.questionsWithMisconceptions / misconceptionStats.totalQuestions) * 100)
    : 0;

  const categoryData = Object.entries(misconceptionStats.misconceptionCategories).map(([name, count]) => ({
    name: name.replace(' Errors', ''),
    count
  }));

  const getAnnotationStatus = () => {
    if (annotationRate >= 80) return { color: 'text-green-600', icon: CheckCircle2, status: 'Excellent' };
    if (annotationRate >= 50) return { color: 'text-yellow-600', icon: BarChart3, status: 'Good' };
    return { color: 'text-red-600', icon: AlertTriangle, status: 'Needs Improvement' };
  };

  const annotationStatus = getAnnotationStatus();
  const StatusIcon = annotationStatus.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Misconception Analysis for Test: {examId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{misconceptionStats.totalQuestions}</div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{misconceptionStats.questionsWithMisconceptions}</div>
              <div className="text-sm text-gray-600">With Misconceptions</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${annotationStatus.color}`}>{annotationRate}%</div>
              <div className="text-sm text-gray-600">Annotation Rate</div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${annotationStatus.color}`} />
                <Badge variant={annotationRate >= 50 ? "default" : "secondary"}>
                  {annotationStatus.status}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 mt-1">Quality Score</div>
            </div>
          </div>

          {categoryData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Misconception Categories</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {annotationRate < 50 && (
                <li>• Consider adding misconception annotations to more multiple-choice questions</li>
              )}
              {Object.keys(misconceptionStats.misconceptionCategories).length === 0 && (
                <li>• Start by identifying common student mistakes for each incorrect option</li>
              )}
              {misconceptionStats.questionsWithMisconceptions > 0 && (
                <li>• Your test will provide targeted feedback to help students learn from their mistakes</li>
              )}
              <li>• Review the misconception categories to ensure comprehensive coverage</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
