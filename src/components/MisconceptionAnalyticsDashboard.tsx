
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Users, BookOpen } from 'lucide-react';
import { MisconceptionLoggingService } from '@/services/misconceptionLoggingService';
import { EnhancedPracticeAnswerKeyService } from '@/services/enhancedPracticeAnswerKeyService';

interface Props {
  classId?: string;
  skillName?: string;
  timeframe?: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export function MisconceptionAnalyticsDashboard({ classId, skillName, timeframe = 30 }: Props) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [questionStats, setQuestionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [classId, skillName, timeframe]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [analyticsData, questionStatsData] = await Promise.all([
        MisconceptionLoggingService.getMisconceptionAnalytics({ classId, skillName, timeframe }),
        EnhancedPracticeAnswerKeyService.getMisconceptionStatistics({ skillName, timeframe })
      ]);

      setAnalytics(analyticsData);
      setQuestionStats(questionStatsData);
    } catch (error) {
      console.error('Error loading misconception analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const categoryData = analytics?.categories ? Object.entries(analytics.categories).map(([name, count]) => ({
    name: name.replace(' Errors', ''),
    count
  })) : [];

  const subtypeData = analytics?.misconceptionCounts ? Object.entries(analytics.misconceptionCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([name, count]) => ({ name, count })) : [];

  const annotationRate = questionStats ? 
    Math.round((questionStats.questionsWithMisconceptions / Math.max(questionStats.totalQuestions, 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">Total Misconceptions</span>
            </div>
            <div className="text-2xl font-bold mt-2">{analytics?.totalMisconceptions || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Last {timeframe} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Questions Annotated</span>
            </div>
            <div className="text-2xl font-bold mt-2">{questionStats?.questionsWithMisconceptions || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              {annotationRate}% of total questions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Categories Tracked</span>
            </div>
            <div className="text-2xl font-bold mt-2">{Object.keys(analytics?.categories || {}).length}</div>
            <div className="text-xs text-gray-500 mt-1">Misconception types</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Annotation Rate</span>
            </div>
            <div className="text-2xl font-bold mt-2">{annotationRate}%</div>
            <Progress value={annotationRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Misconception Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Misconception Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-12">
                No misconception data available for the selected timeframe
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Misconception Subtypes */}
        <Card>
          <CardHeader>
            <CardTitle>Most Common Misconception Subtypes</CardTitle>
          </CardHeader>
          <CardContent>
            {subtypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subtypeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-12">
                No misconception subtypes data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      {Object.keys(analytics?.categories || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Misconception Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.categories).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{category}</Badge>
                    <span className="text-sm text-gray-600">
                      {category === 'Procedural Errors' && 'Step-by-step execution issues'}
                      {category === 'Conceptual Errors' && 'Fundamental understanding gaps'}
                      {category === 'Interpretive Errors' && 'Question/content misunderstanding'}
                      {category === 'Expression Errors' && 'Communication and formatting issues'}
                      {category === 'Strategic Errors' && 'Wrong approach or method choice'}
                      {category === 'Meta-Cognitive Errors' && 'Self-awareness and reflection gaps'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count as number}</span>
                    <span className="text-xs text-gray-500">occurrences</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
