
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Award, AlertCircle } from 'lucide-react';
import type { ImprovementSummary as ImprovementSummaryType } from '@/services/studentResultsHistoryService';

interface ImprovementSummaryProps {
  summary: ImprovementSummaryType;
  className?: string;
}

export function ImprovementSummary({ summary, className = '' }: ImprovementSummaryProps) {
  const improvementPercentage = summary.total_skills_practiced > 0 
    ? (summary.skills_improved / summary.total_skills_practiced) * 100 
    : 0;

  const resolutionPercentage = summary.total_misconceptions > 0
    ? (summary.misconceptions_resolved / summary.total_misconceptions) * 100
    : 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Skills Improvement */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Skills Improved</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-blue-600">
                  {summary.skills_improved}
                </span>
                <span className="text-sm text-gray-500">
                  / {summary.total_skills_practiced}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{improvementPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={improvementPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Average Improvement */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Improvement</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-2xl font-bold text-green-600">
                  {summary.average_improvement > 0 ? '+' : ''}
                  {summary.average_improvement.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <Badge 
              className={`text-xs ${
                summary.average_improvement > 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {summary.average_improvement > 0 ? 'Trending Up' : 'Stable'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Misconceptions Resolved */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Misconceptions Resolved</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-purple-600">
                  {summary.misconceptions_resolved}
                </span>
                <span className="text-sm text-gray-500">
                  / {summary.total_misconceptions}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Resolution Rate</span>
              <span>{resolutionPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={resolutionPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Top Achievement */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Most Improved</p>
              <div className="mt-1">
                <span className="text-sm font-bold text-yellow-600 truncate block">
                  {summary.most_improved_skill}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
              🏆 Top Performer
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
