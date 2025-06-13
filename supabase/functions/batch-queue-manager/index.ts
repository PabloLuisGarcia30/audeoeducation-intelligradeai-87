
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// --- ENHANCED CONFIG WITH ATOMIC OPERATIONS ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const MAX_API_CALLS_PER_MINUTE = Number(Deno.env.get("API_RATE_LIMIT") || 50);
const MAX_CONCURRENT_JOBS = 12; // Global limit enforced atomically
const MAX_FILES_PER_BATCH = 12;
const JOB_CLEANUP_DAYS = 2;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Enhanced file grouping for optimal batch processing
function groupFilesBySize(files: any[]): any[][] {
  // Sort files by estimated size (base64 length as proxy)
  const sortedFiles = [...files].sort((a, b) => {
    const sizeA = a.fileContent?.length || 1000;
    const sizeB = b.fileContent?.length || 1000;
    return sizeA - sizeB;
  });

  const groups: any[][] = [];
  let currentGroup: any[] = [];
  let currentGroupSize = 0;
  const maxGroupSize = 500000; // ~500KB total per group

  for (const file of sortedFiles) {
    const fileSize = file.fileContent?.length || 1000;
    
    if (currentGroup.length >= MAX_FILES_PER_BATCH || 
        (currentGroupSize + fileSize > maxGroupSize && currentGroup.length > 0)) {
      groups.push(currentGroup);
      currentGroup = [file];
      currentGroupSize = fileSize;
    } else {
      currentGroup.push(file);
      currentGroupSize += fileSize;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  console.log(`Grouped ${files.length} files into ${groups.length} optimized batches`);
  return groups;
}

// --- RATE LIMIT STATE ---
const apiCallTracker = {
  calls: [] as number[],
  getCurrentMinuteCallCount: () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    apiCallTracker.calls = apiCallTracker.calls.filter((time) => time > oneMinuteAgo);
    return apiCallTracker.calls.length;
  },
  recordCall: () => {
    apiCallTracker.calls.push(Date.now());
  }
};

function nowIso() {
  return new Date().toISOString();
}

// --- OPTIMIZED JOB CREATION WITH PAYLOAD SEPARATION ---
async function createJobWithPayload(jobData: any, payloadData: any) {
  // Insert job metadata only (no large fields)
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      id: jobData.id,
      status: jobData.status,
      priority: jobData.priority,
      progress: jobData.progress,
      created_at: jobData.created_at,
      started_at: jobData.started_at,
      completed_at: jobData.completed_at,
      retry_count: jobData.retry_count,
      max_retries: jobData.max_retries,
      // Remove large fields - they go to job_payloads
      files: [], // Keep minimal for backwards compatibility
      results: [],
      errors: []
    })
    .select()
    .single();

  if (jobError) {
    throw new Error(`Failed to create job: ${jobError.message}`);
  }

  // Insert payload data separately
  const { error: payloadError } = await supabase
    .from('job_payloads')
    .insert({
      job_id: jobData.id,
      files_data: payloadData.files,
      results_data: payloadData.results || [],
      errors_data: payloadData.errors || [],
      request_metadata: payloadData.metadata || {}
    });

  if (payloadError) {
    console.error('Failed to create job payload:', payloadError);
    // Clean up job if payload creation fails
    await supabase.from('jobs').delete().eq('id', jobData.id);
    throw new Error(`Failed to create job payload: ${payloadError.message}`);
  }

  return job;
}

// --- OPTIMIZED JOB RETRIEVAL WITH PAYLOAD JOIN ---
async function getJobWithPayload(jobId: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_payloads (
        files_data,
        results_data,
        errors_data,
        request_metadata
      )
    `)
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get job: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Reconstruct the original format for backwards compatibility
  const payload = data.job_payloads?.[0];
  return {
    ...data,
    files: payload?.files_data || data.files || [],
    results: payload?.results_data || data.results || [],
    errors: payload?.errors_data || data.errors || [],
    metadata: payload?.request_metadata || {}
  };
}

// --- OPTIMIZED JOB UPDATE WITH PAYLOAD ---
async function updateJobWithPayload(jobId: string, jobUpdates: any, payloadUpdates?: any) {
  // Update job metadata
  const { error: jobError } = await supabase
    .from('jobs')
    .update(jobUpdates)
    .eq('id', jobId);

  if (jobError) {
    throw new Error(`Failed to update job: ${jobError.message}`);
  }

  // Update payload if provided
  if (payloadUpdates) {
    const { error: payloadError } = await supabase
      .from('job_payloads')
      .update(payloadUpdates)
      .eq('job_id', jobId);

    if (payloadError) {
      console.warn('Failed to update job payload:', payloadError);
    }
  }
}

// --- MAIN SERVER ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // CLEANUP OLD JOBS (once per request)
    await cleanupOldJobs();

    switch (path) {
      case '/submit':
        return await handleJobSubmission(req);
      case '/status':
        return await handleStatusCheck(url);
      case '/queue-stats':
        return await handleQueueStats();
      case '/process-next':
        return await handleProcessNext();
      default:
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Queue manager error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// --- ENDPOINT HANDLERS ---

async function handleJobSubmission(req: Request) {
  const { files, priority = 'normal', maxRetries = 3 } = await req.json();
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = nowIso();
  
  const jobData = {
    id: jobId,
    priority,
    status: 'pending',
    progress: 0,
    created_at: createdAt,
    started_at: null,
    completed_at: null,
    retry_count: 0,
    max_retries: maxRetries
  };

  const payloadData = {
    files,
    results: [],
    errors: [],
    metadata: { priority, maxRetries }
  };

  await createJobWithPayload(jobData, payloadData);

  // Trigger processing with atomic concurrency control
  processNextJobsAtomic().catch(console.error);

  // Enhanced queue position/ETA calculation using optimized indexes
  const { count: pendingCount } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const estimatedTimePerFile = 2; // seconds per file with optimizations
  const estimatedWait = Math.round((pendingCount || 0) * files.length * estimatedTimePerFile / MAX_CONCURRENT_JOBS);

  return new Response(JSON.stringify({
    jobId,
    position: pendingCount || 0,
    estimatedWait: estimatedWait,
    atomicProcessingEnabled: true,
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
    maxFilesPerBatch: MAX_FILES_PER_BATCH,
    optimizedIndexing: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleStatusCheck(url: URL) {
  const jobId = url.searchParams.get('jobId');
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Job ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const job = await getJobWithPayload(jobId);

  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    ...job,
    atomicProcessingStats: {
      concurrencyControlEnabled: true,
      maxConcurrentJobs: MAX_CONCURRENT_JOBS,
      maxFilesPerBatch: MAX_FILES_PER_BATCH,
      optimizedIndexing: true
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleQueueStats() {
  try {
    // Use atomic function to get processing count
    const { data: processingCount } = await supabase.rpc('get_processing_job_count');
    
    // Get other counts using optimized indexes
    const [total, pending, completed, failed] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed')
    ]);

    return new Response(JSON.stringify({
      totalJobs: total.count || 0,
      pendingJobs: pending.count || 0,
      activeJobs: processingCount || 0,
      completedJobs: completed.count || 0,
      failedJobs: failed.count || 0,
      currentApiCallRate: apiCallTracker.getCurrentMinuteCallCount(),
      maxConcurrentJobs: MAX_CONCURRENT_JOBS,
      maxApiCallsPerMinute: MAX_API_CALLS_PER_MINUTE,
      maxFilesPerBatch: MAX_FILES_PER_BATCH,
      concurrencyControl: "Atomic with Row-Level Locking",
      raceConditionPrevention: "Enabled",
      optimizedIndexing: "Active",
      payloadSeparation: "Enabled"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to get queue stats' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleProcessNext() {
  await processNextJobsAtomic();
  return new Response(JSON.stringify({ 
    message: 'Atomic processing triggered',
    concurrencyControlEnabled: true,
    optimizedIndexing: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// --- ATOMIC JOB PROCESSING WITH OPTIMIZED QUERIES ---

async function processNextJobsAtomic() {
  try {
    // Step 1: Try to acquire distributed lock
    const { data: gotLock, error: lockError } = await supabase.rpc('try_acquire_queue_lock');
    
    if (lockError) {
      console.error('Lock acquisition failed:', lockError);
      return;
    }
    
    if (!gotLock) {
      console.log('Another instance is processing jobs; skipping this cycle');
      return;
    }

    console.log('🔒 Acquired queue processing lock');

    try {
      // Step 2: Check rate limits
      if (apiCallTracker.getCurrentMinuteCallCount() >= MAX_API_CALLS_PER_MINUTE) {
        console.log('Rate limit reached, skipping job processing');
        return;
      }

      // Step 3: Get current processing job count atomically
      const { data: currentProcessingCount, error: countError } = await supabase.rpc('get_processing_job_count');
      
      if (countError) {
        console.error('Failed to get processing count:', countError);
        return;
      }

      const availableSlots = MAX_CONCURRENT_JOBS - (currentProcessingCount || 0);
      
      if (availableSlots <= 0) {
        console.log(`Max concurrent jobs reached: ${currentProcessingCount}/${MAX_CONCURRENT_JOBS}`);
        return;
      }

      console.log(`🎯 Available slots: ${availableSlots} (current: ${currentProcessingCount}/${MAX_CONCURRENT_JOBS})`);

      // Step 4: Atomically claim pending jobs with optimized query using new indexes
      const { data: claimedJobs, error: claimError } = await supabase.rpc('claim_pending_jobs', { 
        batch_size: availableSlots 
      });

      if (claimError) {
        console.error('Job claiming failed:', claimError);
        return;
      }

      if (!claimedJobs || claimedJobs.length === 0) {
        console.log('No pending jobs available to claim');
        return;
      }

      console.log(`✅ Atomically claimed ${claimedJobs.length} jobs using optimized indexes`);

      // Step 5: Launch processing for each claimed job with payload retrieval
      for (const job of claimedJobs) {
        console.log(`🚀 Starting job ${job.id} with optimized structure`);
        
        // Get full job data with payload
        const fullJob = await getJobWithPayload(job.id);
        if (!fullJob) {
          console.error(`Failed to get job payload for ${job.id}`);
          continue;
        }
        
        // Launch processing in background (no await)
        processJobWithOptimization(fullJob).catch(async (error) => {
          console.error(`❌ Job ${job.id} failed:`, error);
          await updateJobWithPayload(job.id, { 
            status: 'failed', 
            completed_at: nowIso() 
          }, {
            errors_data: [error.message]
          });
        });

        // Record API call for rate limiting
        apiCallTracker.recordCall();
      }

    } finally {
      // Step 6: Always release the distributed lock
      const { error: unlockError } = await supabase.rpc('release_queue_lock');
      if (unlockError) {
        console.error('Failed to release queue lock:', unlockError);
      } else {
        console.log('🔓 Released queue processing lock');
      }
    }

  } catch (error) {
    console.error('Error in atomic job processing:', error);
    // Ensure lock is released even if there's an error
    await supabase.rpc('release_queue_lock').catch(console.error);
  }
}

async function processJobWithOptimization(job: any) {
  console.log(`🔄 Processing job ${job.id} with ${job.files.length} files using optimized structure`);
  
  const totalFiles = job.files.length;
  let allResults: any[] = [];
  
  // Group files by size for optimal batching
  const fileGroups = groupFilesBySize(job.files);
  let processedFiles = 0;

  for (let groupIndex = 0; groupIndex < fileGroups.length; groupIndex++) {
    const group = fileGroups[groupIndex];
    
    // Rate limit enforcement
    while (apiCallTracker.getCurrentMinuteCallCount() >= MAX_API_CALLS_PER_MINUTE) {
      console.log(`Job ${job.id}: Waiting for rate limit...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    let results: any[] = [];
    let retry = 0;

    while (retry <= job.max_retries) {
      try {
        console.log(`Job ${job.id}: Processing group ${groupIndex + 1}/${fileGroups.length} (${group.length} files)`);
        
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/extract-text-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ files: group })
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Batch failed: ${resp.status} - ${errorText}`);
        }

        const json = await resp.json();
        results = json.results || [];
        
        console.log(`✅ Job ${job.id}: Group ${groupIndex + 1} completed with ${results.length} results`);
        break; // Success, exit retry loop
        
      } catch (error) {
        retry++;
        console.error(`Job ${job.id}: Group attempt ${retry} failed:`, error);
        
        if (retry > job.max_retries) {
          throw new Error(`Group processing failed after ${job.max_retries} retries: ${error.message}`);
        }
        
        // Exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, retry - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }

    // Append results to accumulated results
    allResults = allResults.concat(results);
    processedFiles += group.length;
    
    // Update job progress using optimized structure
    const progress = Math.round((processedFiles / totalFiles) * 100);
    
    await updateJobWithPayload(job.id, {
      progress: progress
    }, {
      results_data: allResults
    });

    console.log(`📊 Job ${job.id} progress: ${progress}% (${processedFiles}/${totalFiles} files) - optimized storage`);
    
    // Record API call for this batch
    apiCallTracker.recordCall();

    // Small delay between batches
    if (groupIndex + 1 < fileGroups.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // Mark job complete with optimized structure
  console.log(`🎉 Completing job ${job.id} with ${allResults.length} results using optimized storage`);
  
  await updateJobWithPayload(job.id, { 
    status: 'completed', 
    completed_at: nowIso(), 
    progress: 100 
  }, {
    results_data: allResults
  });

  console.log(`✅ Job ${job.id} completed successfully with optimized atomic processing`);
}

async function cleanupOldJobs() {
  try {
    const cutoff = new Date(Date.now() - JOB_CLEANUP_DAYS * 86400000).toISOString();
    
    // First get job IDs to clean up
    const { data: jobsToCleanup, error: selectError } = await supabase
      .from('jobs')
      .select('id')
      .lt('completed_at', cutoff)
      .or('status.eq.completed,status.eq.failed');

    if (selectError) {
      console.error('Failed to select old jobs for cleanup:', selectError);
      return;
    }

    if (!jobsToCleanup || jobsToCleanup.length === 0) {
      return;
    }

    console.log(`🧹 Cleaning up ${jobsToCleanup.length} old jobs`);

    // Delete job payloads first (will cascade from job deletion, but being explicit)
    const jobIds = jobsToCleanup.map(job => job.id);
    
    const { error: payloadDeleteError } = await supabase
      .from('job_payloads')
      .delete()
      .in('job_id', jobIds);

    if (payloadDeleteError) {
      console.error('Failed to cleanup job payloads:', payloadDeleteError);
    }

    // Delete jobs (this should cascade to payloads anyway)
    const { error: jobDeleteError } = await supabase
      .from('jobs')
      .delete()
      .in('id', jobIds);

    if (jobDeleteError) {
      console.error('Failed to cleanup old jobs:', jobDeleteError);
    } else {
      console.log(`✅ Cleaned up ${jobsToCleanup.length} old jobs with optimized structure`);
    }

  } catch (error) {
    console.error('Error in cleanupOldJobs:', error);
  }
}
