
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTrailblazer } from '@/hooks/useTrailblazer';
import { TrailblazerSessionAnalytics } from '@/components/TrailblazerSessionAnalytics';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Target, 
  Brain, 
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export function TrailblazerSessionRunner() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { 
    activeSession, 
    getSessionMisconceptions, 
    completeSession, 
    isCompletingSession 
  } = useTrailblazer();

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<'learning' | 'practice' | 'reflection'>('learning');

  // Get session misconceptions
  const { data: misconceptions = [], isLoading: misconceptionsLoading } = getSessionMisconceptions(sessionId || '');

  // Timer effect
  useEffect(() => {
    if (!activeSession || isPaused) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, isPaused]);

  // Redirect if no active session
  useEffect(() => {
    if (!activeSession && sessionId) {
      toast.error('No active session found');
      navigate('/student-dashboard/trailblazer');
    }
  }, [activeSession, sessionId, navigate]);

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? 'Session resumed' : 'Session paused');
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;

    try {
      const scoreImprovement = misconceptions.length > 0 ? 15 : 25; // Mock improvement
      
      await completeSession({
        sessionId: activeSession.id,
        actualDuration: Math.floor(timeElapsed / 60),
        scoreImprovement,
        misconceptionEvents: misconceptions.map(m => ({
          misconceptionId: m.misconception_id,
          questionSequence: m.question_sequence,
          resolved: Math.random() > 0.3 // Mock resolution status
        }))
      });

      toast.success('Session completed successfully!');
      navigate('/student-dashboard/trailblazer');
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete session');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sessionProgress = activeSession ? Math.min((timeElapsed / (activeSession.duration_minutes * 60)) * 100, 100) : 0;
  const conceptMastery = Math.max(0, 75 - (misconceptions.length * 5)); // Mock mastery calculation

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Session Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Active Learning Session
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>{activeSession.goal_type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span>{activeSession.focus_concept}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{activeSession.duration_minutes} min planned</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePauseResume}
                className="flex items-center gap-2"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              
              <Button
                onClick={handleCompleteSession}
                disabled={isCompletingSession}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Square className="h-4 w-4" />
                {isCompletingSession ? 'Completing...' : 'Complete Session'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Session Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Session Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Time Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(timeElapsed)} / {activeSession.duration_minutes}:00
                    </span>
                  </div>
                  <Progress value={sessionProgress} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Concept Mastery</span>
                    <span className="text-sm text-muted-foreground">{conceptMastery}%</span>
                  </div>
                  <Progress value={conceptMastery} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Learning Activity Simulator */}
            <Card>
              <CardHeader>
                <CardTitle>Current Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-center space-x-2">
                    {(['learning', 'practice', 'reflection'] as const).map((activity) => (
                      <Button
                        key={activity}
                        variant={currentActivity === activity ? 'default' : 'outline'}
                        onClick={() => setCurrentActivity(activity)}
                        className="capitalize"
                      >
                        {activity}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="p-6 bg-gray-50 rounded-lg text-center">
                    {currentActivity === 'learning' && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Learning Phase</h3>
                        <p className="text-gray-600">
                          Exploring concepts and building understanding of {activeSession.focus_concept}
                        </p>
                      </div>
                    )}
                    
                    {currentActivity === 'practice' && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Practice Phase</h3>
                        <p className="text-gray-600">
                          Applying knowledge through targeted exercises and problem-solving
                        </p>
                      </div>
                    )}
                    
                    {currentActivity === 'reflection' && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Reflection Phase</h3>
                        <p className="text-gray-600">
                          Reviewing progress and consolidating new understanding
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Analytics */}
            <TrailblazerSessionAnalytics sessionId={activeSession.id} />
          </div>

          {/* Sidebar - Session Info & Status */}
          <div className="space-y-6">
            {/* Session Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Session Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {formatTime(timeElapsed)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isPaused ? 'Paused' : 'Active'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Goal:</span>
                    <span className="font-medium capitalize">
                      {activeSession.goal_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Focus:</span>
                    <span className="font-medium">{activeSession.focus_concept}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Duration:</span>
                    <span className="font-medium">{activeSession.duration_minutes} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Learning Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Learning Opportunities</span>
                  <Badge variant="secondary">{misconceptions.length}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Concepts Explored</span>
                  <Badge variant="secondary">3</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mastery Level</span>
                  <Badge variant={conceptMastery >= 80 ? 'default' : 'secondary'}>
                    {conceptMastery >= 80 ? 'High' : conceptMastery >= 60 ? 'Medium' : 'Developing'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review Progress
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Get Help
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Adjust Goal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
