
import { useAuth } from "@/contexts/AuthContext";

export function useTeacherAuth() {
  const { profile, user } = useAuth();

  const isTeacher = profile?.role === 'teacher';
  const teacherUUID = user?.id; // Use for all database operations
  const displayTeacherId = profile?.display_teacher_id; // Use for UI display only
  const teacherName = profile?.full_name;

  return {
    isTeacher,
    teacherUUID,
    displayTeacherId,
    teacherName,
    isAuthenticated: !!user,
    profile
  };
}
