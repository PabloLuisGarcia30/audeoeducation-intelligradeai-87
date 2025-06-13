
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Database, Activity } from 'lucide-react';

interface IndexInfo {
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface QueryPerformance {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
}

export const DatabaseIndexMonitor = () => {
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [performance, setPerformance] = useState<QueryPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupResult, setCleanupResult] = useState<string>('');

  const targetTables = [
    'class_sessions', 'student_exercises', 'exams', 'test_results',
    'active_classes', 'class_enrollments', 'grading_jobs', 'mistake_patterns',
    'content_skill_scores', 'subject_skill_scores'
  ];

  useEffect(() => {
    fetchIndexes();
    fetchPerformance();
  }, []);

  const fetchIndexes = async () => {
    try {
      const { data, error } = await supabase.rpc('execute_raw_sql', {
        sql_query: `
          SELECT tablename, indexname, indexdef
          FROM pg_indexes
          WHERE tablename = ANY($1)
          ORDER BY tablename, indexname;
        `,
        sql_params: [targetTables]
      });

      if (error) throw error;
      setIndexes(data || []);
    } catch (error) {
      console.error('Error fetching indexes:', error);
    }
  };

  const fetchPerformance = async () => {
    try {
      // Note: pg_stat_statements might not be available in all Supabase instances
      const { data, error } = await supabase.rpc('execute_raw_sql', {
        sql_query: `
          SELECT 
            query,
            calls,
            total_time,
            mean_time
          FROM pg_stat_statements
          WHERE query ILIKE ANY(ARRAY['%class_sessions%', '%student_exercises%', '%test_results%'])
          ORDER BY total_time DESC
          LIMIT 10;
        `
      });

      if (!error && data) {
        setPerformance(data);
      }
    } catch (error) {
      console.log('Performance stats not available (pg_stat_statements extension)');
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_old_cache');
      if (error) throw error;
      setCleanupResult('Cleanup completed successfully');
    } catch (error) {
      setCleanupResult(`Cleanup failed: ${error.message}`);
    }
  };

  const getIndexStatus = (tableName: string, expectedIndexes: string[]) => {
    const tableIndexes = indexes.filter(idx => idx.tablename === tableName);
    const foundIndexes = expectedIndexes.filter(expected => 
      tableIndexes.some(idx => idx.indexname.includes(expected))
    );
    return {
      found: foundIndexes.length,
      total: expectedIndexes.length,
      missing: expectedIndexes.filter(expected => 
        !tableIndexes.some(idx => idx.indexname.includes(expected))
      )
    };
  };

  const indexChecks = [
    {
      table: 'class_sessions',
      expected: ['teacher_id', 'teacher_active_created']
    },
    {
      table: 'student_exercises', 
      expected: ['student_id', 'student_created', 'student_status_created']
    },
    {
      table: 'test_results',
      expected: ['exam_id', 'student_id', 'authenticated_student_id']
    },
    {
      table: 'grading_jobs',
      expected: ['created_at', 'status_priority_created']
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 animate-spin" />
            <span>Loading database indexes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Database Index Monitor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="indexes">
            <TabsList>
              <TabsTrigger value="indexes">Index Status</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>

            <TabsContent value="indexes" className="space-y-4">
              <div className="grid gap-4">
                {indexChecks.map(({ table, expected }) => {
                  const status = getIndexStatus(table, expected);
                  return (
                    <Card key={table}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{table}</h3>
                            <p className="text-sm text-muted-foreground">
                              {status.found}/{status.total} expected indexes found
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {status.found === status.total ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Missing {status.total - status.found}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {status.missing.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-red-600">
                              Missing: {status.missing.join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              {performance.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Slowest Queries</h3>
                  {performance.map((query, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="space-y-1">
                          <code className="text-xs bg-gray-100 p-1 rounded block">
                            {query.query.substring(0, 100)}...
                          </code>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Calls: {query.calls}</span>
                            <span>Avg: {Math.round(query.mean_time)}ms</span>
                            <span>Total: {Math.round(query.total_time)}ms</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Performance statistics not available (requires pg_stat_statements extension)
                </p>
              )}
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Cache Cleanup</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Remove old completed grading jobs (older than 30 days)
                      </p>
                      <Button onClick={runCleanup} size="sm">
                        Run Cleanup
                      </Button>
                      {cleanupResult && (
                        <p className="text-xs mt-2 text-green-600">{cleanupResult}</p>
                      )}
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Index Usage Stats</h3>
                      <p className="text-sm text-muted-foreground">
                        Total indexes found: {indexes.length}
                      </p>
                      <div className="mt-2 space-y-1">
                        {targetTables.map(table => {
                          const tableIndexes = indexes.filter(idx => idx.tablename === table);
                          return (
                            <div key={table} className="text-xs">
                              <span className="font-mono">{table}:</span>
                              <span className="ml-2">{tableIndexes.length} indexes</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
