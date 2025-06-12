
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Search, 
  Users, 
  BarChart3, 
  UserCircle, 
  BookOpen, 
  Calendar,
  Brain,
  Activity,
  Target,
  Compass
} from "lucide-react";

interface DashboardSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function DashboardSidebar({ activeView, onViewChange }: DashboardSidebarProps) {
  const menuItems = [
    {
      title: "Main",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'search', label: 'Student Search', icon: Search },
        { id: 'classes', label: 'Classes', icon: Users },
      ]
    },
    {
      title: "Teaching Tools",
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'portals', label: 'Student Portals', icon: UserCircle },
        { id: 'misconceptions', label: 'Misconception Analytics', icon: Brain },
        { id: 'live-sessions', label: 'Live Sessions', icon: Activity },
      ]
    },
    {
      title: "Advanced Features",
      items: [
        { id: 'student-lesson-tracker', label: 'Lesson Tracker', icon: Calendar },
        { id: 'learner-profiles', label: 'Learner Profiles', icon: Target },
        { id: 'trailblazer', label: 'Trailblazer Mode', icon: Compass },
      ]
    }
  ];

  return (
    <Sidebar className="w-64 border-r bg-white">
      <SidebarContent>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900">EduAI Platform</h2>
          <p className="text-sm text-gray-600">Intelligent Learning System</p>
        </div>
        
        <ScrollArea className="flex-1 px-3">
          {menuItems.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onViewChange(item.id)}
                        className={cn(
                          "w-full justify-start",
                          activeView === item.id && "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Brain className="h-4 w-4" />
            <span>AI-Powered Learning</span>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
