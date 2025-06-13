
import { ClassProgressHeatmap } from "@/components/ClassProgressHeatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  Brain,
  Target
} from "lucide-react";
import { useState } from "react";

interface EnhancedTeacherAnalyticsProps {
  classId: string;
  className?: string;
}

export function EnhancedTeacherAnalytics({ classId, className }: EnhancedTeacherAnalyticsProps) {
  const [selectedView, setSelectedView] = useState('heatmap');

  const handleExportClassData = () => {
    // Export functionality for class analytics
    console.log('Exporting class analytics...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Class Analytics Dashboard</h2>
          <p className="text-slate-600">
            Comprehensive insights into student progress and performance patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heatmap">Progress Heatmap</SelectItem>
              <SelectItem value="trends">Trend Analysis</SelectItem>
              <SelectItem value="interventions">Intervention Alerts</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleExportClassData}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {selectedView === 'heatmap' && (
        <ClassProgressHeatmap classId={classId} className={className} />
      )}

      {selectedView === 'interventions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recommended Interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-800">Students Struggling with Algebra</h4>
                    <p className="text-sm text-red-600 mt-1">
                      3 students showing consistent difficulty with quadratic equations
                    </p>
                  </div>
                  <Badge variant="destructive">High Priority</Badge>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="text-red-600 border-red-600">
                    <Target className="h-3 w-3 mr-1" />
                    Create Targeted Practice
                  </Button>
                </div>
              </div>

              <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-yellow-800">Inconsistent Performance</h4>
                    <p className="text-sm text-yellow-600 mt-1">
                      2 students showing high variability in geometry skills
                    </p>
                  </div>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium Priority</Badge>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-600">
                    <Brain className="h-3 w-3 mr-1" />
                    Schedule Review Session
                  </Button>
                </div>
              </div>

              <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-800">Ready for Advanced Content</h4>
                    <p className="text-sm text-green-600 mt-1">
                      5 students consistently scoring 90%+ across all topics
                    </p>
                  </div>
                  <Badge variant="outline" className="border-green-500 text-green-700">Enrichment</Badge>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Assign Challenge Problems
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
