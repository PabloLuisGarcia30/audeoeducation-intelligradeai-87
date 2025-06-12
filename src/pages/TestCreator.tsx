import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAllActiveClasses, getLinkedContentSkillsForClass, saveExamToDatabase, type ActiveClass, type ExamData } from "@/services/examService";

const TestCreator = () => {
  const [examData, setExamData] = useState<ExamData>({
    title: "",
    description: "",
    questions: [],
    time_limit: 60
  });
  const [questionText, setQuestionText] = useState("");
  const [answerOptions, setAnswerOptions] = useState(["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [activeClasses, setActiveClasses] = useState<ActiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<ActiveClass | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classes = await getAllActiveClasses();
        setActiveClasses(classes);
      } catch (error) {
        console.error("Error fetching active classes:", error);
        toast.error("Failed to load active classes.");
      }
    };

    fetchClasses();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExamData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setQuestionText(e.target.value);
  };

  const handleAnswerOptionChange = (index: number, value: string) => {
    const newAnswerOptions = [...answerOptions];
    newAnswerOptions[index] = value;
    setAnswerOptions(newAnswerOptions);
  };

  const handleCorrectAnswerSelect = (index: number) => {
    setCorrectAnswerIndex(index);
  };

  const addQuestion = () => {
    if (!questionText.trim()) {
      toast.error("Please enter a question");
      return;
    }

    if (answerOptions.some(option => !option.trim())) {
      toast.error("Please fill in all answer options");
      return;
    }

    if (correctAnswerIndex === null) {
      toast.error("Please select the correct answer");
      return;
    }

    const newQuestion = {
      questionText,
      answerOptions,
      correctAnswerIndex
    };

    setExamData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    // Reset question input fields
    setQuestionText("");
    setAnswerOptions(["", "", "", ""]);
    setCorrectAnswerIndex(null);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = [...examData.questions];
    newQuestions.splice(index, 1);
    setExamData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleSaveExam = async () => {
    if (!examData.title.trim()) {
      toast.error("Please enter an exam title");
      return;
    }

    if (examData.questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    setLoading(true);
    try {
      // Get linked content skills for the class
      const linkedSkills = await getLinkedContentSkillsForClass(selectedClass.id);
      
      // Prepare exam data with examId
      const examDataToSave: ExamData = {
        ...examData,
        class_id: selectedClass.id,
        class_name: selectedClass.name,
        examId: `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const examId = await saveExamToDatabase(examDataToSave, linkedSkills);

      toast.success(`Exam "${examData.title}" saved successfully!`);
      
      // Reset form
      setExamData({
        title: "",
        description: "",
        questions: [],
        time_limit: 60
      });
      setSelectedClass(null);
      
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error('Failed to save exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Exam</h1>

      {/* Exam Details */}
      <div className="mb-4">
        <Label htmlFor="title">Exam Title</Label>
        <Input
          type="text"
          id="title"
          name="title"
          value={examData.title}
          onChange={handleInputChange}
          placeholder="Enter exam title"
          className="mt-1"
        />
      </div>

      <div className="mb-4">
        <Label htmlFor="description">Exam Description</Label>
        <Textarea
          id="description"
          name="description"
          value={examData.description}
          onChange={handleInputChange}
          placeholder="Enter exam description"
          className="mt-1"
        />
      </div>

      <div className="mb-4">
        <Label htmlFor="time_limit">Time Limit (minutes)</Label>
        <Input
          type="number"
          id="time_limit"
          name="time_limit"
          value={examData.time_limit}
          onChange={handleInputChange}
          placeholder="Enter time limit"
          className="mt-1"
        />
      </div>

      {/* Class Selection */}
      <div className="mb-4">
        <Label htmlFor="class">Select Class</Label>
        <Select onValueChange={(value) => {
          const selected = activeClasses.find(c => c.id === value);
          setSelectedClass(selected || null);
        }}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="Select a class" defaultValue={selectedClass?.id} />
          </SelectTrigger>
          <SelectContent>
            {activeClasses.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Question Input */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-lg font-semibold">Add Question</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label htmlFor="questionText">Question Text</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={handleQuestionTextChange}
              placeholder="Enter question text"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Answer Options</Label>
            {answerOptions.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 mt-1">
                <Input
                  type="text"
                  value={option}
                  onChange={(e) => handleAnswerOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCorrectAnswerSelect(index)}
                  className={correctAnswerIndex === index ? "bg-green-500 text-white hover:bg-green-700" : ""}
                >
                  {correctAnswerIndex === index ? "Correct" : "Mark Correct"}
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={addQuestion} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Question List */}
      {examData.questions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Questions</h2>
          {examData.questions.map((question, index) => (
            <Card key={index} className="mb-2">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{question.questionText}</p>
                  <ul className="list-disc pl-5">
                    {question.answerOptions.map((option, i) => (
                      <li key={i} className={question.correctAnswerIndex === i ? "text-green-500 font-semibold" : ""}>
                        {option}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeQuestion(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSaveExam}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Exam
          </>
        )}
      </Button>
    </div>
  );
};

export default TestCreator;
