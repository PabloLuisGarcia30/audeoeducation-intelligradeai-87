
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, CheckCircle2, Clock } from "lucide-react";
import { type StudentGoal } from "@/services/smartGoalService";

interface GoalCalendarProps {
  goals: StudentGoal[];
}

export function GoalCalendar({ goals }: GoalCalendarProps) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Create calendar grid
  const calendarDays = [];
  const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;
  
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - startingDayOfWeek + 1;
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const date = isCurrentMonth ? new Date(currentYear, currentMonth, dayNumber) : null;
    
    calendarDays.push({
      dayNumber: isCurrentMonth ? dayNumber : null,
      date,
      isToday: date && date.toDateString() === currentDate.toDateString(),
      isCurrentMonth
    });
  }
  
  // Get goals for specific date
  const getGoalsForDate = (date: Date) => {
    return goals.filter(goal => {
      if (!goal.target_date) return false;
      const goalDate = new Date(goal.target_date);
      return goalDate.toDateString() === date.toDateString();
    });
  };
  
  // Get milestones for date (simplified - would need more complex logic for actual milestone dates)
  const getMilestonesForDate = (date: Date) => {
    // This is a simplified version - you might want to track milestone due dates separately
    return [];
  };
  
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-500" />
            {monthName} - Goal Calendar
          </CardTitle>
        </CardHeader>
      </Card>
      
      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const goalsForDay = day.date ? getGoalsForDate(day.date) : [];
              const milestonesForDay = day.date ? getMilestonesForDate(day.date) : [];
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border rounded-lg transition-colors
                    ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'}
                    ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                  `}
                >
                  {day.dayNumber && (
                    <>
                      {/* Day Number */}
                      <div className={`
                        text-sm font-semibold mb-2
                        ${day.isToday ? 'text-blue-600' : 'text-gray-700'}
                      `}>
                        {day.dayNumber}
                      </div>
                      
                      {/* Goals for this day */}
                      <div className="space-y-1">
                        {goalsForDay.map(goal => (
                          <div
                            key={goal.id}
                            className={`
                              text-xs p-1 rounded border-l-2 truncate
                              ${goal.status === 'completed' ? 
                                'bg-green-100 border-green-400 text-green-700' :
                                goal.progress_percentage >= 80 ?
                                'bg-blue-100 border-blue-400 text-blue-700' :
                                'bg-yellow-100 border-yellow-400 text-yellow-700'
                              }
                            `}
                          >
                            <div className="flex items-center gap-1">
                              {goal.status === 'completed' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Target className="h-3 w-3" />
                              )}
                              <span className="truncate">{goal.goal_title}</span>
                            </div>
                          </div>
                        ))}
                        
                        {milestonesForDay.map((milestone, mIndex) => (
                          <div
                            key={mIndex}
                            className="text-xs p-1 rounded bg-purple-100 border-l-2 border-purple-400 text-purple-700 truncate"
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="truncate">Milestone</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-2 border-green-400 rounded"></div>
              <span className="text-sm">Completed Goals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-l-2 border-blue-400 rounded"></div>
              <span className="text-sm">On Track Goals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-l-2 border-yellow-400 rounded"></div>
              <span className="text-sm">Needs Attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border-l-2 border-purple-400 rounded"></div>
              <span className="text-sm">Milestones</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Upcoming Deadlines */}
      {goals.filter(g => g.target_date && g.status === 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals
                .filter(goal => goal.target_date && goal.status === 'active')
                .sort((a, b) => new Date(a.target_date!).getTime() - new Date(b.target_date!).getTime())
                .slice(0, 5)
                .map(goal => {
                  const daysUntil = Math.ceil((new Date(goal.target_date!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">{goal.goal_title}</div>
                          <div className="text-sm text-gray-600">
                            {Math.round(goal.progress_percentage)}% complete
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline" 
                          className={
                            daysUntil < 0 ? 'border-red-300 text-red-700' :
                            daysUntil <= 3 ? 'border-amber-300 text-amber-700' :
                            'border-green-300 text-green-700'
                          }
                        >
                          {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                           daysUntil === 0 ? 'Due today' :
                           `${daysUntil} days left`}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(goal.target_date!).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
