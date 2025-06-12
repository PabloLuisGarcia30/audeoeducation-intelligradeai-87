
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, 
  Trophy, 
  Target, 
  Clock,
  TrendingUp,
  Star
} from "lucide-react";
import { useTrailblazer } from "@/hooks/useTrailblazer";

export const TrailblazerStats = () => {
  const { streak, concepts, achievements, isLoading } = useTrailblazer();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalTimeSpent = concepts.reduce((sum, concept) => sum + concept.time_spent_minutes, 0);
  const averageMastery = concepts.length > 0 
    ? concepts.reduce((sum, concept) => sum + concept.mastery_score, 0) / concepts.length 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Current Streak */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-lg">Current Streak</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {streak?.current_streak_days || 0}
          </div>
          <p className="text-sm text-gray-600">
            Days in a row
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              Best: {streak?.longest_streak_days || 0} days
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Total Sessions */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Total Sessions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {streak?.total_sessions || 0}
          </div>
          <p className="text-sm text-gray-600">
            Learning sessions completed
          </p>
        </CardContent>
      </Card>

      {/* Time Invested */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Time Invested</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {Math.round(totalTimeSpent / 60)}h
          </div>
          <p className="text-sm text-gray-600">
            {totalTimeSpent} minutes total
          </p>
        </CardContent>
      </Card>

      {/* Average Mastery */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Avg. Mastery</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {Math.round(averageMastery)}%
          </div>
          <p className="text-sm text-gray-600">
            Across {concepts.length} concepts
          </p>
          <Progress value={averageMastery} className="mt-2 h-2" />
        </CardContent>
      </Card>
    </div>
  );
};
