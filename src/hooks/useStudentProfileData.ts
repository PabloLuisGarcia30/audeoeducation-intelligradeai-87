import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { 
  getActiveStudentById, 
  getStudentTestResults, 
  getStudentContentSkillScores, 
  getStudentSubjectSkillScores,
  getActiveClassById,
  getLinkedContentSkillsForClass,
  getLinkedSubjectSkillsForClass,
  getContentSkillsBySubjectAndGrade,
  getSubjectSkillsBySubjectAndGrade,
  linkClassToContentSkills,
  linkClassToSubjectSkills,
  getStudentEnrolledClasses
} from "@/services/examService";
import { 
  mockPabloContentSkillScores, 
  mockPabloSubjectSkillScores,
  mockPabloGeographyContentSkillScores,
  mockPabloGeographySubjectSkillScores,
  mockPabloGeographyTestResults,
  mockBettyContentSkillScores,
  mockBettySubjectSkillScores,
  mockBettyTestResults,
  mockBettyGeographyContentSkillScores,
  mockBettyGeographySubjectSkillScores
} from "@/data/mockStudentData";
import { supabase } from "@/integrations/supabase/client";

interface UseStudentProfileDataProps {
  studentId: string;
  classId?: string;
  className?: string;
}

export function useStudentProfileData({ studentId, classId, className }: UseStudentProfileDataProps) {
  const isClassView = Boolean(classId && className);

  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['activeStudent', studentId],
    queryFn: () => getActiveStudentById(studentId),
  });

  // For Pablo Luis Garcia, use the corrected student profile ID
  const getCorrectStudentProfileId = (studentName: string | undefined): string | null => {
    if (studentName === 'Pablo Luis Garcia') {
      return 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26';
    }
    return null;
  };

  // Fetch student profile with corrected logic for Pablo
  const { data: studentProfile, isLoading: studentProfileLoading } = useQuery({
    queryKey: ['studentProfile', student?.name, studentId],
    queryFn: async () => {
      if (!student?.name) return null;
      
      // Use the corrected profile ID for Pablo
      const correctProfileId = getCorrectStudentProfileId(student.name);
      
      if (correctProfileId) {
        console.log('🔗 Using corrected profile ID for', student.name, ':', correctProfileId);
        
        const { data, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', correctProfileId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching student profile by ID:', error);
          return null;
        }

        if (data) {
          console.log('✅ Found corrected student profile:', data.id, 'for', student.name);
          return data;
        }
      }
      
      // Fallback to name lookup for other students
      console.log('🔗 Looking up student profile for:', student.name);
      
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('student_name', student.name)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching student profile:', error);
        return null;
      }

      if (data) {
        console.log('✅ Found student profile:', data.id, 'for', student.name);
      } else {
        console.log('⚠️ No student profile found for:', student.name);
      }

      return data;
    },
    enabled: !!student?.name,
  });

  const isPabloLuisGarcia = student?.name === 'Pablo Luis Garcia';
  const isBettyJohnson = student?.name === 'Betty Johnson';

  // Fetch class data if in class view
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['activeClass', classId],
    queryFn: () => classId ? getActiveClassById(classId) : Promise.resolve(null),
    enabled: !!classId,
  });

  // Check if we have real database data for Pablo
  const { data: pabloRealSkillScores } = useQuery({
    queryKey: ['pabloRealContentSkills', studentProfile?.id],
    queryFn: async () => {
      if (!studentProfile?.id || !isPabloLuisGarcia) return [];
      
      const { data, error } = await supabase
        .from('content_skill_scores')
        .select('*')
        .eq('student_id', studentProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Pablo real skill scores:', error);
        return [];
      }

      console.log('📊 Pablo real skill scores from database:', data?.length || 0, 'records');
      return data || [];
    },
    enabled: !!studentProfile?.id && isPabloLuisGarcia,
  });

  // Helper function to check if this student/class has mock data available
  const hasMockData = () => {
    if (isPabloLuisGarcia) {
      if (classData) {
        // Check for specific mock data combinations for Pablo
        const isGrade10Math = classData.subject === 'Math' && classData.grade === 'Grade 10';
        const isGrade10Science = classData.subject === 'Science' && classData.grade === 'Grade 10';
        const isGrade11Geography = classData.subject === 'Geography' && classData.grade === 'Grade 11';
        
        return isGrade10Math || isGrade10Science || isGrade11Geography;
      }
      // Return true for general profile view for Pablo
      return true;
    }
    
    if (isBettyJohnson) {
      if (classData) {
        // Check for specific mock data combinations for Betty
        const isGrade10Math = classData.subject === 'Math' && classData.grade === 'Grade 10';
        const isGrade11Biology = classData.subject === 'Science' && classData.grade === 'Grade 11';
        const isGrade11English = classData.subject === 'English' && classData.grade === 'Grade 11';
        const isGrade10History = classData.subject === 'History' && classData.grade === 'Grade 10';
        const isGrade11Geography = classData.subject === 'Geography' && classData.grade === 'Grade 11';
        
        return isGrade10Math || isGrade11Biology || isGrade11English || isGrade10History || isGrade11Geography;
      }
      // Return true for general profile view for Betty
      return true;
    }
    
    return false;
  };

  // Helper function to merge real and mock data for Pablo
  const mergeRealAndMockData = (mockData: any[], realData: any[]) => {
    if (!realData || realData.length === 0) {
      return mockData;
    }

    // Create a map of real data by skill name (use most recent score for each skill)
    const realDataMap = new Map();
    realData.forEach(item => {
      const existing = realDataMap.get(item.skill_name);
      if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
        realDataMap.set(item.skill_name, item);
      }
    });

    // Merge: use real data where available, mock data otherwise
    return mockData.map(mockItem => {
      const realItem = realDataMap.get(mockItem.skill_name);
      if (realItem) {
        console.log(`🔄 Using real data for ${mockItem.skill_name}: ${realItem.score}% (was mock: ${mockItem.score}%)`);
        return {
          ...mockItem,
          score: realItem.score,
          points_earned: realItem.points_earned,
          points_possible: realItem.points_possible,
          created_at: realItem.created_at,
          id: realItem.id
        };
      }
      return mockItem;
    });
  };

  // Fetch test results with mock data support for both students
  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ['studentTestResults', studentProfile?.id, studentId, classId, classData?.subject, classData?.grade, student?.name],
    queryFn: async () => {
      // Use mock data for Pablo Luis Garcia
      if (isPabloLuisGarcia && classData?.subject === 'Geography' && classData?.grade === 'Grade 11') {
        console.log('Using mock Geography test results for Pablo Luis Garcia');
        return Promise.resolve(mockPabloGeographyTestResults);
      }

      // Use mock data for Betty Johnson
      if (isBettyJohnson) {
        console.log('Using mock test results for Betty Johnson');
        return Promise.resolve(mockBettyTestResults);
      }

      // Try student profile ID first (for newly processed tests)
      if (studentProfile?.id) {
        console.log('📊 Fetching test results using student profile ID:', studentProfile.id);
        try {
          const profileResults = await getStudentTestResults(studentProfile.id);
          if (profileResults.length > 0) {
            console.log(`✅ Found ${profileResults.length} test results via student profile`);
            return profileResults;
          }
        } catch (error) {
          console.warn('Failed to fetch via student profile, trying active student ID:', error);
        }
      }
      
      // Fallback to active student ID
      console.log('📊 Fetching test results using active student ID:', studentId);
      return getStudentTestResults(studentId);
    },
    enabled: !!(studentProfile?.id || studentId),
  });

  // Fetch content skill scores with enhanced mock data support and real data merging for Pablo
  const { data: contentSkillScores = [], isLoading: contentSkillsLoading } = useQuery({
    queryKey: ['studentContentSkills', studentProfile?.id, studentId, classId, classData?.subject, classData?.grade, isClassView, student?.name, pabloRealSkillScores?.length],
    queryFn: async () => {
      console.log('Fetching content skills for:', { 
        studentName: student?.name, 
        isPablo: isPabloLuisGarcia,
        isBetty: isBettyJohnson,
        isClassView, 
        classId,
        className,
        classSubject: classData?.subject,
        classGrade: classData?.grade,
        studentProfileId: studentProfile?.id,
        hasMockData: hasMockData(),
        realDataCount: pabloRealSkillScores?.length || 0
      });
      
      // Use enhanced data merging for Pablo Luis Garcia
      if (isPabloLuisGarcia) {
        if (classData) {
          // Class-specific mock data for Pablo with real data overlay
          if (classData.subject === 'Geography' && classData.grade === 'Grade 11') {
            console.log('Using merged real + mock Geography data for Pablo Luis Garcia');
            const mergedData = mergeRealAndMockData(mockPabloGeographyContentSkillScores, pabloRealSkillScores || []);
            return Promise.resolve(mergedData);
          }
          if (classData.subject === 'Math' && classData.grade === 'Grade 10') {
            console.log('Using merged real + mock Math data for Pablo Luis Garcia');
            const mergedData = mergeRealAndMockData(mockPabloContentSkillScores, pabloRealSkillScores || []);
            return Promise.resolve(mergedData);
          }
        } else {
          // General profile view - use merged data for Pablo
          console.log('Using merged real + mock content skills for Pablo Luis Garcia');
          const mergedData = mergeRealAndMockData(mockPabloContentSkillScores, pabloRealSkillScores || []);
          return Promise.resolve(mergedData);
        }
      }

      // Use mock data for Betty Johnson
      if (isBettyJohnson) {
        if (classData) {
          // Class-specific mock data for Betty
          if (classData.subject === 'Geography' && classData.grade === 'Grade 11') {
            console.log('Using mock Geography data for Betty Johnson');
            return Promise.resolve(mockBettyGeographyContentSkillScores);
          }
          // For other subjects, use general mock data
          console.log('Using mock content skills for Betty Johnson in', classData.subject);
          return Promise.resolve(mockBettyContentSkillScores);
        } else {
          // General profile view - use general mock data for Betty
          console.log('Using general mock content skills for Betty Johnson');
          return Promise.resolve(mockBettyContentSkillScores);
        }
      }
      
      // Try student profile ID first, then fallback to active student ID
      const searchId = studentProfile?.id || studentId;
      return getStudentContentSkillScores(searchId);
    },
    enabled: !!student, // Wait for student data to load first
    staleTime: hasMockData() ? 0 : 0, // Don't cache to always get fresh real data
  });

  // Fetch subject skill scores with enhanced mock data support for both students
  const { data: subjectSkillScores = [], isLoading: subjectSkillsLoading } = useQuery({
    queryKey: ['studentSubjectSkills', studentProfile?.id, studentId, classId, classData?.subject, classData?.grade, student?.name],
    queryFn: async () => {
      console.log('Fetching subject skills for:', { 
        studentName: student?.name, 
        isPablo: isPabloLuisGarcia,
        isBetty: isBettyJohnson,
        isClassView, 
        classId,
        className,
        classSubject: classData?.subject,
        classGrade: classData?.grade,
        studentProfileId: studentProfile?.id,
        hasMockData: hasMockData()
      });
      
      // Use mock data for Pablo Luis Garcia
      if (isPabloLuisGarcia) {
        if (classData) {
          // Class-specific mock data for Pablo
          if (classData.subject === 'Geography' && classData.grade === 'Grade 11') {
            console.log('Using mock Geography subject skills for Pablo Luis Garcia');
            return Promise.resolve(mockPabloGeographySubjectSkillScores);
          }
          if (classData.subject === 'Math' && classData.grade === 'Grade 10') {
            console.log('Using mock Math subject skills for Pablo Luis Garcia');
            return Promise.resolve(mockPabloSubjectSkillScores);
          }
        } else {
          // General profile view - use general mock data for Pablo
          console.log('Using general mock subject skills for Pablo Luis Garcia');
          return Promise.resolve(mockPabloSubjectSkillScores);
        }
      }

      // Use mock data for Betty Johnson
      if (isBettyJohnson) {
        if (classData) {
          // Class-specific mock data for Betty
          if (classData.subject === 'Geography' && classData.grade === 'Grade 11') {
            console.log('Using mock Geography subject skills for Betty Johnson');
            return Promise.resolve(mockBettyGeographySubjectSkillScores);
          }
          // For other subjects, use general mock data
          console.log('Using mock subject skills for Betty Johnson in', classData.subject);
          return Promise.resolve(mockBettySubjectSkillScores);
        } else {
          // General profile view - use general mock data for Betty
          console.log('Using general mock subject skills for Betty Johnson');
          return Promise.resolve(mockBettySubjectSkillScores);
        }
      }
      
      // Try student profile ID first, then fallback to active student ID
      const searchId = studentProfile?.id || studentId;
      console.log('📈 Fetching subject skills using ID:', searchId);
      return getStudentSubjectSkillScores(searchId);
    },
    enabled: !!student, // Wait for student data to load first
    staleTime: hasMockData() ? 24 * 60 * 60 * 1000 : 0, // 24 hours cache for mock data
  });

  // Fetch content skills for the class to show complete skill set
  const { data: classContentSkills = [], isLoading: classContentSkillsLoading, refetch: classContentSkillsRefetch } = useQuery({
    queryKey: ['classLinkedContentSkills', classId],
    queryFn: () => classId ? getLinkedContentSkillsForClass(classId) : Promise.resolve([]),
    enabled: !!classId && isClassView,
  });

  // Fetch subject skills for the class to show complete skill set
  const { data: classSubjectSkills = [], isLoading: classSubjectSkillsLoading, refetch: classSubjectSkillsRefetch } = useQuery({
    queryKey: ['classLinkedSubjectSkills', classId],
    queryFn: () => classId ? getLinkedSubjectSkillsForClass(classId) : Promise.resolve([]),
    enabled: !!classId && isClassView,
  });

  // Universal auto-linking: Link ANY class to skills based on subject/grade when class data loads
  useEffect(() => {
    const autoLinkSkills = async () => {
      if (classData && classId && classData.subject && classData.grade) {
        try {
          console.log(`Auto-linking ${classData.grade} ${classData.subject} class to skills`);
          
          // Try to link Content-Specific Skills
          try {
            const allContentSkills = await getContentSkillsBySubjectAndGrade(classData.subject, classData.grade);
            if (allContentSkills.length > 0) {
              const contentSkillIds = allContentSkills.map(skill => skill.id);
              await linkClassToContentSkills(classId, contentSkillIds);
              console.log(`Successfully linked class to ${contentSkillIds.length} ${classData.grade} ${classData.subject} content skills`);
            } else {
              console.log(`No content skills found for ${classData.grade} ${classData.subject} - will work when skills are added`);
            }
          } catch (error) {
            console.log(`Content skills not available yet for ${classData.grade} ${classData.subject}:`, error);
          }
          
          // Try to link Subject-Specific Skills
          try {
            const allSubjectSkills = await getSubjectSkillsBySubjectAndGrade(classData.subject, classData.grade);
            if (allSubjectSkills.length > 0) {
              const subjectSkillIds = allSubjectSkills.map(skill => skill.id);
              await linkClassToSubjectSkills(classId, subjectSkillIds);
              console.log(`Successfully linked class to ${subjectSkillIds.length} ${classData.grade} ${classData.subject} subject skills`);
            } else {
              console.log(`No subject skills found for ${classData.grade} ${classData.subject} - will work when skills are added`);
            }
          } catch (error) {
            console.log(`Subject skills not available yet for ${classData.grade} ${classData.subject}:`, error);
          }
          
          // Trigger refetch of both skill types to show any newly linked skills
          if (classContentSkillsRefetch) {
            classContentSkillsRefetch();
          }
          if (classSubjectSkillsRefetch) {
            classSubjectSkillsRefetch();
          }
        } catch (error) {
          console.error(`Failed to auto-link ${classData.grade} ${classData.subject} skills:`, error);
        }
      }
    };

    if (classData) {
      autoLinkSkills();
    }
  }, [classData, classId]);

  // Fetch enrolled classes for the student
  const { data: enrolledClasses = [], isLoading: enrolledClassesLoading } = useQuery({
    queryKey: ['studentEnrolledClasses', studentId],
    queryFn: () => getStudentEnrolledClasses(studentId),
    enabled: !!studentId,
  });

  console.log('🔄 useStudentProfileData summary:', {
    studentId,
    studentName: student?.name,
    studentProfileId: studentProfile?.id,
    testResultsCount: testResults.length,
    contentSkillScoresCount: contentSkillScores.length,
    subjectSkillScoresCount: subjectSkillScores.length,
    enrolledClassesCount: enrolledClasses.length,
    classId,
    className,
    classSubject: classData?.subject,
    classGrade: classData?.grade,
    classContentSkillsCount: classContentSkills.length,
    classSubjectSkillsCount: classSubjectSkills.length,
    usingMockData: hasMockData(),
    isPablo: isPabloLuisGarcia,
    isBetty: isBettyJohnson,
    correctedProfileId: getCorrectStudentProfileId(student?.name),
    pabloRealDataCount: pabloRealSkillScores?.length || 0
  });

  return {
    student,
    studentLoading: studentLoading || studentProfileLoading,
    studentProfile,
    classData,
    classLoading,
    testResults,
    testResultsLoading,
    contentSkillScores,
    contentSkillsLoading,
    subjectSkillScores,
    subjectSkillsLoading,
    classContentSkills,
    classContentSkillsLoading,
    classSubjectSkills,
    classSubjectSkillsLoading,
    enrolledClasses,
    enrolledClassesLoading,
    isPabloLuisGarcia,
    isBettyJohnson,
    isClassView,
    hasMockData
  };
}
