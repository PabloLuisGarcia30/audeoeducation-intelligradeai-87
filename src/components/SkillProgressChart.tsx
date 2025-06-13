
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SkillProgressData } from '@/services/studentResultsHistoryService';

interface SkillProgressChartProps {
  skillData: SkillProgressData[];
  className?: string;
}

export function SkillProgressChart({ skillData, className = '' }: SkillProgressChartProps) {
  // Transform data for chart
  const chartData = skillData.map(skill => ({
    name: skill.skill_name,
    latest_score: skill.latest_score,
    best_score: skill.best_score,
    improvement: skill.improvement_percentage,
    attempts: skill.attempts[0] || 0
  }));

  const getTrendIcon = (improvement: number) => {
    if (improvement > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (improvement < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (improvement: number) => {
    if (improvement > 5) return 'bg-green-100 text-green-800';
    if (improvement < -5) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Skill Progress Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        {skillData.length > 0 ? (
          <div className="space-y-6">
            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="latest_score" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Current Score"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="best_score" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Best Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Skill Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Skill Performance Summary</h4>
              <div className="grid gap-3">
                {skillData.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{skill.skill_name}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {skill.skill_type}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          {skill.attempts[0] || 0} attempts
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {skill.latest_score}% / {skill.best_score}%
                        </div>
                        <div className="text-xs text-gray-600">Current / Best</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(skill.improvement_percentage)}
                        <Badge className={`text-xs ${getTrendColor(skill.improvement_percentage)}`}>
                          {skill.improvement_percentage > 0 ? '+' : ''}{skill.improvement_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Skill Data Available</h3>
            <p>Start practicing to see your progress here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
