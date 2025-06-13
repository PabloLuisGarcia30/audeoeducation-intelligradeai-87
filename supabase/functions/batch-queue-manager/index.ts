
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
  
  const job = {
    id: jobId,
    files,
    priority,
    status: 'pending',
    progress: 0,
    results: [],
    errors: [],
    created_at: createdAt,
    started_at: null,
    completed_at: null,
    retry_count: 0,
    max_retries: maxRetries
  };

  const { error } = await supabase.from('jobs').insert([job]);
  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  // Trigger processing with atomic concurrency control
  processNextJobsAtomic().catch(console.error);

  // Enhanced queue position/ETA calculation
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
    maxFilesPerBatch: MAX_FILES_PER_BATCH
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

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error || !job) {
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
      maxFilesPerBatch: MAX_FILES_PER_BATCH
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleQueueStats() {
  try {
    // Use atomic function to get processing count
    const { data: processingCount } = await supabase.rpc('get_processing_job_count');
    
    // Get other counts
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
      raceConditionPrevention: "Enabled"
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
    concurrencyControlEnabled: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// --- ATOMIC JOB PROCESSING WITH CONCURRENCY CONTROL ---

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

      // Step 4: Atomically claim pending jobs with row-level locking
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

      console.log(`✅ Atomically claimed ${claimedJobs.length} jobs`);

      // Step 5: Launch processing for each claimed job (non-blocking)
      for (const job of claimedJobs) {
        console.log(`🚀 Starting job ${job.id} with ${job.files.length} files`);
        
        // Launch processing in background (no await)
        processJobWithOptimization(job).catch(async (error) => {
          console.error(`❌ Job ${job.id} failed:`, error);
          await supabase
            .from('jobs')
            .update({ 
              status: 'failed', 
              errors: [error.message], 
              completed_at: nowIso() 
            })
            .eq('id', job.id);
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
  console.log(`🔄 Processing job ${job.id} with ${job.files.length} files`);
  
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
    
    // Update job progress in database
    const progress = Math.round((processedFiles / totalFiles) * 100);
    
    await supabase
      .from('jobs')
      .update({
        results: allResults,
        progress: progress
      })
      .eq('id', job.id);

    console.log(`📊 Job ${job.id} progress: ${progress}% (${processedFiles}/${totalFiles} files)`);
    
    // Record API call for this batch
    apiCallTracker.recordCall();

    // Small delay between batches
    if (groupIndex + 1 < fileGroups.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // Mark job complete
  console.log(`🎉 Completing job ${job.id} with ${allResults.length} results`);
  
  await supabase
    .from('jobs')
    .update({ 
      status: 'completed', 
      completed_at: nowIso(), 
      progress: 100 
    })
    .eq('id', job.id);

  console.log(`✅ Job ${job.id} completed successfully with atomic processing`);
}

async function cleanupOldJobs() {
  try {
    const cutoff = new Date(Date.now() - JOB_CLEANUP_DAYS * 86400000).toISOString();
    
    const { error } = await supabase
      .from('jobs')
      .delete()
      .lt('completed_at', cutoff)
      .or('status.eq.completed,status.eq.failed');

    if (error) {
      console.error('Failed to cleanup old jobs:', error);
    }
  } catch (error) {
    console.error('Error in cleanupOldJobs:', error);
  }
}
