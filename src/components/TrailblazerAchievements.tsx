
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Trophy, 
  Star, 
  Target, 
  Flame,
  Brain,
  Clock,
  TrendingUp
} from "lucide-react";
import { useTrailblazer } from "@/hooks/useTrailblazer";

const achievementIcons: Record<string, any> = {
  trophy: Trophy,
  star: Star,
  target: Target,
  flame: Flame,
  brain: Brain,
  clock: Clock,
  trending: TrendingUp,
  default: Award
};

export const TrailblazerAchievements = () => {
  const { achievements, isLoading } = useTrailblazer();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Complete learning sessions to unlock achievements!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const IconComponent = achievementIcons[achievement.icon_name || 'default'];
            
            return (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200"
              >
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <IconComponent className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{achievement.achievement_name}</h4>
                  {achievement.description && (
                    <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                  )}
                  <Badge variant="outline" className="mt-1 text-xs text-yellow-700 border-yellow-300">
                    {achievement.achievement_type}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
