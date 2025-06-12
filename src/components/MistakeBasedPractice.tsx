
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  PlayCircle, 
  CheckCircle2,
  AlertTriangle,
  BookOpen
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MisconceptionPattern {
  id: string;
  concept: string;
  description: string;
  frequency: number;
  lastSeen: string;
  severity: 'low' | 'medium' | 'high';
  subject: string;
  practiceGenerated: boolean;
}

interface MistakeBasedPracticeProps {
  studentId: string;
}

export function MistakeBasedPractice({ studentId }: MistakeBasedPracticeProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  // Fetch misconception patterns for the student
  const { data: patterns = [], isLoading } = useQuery({
    queryKey: ['misconceptionPatterns', studentId],
    queryFn: async () => {
      // Mock data based on student's learning patterns
      const mockPatterns: MisconceptionPattern[] = [
        {
          id: '1',
          concept: 'Quadratic Function Vertex',
          description: 'Difficulty identifying vertex form and transformations',
          frequency: 8,
          lastSeen: '2 days ago',
          severity: 'high',
          subject: 'Mathematics',
          practiceGenerated: false
        },
        {
          id: '2',
          concept: 'Geographic Scale Analysis',
          description: 'Confusion between map scale and real-world distances',
          frequency: 5,
          lastSeen: '1 week ago',
          severity: 'medium',
          subject: 'Geography',
          practiceGenerated: true
        },
        {
          id: '3',
          concept: 'Literary Device Identification',
          description: 'Mixing up metaphors and similes in analysis',
          frequency: 3,
          lastSeen: '3 days ago',
          severity: 'low',
          subject: 'English',
          practiceGenerated: false
        }
      ];
      return mockPatterns;
    },
  });

  const handleGeneratePractice = async (patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;

    try {
      // Generate targeted practice exercise
      console.log(`Generating practice for misconception: ${pattern.concept}`);
      // This would call the AI service to generate targeted exercises
      
      // Update pattern status
      const updatedPatterns = patterns.map(p => 
        p.id === patternId ? { ...p, practiceGenerated: true } : p
      );
      
      console.log('Practice exercise generated successfully');
    } catch (error) {
      console.error('Error generating practice:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Practice Based on Mistakes
        </CardTitle>
        <p className="text-sm text-gray-600">
          Targeted practice exercises to address your common misconceptions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {patterns.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Great Work!</h3>
            <p className="text-gray-600">No significant misconception patterns detected.</p>
          </div>
        ) : (
          patterns.map((pattern) => (
            <div key={pattern.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">{pattern.concept}</h4>
                    <Badge className={getSeverityColor(pattern.severity)}>
                      {pattern.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {pattern.subject}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Frequency: {pattern.frequency} times</span>
                    <span>Last seen: {pattern.lastSeen}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {pattern.practiceGenerated ? (
                    <Button size="sm" variant="outline" className="text-green-600 border-green-200">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Practice Ready
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleGeneratePractice(pattern.id)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Generate Practice
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Improvement Progress</span>
                  <span>{Math.max(0, 100 - pattern.frequency * 10)}%</span>
                </div>
                <Progress 
                  value={Math.max(0, 100 - pattern.frequency * 10)} 
                  className="h-2"
                />
              </div>
            </div>
          ))
        )}
        
        {patterns.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Improvement Tips</h4>
                <p className="text-sm text-blue-800">
                  Focus on your high-severity misconceptions first. Regular practice with 
                  generated exercises will help solidify correct understanding.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
