
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, BookOpen, Target } from 'lucide-react';

interface MisconceptionData {
  misconceptionCategory: string;
  misconceptionSubtype: string;
  description: string;
  confidence: number;
}

interface Props {
  questionId: string;
  selectedOption: string;
  isIncorrect: boolean;
  misconceptionData?: MisconceptionData;
  onRetry?: () => void;
}

export function MisconceptionFeedback({ 
  questionId, 
  selectedOption, 
  isIncorrect, 
  misconceptionData,
  onRetry 
}: Props) {
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    if (isIncorrect && misconceptionData) {
      generateFeedback(misconceptionData);
    }
  }, [isIncorrect, misconceptionData]);

  const generateFeedback = (data: MisconceptionData) => {
    const feedbackMap: Record<string, string> = {
      'Procedural Errors': `It looks like there might be a step or procedure that needs attention. ${data.description}. Try reviewing the steps carefully.`,
      'Conceptual Errors': `This seems to involve a concept that might need clarification. ${data.description}. Consider reviewing the underlying principle.`,
      'Interpretive Errors': `The question interpretation might be the issue here. ${data.description}. Try reading the question more carefully.`,
      'Expression Errors': `This might be about how the answer is expressed. ${data.description}. Focus on clear communication of your thinking.`,
      'Strategic Errors': `The approach or strategy might need adjustment. ${data.description}. Consider trying a different method.`,
      'Meta-Cognitive Errors': `This involves thinking about your thinking. ${data.description}. Take a moment to reflect on your approach.`
    };

    setFeedback(feedbackMap[data.misconceptionCategory] || `${data.description}. Review this concept and try again.`);
  };

  if (!isIncorrect || !misconceptionData) {
    return null;
  }

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'Procedural Errors':
      case 'Strategic Errors':
        return <Target className="h-4 w-4" />;
      case 'Conceptual Errors':
      case 'Expression Errors':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50">
      <CardContent className="pt-4">
        <Alert className="border-orange-300">
          <div className="flex items-start gap-3">
            {getIconForCategory(misconceptionData.misconceptionCategory)}
            <div className="flex-1">
              <div className="font-medium text-orange-800 mb-1">
                Common Mistake: {misconceptionData.misconceptionSubtype}
              </div>
              <AlertDescription className="text-orange-700">
                {feedback}
              </AlertDescription>
              <div className="mt-3 text-xs text-orange-600">
                Category: {misconceptionData.misconceptionCategory} 
                {misconceptionData.confidence && (
                  <span className="ml-2">
                    (Confidence: {Math.round(misconceptionData.confidence * 100)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </Alert>
        
        {onRetry && (
          <div className="mt-3 text-center">
            <button
              onClick={onRetry}
              className="text-orange-700 hover:text-orange-800 underline text-sm"
            >
              Try a similar question to practice this concept
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
