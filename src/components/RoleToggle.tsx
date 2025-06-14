
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GraduationCap, User } from "lucide-react";
import { useDevRole } from "@/contexts/DevRoleContext";
import { DEV_CONFIG } from "@/config/devConfig";

export function RoleToggle() {
  const { currentRole, setCurrentRole, isDevMode } = useDevRole();

  // Show when FORCE_NO_AUTH is true or in dev mode
  if (!DEV_CONFIG.FORCE_NO_AUTH && (!isDevMode || !DEV_CONFIG.DISABLE_AUTH_FOR_DEV)) {
    return null;
  }

  const isStudent = currentRole === 'student';

  const handleToggle = (checked: boolean) => {
    const newRole = checked ? 'student' : 'teacher';
    console.log('🔄 Role toggle:', { from: currentRole, to: newRole });
    setCurrentRole(newRole);
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 rounded-lg border min-w-[280px] w-full">
      <div className="flex items-center gap-3 whitespace-nowrap flex-shrink-0">
        <GraduationCap className="h-5 w-5 text-blue-600" />
        <Label htmlFor="role-toggle" className="text-sm font-medium cursor-pointer">
          Teacher
        </Label>
      </div>
      
      <Switch
        id="role-toggle"
        checked={isStudent}
        onCheckedChange={handleToggle}
        className="flex-shrink-0 mx-2"
      />
      
      <div className="flex items-center gap-3 whitespace-nowrap flex-shrink-0">
        <Label htmlFor="role-toggle" className="text-sm font-medium cursor-pointer">
          Student
        </Label>
        <User className="h-5 w-5 text-green-600" />
      </div>
    </div>
  );
}
