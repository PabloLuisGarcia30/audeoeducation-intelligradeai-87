
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Brain, 
  MessageCircle,
  BarChart3,
  Calendar,
  Award,
  Activity
} from "lucide-react";

interface MetricData {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  category: 'mastery' | 'engagement' | 'prediction' | 'retention' | 'recommendation';
}

interface MetricsDashboardProps {
  studentId: string;
}

export function MetricsDashboard({ studentId }: MetricsDashboardProps) {
  const [timeFrame, setTimeFrame] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  useEffect(() => {
    // Mock metrics data based on Pablo's performance
    const mockMetrics: MetricData[] = [
      {
        id: '1',
        name: 'Time to Skill Mastery',
        value: 12.5,
        previousValue: 16.2,
        unit: 'days',
        trend: 'up',
        category: 'mastery'
      },
      {
        id: '2',
        name: 'AI Coach Engagement',
        value: 8.5,
        previousValue: 6.2,
        unit: 'sessions/week',
        trend: 'up',
        category: 'engagement'
      },
      {
        id: '3',
        name: 'Difficulty Prediction Accuracy',
        value: 87,
        previousValue: 82,
        unit: '%',
        trend: 'up',
        category: 'prediction'
      },
      {
        id: '4',
        name: 'Learning Retention Rate',
        value: 92,
        previousValue: 88,
        unit: '%',
        trend: 'up',
        category: 'retention'
      },
      {
        id: '5',
        name: 'Practice Recommendation Effectiveness',
        value: 78,
        previousValue: 71,
        unit: '%',
        trend: 'up',
        category: 'recommendation'
      },
      {
        id: '6',
        name: 'Average Session Duration',
        value: 24,
        previousValue: 28,
        unit: 'minutes',
        trend: 'up',
        category: 'engagement'
      }
    ];
    setMetrics(mockMetrics);
  }, [timeFrame]);

  const getMetricsByCategory = (category: string) => {
    return metrics.filter(metric => metric.category === category);
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
  };

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-600';
  };

  const getPercentageChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return Math.abs(change).toFixed(1);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mastery': return Target;
      case 'engagement': return MessageCircle;
      case 'prediction': return Brain;
      case 'retention': return Award;
      case 'recommendation': return BarChart3;
      default: return Activity;
    }
  };

  const categoryData = [
    { key: 'mastery', name: 'Skill Mastery', color: 'bg-blue-500' },
    { key: 'engagement', name: 'Engagement', color: 'bg-green-500' },
    { key: 'prediction', name: 'AI Accuracy', color: 'bg-purple-500' },
    { key: 'retention', name: 'Retention', color: 'bg-orange-500' },
    { key: 'recommendation', name: 'Recommendations', color: 'bg-indigo-500' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Learning Analytics</h2>
          <p className="text-slate-600">Track your progress and AI Coach effectiveness</p>
        </div>
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly'].map((period) => (
            <Badge
              key={period}
              variant={timeFrame === period ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setTimeFrame(period as any)}
            >
              <Calendar className="h-3 w-3 mr-1" />
              {period}
            </Badge>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.slice(0, 3).map((metric) => {
          const TrendIcon = getTrendIcon(metric.trend);
          return (
            <Card key={metric.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {getPercentageChange(metric.value, metric.previousValue)}%
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{metric.name}</h3>
                <div className="text-2xl font-bold text-slate-900">
                  {metric.value} <span className="text-sm font-normal text-slate-600">{metric.unit}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  vs {metric.previousValue} {metric.unit} last {timeFrame}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Metrics by Category */}
      <Tabs defaultValue="mastery" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {categoryData.map((category) => {
            const IconComponent = getCategoryIcon(category.key);
            return (
              <TabsTrigger key={category.key} value={category.key} className="flex items-center gap-2">
                <IconComponent className="h-4 w-4" />
                {category.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categoryData.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getMetricsByCategory(category.key).map((metric) => {
                const TrendIcon = getTrendIcon(metric.trend);
                const IconComponent = getCategoryIcon(category.key);
                
                return (
                  <Card key={metric.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center`}>
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <CardTitle className="text-lg">{metric.name}</CardTitle>
                        </div>
                        <div className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {getPercentageChange(metric.value, metric.previousValue)}%
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="text-3xl font-bold text-slate-900 mb-1">
                            {metric.value} 
                            <span className="text-lg font-normal text-slate-600 ml-1">{metric.unit}</span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Previous {timeFrame}: {metric.previousValue} {metric.unit}
                          </p>
                        </div>
                        
                        {metric.unit === '%' && (
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Progress</span>
                              <span>{metric.value}%</span>
                            </div>
                            <Progress value={metric.value} className="h-2" />
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <h4 className="font-medium mb-2">Insights</h4>
                          <p className="text-sm text-slate-600">
                            {metric.trend === 'up' && metric.value > metric.previousValue
                              ? `Great improvement! Your ${metric.name.toLowerCase()} has increased by ${getPercentageChange(metric.value, metric.previousValue)}%.`
                              : metric.trend === 'down'
                              ? `This metric needs attention. Consider adjusting your learning approach.`
                              : 'Maintaining steady progress in this area.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
