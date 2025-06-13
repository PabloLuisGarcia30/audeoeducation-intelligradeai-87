
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Clock, Eye, BookOpen } from 'lucide-react';
import { SupercoachService } from '@/services/supercoachService';

interface MiniLessonProps {
  misconceptionSubtypeId: string;
  studentId: string;
  onLessonGenerated?: (lesson: any) => void;
  className?: string;
}

export function SupercoachMiniLesson({ 
  misconceptionSubtypeId, 
  studentId, 
  onLessonGenerated,
  className = ''
}: MiniLessonProps) {
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateAdaptiveLesson = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get basic learning profile (you might want to enhance this)
      const learningProfile = {
        preferredExplanationStyle: 'textual' as const,
        difficultyPreference: 'standard' as const,
        learningPace: 'normal' as const,
        commonMisconceptionPatterns: [],
        strengths: [],
        weaknesses: []
      };

      const generatedLesson = await SupercoachService.generateAdaptiveMiniLesson(
        studentId,
        misconceptionSubtypeId,
        learningProfile,
        { trigger: 'student_button_click' }
      );

      if (generatedLesson) {
        setLesson(generatedLesson);
        
        // Mark as viewed
        await SupercoachService.markMiniLessonViewed(generatedLesson.id);
        
        if (onLessonGenerated) {
          onLessonGenerated(generatedLesson);
        }
      } else {
        setError('Failed to generate mini-lesson. Please try again.');
      }
    } catch (err) {
      console.error('Error generating mini-lesson:', err);
      setError('An error occurred while generating the mini-lesson.');
    } finally {
      setLoading(false);
    }
  };

  if (lesson) {
    return (
      <Card className={`${className} border-green-200 bg-green-50`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg text-green-800">
              AI Supercoach Mini-Lesson
            </CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Personalized help for this misconception
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
          
          <div className="flex items-center gap-2 pt-2 border-t border-green-200">
            <Badge variant="secondary" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              {lesson.difficultyLevel}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Generated {new Date(lesson.generatedAt).toLocaleString()}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Viewed
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-blue-200 bg-blue-50`}>
      <CardContent className="p-6 text-center">
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Lightbulb className="h-8 w-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              Need Help Understanding This?
            </h3>
            <p className="text-blue-700 text-sm mb-4">
              Get a personalized mini-lesson from your AI Supercoach to help you understand this concept better.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <Button 
            onClick={generateAdaptiveLesson}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Generating Lesson...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Get Adaptive Mini-Lesson
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
