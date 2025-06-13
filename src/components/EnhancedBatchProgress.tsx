
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, DollarSign, Target, AlertCircle } from 'lucide-react';
import { FileJobService, type FileJob } from '@/services/fileJobService';

interface EnhancedBatchProgressProps {
  jobId: string;
  onComplete?: (results: any[]) => void;
}

export const EnhancedBatchProgress: React.FC<EnhancedBatchProgressProps> = ({
  jobId,
  onComplete
}) => {
  const [job, setJob] = useState<FileJob | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    let mounted = true;

    const loadInitialJob = async () => {
      try {
        const initialJob = await FileJobService.getJobStatus(jobId);
        if (mounted && initialJob) {
          setJob(initialJob);
          setLoading(false);
          
          // Check if already completed
          if (initialJob.status === 'completed' && onComplete) {
            onComplete(initialJob.result_json?.results || []);
          }
        }
      } catch (error) {
        console.error('Error loading initial file job:', error);
        setLoading(false);
      }
    };

    // Subscribe to real-time updates
    FileJobService.subscribeToJob(jobId, (updatedJob) => {
      if (!mounted) return;
      
      console.log(`📦 File job update received: ${updatedJob.status}`);
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed' && onComplete) {
        onComplete(updatedJob.result_json?.results || []);
      }
    });

    loadInitialJob();

    return () => {
      mounted = false;
      FileJobService.unsubscribeFromJob(jobId);
    };
  }, [jobId, onComplete]);

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Loading decoupled file processing job...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job || !isVisible) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const totalFiles = job.file_group_data?.files?.length || 0;
  const progress = job.result_json?.progress || 0;
  const processedFiles = job.result_json?.processedFiles || 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Decoupled File Processing</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${getStatusColor(job.status)} text-white`}>
            {job.status.toUpperCase()}
          </Badge>
          {job.priority !== 'normal' && (
            <Badge variant="secondary">
              {job.priority.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress: {processedFiles}/{totalFiles} files</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Job Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">
                {job.status === 'processing' ? 'Processing...' : 
                 job.status === 'pending' ? 'Queued' :
                 job.status === 'completed' ? 'Completed' : 'Failed'}
              </div>
              <div className="text-xs text-gray-500">Status</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{totalFiles}</div>
              <div className="text-xs text-gray-500">Total Files</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">Decoupled Queue</div>
              <div className="text-xs text-gray-500">Processing Mode</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">ID: {job.id.slice(-8)}</div>
              <div className="text-xs text-gray-500">Job ID</div>
            </div>
          </div>
        </div>

        {/* Processing Time */}
        {job.started_at && (
          <div className="text-sm text-gray-600">
            {job.status === 'completed' && job.completed_at ? (
              <span>✅ Completed in {formatTime(job.processing_time_ms || 0)}</span>
            ) : job.status === 'processing' ? (
              <span>⏱️ Running for {formatTime(Date.now() - new Date(job.started_at).getTime())}</span>
            ) : (
              <span>⏳ Queued since {new Date(job.created_at).toLocaleTimeString()}</span>
            )}
          </div>
        )}

        {/* Errors */}
        {job.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-1">
              <AlertCircle className="h-4 w-4" />
              Processing Error
            </div>
            <div className="text-red-700 text-xs">
              {job.error_message}
            </div>
          </div>
        )}

        {/* Results Summary */}
        {job.result_json?.results && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-blue-800 text-xs font-medium mb-1">
              📊 Processing Results:
            </div>
            <div className="text-blue-700 text-xs space-y-1">
              <div>• Successful: {job.result_json.results.filter((r: any) => r.success).length}</div>
              <div>• Failed: {job.result_json.results.filter((r: any) => !r.success).length}</div>
              <div>• Processing Method: {job.result_json.metadata?.processingMethod || 'decoupled_processing'}</div>
            </div>
          </div>
        )}

        {/* Success Summary */}
        {job.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-green-800 text-sm font-medium">
              🎉 File processing completed successfully!
            </div>
            <div className="text-green-700 text-xs mt-1">
              {job.result_json?.metadata?.successfulFiles || 0} files processed using decoupled architecture
            </div>
          </div>
        )}

        {/* Architecture Benefits */}
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
          <div className="text-purple-800 text-xs font-medium mb-1">
            🚀 Decoupled Architecture Benefits:
          </div>
          <div className="text-purple-700 text-xs space-y-1">
            <div>• Zero HTTP overhead between components</div>
            <div>• Horizontal scaling with multiple workers</div>
            <div>• Persistent job state across system restarts</div>
            <div>• Real-time progress updates via database</div>
            <div>• Independent worker scaling and deployment</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
