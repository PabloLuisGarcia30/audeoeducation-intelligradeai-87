
import { useState, useEffect } from 'react';
import { DatabaseOptimizationService } from '@/services/databaseOptimizationService';

export const useDatabaseOptimization = () => {
  const [healthReport, setHealthReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHealthReport();
  }, []);

  const loadHealthReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const report = await DatabaseOptimizationService.getDatabaseHealthReport();
      setHealthReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health report');
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    try {
      const result = await DatabaseOptimizationService.runCleanup();
      return result;
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Cleanup failed'
      };
    }
  };

  return {
    healthReport,
    loading,
    error,
    runCleanup,
    refresh: loadHealthReport
  };
};
