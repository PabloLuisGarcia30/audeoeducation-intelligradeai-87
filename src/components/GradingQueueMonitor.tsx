
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Play,
  X,
  RotateCcw
} from 'lucide-react';
import { GradingQueueService, type GradingJob, type QueueStats } from '@/services/gradingQueueService';
import { useToast } from '@/hooks/use-toast';

export const GradingQueueMonitor: React.FC = () => {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [jobs, setJobs] = useState<GradingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [queueStats, userJobs] = await Promise.all([
        GradingQueueService.getQueueStats(),
        GradingQueueService.getUserJobs(undefined, { limit: 20 })
      ]);
      
      setStats(queueStats);
      setJobs(userJobs);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load queue data:', error);
      toast({
        title: "Error",
        description: "Failed to load queue data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerWorker = async () => {
    try {
      await GradingQueueService.triggerWorker();
      toast({
        title: "Success",
        description: "Queue worker triggered successfully"
      });
      setTimeout(loadData, 2000); // Refresh after 2 seconds
    } catch (error) {
      console.error('Failed to trigger worker:', error);
      toast({
        title: "Error",
        description: "Failed to trigger worker",
        variant: "destructive"
      });
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const success = await GradingQueueService.cancelJob(jobId);
      if (success) {
        toast({
          title: "Success",
          description: "Job cancelled successfully"
        });
        loadData();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive"
      });
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const success = await GradingQueueService.retryJob(jobId);
      if (success) {
        toast({
          title: "Success",
          description: "Job queued for retry"
        });
        loadData();
      }
    } catch (error) {
      console.error('Failed to retry job:', error);
      toast({
        title: "Error",
        description: "Failed to retry job",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    const icons = {
      pending: Clock,
      processing: Activity,
      completed: CheckCircle,
      failed: AlertTriangle
    };
    
    const Icon = icons[status] || Clock;
    
    return (
      <Badge className={variants[status] || variants.pending}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-gray-100 text-gray-800',
      low: 'bg-gray-50 text-gray-600'
    };
    
    return (
      <Badge className={variants[priority] || variants.normal}>
        {priority}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading queue monitor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grading Queue Monitor</h2>
          <p className="text-gray-600">Real-time monitoring of grading jobs and queue performance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={triggerWorker}>
            <Play className="h-4 w-4 mr-2" />
            Trigger Worker
          </Button>
        </div>
      </div>

      {/* Queue Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending_jobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Processing</p>
                  <p className="text-2xl font-bold">{stats.processing_jobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold">{stats.completed_jobs_today}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Failed Today</p>
                  <p className="text-2xl font-bold">{stats.failed_jobs_today}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Avg Time</p>
                  <p className="text-2xl font-bold">
                    {stats.avg_processing_time_ms ? Math.round(stats.avg_processing_time_ms / 1000) : 0}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No jobs found
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{job.id.slice(0, 8)}</span>
                      {getStatusBadge(job.status)}
                      {getPriorityBadge(job.priority)}
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => cancelJob(job.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                      {job.status === 'failed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => retryJob(job.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Questions:</span>
                      <span className="ml-1 font-medium">
                        {job.payload.questions?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-1">
                        {new Date(job.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Retries:</span>
                      <span className="ml-1">{job.retries}/{job.max_retries}</span>
                    </div>
                    {job.processing_time_ms && (
                      <div>
                        <span className="text-gray-500">Processing Time:</span>
                        <span className="ml-1">{Math.round(job.processing_time_ms / 1000)}s</span>
                      </div>
                    )}
                  </div>
                  
                  {job.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {job.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
