
import { StudentProgressChart } from "@/components/StudentProgressChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Award, 
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";

interface EnhancedStudentProgressTabProps {
  studentId: string;
  studentName?: string;
}

export function EnhancedStudentProgressTab({ studentId, studentName }: EnhancedStudentProgressTabProps) {
  const handleExportProgress = () => {
    // Export functionality - could generate PDF or CSV
    console.log('Exporting progress data...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Progress Analytics</h2>
          <p className="text-slate-600">
            {studentName ? `Detailed progress tracking for ${studentName}` : 'Track your learning progress and improvements'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportProgress}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="30days" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
          <TabsTrigger value="90days">Last 90 Days</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value="7days">
          <StudentProgressChart studentId={studentId} timeRange={7} />
        </TabsContent>

        <TabsContent value="30days">
          <StudentProgressChart studentId={studentId} timeRange={30} />
        </TabsContent>

        <TabsContent value="90days">
          <StudentProgressChart studentId={studentId} timeRange={90} />
        </TabsContent>

        <TabsContent value="all">
          <StudentProgressChart studentId={studentId} timeRange={365} />
        </TabsContent>
      </Tabs>

      {/* Achievement Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Award className="h-6 w-6 text-yellow-500" />
              <div>
                <h4 className="font-medium">Consistency Champion</h4>
                <p className="text-sm text-slate-600">Practiced for 7 consecutive days</p>
              </div>
              <Badge variant="outline" className="ml-auto">
                <Calendar className="h-3 w-3 mr-1" />
                This Week
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <div>
                <h4 className="font-medium">Improvement Streak</h4>
                <p className="text-sm text-slate-600">Improved accuracy in 5 skills this month</p>
              </div>
              <Badge variant="outline" className="ml-auto">
                <Calendar className="h-3 w-3 mr-1" />
                This Month
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
