
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, BookOpen, Target, CheckCircle, HelpCircle } from 'lucide-react';

interface ActivitySimulatorProps {
  onMisconceptionGenerated?: (type: string) => void;
  sessionFocus: string;
}

export function TrailblazerActivitySimulator({ onMisconceptionGenerated, sessionFocus }: ActivitySimulatorProps) {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const mockQuestions = [
    {
      id: 1,
      text: `Solve for x: 2x + 5 = 13`,
      type: 'algebra',
      difficulty: 'easy'
    },
    {
      id: 2,
      text: `Find the area of a triangle with base 8 and height 6`,
      type: 'geometry',
      difficulty: 'medium'
    },
    {
      id: 3,
      text: `Simplify: (3x + 2)(x - 4)`,
      type: 'algebra',
      difficulty: 'medium'
    }
  ];

  const handleAnswer = (correct: boolean) => {
    setAttempts(prev => prev + 1);
    
    if (correct) {
      setScore(prev => prev + 1);
      setCurrentQuestion(prev => Math.min(prev + 1, mockQuestions.length));
    } else {
      // Generate misconception
      onMisconceptionGenerated?.(`${mockQuestions[currentQuestion - 1]?.type}_error`);
    }
  };

  const currentQ = mockQuestions[currentQuestion - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          Practice Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Badge variant="outline">Question {currentQuestion} of {mockQuestions.length}</Badge>
          <Badge variant={score >= currentQuestion - 1 ? 'default' : 'secondary'}>
            Score: {score}/{attempts}
          </Badge>
        </div>

        {currentQ && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Practice Problem</h3>
                <p className="text-gray-700">{currentQ.text}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => handleAnswer(true)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Correct Answer
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleAnswer(false)}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Incorrect Answer
              </Button>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Focused on: <span className="font-medium">{sessionFocus}</span>
        </div>
      </CardContent>
    </Card>
  );
}
