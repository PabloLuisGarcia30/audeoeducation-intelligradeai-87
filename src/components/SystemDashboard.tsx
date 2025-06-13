
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Shield, 
  Zap, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Lock
} from 'lucide-react';
import { BatchProcessingService } from '@/services/batchProcessingService';

export const SystemDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const queueStats = await BatchProcessingService.getQueueStats();
      setStats(queueStats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerProcessing = async () => {
    await BatchProcessingService.triggerProcessing();
    // Refresh stats after triggering
    setTimeout(loadStats, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading system dashboard...</div>
      </div>
    );
  }

  const utilizationPercentage = stats ? Math.round((stats.activeJobs / stats.maxConcurrentJobs) * 100) : 0;
  const apiUtilization = stats ? Math.round((stats.currentApiCallRate / stats.maxApiCallsPerMinute) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Dashboard</h2>
          <p className="text-gray-600">Real-time atomic processing monitor</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Concurrency Control Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Atomic Concurrency Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge className="bg-green-100 text-green-800 mb-2">
                <Lock className="h-3 w-3 mr-1" />
                Row-Level Locking
              </Badge>
              <p className="text-sm text-gray-600">Race condition prevention</p>
            </div>
            <div className="text-center">
              <Badge className="bg-blue-100 text-blue-800 mb-2">
                <Database className="h-3 w-3 mr-1" />
                Atomic Claims
              </Badge>
              <p className="text-sm text-gray-600">FOR UPDATE SKIP LOCKED</p>
            </div>
            <div className="text-center">
              <Badge className="bg-purple-100 text-purple-800 mb-2">
                <Activity className="h-3 w-3 mr-1" />
                Advisory Locks
              </Badge>
              <p className="text-sm text-gray-600">Distributed coordination</p>
            </div>
            <div className="text-center">
              <Badge className="bg-orange-100 text-orange-800 mb-2">
                <Zap className="h-3 w-3 mr-1" />
                Zero Duplicates
              </Badge>
              <p className="text-sm text-gray-600">Guaranteed uniqueness</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      {stats && (
        <>
          {/* Job Processing Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Active Jobs</p>
                    <p className="text-2xl font-bold">{stats.activeJobs}</p>
                    <p className="text-xs text-gray-500">of {stats.maxConcurrentJobs} max</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">{stats.pendingJobs}</p>
                    <p className="text-xs text-gray-500">in queue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold">{stats.completedJobs}</p>
                    <p className="text-xs text-gray-500">total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold">{stats.failedJobs}</p>
                    <p className="text-xs text-gray-500">errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{stats.totalJobs}</p>
                    <p className="text-xs text-gray-500">all time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resource Utilization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Jobs: {stats.activeJobs}/{stats.maxConcurrentJobs}</span>
                    <span>{utilizationPercentage}%</span>
                  </div>
                  <Progress value={utilizationPercentage} className="h-2" />
                </div>
                
                <div className="text-xs text-gray-600">
                  <p>• Max Files per Batch: {stats.maxFilesPerBatch}</p>
                  <p>• Concurrency Control: {stats.concurrencyControl}</p>
                  <p>• Race Prevention: {stats.raceConditionPrevention}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Rate Limiting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Calls: {stats.currentApiCallRate}/{stats.maxApiCallsPerMinute}/min</span>
                    <span>{apiUtilization}%</span>
                  </div>
                  <Progress 
                    value={apiUtilization} 
                    className={`h-2 ${apiUtilization > 80 ? 'bg-red-100' : 'bg-green-100'}`}
                  />
                </div>
                
                <div className="text-xs text-gray-600">
                  <p>• Rate window: 1 minute</p>
                  <p>• Throttling: {apiUtilization > 90 ? 'Active' : 'Inactive'}</p>
                  <p>• Backoff: Exponential</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>System Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button onClick={triggerProcessing} className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Trigger Processing
                </Button>
                
                <div className="text-sm text-gray-600">
                  Manually trigger the atomic job processing cycle
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
