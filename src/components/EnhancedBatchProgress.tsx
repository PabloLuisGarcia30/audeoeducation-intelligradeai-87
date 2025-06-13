
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, DollarSign, Target, AlertCircle } from 'lucide-react';
import { EnhancedBatchProcessingService, EnhancedBatchJob } from '@/services/enhancedBatchProcessingService';

interface EnhancedBatchProgressProps {
  jobId: string;
  onComplete?: (results: any[]) => void;
}

export const EnhancedBatchProgress: React.FC<EnhancedBatchProgressProps> = ({
  jobId,
  onComplete
}) => {
  const [job, setJob] = useState<EnhancedBatchJob | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    let mounted = true;

    const loadInitialJob = async () => {
      try {
        const initialJob = await EnhancedBatchProcessingService.getJob(jobId);
        if (mounted && initialJob) {
          setJob(initialJob);
          setLoading(false);
          
          // Check if already completed
          if (initialJob.status === 'completed' && onComplete) {
            onComplete(initialJob.results);
          }
        }
      } catch (error) {
        console.error('Error loading initial job:', error);
        setLoading(false);
      }
    };

    // Subscribe to real-time updates
    EnhancedBatchProcessingService.subscribeToJob(jobId, (updatedJob) => {
      if (!mounted) return;
      
      console.log(`📦 Job update received: ${updatedJob.status}`);
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed' && onComplete) {
        onComplete(updatedJob.results);
      }
    });

    loadInitialJob();

    return () => {
      mounted = false;
      EnhancedBatchProcessingService.unsubscribeFromJob(jobId);
    };
  }, [jobId, onComplete]);

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Loading batch job...</span>
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

  const totalFiles = job.files.length;
  const processedFiles = Math.floor((job.progress / 100) * totalFiles);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Database-Backed Batch Processing</CardTitle>
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
            <span>{job.progress.toFixed(1)}%</span>
          </div>
          <Progress value={job.progress} className="w-full" />
        </div>

        {/* Job Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">
                {job.estimatedTimeRemaining ? `${Math.ceil(job.estimatedTimeRemaining / 1000)}s remaining` : 'Calculating...'}
              </div>
              <div className="text-xs text-gray-500">Time Remaining</div>
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
              <div className="text-sm font-medium">Database Queue</div>
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
        {job.startedAt && (
          <div className="text-sm text-gray-600">
            {job.status === 'completed' && job.completedAt ? (
              <span>✅ Completed in {formatTime(job.completedAt - job.startedAt)}</span>
            ) : job.status === 'processing' ? (
              <span>⏱️ Running for {formatTime(Date.now() - job.startedAt)}</span>
            ) : (
              <span>⏳ Queued since {new Date(job.createdAt).toLocaleTimeString()}</span>
            )}
          </div>
        )}

        {/* Errors */}
        {job.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-1">
              <AlertCircle className="h-4 w-4" />
              {job.errors.length} Error{job.errors.length > 1 ? 's' : ''}
            </div>
            <div className="text-red-700 text-xs">
              {job.errors.slice(0, 2).map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
              {job.errors.length > 2 && (
                <div>• ... and {job.errors.length - 2} more</div>
              )}
            </div>
          </div>
        )}

        {/* Success Summary */}
        {job.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-green-800 text-sm font-medium">
              🎉 Batch processing completed successfully!
            </div>
            <div className="text-green-700 text-xs mt-1">
              {job.results.length} files processed using database-backed queue
            </div>
          </div>
        )}

        {/* Database Queue Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="text-blue-800 text-xs font-medium mb-1">
            ✨ Database-Backed Processing Benefits:
          </div>
          <div className="text-blue-700 text-xs space-y-1">
            <div>• Persistent job state - survives browser refresh</div>
            <div>• Horizontal scaling across multiple servers</div>
            <div>• Real-time progress updates via Supabase</div>
            <div>• Automatic retry and error handling</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
