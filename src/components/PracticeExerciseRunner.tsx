import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { PracticeExerciseGradingServiceUnified } from "@/services/practiceExerciseGradingServiceUnified";
import { usePracticeExerciseCompletion } from "@/hooks/usePracticeExerciseCompletion";

interface PracticeExerciseRunnerProps {
  exerciseData: any;
  onComplete: (results: any) => void;
  onExit: () => void;
}

export function PracticeExerciseRunner({ exerciseData, onComplete, onExit }: PracticeExerciseRunnerProps) {
  const [answers, setAnswers] = useState<string[]>(Array(exerciseData.questions.length).fill(''));
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const { completeExercise, isCompleting, isUpdatingSkills } = usePracticeExerciseCompletion({
    onSkillUpdated: (skillUpdates) => {
      console.log('✅ Skills updated after exercise completion:', skillUpdates);
    }
  });

  useEffect(() => {
    // Check if all questions are answered
    const allAnswered = answers.every(answer => answer !== '');
    setIsComplete(allAnswered);
  }, [answers]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!isComplete) return;

    try {
      setIsSubmitting(true);
      
      console.log('🎯 Starting unified exercise grading submission');

      const answersData = exerciseData.questions.map((question: any, index: number) => ({
        questionId: question.id || `q${index + 1}`,
        questionText: question.question,
        studentAnswer: answers[index] || '',
        correctAnswer: question.correctAnswer || '',
        points: question.points || 1,
        questionType: question.type || 'multiple-choice'
      }));

      // Use unified grading service
      const results = await PracticeExerciseGradingServiceUnified.gradeExerciseSubmission(
        answersData,
        exerciseData.title || 'Practice Exercise',
        exerciseData.exerciseId,
        exerciseData.skillName,
        {
          subject: exerciseData.subject || exerciseData.skillMetadata?.subject,
          grade: exerciseData.grade || exerciseData.skillMetadata?.grade,
          exerciseType: 'practice',
          skillsTargeted: exerciseData.skillMetadata?.skillsTargeted || [exerciseData.skillName]
        },
        exerciseData.trailblazerSessionId
      );

      console.log('✅ Unified grading results:', results);

      setSubmissionResult(results);
      
      // Complete the exercise with class context if available
      const classContext = exerciseData.classContext;
      await completeExercise({
        exerciseId: exerciseData.exerciseId || exerciseData.id || 'temp-' + Date.now(),
        score: results.percentageScore,
        skillName: exerciseData.skillName,
        exerciseData: exerciseData,
        classId: classContext?.classId
      });

      console.log(`🎯 Exercise completed with unified grading: ${results.percentageScore}% score, ${results.cacheHits} cache hits, ${results.misconceptionsLogged} misconceptions`);

    } catch (error) {
      console.error('❌ Error submitting exercise with unified grading:', error);
      toast.error('Failed to submit exercise. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitButtonText = isSubmitting 
    ? "Submitting..." 
    : isCompleting || isUpdatingSkills 
    ? "Processing..." 
    : "Submit Answers";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{exerciseData.title || 'Practice Exercise'}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {exerciseData.questions.map((question: any, index: number) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`question-${index}`}>{question.question}</Label>
              {question.type === 'multiple-choice' ? (
                <div className="flex flex-col space-y-2">
                  {question.options.map((option: string) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`question-${index}-${option}`}
                        checked={answers[index] === option}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleAnswerChange(index, option);
                          } else {
                            handleAnswerChange(index, '');
                          }
                        }}
                      />
                      <Label htmlFor={`question-${index}-${option}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              ) : (
                <Input
                  type="text"
                  id={`question-${index}`}
                  value={answers[index]}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={onExit}>
            Exit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting || isCompleting || isUpdatingSkills}
          >
            {submitButtonText}
          </Button>
        </div>
        {submissionResult && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Results</h3>
            <p>
              You got {submissionResult.correctAnswers} out of {submissionResult.totalQuestions} questions correct.
            </p>
            <p>Percentage Score: {submissionResult.percentageScore.toFixed(2)}%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
