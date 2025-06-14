import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Moon, UserCheck, FileText, FileCheck, BookOpen, X, Check, Layers } from "lucide-react";
import { toast } from "sonner";
import { 
  getAllActiveStudents,
  getStudentContentSkillScores,
  getAllActiveClasses,
  type ActiveStudent,
  type ActiveClass
} from "@/services/examService";
import { useMultiSkillSelection } from "@/contexts/MultiSkillSelectionContext";
import { generatePracticeTest } from "@/services/practiceTestService";

interface SkillScore {
  skill_name: string;
  score: number;
}

interface StudentWithSkills extends ActiveStudent {
  lowestSkills: SkillScore[];
}

interface StudentPerformanceOverviewProps {
  students?: ActiveStudent[];
  classes?: ActiveClass[];
}

// Mock data for students without scores
const generateMockSkills = (): SkillScore[] => {
  const mockSkills = [
    { skill_name: "Factoring Polynomials", score: Math.floor(Math.random() * 30) + 45 },
    { skill_name: "Solving Systems of Equations", score: Math.floor(Math.random() * 30) + 50 },
    { skill_name: "Understanding Function Notation", score: Math.floor(Math.random() * 25) + 40 },
    { skill_name: "Graphing Linear Functions", score: Math.floor(Math.random() * 35) + 55 },
    { skill_name: "Working with Exponential Functions", score: Math.floor(Math.random() * 20) + 35 },
    { skill_name: "Properties of Similar Triangles", score: Math.floor(Math.random() * 30) + 45 },
    { skill_name: "Area and Perimeter Calculations", score: Math.floor(Math.random() * 25) + 50 },
    { skill_name: "Basic Trigonometric Ratios", score: Math.floor(Math.random() * 30) + 40 },
    { skill_name: "Statistical Measures", score: Math.floor(Math.random() * 35) + 45 },
    { skill_name: "Probability Calculations", score: Math.floor(Math.random() * 25) + 55 }
  ];
  
  // Shuffle and take 5 random skills
  const shuffled = mockSkills.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5).sort((a, b) => a.score - b.score);
};

export function StudentPerformanceOverview({ students: propStudents, classes: propClasses }: StudentPerformanceOverviewProps) {
  const [studentsWithSkills, setStudentsWithSkills] = useState<StudentWithSkills[]>([]);
  const [allStudentsWithSkills, setAllStudentsWithSkills] = useState<StudentWithSkills[]>([]);
  const [classes, setClasses] = useState<ActiveClass[]>(propClasses || []);
  const [selectedClass, setSelectedClass] = useState<ActiveClass | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("all_subjects");
  const [selectedClasses, setSelectedClasses] = useState<ActiveClass[]>([]);
  const [selectedSubjectForMultiClass, setSelectedSubjectForMultiClass] = useState<string | null>(null);
  // New state for multiple subject selection
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'class' | 'subject' | 'multi-class' | 'multi-subject'>('class');
  const [showMultiClassSelector, setShowMultiClassSelector] = useState(false);
  const [loading, setLoading] = useState(!propStudents);
  const [generatingTests, setGeneratingTests] = useState<Set<string>>(new Set());

  // Multi-skill selection context
  const { isSelectionMode, toggleSelectionMode, toggleSkillSelection, selectedSkills } = useMultiSkillSelection();

  // Get unique subjects from classes
  const availableSubjects = Array.from(new Set(classes.map(c => c.subject))).sort();

  // Get classes for the selected subject in multi-class mode
  const classesForSelectedSubject = selectedSubjectForMultiClass 
    ? classes.filter(c => c.subject === selectedSubjectForMultiClass)
    : [];
    
  // Get all classes for the selected subjects in multi-subject mode
  const classesForSelectedSubjects = selectedSubjects.length > 0
    ? classes.filter(c => selectedSubjects.includes(c.subject))
    : [];

  useEffect(() => {
    if (propStudents && propClasses) {
      // Use provided data
      loadStudentSkills(propStudents);
      setClasses(propClasses);
    } else {
      // Load data independently
      loadDashboardData();
    }
  }, [propStudents, propClasses]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load both students and classes
      const [students, classesData] = await Promise.all([
        getAllActiveStudents(),
        getAllActiveClasses()
      ]);
      
      setClasses(classesData);
      
      const studentsWithSkillsData = await Promise.all(
        students.map(async (student) => {
          try {
            const skillScores = await getStudentContentSkillScores(student.id);
            
            let lowestSkills: SkillScore[];
            
            if (skillScores && skillScores.length > 0) {
              // Use real data if available - get the 5 lowest scores
              lowestSkills = skillScores
                .map(score => ({
                  skill_name: score.skill_name,
                  score: score.score
                }))
                .sort((a, b) => a.score - b.score)
                .slice(0, 5);
            } else {
              // Use mock data for students without scores
              lowestSkills = generateMockSkills();
            }

            return {
              ...student,
              lowestSkills
            };
          } catch (error) {
            console.error(`Error fetching skills for student ${student.id}:`, error);
            // Use mock data if there's an error fetching real data
            return {
              ...student,
              lowestSkills: generateMockSkills()
            };
          }
        })
      );

      setAllStudentsWithSkills(studentsWithSkillsData);
      setStudentsWithSkills(studentsWithSkillsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentSkills = async (students: ActiveStudent[]) => {
    const studentsWithSkillsData = await Promise.all(
      students.map(async (student) => {
        try {
          const skillScores = await getStudentContentSkillScores(student.id);
          
          let lowestSkills: SkillScore[];
          
          if (skillScores && skillScores.length > 0) {
            lowestSkills = skillScores
              .map(score => ({
                skill_name: score.skill_name,
                score: score.score
              }))
              .sort((a, b) => a.score - b.score)
              .slice(0, 5);
          } else {
            lowestSkills = generateMockSkills();
          }

          return {
            ...student,
            lowestSkills
          };
        } catch (error) {
          console.error(`Error fetching skills for student ${student.id}:`, error);
          return {
            ...student,
            lowestSkills: generateMockSkills()
          };
        }
      })
    );

    setAllStudentsWithSkills(studentsWithSkillsData);
    setStudentsWithSkills(studentsWithSkillsData);
  };

  // Handle skill circle click for practice test generation
  const handleSkillClick = async (student: StudentWithSkills, skill: SkillScore) => {
    // Always use the multi-skill selection system for both single and multi-select modes
    const selectedSkill = {
      id: `${student.id}-${skill.skill_name}`,
      name: skill.skill_name,
      score: skill.score,
      type: 'content' as const
    };
    toggleSkillSelection(selectedSkill);
  };

  // Check if a skill is selected in multi-selection mode
  const isSkillSelected = (student: StudentWithSkills, skill: SkillScore) => {
    return selectedSkills.some(s => s.id === `${student.id}-${skill.skill_name}`);
  };

  // Check if a skill is currently generating a test
  const isSkillGenerating = (student: StudentWithSkills, skill: SkillScore) => {
    return generatingTests.has(`${student.id}-${skill.skill_name}`);
  };

  const handleClassFilter = (selectedClass: ActiveClass | null) => {
    setSelectedClass(selectedClass);
    setViewMode('class');
    setSelectedSubject("all_subjects");
    setSelectedClasses([]);
    setSelectedSubjectForMultiClass(null);
    setSelectedSubjects([]);
    setShowMultiClassSelector(false);
    
    if (!selectedClass) {
      // Show all students
      setStudentsWithSkills(allStudentsWithSkills);
    } else {
      // Filter students by class
      const filteredStudents = allStudentsWithSkills.filter(student => 
        selectedClass.students && selectedClass.students.includes(student.id)
      );
      setStudentsWithSkills(filteredStudents);
    }
  };

  const handleSubjectFilter = (subject: string) => {
    setSelectedSubject(subject);
    setViewMode('subject');
    setSelectedClass(null);
    setSelectedClasses([]);
    setSelectedSubjectForMultiClass(null);
    setSelectedSubjects([]);
    setShowMultiClassSelector(false);
    
    if (!subject || subject === "all_subjects") {
      // Show all students
      setStudentsWithSkills(allStudentsWithSkills);
    } else {
      // Filter students by subject - only show students who are in at least one class for this subject
      const subjectClasses = classes.filter(c => c.subject === subject);
      const studentsInSubject = new Set();
      
      subjectClasses.forEach(cls => {
        if (cls.students) {
          cls.students.forEach(studentId => studentsInSubject.add(studentId));
        }
      });
      
      const filteredStudents = allStudentsWithSkills.filter(student => 
        studentsInSubject.has(student.id)
      );
      setStudentsWithSkills(filteredStudents);
    }
  };

  const handleSubjectSelection = (subject: string) => {
    console.log('Subject selected for multi-class:', subject);
    setSelectedSubjectForMultiClass(subject);
    setViewMode('multi-class');
    setSelectedClass(null);
    setSelectedSubject("all_subjects");
    setSelectedClasses([]);
    setSelectedSubjects([]);
    setShowMultiClassSelector(true);
  };

  // New function to handle multi-subject selection
  const handleSubjectToggle = (subject: string) => {
    setViewMode('multi-subject');
    setSelectedClass(null);
    setSelectedSubject("all_subjects");
    setSelectedClasses([]);
    setSelectedSubjectForMultiClass(null);
    setShowMultiClassSelector(false);
    
    let newSelectedSubjects: string[];
    if (selectedSubjects.includes(subject)) {
      // Remove subject if already selected
      newSelectedSubjects = selectedSubjects.filter(s => s !== subject);
    } else {
      // Add subject if not already selected
      newSelectedSubjects = [...selectedSubjects, subject];
    }
    
    setSelectedSubjects(newSelectedSubjects);
    updateStudentsForMultiSubjects(newSelectedSubjects);
  };

  // Function to update students based on selected subjects
  const updateStudentsForMultiSubjects = (subjects: string[]) => {
    if (subjects.length === 0) {
      // If no subjects selected, show all students
      setStudentsWithSkills(allStudentsWithSkills);
      return;
    }
    
    // Get classes for selected subjects
    const relevantClasses = classes.filter(c => subjects.includes(c.subject));
    
    // Get all students in these classes
    const studentsInClasses = new Set<string>();
    relevantClasses.forEach(cls => {
      if (cls.students) {
        cls.students.forEach(studentId => studentsInClasses.add(studentId));
      }
    });
    
    // Filter students who are in any of the selected subject classes
    const filteredStudents = allStudentsWithSkills.filter(student => 
      studentsInClasses.has(student.id)
    );
    
    // Aggregate skills across all students in the classes and find the lowest
    const allSkills: SkillScore[] = [];
    filteredStudents.forEach(student => {
      allSkills.push(...student.lowestSkills);
    });
    
    // Group skills by name and calculate average scores
    const skillAverages: { [key: string]: { total: number; count: number } } = {};
    allSkills.forEach(skill => {
      if (!skillAverages[skill.skill_name]) {
        skillAverages[skill.skill_name] = { total: 0, count: 0 };
      }
      skillAverages[skill.skill_name].total += skill.score;
      skillAverages[skill.skill_name].count += 1;
    });
    
    // Convert to array and sort by average score
    const aggregatedSkills = Object.entries(skillAverages)
      .map(([skill_name, data]) => ({
        skill_name,
        score: Math.round(data.total / data.count)
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
    
    // Update each student to show the top 5 lowest skills across all selected subjects
    const updatedStudents = filteredStudents.map(student => ({
      ...student,
      lowestSkills: aggregatedSkills
    }));
    
    setStudentsWithSkills(updatedStudents);
  };

  const handleMultiClassSelection = (classItem: ActiveClass, checked: boolean) => {
    let newSelectedClasses: ActiveClass[];
    
    if (checked) {
      newSelectedClasses = [...selectedClasses, classItem];
    } else {
      newSelectedClasses = selectedClasses.filter(c => c.id !== classItem.id);
    }
    
    setSelectedClasses(newSelectedClasses);
    
    // Filter students based on selected classes and aggregate their lowest skills
    if (newSelectedClasses.length === 0) {
      // If no classes selected, show students from the selected subject
      if (selectedSubjectForMultiClass) {
        const subjectClasses = classes.filter(c => c.subject === selectedSubjectForMultiClass);
        const studentsInSubject = new Set();
        
        subjectClasses.forEach(cls => {
          if (cls.students) {
            cls.students.forEach(studentId => studentsInSubject.add(studentId));
          }
        });
        
        const filteredStudents = allStudentsWithSkills.filter(student => 
          studentsInSubject.has(student.id)
        );
        setStudentsWithSkills(filteredStudents);
      } else {
        setStudentsWithSkills(allStudentsWithSkills);
      }
    } else {
      const studentsInSelectedClasses = new Set();
      newSelectedClasses.forEach(cls => {
        if (cls.students) {
          cls.students.forEach(studentId => studentsInSelectedClasses.add(studentId));
        }
      });
      
      const filteredStudents = allStudentsWithSkills.filter(student => 
        studentsInSelectedClasses.has(student.id)
      );
      
      // Aggregate skills across all students and find the 5 lowest
      const allSkills: SkillScore[] = [];
      filteredStudents.forEach(student => {
        allSkills.push(...student.lowestSkills);
      });
      
      // Group skills by name and calculate average scores
      const skillAverages: { [key: string]: { total: number; count: number } } = {};
      allSkills.forEach(skill => {
        if (!skillAverages[skill.skill_name]) {
          skillAverages[skill.skill_name] = { total: 0, count: 0 };
        }
        skillAverages[skill.skill_name].total += skill.score;
        skillAverages[skill.skill_name].count += 1;
      });
      
      // Convert to array and sort by average score
      const aggregatedSkills = Object.entries(skillAverages)
        .map(([skill_name, data]) => ({
          skill_name,
          score: Math.round(data.total / data.count)
        }))
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);
      
      // Update each student to show the top 5 lowest skills across all selected classes
      const updatedStudents = filteredStudents.map(student => ({
        ...student,
        lowestSkills: aggregatedSkills
      }));
      
      setStudentsWithSkills(updatedStudents);
    }
  };

  const handleCreatePracticeForSeveral = () => {
    console.log('Create practice exercise for several students clicked');
  };

  const handleCreatePracticeForOne = () => {
    console.log('Create practice exercise for one student clicked');
  };

  const handleShowStudentsSkillsForAllSubjects = () => {
    console.log('Show students skills for all subjects clicked');
    setViewMode('subject');
    setSelectedClass(null);
    setSelectedSubject("all_subjects");
    setSelectedClasses([]);
    setSelectedSubjectForMultiClass(null);
    setSelectedSubjects([]);
    setShowMultiClassSelector(false);
    setStudentsWithSkills(allStudentsWithSkills);
  };

  const getScoreColor = (score: number) => {
    if (score >= 86) return "from-emerald-400 to-emerald-600";
    if (score >= 76) return "from-yellow-400 to-yellow-600";
    if (score >= 61) return "from-orange-400 to-orange-600";
    return "from-green-400 to-blue-600";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 86) return "text-emerald-700";
    if (score >= 76) return "text-yellow-700";
    if (score >= 61) return "text-orange-700";
    return "text-white";
  };

  const getDisplayTitle = () => {
    let baseTitle = "Your Students: 5 Skills Most Needing Improving This Week";
    
    if (viewMode === 'class' && selectedClass) {
      return `${baseTitle} - ${selectedClass.name}`;
    } else if (viewMode === 'subject' && selectedSubject && selectedSubject !== "all_subjects") {
      return `${baseTitle} - ${selectedSubject} Subject`;
    } else if (viewMode === 'subject' && selectedSubject === "all_subjects") {
      return `${baseTitle} - All Subjects`;
    } else if (viewMode === 'multi-class') {
      if (selectedClasses.length > 0) {
        return `${baseTitle} - ${selectedClasses.map(c => c.name).join(', ')}`;
      } else if (selectedSubjectForMultiClass) {
        return `${baseTitle} - ${selectedSubjectForMultiClass} Subject`;
      }
    } else if (viewMode === 'multi-subject' && selectedSubjects.length > 0) {
      return `${baseTitle} - ${selectedSubjects.join(', ')}`;
    }
    
    return baseTitle;
  };

  if (loading) {
    return (
      <Card className="w-full border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Moon className="h-5 w-5 text-orange-500" />
              Your Students: 5 Skills Most Needing Improving This Week
            </CardTitle>
            <TooltipProvider>
              <div className="flex items-center gap-2">
                {/* Button 1 - User Check - Class Filter */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white shadow-lg border">
                        <DropdownMenuItem onClick={() => handleClassFilter(null)}>
                          All Students
                        </DropdownMenuItem>
                        {classes.map((classItem) => (
                          <DropdownMenuItem 
                            key={classItem.id}
                            onClick={() => handleClassFilter(classItem)}
                          >
                            {classItem.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border z-50">
                    <p>Show Students by Classes</p>
                  </TooltipContent>
                </Tooltip>

                {/* Button 2 - File Text - Create Practice for Several */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForSeveral}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for several students</p>
                  </TooltipContent>
                </Tooltip>

                {/* Button 3 - File Check - Create Practice for One */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForOne}
                    >
                      <FileCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for one student</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Button 4 - Book Open - Multi-Subject Selection - NEW IMPLEMENTATION */}
                <div className="relative">
                  <DropdownMenu open={subjectDropdownOpen} onOpenChange={setSubjectDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                      <DropdownMenuItem onClick={handleShowStudentsSkillsForAllSubjects}>
                        All Subjects
                      </DropdownMenuItem>
                      
                      {availableSubjects.map((subject) => (
                        <DropdownMenuCheckboxItem
                          key={subject}
                          checked={selectedSubjects.includes(subject)}
                          onCheckedChange={() => handleSubjectToggle(subject)}
                        >
                          <div className="flex items-center">
                            {subject}
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200 absolute inset-0 opacity-0"
                        tabIndex={-1}
                      >
                        <span className="sr-only">Select multiple subjects</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={5}>
                      <p>Select multiple subjects</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-3 ml-auto">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-12 w-12 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (studentsWithSkills.length === 0) {
    return (
      <Card className="w-full border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Moon className="h-5 w-5 text-orange-500" />
              {getDisplayTitle()}
            </CardTitle>
            <TooltipProvider>
              <div className="flex items-center gap-2">
                {/* Button 1 - User Check - Class Filter */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white shadow-lg border">
                        <DropdownMenuItem onClick={() => handleClassFilter(null)}>
                          All Students
                        </DropdownMenuItem>
                        {classes.map((classItem) => (
                          <DropdownMenuItem 
                            key={classItem.id}
                            onClick={() => handleClassFilter(classItem)}
                          >
                            {classItem.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border z-50">
                    <p>Show Students by Classes</p>
                  </TooltipContent>
                </Tooltip>

                {/* Button 2 - File Text - Create Practice for Several */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForSeveral}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for several students</p>
                  </TooltipContent>
                </Tooltip>

                {/* Button 3 - File Check - Create Practice for One */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForOne}
                    >
                      <FileCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for one student</p>
                  </TooltipContent>
                </Tooltip>

                {/* Button 4 - Book Open - Multi-Subject Selection - NEW IMPLEMENTATION */}
                <div className="relative">
                  <DropdownMenu open={subjectDropdownOpen} onOpenChange={setSubjectDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                      <DropdownMenuItem onClick={handleShowStudentsSkillsForAllSubjects}>
                        All Subjects
                      </DropdownMenuItem>
                      
                      {availableSubjects.map((subject) => (
                        <DropdownMenuCheckboxItem
                          key={subject}
                          checked={selectedSubjects.includes(subject)}
                          onCheckedChange={() => handleSubjectToggle(subject)}
                        >
                          <div className="flex items-center">
                            {subject}
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200 absolute inset-0 opacity-0"
                        tabIndex={-1}
                      >
                        <span className="sr-only">Select multiple subjects</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={5}>
                      <p>Select multiple subjects</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Multi-Select Toggle Button */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isSelectionMode ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={toggleSelectionMode}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isSelectionMode ? 'Exit' : 'Enter'} multi-select mode</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
          
          {/* Subject selector when in subject view mode */}
          {viewMode === 'subject' && (
            <div className="mt-4">
              <Select value={selectedSubject} onValueChange={handleSubjectFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_subjects">All Subjects</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected subjects display */}
          {viewMode === 'multi-subject' && selectedSubjects.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {selectedSubjects.map(subject => (
                  <div key={subject} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {subject}
                    <button 
                      onClick={() => handleSubjectToggle(subject)}
                      className="ml-1 rounded-full p-0.5 hover:bg-blue-200 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multi-class selector for selected subject */}
          {showMultiClassSelector && selectedSubjectForMultiClass && (
            <div className="mt-4">
              <div className="bg-slate-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-900">
                    Select Classes from {selectedSubjectForMultiClass}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMultiClassSelector(false);
                      setSelectedSubjectForMultiClass(null);
                      setSelectedClasses([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {classesForSelectedSubject.map((classItem) => (
                    <div key={classItem.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={classItem.id}
                        checked={selectedClasses.some(c => c.id === classItem.id)}
                        onCheckedChange={(checked) => 
                          handleMultiClassSelection(classItem, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={classItem.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {classItem.name}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedClasses.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-600">
                      Selected: {selectedClasses.map(c => c.name).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Moon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {viewMode === 'class' && selectedClass 
                ? `No Students in ${selectedClass.name}`
                : viewMode === 'subject' && selectedSubject && selectedSubject !== "all_subjects"
                ? `No Students in ${selectedSubject} Subject`
                : viewMode === 'multi-class' && selectedClasses.length > 0
                ? `No Students in Selected Classes`
                : viewMode === 'multi-class' && selectedSubjectForMultiClass
                ? `No Students in ${selectedSubjectForMultiClass} Classes` 
                : viewMode === 'multi-subject' && selectedSubjects.length > 0
                ? `No Students in ${selectedSubjects.join(', ')}` 
                : 'No Performance Data'
              }
            </h3>
            <p className="text-gray-600">
              {viewMode === 'class' && selectedClass
                ? 'This class has no students assigned or students need to take tests to see performance data'
                : viewMode === 'subject' && selectedSubject && selectedSubject !== "all_subjects"
                ? `No students are enrolled in ${selectedSubject} classes or need to take tests to see performance data`
                : viewMode === 'multi-class' && selectedClasses.length > 0
                ? 'Selected classes have no students assigned or students need to take tests to see performance data'
                : viewMode === 'multi-class' && selectedSubjectForMultiClass
                ? `No students are enrolled in ${selectedSubjectForMultiClass} classes or need to take tests to see performance data`
                : viewMode === 'multi-subject' && selectedSubjects.length > 0
                ? `No students are enrolled in ${selectedSubjects.join(', ')} or need to take tests to see performance data`
                : 'Students need to take tests to see performance data here'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Moon className="h-5 w-5 text-orange-500" />
            {getDisplayTitle()}
          </CardTitle>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              {/* Button 1 - User Check - Class Filter */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                      <DropdownMenuItem onClick={() => handleClassFilter(null)}>
                        All Students
                      </DropdownMenuItem>
                      {classes.map((classItem) => (
                        <DropdownMenuItem 
                          key={classItem.id}
                          onClick={() => handleClassFilter(classItem)}
                        >
                          {classItem.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent className="bg-white border z-50">
                  <p>Show Students by Classes</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Button 2 - File Text - Create Practice for Several */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCreatePracticeForSeveral}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create practice exercise for several students</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Button 3 - File Check - Create Practice for One */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCreatePracticeForOne}
                  >
                    <FileCheck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create practice exercise for one student</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Button 4 - Book Open - Multi-Subject Selection - NEW IMPLEMENTATION */}
              <div className="relative">
                <DropdownMenu open={subjectDropdownOpen} onOpenChange={setSubjectDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                    <DropdownMenuItem onClick={handleShowStudentsSkillsForAllSubjects}>
                      All Subjects
                    </DropdownMenuItem>
                    
                    {availableSubjects.map((subject) => (
                      <DropdownMenuCheckboxItem
                        key={subject}
                        checked={selectedSubjects.includes(subject)}
                        onCheckedChange={() => handleSubjectToggle(subject)}
                      >
                        <div className="flex items-center">
                          {subject}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200 absolute inset-0 opacity-0 pointer-events-none"
                      tabIndex={-1}
                    >
                      <span className="sr-only">Select multiple subjects</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={5}>
                    <p>Select multiple subjects</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Multi-Select Toggle Button */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelectionMode ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={toggleSelectionMode}
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSelectionMode ? 'Exit' : 'Enter'} multi-select mode</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        
        {/* Subject selector when in subject view mode */}
        {viewMode === 'subject' && (
          <div className="mt-4">
            <Select value={selectedSubject} onValueChange={handleSubjectFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_subjects">All Subjects</SelectItem>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Selected subjects display */}
        {viewMode === 'multi-subject' && selectedSubjects.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.map(subject => (
                <div key={subject} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  {subject}
                  <button 
                    onClick={() => handleSubjectToggle(subject)}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-200 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-class selector for selected subject */}
        {showMultiClassSelector && selectedSubjectForMultiClass && (
          <div className="mt-4">
            <div className="bg-slate-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-900">
                  Select Classes from {selectedSubjectForMultiClass}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMultiClassSelector(false);
                    setSelectedSubjectForMultiClass(null);
                    setSelectedClasses([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {classesForSelectedSubject.map((classItem) => (
                  <div key={classItem.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={classItem.id}
                      checked={selectedClasses.some(c => c.id === classItem.id)}
                      onCheckedChange={(checked) => 
                        handleMultiClassSelection(classItem, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={classItem.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {classItem.name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedClasses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-600">
                    Selected: {selectedClasses.map(c => c.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-96 w-full">
          <div className="space-y-3 pr-4">
            {studentsWithSkills.map((student) => (
              <div 
                key={student.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-12 w-12 ring-2 ring-slate-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{student.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{student.email || 'No email'}</p>
                  </div>
                </div>
                
                <div className="flex items-end gap-4">
                  {student.lowestSkills.map((skill, index) => {
                    const isSelected = isSkillSelected(student, skill);
                    const isGenerating = isSkillGenerating(student, skill);
                    
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="h-10 text-xs text-slate-600 text-center mb-2 w-16 leading-tight flex items-center justify-center">
                          <span className="line-clamp-2">{skill.skill_name}</span>
                        </div>
                        <div className="relative">
                          <div 
                            className={`h-12 w-12 rounded-full bg-gradient-to-br ${getScoreColor(skill.score)} 
                              flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 
                              transition-all duration-200 cursor-pointer
                              ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                              ${isGenerating ? 'animate-pulse' : ''}`}
                            onClick={() => handleSkillClick(student, skill)}
                            title={`Click to select ${skill.skill_name} for practice test generation`}
                          >
                            {isGenerating ? (
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                              <span className="text-xs font-bold text-white drop-shadow-sm">
                                {skill.score}%
                              </span>
                            )}
                          </div>
                          
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Fill remaining slots if less than 5 skills */}
                  {[...Array(Math.max(0, 5 - student.lowestSkills.length))].map((_, index) => (
                    <div key={`empty-${index}`} className="flex flex-col items-center">
                      <div className="h-10 text-xs text-slate-400 text-center mb-2 w-16 leading-tight flex items-center justify-center">
                        <span>No data</span>
                      </div>
                      <div 
                        className="h-12 w-12 rounded-full bg-slate-100 border-2 border-dashed border-slate-300
                          flex items-center justify-center"
                      >
                        <span className="text-xs text-slate-400">—</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
