
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Download, 
  ArrowLeft,
  Calendar,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SkillProgressChart } from '@/components/SkillProgressChart';
import { MisconceptionTimeline } from '@/components/MisconceptionTimeline';
import { ImprovementSummary } from '@/components/ImprovementSummary';
import { ResultsFilter } from '@/components/ResultsFilter';
import { DashboardHeader } from '@/components/DashboardHeader';
import { 
  StudentResultsHistoryService,
  type SkillProgressData,
  type MisconceptionTrendData,
  type ImprovementSummary as ImprovementSummaryType
} from '@/services/studentResultsHistoryService';

export default function StudentResultsHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [skillData, setSkillData] = useState<SkillProgressData[]>([]);
  const [misconceptionData, setMisconceptionData] = useState<MisconceptionTrendData[]>([]);
  const [summaryData, setSummaryData] = useState<ImprovementSummaryType>({
    total_skills_practiced: 0,
    skills_improved: 0,
    average_improvement: 0,
    misconceptions_resolved: 0,
    total_misconceptions: 0,
    most_improved_skill: 'None',
    most_problematic_misconception: 'None'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Pablo Luis Garcia test student ID (from StudentDashboard.tsx)
  const studentId = user?.id || 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26';

  useEffect(() => {
    loadResultsData();
  }, [studentId]);

  const loadResultsData = async (days: number = 30) => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      
      const [skills, misconceptions, summary] = await Promise.all([
        StudentResultsHistoryService.getSkillProgressionData(studentId, days),
        StudentResultsHistoryService.getMisconceptionTrends(studentId, days),
        StudentResultsHistoryService.getImprovementSummary(studentId, days)
      ]);
      
      setSkillData(skills);
      setMisconceptionData(misconceptions);
      setSummaryData(summary);
    } catch (error) {
      console.error('Error loading results data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters: any) => {
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      'all': 365
    };
    
    const days = daysMap[filters.dateRange] || 30;
    loadResultsData(days);
  };

  const handleExport = () => {
    // Simple export functionality - in a real app this would generate a PDF or CSV
    const exportData = {
      summary: summaryData,
      skills: skillData,
      misconceptions: misconceptionData,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `results-history-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading your results history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/student-dashboard/main')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <DashboardHeader 
              title="Results History" 
              subtitle="Track your learning progress and improvements over time"
            />
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Improvement Summary */}
        <div className="mb-8">
          <ImprovementSummary summary={summaryData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <ResultsFilter onFilterChange={handleFilterChange} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="skills">Skills Progress</TabsTrigger>
                <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">{summaryData.total_skills_practiced}</div>
                        <div className="text-sm text-slate-600">Skills Practiced</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6 text-center">
                        <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">
                          {summaryData.average_improvement > 0 ? '+' : ''}{summaryData.average_improvement.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-600">Avg Improvement</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">
                          {summaryData.total_misconceptions > 0 ? 
                            ((summaryData.misconceptions_resolved / summaryData.total_misconceptions) * 100).toFixed(0) : 
                            0
                          }%
                        </div>
                        <div className="text-sm text-slate-600">Misconceptions Resolved</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overview Charts */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <SkillProgressChart skillData={skillData.slice(0, 5)} />
                    <MisconceptionTimeline misconceptions={misconceptionData.slice(0, 3)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="skills">
                <SkillProgressChart skillData={skillData} />
              </TabsContent>

              <TabsContent value="misconceptions">
                <MisconceptionTimeline misconceptions={misconceptionData} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
