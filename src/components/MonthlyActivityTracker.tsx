
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp, Target } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ResponsiveContainer, Cell, XAxis, YAxis, Tooltip, ScatterChart, Scatter } from "recharts";

interface ActivityData {
  day: number;
  timeSlot: number;
  intensity: number;
  activities: string[];
  count: number;
}

const timeSlots = [
  { slot: 0, label: "6 AM" },
  { slot: 1, label: "8 AM" },
  { slot: 2, label: "10 AM" },
  { slot: 3, label: "12 PM" },
  { slot: 4, label: "2 PM" },
  { slot: 5, label: "4 PM" },
  { slot: 6, label: "6 PM" },
  { slot: 7, label: "8 PM" },
  { slot: 8, label: "10 PM" }
];

// Generate mock activity data for the current month
const generateMockActivityData = (): ActivityData[] => {
  const data: ActivityData[] = [];
  const currentDate = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    for (let timeSlot = 0; timeSlot < timeSlots.length; timeSlot++) {
      const intensity = Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0;
      const activities = [];
      
      if (intensity > 0) {
        const possibleActivities = [
          "Goal completed", "Study session", "Practice exercise", 
          "Achievement unlocked", "Progress update", "Lesson review"
        ];
        const activityCount = Math.min(intensity, 3);
        for (let i = 0; i < activityCount; i++) {
          activities.push(possibleActivities[Math.floor(Math.random() * possibleActivities.length)]);
        }
      }
      
      data.push({
        day,
        timeSlot,
        intensity,
        activities,
        count: activities.length
      });
    }
  }
  
  return data;
};

const getIntensityColor = (intensity: number): string => {
  if (intensity === 0) return "#f3f4f6";
  if (intensity === 1) return "#dbeafe";
  if (intensity === 2) return "#93c5fd";
  if (intensity === 3) return "#3b82f6";
  if (intensity === 4) return "#1d4ed8";
  return "#1e3a8a";
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    const timeLabel = timeSlots[data.timeSlot]?.label || "Unknown time";
    
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{`Day ${data.day} at ${timeLabel}`}</p>
        <p className="text-sm text-gray-600">{`Activities: ${data.count}`}</p>
        {data.activities.length > 0 && (
          <div className="mt-2">
            {data.activities.slice(0, 3).map((activity: string, index: number) => (
              <Badge key={index} variant="outline" className="mr-1 text-xs">
                {activity}
              </Badge>
            ))}
            {data.activities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{data.activities.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function MonthlyActivityTracker() {
  const activityData = generateMockActivityData();
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Calculate stats
  const totalActivities = activityData.reduce((sum, item) => sum + item.count, 0);
  const activeDays = new Set(activityData.filter(item => item.count > 0).map(item => item.day)).size;
  const peakTimeSlot = timeSlots[
    activityData.reduce((prev, current) => 
      activityData.filter(item => item.timeSlot === current.timeSlot).reduce((sum, item) => sum + item.count, 0) >
      activityData.filter(item => item.timeSlot === prev).reduce((sum, item) => sum + item.count, 0) 
        ? current.timeSlot : prev, 0
    )
  ];

  // Create grid data for heatmap visualization
  const gridData = activityData.map(item => ({
    x: item.day,
    y: item.timeSlot,
    intensity: item.intensity,
    ...item
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Monthly Activity Tracker
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Your learning activity patterns for {currentMonth}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-green-500" />
              <span className="font-medium">{totalActivities}</span>
              <span className="text-gray-600">activities</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="font-medium">{activeDays}</span>
              <span className="text-gray-600">active days</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activity Heatmap */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Activity Heatmap</h3>
            <p className="text-sm text-gray-600">
              Darker colors indicate higher activity levels. Hover for details.
            </p>
          </div>
          
          {/* Custom Grid Heatmap */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Time labels */}
              <div className="flex mb-2">
                <div className="w-12"></div>
                {Array.from({ length: 31 }, (_, i) => (
                  <div key={i + 1} className="w-6 text-xs text-center text-gray-500">
                    {i + 1}
                  </div>
                ))}
              </div>
              
              {/* Grid rows */}
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot.slot} className="flex items-center mb-1">
                  <div className="w-12 text-xs text-gray-500 text-right pr-2">
                    {timeSlot.label}
                  </div>
                  {Array.from({ length: 31 }, (_, day) => {
                    const cellData = activityData.find(
                      item => item.day === day + 1 && item.timeSlot === timeSlot.slot
                    );
                    return (
                      <div
                        key={day + 1}
                        className="w-6 h-6 mx-px border border-gray-200 rounded-full cursor-pointer hover:scale-110 transition-transform"
                        style={{ 
                          backgroundColor: getIntensityColor(cellData?.intensity || 0)
                        }}
                        title={`Day ${day + 1} at ${timeSlot.label}: ${cellData?.count || 0} activities`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Less</span>
              {[0, 1, 2, 3, 4, 5].map((intensity) => (
                <div
                  key={intensity}
                  className="w-4 h-4 border border-gray-200 rounded-full"
                  style={{ backgroundColor: getIntensityColor(intensity) }}
                />
              ))}
              <span className="text-sm text-gray-600">More</span>
            </div>
            
            {peakTimeSlot && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-gray-600">Peak time:</span>
                <Badge variant="outline">{peakTimeSlot.label}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{totalActivities}</div>
            <div className="text-sm text-green-800">Total Activities</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{activeDays}</div>
            <div className="text-sm text-blue-800">Active Days</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {activeDays > 0 ? Math.round((totalActivities / activeDays) * 10) / 10 : 0}
            </div>
            <div className="text-sm text-purple-800">Avg per Active Day</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
