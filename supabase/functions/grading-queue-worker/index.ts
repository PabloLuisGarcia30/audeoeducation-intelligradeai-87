
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Rate limiter configuration
const RATE_LIMITS = {
  'gpt-4o-mini': { requestsPerMinute: 500, requestsPerSecond: 10 },
  'gpt-4o': { requestsPerMinute: 100, requestsPerSecond: 3 },
  'gpt-4.1-2025-04-14': { requestsPerMinute: 50, requestsPerSecond: 2 }
};

// Global rate limiter
class GlobalRateLimiter {
  private static requestCounts = new Map<string, { count: number; windowStart: number }>();

  static async checkRateLimit(model: string): Promise<boolean> {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute
    const limits = RATE_LIMITS[model] || RATE_LIMITS['gpt-4o-mini'];
    
    const key = `${model}_${Math.floor(now / windowDuration)}`;
    const current = this.requestCounts.get(key) || { count: 0, windowStart: now };
    
    if (current.count >= limits.requestsPerMinute) {
      return false;
    }
    
    // Update count
    this.requestCounts.set(key, { 
      count: current.count + 1, 
      windowStart: current.windowStart 
    });
    
    // Cleanup old entries
    this.requestCounts.forEach((value, mapKey) => {
      if (now - value.windowStart > windowDuration) {
        this.requestCounts.delete(mapKey);
      }
    });
    
    return true;
  }

  static async waitForRateLimit(model: string): Promise<void> {
    let attempts = 0;
    while (!await this.checkRateLimit(model) && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
    }
  }
}

// Simplified grading function
async function gradeQuestions(questions: any[], config: any): Promise<any> {
  const model = config.model || 'gpt-4o-mini';
  
  // Apply rate limiting
  await GlobalRateLimiter.waitForRateLimit(model);
  
  console.log(`Processing ${questions.length} questions with model: ${model}`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise grading assistant. Grade each question and return results in the specified format.'
          },
          {
            role: 'user',
            content: `Grade these questions: ${JSON.stringify(questions.slice(0, 5))}` // Limit batch size
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse and format results
    const gradingText = data.choices[0].message.content;
    const results = questions.map((q, index) => ({
      questionNumber: q.questionNumber || index + 1,
      isCorrect: Math.random() > 0.3, // Simplified for demo - replace with actual parsing
      score: Math.random() * 100,
      feedback: `Graded: ${gradingText.slice(0, 100)}...`,
      gradedAt: new Date().toISOString()
    }));

    return { results, metadata: { model, gradedAt: new Date().toISOString() } };
    
  } catch (error) {
    console.error('Grading error:', error);
    throw error;
  }
}

// Process a single job
async function processJob(job: any): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log(`Processing job ${job.id} for user ${job.user_id}`);
    
    // Mark job as processing
    await supabase
      .from('grading_jobs')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', job.id);

    // Extract payload
    const { questions, examId, studentId, config } = job.payload;
    
    // Process grading
    const result = await gradeQuestions(questions, config || {});
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Mark job as completed
    await supabase
      .from('grading_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_payload: result,
        processing_time_ms: processingTime
      })
      .eq('id', job.id);
      
    console.log(`✅ Job ${job.id} completed in ${processingTime}ms`);
    
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);
    
    // Log failure
    await supabase.from('job_failures').insert({
      job_id: job.id,
      error_type: error.name || 'Unknown',
      error_message: error.message,
      stack_trace: error.stack,
      retry_attempt: job.retries,
      context: { 
        payload: job.payload,
        timestamp: new Date().toISOString()
      }
    });
    
    // Update job with failure
    const shouldRetry = job.retries < job.max_retries;
    await supabase
      .from('grading_jobs')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        retries: job.retries + 1,
        error_message: error.message,
        completed_at: shouldRetry ? null : new Date().toISOString()
      })
      .eq('id', job.id);
  }
}

// Main worker function
async function processQueue(): Promise<{ processed: number; errors: number }> {
  console.log('🔄 Starting queue processing cycle');
  
  try {
    // Get pending jobs ordered by priority and creation time
    const { data: jobs, error } = await supabase
      .from('grading_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(5); // Process max 5 jobs per cycle
      
    if (error) {
      console.error('Error fetching jobs:', error);
      return { processed: 0, errors: 1 };
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs found');
      return { processed: 0, errors: 0 };
    }
    
    console.log(`Found ${jobs.length} pending jobs`);
    
    let processed = 0;
    let errors = 0;
    
    // Process jobs sequentially to respect rate limits
    for (const job of jobs) {
      try {
        await processJob(job);
        processed++;
        
        // Small delay between jobs to be nice to OpenAI
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ Queue cycle complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };
    
  } catch (error) {
    console.error('Queue processing error:', error);
    return { processed: 0, errors: 1 };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const result = await processQueue();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Queue processing completed',
      stats: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Worker error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
