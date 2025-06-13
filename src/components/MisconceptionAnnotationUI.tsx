
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';

interface MisconceptionOption {
  correct?: boolean;
  misconceptionCategory?: string;
  misconceptionSubtype?: string;
  description?: string;
  confidence?: number;
}

interface Props {
  questionOptions: string[];
  correctAnswer: string;
  choiceMisconceptions: Record<string, MisconceptionOption>;
  onMisconceptionChange: (misconceptions: Record<string, MisconceptionOption>) => void;
}

const MISCONCEPTION_CATEGORIES = [
  'Procedural Errors',
  'Conceptual Errors', 
  'Interpretive Errors',
  'Expression Errors',
  'Strategic Errors',
  'Meta-Cognitive Errors'
];

const MISCONCEPTION_SUBTYPES = {
  'Procedural Errors': ['Step Omission', 'Step Order Error', 'Symbol Confusion', 'Partial Completion', 'Flawed Memorized Routine'],
  'Conceptual Errors': ['False Assumption', 'Category Confusion', 'Causal Misunderstanding', 'Overgeneralization', 'Model Misuse'],
  'Interpretive Errors': ['Keyword Confusion', 'Ambiguity Blindness', 'Literal Interpretation', 'Task Misread', 'Diagram/Text Misalignment'],
  'Expression Errors': ['Vocabulary Mismatch', 'Poor Organization', 'Omitted Justification', 'Communication Breakdown', 'Grammatical Noise'],
  'Strategic Errors': ['Guess-and-Check Default', 'Overkill Strategy', 'Off-topic Response', 'Algorithmic Overreliance', 'Misapplied Prior Knowledge'],
  'Meta-Cognitive Errors': ['Overconfidence in Error', 'Underconfidence in Correct Work', 'Repeated Submission Without Adjustment', 'Ignores Feedback', 'Abandons Question Midway']
};

export function MisconceptionAnnotationUI({ questionOptions, correctAnswer, choiceMisconceptions, onMisconceptionChange }: Props) {
  const [misconceptions, setMisconceptions] = useState<Record<string, MisconceptionOption>>(choiceMisconceptions);

  const updateMisconception = (optionLabel: string, updates: Partial<MisconceptionOption>) => {
    const newMisconceptions = {
      ...misconceptions,
      [optionLabel]: {
        ...misconceptions[optionLabel],
        ...updates
      }
    };
    setMisconceptions(newMisconceptions);
    onMisconceptionChange(newMisconceptions);
  };

  const removeMisconception = (optionLabel: string) => {
    const newMisconceptions = { ...misconceptions };
    if (newMisconceptions[optionLabel] && !newMisconceptions[optionLabel].correct) {
      delete newMisconceptions[optionLabel];
    }
    setMisconceptions(newMisconceptions);
    onMisconceptionChange(newMisconceptions);
  };

  const getOptionLabel = (index: number): string => {
    return String.fromCharCode(65 + index); // A, B, C, D...
  };

  const isCorrectOption = (index: number): boolean => {
    return questionOptions[index] === correctAnswer;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Misconception Annotation
        </CardTitle>
        <p className="text-sm text-gray-600">
          Annotate incorrect options with common misconceptions to provide targeted feedback
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {questionOptions.map((option, index) => {
          const optionLabel = getOptionLabel(index);
          const isCorrect = isCorrectOption(index);
          const misconception = misconceptions[optionLabel] || {};

          return (
            <div key={optionLabel} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={isCorrect ? "default" : "secondary"}>
                  Option {optionLabel}
                </Badge>
                {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                <span className="flex-1 text-sm">{option}</span>
              </div>

              {isCorrect ? (
                <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  ✓ Correct Answer - No misconception annotation needed
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`category-${optionLabel}`}>Misconception Category</Label>
                      <Select
                        value={misconception.misconceptionCategory || ''}
                        onValueChange={(value) => updateMisconception(optionLabel, { misconceptionCategory: value, misconceptionSubtype: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MISCONCEPTION_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`subtype-${optionLabel}`}>Subtype</Label>
                      <Select
                        value={misconception.misconceptionSubtype || ''}
                        onValueChange={(value) => updateMisconception(optionLabel, { misconceptionSubtype: value })}
                        disabled={!misconception.misconceptionCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subtype..." />
                        </SelectTrigger>
                        <SelectContent>
                          {misconception.misconceptionCategory && 
                            MISCONCEPTION_SUBTYPES[misconception.misconceptionCategory as keyof typeof MISCONCEPTION_SUBTYPES]?.map(subtype => (
                              <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`description-${optionLabel}`}>Misconception Description</Label>
                    <Input
                      id={`description-${optionLabel}`}
                      placeholder="Explain why students might choose this option..."
                      value={misconception.description || ''}
                      onChange={(e) => updateMisconception(optionLabel, { description: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`confidence-${optionLabel}`}>Confidence:</Label>
                      <Input
                        id={`confidence-${optionLabel}`}
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={misconception.confidence || 0.8}
                        onChange={(e) => updateMisconception(optionLabel, { confidence: parseFloat(e.target.value) })}
                        className="w-20"
                      />
                    </div>
                    
                    {misconception.misconceptionCategory && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMisconception(optionLabel)}
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
