
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Database, RefreshCw, Brain, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedDataMigrationService } from '@/services/unifiedDataMigrationService';
import { SkillAutoCreationService, type SkillAutoCreationStats } from '@/services/skillAutoCreationService';

export function UnifiedDataMigrationPanel() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [autoCreationStats, setAutoCreationStats] = useState<SkillAutoCreationStats | null>(null);

  useEffect(() => {
    loadAutoCreationStats();
  }, []);

  const loadAutoCreationStats = async () => {
    try {
      const stats = await SkillAutoCreationService.getAutoCreationStats(30);
      setAutoCreationStats(stats);
    } catch (error) {
      console.error('Error loading auto-creation stats:', error);
    }
  };

  const runMigration = async () => {
    try {
      setMigrationStatus('running');
      setProgress(0);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await UnifiedDataMigrationService.runCompleteMigration();
      
      clearInterval(progressInterval);
      setProgress(100);
      setMigrationResult(result);
      
      if (result.success) {
        setMigrationStatus('completed');
        toast.success(`Migration completed! ${result.totalMigrated} records migrated.`);
        // Reload auto-creation stats after migration
        await loadAutoCreationStats();
      } else {
        setMigrationStatus('error');
        toast.error(`Migration failed: ${result.error}`);
      }
    } catch (error) {
      setMigrationStatus('error');
      setProgress(0);
      console.error('Migration error:', error);
      toast.error('Migration failed with an unexpected error.');
    }
  };

  const resetMigration = () => {
    setMigrationStatus('idle');
    setMigrationResult(null);
    setProgress(0);
  };

  const getStatusIcon = () => {
    switch (migrationStatus) {
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Database className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (migrationStatus) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Unified Data Migration
          </CardTitle>
          <p className="text-sm text-gray-600">
            Migrate existing practice exercise and misconception data to the new unified results system with auto-creation support.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">Migration Status</span>
            </div>
            <Badge className={getStatusColor()}>
              {migrationStatus.charAt(0).toUpperCase() + migrationStatus.slice(1)}
            </Badge>
          </div>

          {/* Progress Bar */}
          {migrationStatus === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Migration Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results */}
          {migrationResult && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-gray-900">Migration Results</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Skill Results:</span>
                  <span className="ml-2 font-medium">{migrationResult.details?.skillResults || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Misconceptions:</span>
                  <span className="ml-2 font-medium">{migrationResult.details?.misconceptions || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Exam Mappings:</span>
                  <span className="ml-2 font-medium">{migrationResult.details?.examMappings || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Migrated:</span>
                  <span className="ml-2 font-medium text-blue-600">{migrationResult.totalMigrated || 0}</span>
                </div>
              </div>
              {migrationResult.error && (
                <div className="text-red-600 text-sm">
                  <strong>Error:</strong> {migrationResult.error}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={runMigration}
              disabled={migrationStatus === 'running'}
              className="flex-1"
            >
              {migrationStatus === 'running' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Start Migration
                </>
              )}
            </Button>
            
            {migrationStatus !== 'idle' && migrationStatus !== 'running' && (
              <Button variant="outline" onClick={resetMigration}>
                Reset
              </Button>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> This migration will copy existing data to the unified results tables with enhanced auto-creation support. 
                It's safe to run multiple times and will not duplicate data.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Creation Statistics */}
      {autoCreationStats && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Skill Auto-Creation Statistics
            </CardTitle>
            <p className="text-sm text-gray-600">
              Statistics for automatically created skills in the last 30 days.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Plus className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-800">{autoCreationStats.totalAutoCreated}</div>
                <div className="text-sm text-green-600">Auto-Created Skills</div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <AlertCircle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-800">{autoCreationStats.totalQueuedForReview}</div>
                <div className="text-sm text-orange-600">Pending Review</div>
              </div>
            </div>

            {/* Recent Creations */}
            {autoCreationStats.recentCreations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Recent Auto-Created Skills</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {autoCreationStats.recentCreations.slice(0, 5).map((creation) => (
                    <div key={creation.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {creation.skillType}
                        </Badge>
                        <span className="font-medium">{creation.skillName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{(creation.confidence * 100).toFixed(0)}%</span>
                        <span>{new Date(creation.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {autoCreationStats.totalAutoCreated === 0 && autoCreationStats.totalQueuedForReview === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No auto-created skills found in the last 30 days.</p>
                <p className="text-xs">Skills will appear here after exam analysis with auto-creation enabled.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
