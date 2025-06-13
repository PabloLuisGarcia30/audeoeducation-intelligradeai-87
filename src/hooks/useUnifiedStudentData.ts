
import { useState, useEffect } from 'react';
import { UnifiedStudentResultsService, UnifiedPerformanceData, UnifiedMisconceptionAnalysis } from '@/services/unifiedStudentResultsService';

export interface UseUnifiedStudentDataResult {
  performance: UnifiedPerformanceData[];
  misconceptions: UnifiedMisconceptionAnalysis[];
  sessionBreakdown: Record<string, number>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUnifiedStudentData(studentId: string, days: number = 30): UseUnifiedStudentDataResult {
  const [performance, setPerformance] = useState<UnifiedPerformanceData[]>([]);
  const [misconceptions, setMisconceptions] = useState<UnifiedMisconceptionAnalysis[]>([]);
  const [sessionBreakdown, setSessionBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      setError(null);

      const [performanceData, misconceptionData, breakdownData] = await Promise.all([
        UnifiedStudentResultsService.getStudentPerformance(studentId, days),
        UnifiedStudentResultsService.getStudentMisconceptions(studentId, days),
        UnifiedStudentResultsService.getSessionTypeBreakdown(studentId)
      ]);

      setPerformance(performanceData);
      setMisconceptions(misconceptionData);
      setSessionBreakdown(breakdownData);
    } catch (err) {
      console.error('Error fetching unified student data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentId, days]);

  return {
    performance,
    misconceptions,
    sessionBreakdown,
    loading,
    error,
    refetch: fetchData
  };
}
