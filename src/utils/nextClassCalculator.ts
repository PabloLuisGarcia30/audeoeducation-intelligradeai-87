
import { addDays, format, isAfter, startOfDay } from "date-fns";

// Simple interface without external dependencies
interface SimpleClass {
  name: string;
  day_of_week?: string[];
  class_time?: string;
  end_time?: string;
}

export function calculateNextClass(classData: SimpleClass) {
  if (!classData.day_of_week || classData.day_of_week.length === 0) {
    return null;
  }

  const today = startOfDay(new Date());
  const dayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };

  // Find the next occurrence of any scheduled day
  for (let i = 0; i < 14; i++) { // Check next 2 weeks
    const checkDate = addDays(today, i);
    const dayOfWeek = checkDate.getDay();
    
    const scheduledDay = classData.day_of_week.find(day => 
      dayMap[day] === dayOfWeek
    );

    if (scheduledDay) {
      return {
        date: checkDate,
        dayName: scheduledDay,
        formattedDate: format(checkDate, 'MMM d, yyyy'),
        time: classData.class_time || 'No time set'
      };
    }
  }

  return null;
}

export function getNextClassDate(classData: SimpleClass): string {
  const nextClass = calculateNextClass(classData);
  return nextClass ? nextClass.formattedDate : 'No upcoming class';
}
