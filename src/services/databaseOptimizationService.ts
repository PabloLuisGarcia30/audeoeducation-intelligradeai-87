
import { supabase } from '@/integrations/supabase/client';

export interface PartitioningRecommendation {
  table: string;
  rowCount: number;
  recommendPartitioning: boolean;
  partitionStrategy: string;
}

export interface IndexAnalysis {
  tableName: string;
  indexName: string;
  indexSize: string;
  isUsed: boolean;
  scanCount: number;
}

export class DatabaseOptimizationService {
  /**
   * Step 2: Verify Foreign Keys Are Indexed
   */
  static async verifyForeignKeyIndexes(): Promise<{
    table: string;
    column: string;
    hasIndex: boolean;
  }[]> {
    try {
      const { data, error } = await supabase.rpc('execute_raw_sql', {
        sql_query: `
          SELECT
            t.tablename as table_name,
            c.column_name,
            CASE WHEN i.indexname IS NOT NULL THEN true ELSE false END as has_index
          FROM
            information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            JOIN information_schema.columns c ON c.table_name = tc.table_name AND c.column_name = ccu.column_name
            JOIN pg_tables t ON t.tablename = tc.table_name
            LEFT JOIN pg_indexes i ON i.tablename = tc.table_name AND i.indexdef ILIKE '%' || c.column_name || '%'
          WHERE
            tc.constraint_type = 'FOREIGN KEY'
            AND t.schemaname = 'public'
            AND tc.table_name IN ('class_sessions', 'student_exercises', 'test_results', 'class_enrollments')
          ORDER BY t.tablename, c.column_name;
        `
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error verifying foreign key indexes:', error);
      return [];
    }
  }

  /**
   * Step 3: Check if tables need partitioning (>10M rows)
   */
  static async analyzePartitioningNeeds(): Promise<PartitioningRecommendation[]> {
    const tables = ['test_results', 'student_exercises', 'grading_jobs', 'mistake_patterns'];
    const recommendations: PartitioningRecommendation[] = [];

    try {
      for (const table of tables) {
        const { data, error } = await supabase.rpc('execute_raw_sql', {
          sql_query: `SELECT COUNT(*) as row_count FROM ${table};`
        });

        if (error) continue;

        const rowCount = parseInt(data[0]?.row_count || '0');
        const recommendPartitioning = rowCount > 10000000; // 10M rows

        let partitionStrategy = 'Not needed';
        if (recommendPartitioning) {
          // Determine partition strategy based on table
          switch (table) {
            case 'test_results':
            case 'student_exercises':
            case 'grading_jobs':
              partitionStrategy = 'Range partition by created_at (monthly)';
              break;
            case 'mistake_patterns':
              partitionStrategy = 'Hash partition by student_exercise_id';
              break;
          }
        }

        recommendations.push({
          table,
          rowCount,
          recommendPartitioning,
          partitionStrategy
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error analyzing partitioning needs:', error);
      return [];
    }
  }

  /**
   * Step 4: Monitor query performance
   */
  static async getSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('execute_raw_sql', {
        sql_query: `
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows,
            100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
          FROM pg_stat_statements
          WHERE query NOT ILIKE '%pg_stat_statements%'
          ORDER BY total_time DESC
          LIMIT $1;
        `,
        sql_params: [limit]
      });

      if (error) {
        console.log('pg_stat_statements not available');
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching slow queries:', error);
      return [];
    }
  }

  /**
   * Step 5: Automated cleanup scheduling
   */
  static async scheduleCleanup(): Promise<boolean> {
    try {
      // Check if pg_cron is available
      const { data: extensions } = await supabase.rpc('execute_raw_sql', {
        sql_query: "SELECT * FROM pg_extension WHERE extname = 'pg_cron';"
      });

      if (!extensions || extensions.length === 0) {
        console.log('pg_cron extension not available');
        return false;
      }

      // Schedule the cleanup job
      const { error } = await supabase.rpc('execute_raw_sql', {
        sql_query: `
          SELECT cron.schedule(
            'daily-cache-cleanup',
            '0 2 * * *',
            'SELECT cleanup_old_cache();'
          );
        `
      });

      if (error) {
        console.error('Error scheduling cleanup:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking for pg_cron:', error);
      return false;
    }
  }

  /**
   * Get comprehensive database health report
   */
  static async getDatabaseHealthReport(): Promise<{
    indexes: any[];
    foreignKeys: any[];
    partitioning: PartitioningRecommendation[];
    slowQueries: any[];
    cleanupScheduled: boolean;
  }> {
    const [
      foreignKeys,
      partitioning,
      slowQueries
    ] = await Promise.all([
      this.verifyForeignKeyIndexes(),
      this.analyzePartitioningNeeds(),
      this.getSlowQueries(5)
    ]);

    const cleanupScheduled = await this.scheduleCleanup();

    return {
      indexes: [], // Will be populated by the monitor component
      foreignKeys,
      partitioning,
      slowQueries,
      cleanupScheduled
    };
  }

  /**
   * Execute manual cleanup
   */
  static async runCleanup(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.rpc('cleanup_old_cache');
      
      if (error) {
        return {
          success: false,
          message: `Cleanup failed: ${error.message}`
        };
      }

      return {
        success: true,
        message: 'Database cleanup completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
