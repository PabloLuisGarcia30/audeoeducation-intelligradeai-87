
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, RotateCcw } from 'lucide-react';

interface FilterState {
  dateRange: '7d' | '30d' | '90d' | 'all';
  skillType: 'all' | 'content' | 'subject';
  sessionType: 'all' | 'class_session' | 'trailblazer' | 'home_learner' | 'practice';
}

interface ResultsFilterProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

export function ResultsFilter({ onFilterChange, className = '' }: ResultsFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '30d',
    skillType: 'all',
    sessionType: 'all'
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      dateRange: '30d',
      skillType: 'all',
      sessionType: 'all'
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case 'all': return 'All time';
      default: return 'Last 30 days';
    }
  };

  const activeFiltersCount = Object.values(filters).filter(value => value !== 'all' && value !== '30d').length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            Filter Results
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Time Period</label>
          <Select 
            value={filters.dateRange} 
            onValueChange={(value) => handleFilterChange('dateRange', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Skill Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Skill Type</label>
          <Select 
            value={filters.skillType} 
            onValueChange={(value) => handleFilterChange('skillType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              <SelectItem value="content">Content Skills</SelectItem>
              <SelectItem value="subject">Subject Skills</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Session Type</label>
          <Select 
            value={filters.sessionType} 
            onValueChange={(value) => handleFilterChange('sessionType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="class_session">Class Sessions</SelectItem>
              <SelectItem value="practice">Practice Exercises</SelectItem>
              <SelectItem value="trailblazer">Trailblazer</SelectItem>
              <SelectItem value="home_learner">Home Learning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Active Filters</label>
            <div className="flex flex-wrap gap-2">
              {filters.dateRange !== '30d' && (
                <Badge variant="secondary" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {getDateRangeLabel(filters.dateRange)}
                </Badge>
              )}
              {filters.skillType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {filters.skillType === 'content' ? 'Content Skills' : 'Subject Skills'}
                </Badge>
              )}
              {filters.sessionType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {filters.sessionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Reset Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetFilters}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  );
}
