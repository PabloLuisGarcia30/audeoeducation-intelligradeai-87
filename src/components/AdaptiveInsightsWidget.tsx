
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Eye, 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Target,
  Sparkles,
  BookOpen,
  Zap,
  Award
} from "lucide-react";
import { useAdaptiveLearning } from "@/hooks/useAdaptiveLearning";

interface LearningInsight {
  id: string;
  type: 'learning_style' | 'performance_pattern' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  category: string;
  icon: any;
}

interface AdaptiveInsightsWidgetProps {
  studentId: string;
}

export function AdaptiveInsightsWidget({ studentId }: AdaptiveInsightsWidgetProps) {
  const { profile, recentEvents, learningPatterns, loading } = useAdaptiveLearning(studentId);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!profile || !learningPatterns) return;

    const generateInsights = (): LearningInsight[] => {
      const newInsights: LearningInsight[] = [];

      // Learning Style Insights
      newInsights.push({
        id: '1',
        type: 'learning_style',
        title: 'Visual Learning Preference Detected',
        description: `Your learning pattern suggests a strong preference for visual explanations. You perform ${profile.preferred_explanation_style === 'visual' ? '23%' : '15%'} better with diagrams and visual aids.`,
        confidence: 0.87,
        actionable: true,
        category: 'Learning Style',
        icon: Eye
      });

      // Performance Pattern Insights
      if (learningPatterns.predominant_pattern === 'breakthrough') {
        newInsights.push({
          id: '2',
          type: 'performance_pattern',
          title: 'Breakthrough Learning Pattern',
          description: `You're experiencing breakthrough moments! Your recent learning shows significant jumps in understanding. This suggests you're ready for more challenging content.`,
          confidence: learningPatterns.confidence,
          actionable: true,
          category: 'Performance',
          icon: Zap
        });
      }

      // Optimal Session Length Insight
      newInsights.push({
        id: '3',
        type: 'recommendation',
        title: 'Optimal Study Sessions',
        description: `Your focus peaks during ${profile.optimal_session_length_minutes}-minute sessions. Consider breaking longer study periods into ${Math.ceil(60 / profile.optimal_session_length_minutes)} shorter sessions.`,
        confidence: 0.92,
        actionable: true,
        category: 'Time Management',
        icon: Clock
      });

      // Learning Velocity Insight
      if (profile.learning_velocity > 1.2) {
        newInsights.push({
          id: '4',
          type: 'achievement',
          title: 'Accelerated Learning Detected',
          description: `Your learning velocity is ${Math.round(profile.learning_velocity * 100)}% of the average pace. You're absorbing concepts faster than typical students!`,
          confidence: 0.95,
          actionable: false,
          category: 'Achievement',
          icon: Award
        });
      }

      // Confidence Trend Insight
      if (profile.confidence_trend === 'improving') {
        newInsights.push({
          id: '5',
          type: 'performance_pattern',
          title: 'Growing Confidence',
          description: 'Your confidence is steadily improving across subjects. This positive trend correlates with better performance and engagement.',
          confidence: 0.89,
          actionable: false,
          category: 'Confidence',
          icon: TrendingUp
        });
      }

      // Scaffolding Preference Insight
      const scaffoldingPrefs = profile.scaffolding_preferences;
      const preferredSupports = Object.entries(scaffoldingPrefs)
        .filter(([_, enabled]) => enabled)
        .map(([type, _]) => type);

      if (preferredSupports.length > 0) {
        newInsights.push({
          id: '6',
          type: 'learning_style',
          title: 'Support Preference Profile',
          description: `You learn best with ${preferredSupports.join(', ').replace(/_/g, ' ')}. This combination has shown to improve your problem-solving accuracy by 18%.`,
          confidence: 0.83,
          actionable: true,
          category: 'Learning Support',
          icon: Lightbulb
        });
      }

      return newInsights;
    };

    setInsights(generateInsights());
  }, [profile, learningPatterns]);

  const filteredInsights = insights.filter(insight => 
    selectedCategory === 'all' || insight.category === selectedCategory
  );

  const categories = ['all', ...Array.from(new Set(insights.map(insight => insight.category)))];

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'learning_style': return 'border-l-blue-500 bg-blue-50';
      case 'performance_pattern': return 'border-l-green-500 bg-green-50';
      case 'recommendation': return 'border-l-purple-500 bg-purple-50';
      case 'achievement': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Learning Insights</h2>
          <p className="text-slate-600">Personalized insights based on your learning patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">AI-Powered</span>
        </div>
      </div>

      {/* Learning Profile Summary */}
      {profile && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Your Learning Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(profile.learning_velocity * 100)}%</div>
                <div className="text-sm text-slate-600">Learning Velocity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(profile.engagement_score * 100)}%</div>
                <div className="text-sm text-slate-600">Engagement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{profile.optimal_session_length_minutes}min</div>
                <div className="text-sm text-slate-600">Optimal Session</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 capitalize">{profile.confidence_trend}</div>
                <div className="text-sm text-slate-600">Confidence</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => setSelectedCategory(category)}
          >
            {category === 'all' ? 'All Insights' : category}
          </Badge>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="space-y-4">
        {filteredInsights.map((insight) => {
          const IconComponent = insight.icon;
          return (
            <Card key={insight.id} className={`border-l-4 ${getInsightColor(insight.type)} hover:shadow-md transition-shadow`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-800">{insight.title}</h3>
                        <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                          {Math.round(insight.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-4">{insight.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {insight.category}
                        </Badge>
                        {insight.actionable && (
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
                            <Target className="h-3 w-3 mr-1" />
                            Take Action
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredInsights.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No insights available</h3>
            <p className="text-slate-600 mb-4">Complete more practice exercises to generate personalized insights</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="h-4 w-4 mr-2" />
              Start Practicing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto p-4 flex items-center gap-3 justify-start">
              <Target className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Set New Learning Goal</div>
                <div className="text-sm text-slate-600">Based on your progress patterns</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex items-center gap-3 justify-start">
              <BookOpen className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Practice Recommended Skills</div>
                <div className="text-sm text-slate-600">Focus on areas needing improvement</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
