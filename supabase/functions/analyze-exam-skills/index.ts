
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Enhanced class-specific exam skill analysis function called with auto-creation');
    
    const { examId } = await req.json();
    
    // Validate environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Step 1: Checking if skill analysis already exists for exam:', examId);
    
    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('exam_skill_analysis')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (existingAnalysis && existingAnalysis.analysis_status === 'completed') {
      console.log('Skill analysis already completed for exam:', examId);
      return new Response(
        JSON.stringify({
          status: 'already_completed',
          message: 'Skill analysis already exists for this exam',
          analysis: existingAnalysis
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('Step 2: Fetching exam data and ensuring class association');
    
    // Fetch exam data with class information
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select(`
        *,
        classes:active_classes(*)
      `)
      .eq('exam_id', examId)
      .maybeSingle();

    if (examError || !examData) {
      throw new Error(`Exam fetch failed: ${examError?.message || 'Exam not found'}`);
    }

    if (!examData.class_id) {
      throw new Error('Exam must be associated with a class for class-specific skill analysis with auto-creation');
    }

    console.log('Step 3: Fetching class-specific skills with auto-creation capability');

    // Fetch class-specific content skills
    const { data: classContentSkills, error: contentSkillsError } = await supabase
      .from('class_content_skills')
      .select(`
        content_skill_id,
        content_skills:content_skill_id (
          id,
          skill_name,
          topic,
          skill_description,
          subject,
          grade
        )
      `)
      .eq('class_id', examData.class_id);

    if (contentSkillsError) {
      throw new Error(`Class content skills fetch failed: ${contentSkillsError.message}`);
    }

    // Fetch class-specific subject skills
    const { data: classSubjectSkills, error: subjectSkillsError } = await supabase
      .from('class_subject_skills')
      .select(`
        subject_skill_id,
        subject_skills:subject_skill_id (
          id,
          skill_name,
          skill_description,
          subject,
          grade
        )
      `)
      .eq('class_id', examData.class_id);

    if (subjectSkillsError) {
      throw new Error(`Class subject skills fetch failed: ${subjectSkillsError.message}`);
    }

    // Extract the actual skill objects
    const classSpecificContentSkills = classContentSkills?.map(cs => cs.content_skills).filter(Boolean) || [];
    const classSpecificSubjectSkills = classSubjectSkills?.map(ss => ss.subject_skills).filter(Boolean) || [];

    console.log('Found class-specific skills:', {
      contentSkills: classSpecificContentSkills.length,
      subjectSkills: classSpecificSubjectSkills.length,
      classId: examData.class_id,
      className: examData.classes?.name || 'Unknown'
    });

    // Fallback to standard curriculum skills if class has no custom skills
    let availableContentSkills = classSpecificContentSkills;
    let availableSubjectSkills = classSpecificSubjectSkills;
    let usingFallbackSkills = false;

    if (classSpecificContentSkills.length === 0 && classSpecificSubjectSkills.length === 0) {
      console.log('No class-specific skills found, falling back to standard curriculum skills');
      usingFallbackSkills = true;

      const { data: standardContentSkills } = await supabase
        .from('content_skills')
        .select('*')
        .eq('subject', examData.classes?.subject || 'Math')
        .eq('grade', examData.classes?.grade || 'Grade 10');

      const { data: standardSubjectSkills } = await supabase
        .from('subject_skills')
        .select('*')
        .eq('subject', examData.classes?.subject || 'Math')
        .eq('grade', examData.classes?.grade || 'Grade 10');

      availableContentSkills = standardContentSkills || [];
      availableSubjectSkills = standardSubjectSkills || [];

      console.log('Using standard curriculum skills as fallback:', {
        contentSkills: availableContentSkills.length,
        subjectSkills: availableSubjectSkills.length
      });
    }

    // Fetch answer keys
    const { data: answerKeys, error: answerKeysError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number');

    if (answerKeysError) {
      throw new Error(`Answer keys fetch failed: ${answerKeysError.message}`);
    }

    // Create or update analysis record
    const { data: analysisRecord } = await supabase
      .from('exam_skill_analysis')
      .upsert({
        exam_id: examId,
        analysis_status: 'in_progress',
        total_questions: answerKeys?.length || 0,
        analysis_started_at: new Date().toISOString()
      }, { onConflict: 'exam_id' })
      .select()
      .single();

    console.log('Step 4: Performing enhanced AI skill mapping with auto-creation capabilities');

    // Prepare skills data for AI with auto-creation capability
    const contentSkillsText = availableContentSkills.map(skill => 
      `ID:${skill.id} | ${skill.skill_name} | ${skill.topic || 'General'} | ${skill.skill_description}`
    ).join('\n');
    
    const subjectSkillsText = availableSubjectSkills.map(skill => 
      `ID:${skill.id} | ${skill.skill_name} | ${skill.skill_description}`
    ).join('\n');

    // Create skill ID validation sets
    const validContentSkillIds = new Set(availableContentSkills.map(s => s.id));
    const validSubjectSkillIds = new Set(availableSubjectSkills.map(s => s.id));

    // Prepare questions for analysis
    const questionsText = answerKeys?.map(ak => 
      `Q${ak.question_number}: ${ak.question_text} (Type: ${ak.question_type})`
    ).join('\n') || '';

    const systemPrompt = `You are an educational skill mapping expert. Map each question exclusively to the provided ${usingFallbackSkills ? 'standard curriculum' : 'class-specific'} skill lists with auto-creation capability.

CRITICAL CONSTRAINTS:
- Primarily use ONLY skills provided in lists below
- Always use exact skill IDs provided when a suitable skill exists
- If no suitable skill exists, explicitly suggest a concise new skill (name + description) 
- New skills will be automatically added to the skill database
- Analysis context: ${examData.classes?.name || 'Unknown Class'} (${examData.classes?.subject} ${examData.classes?.grade})

ENHANCED FEATURE – CONCEPT GROUPING:
- Provide "concept_missed_short": concise, groupable 2-4 word identifier per concept (e.g., "Linear Equations")
- Ensure consistent naming for the same concept across all questions

AUTO-CREATION GUIDELINES:
- Only suggest new skills when existing skills are genuinely insufficient
- New skill names should be 2-6 words, descriptive and precise
- New skill descriptions should be 10-30 words explaining what the skill tests
- Confidence levels: >0.8 = auto-create, 0.6-0.8 = review queue, <0.6 = flag for manual review

PROVIDED ${usingFallbackSkills ? 'STANDARD CURRICULUM' : 'CLASS-SPECIFIC'} CONTENT SKILLS:
${contentSkillsText}

PROVIDED ${usingFallbackSkills ? 'STANDARD CURRICULUM' : 'CLASS-SPECIFIC'} SUBJECT SKILLS:
${subjectSkillsText}

For each question, explicitly identify:
1. Relevant content skills (0-2 max) from existing list OR suggest new ones
2. Relevant subject skills (0-2 max) from existing list OR suggest new ones  
3. Skill weight (0.1-1.0 relevance scale)
4. Mapping confidence (0.1-1.0 scale)
5. "concept_missed_short" (2-4 word core concept)

Return ONLY structured JSON:
{
  "mappings": [
    {
      "question_number": 1,
      "content_skills": [
        {
          "skill_id": "existing-uuid-or-null-for-new",
          "skill_name": "exact-skill-name-or-new-name",
          "skill_description": "existing-or-new-description",
          "is_new_skill": false,
          "weight": 0.8,
          "confidence": 0.9,
          "concept_missed_short": "Linear Equations"
        }
      ],
      "subject_skills": [
        {
          "skill_id": "existing-uuid-or-null-for-new", 
          "skill_name": "exact-skill-name-or-new-name",
          "skill_description": "existing-or-new-description",
          "is_new_skill": true,
          "weight": 1.0,
          "confidence": 0.85,
          "concept_missed_short": "Algebraic Reasoning"
        }
      ]
    }
  ],
  "summary": {
    "total_questions_mapped": 10,
    "existing_content_skills_used": 5,
    "existing_subject_skills_used": 3,
    "new_content_skills_suggested": 2,
    "new_subject_skills_suggested": 1,
    "unique_concepts_identified": 8
  }
}`;

    const userPrompt = `Map these questions to ${usingFallbackSkills ? 'standard curriculum' : 'class-specific'} skills for exam: ${examData.title}
Class: ${examData.classes?.name || 'Unknown'} (${examData.classes?.subject} ${examData.classes?.grade})

Enable auto-creation of new skills when existing skills are insufficient. Include concept_missed_short for each skill mapping.

QUESTIONS:
${questionsText}`;

    const aiPayload = {
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.1
    };

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(aiPayload)
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.statusText}`);
    }

    const result = await aiResponse.json();
    const analysisText = result.choices[0]?.message?.content || "{}";
    
    let skillMappings;
    try {
      skillMappings = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI skill mapping:', parseError);
      throw new Error('AI returned invalid skill mapping format');
    }

    console.log('Step 5: Processing skill mappings with auto-creation logic');

    const mappingInserts = [];
    let contentSkillsFound = 0;
    let subjectSkillsFound = 0;
    let invalidSkillsRejected = 0;
    let autoCreatedSkills = 0;
    let skillsQueuedForReview = 0;

    // Process each mapping with auto-creation logic
    for (const mapping of skillMappings.mappings || []) {
      // Process content skills
      for (const contentSkill of mapping.content_skills || []) {
        if (contentSkill.is_new_skill) {
          // Handle new skill creation
          const newSkillResult = await createOrQueueSkill(
            supabase,
            'content',
            contentSkill,
            examData,
            examId
          );
          
          if (newSkillResult.action === 'created') {
            mappingInserts.push({
              exam_id: examId,
              question_number: mapping.question_number,
              skill_type: 'content',
              skill_id: newSkillResult.skillId,
              skill_name: contentSkill.skill_name,
              skill_weight: Math.min(Math.max(contentSkill.weight || 1.0, 0), 2.0),
              confidence: Math.min(Math.max(contentSkill.confidence || 1.0, 0), 1.0),
              concept_missed_short: contentSkill.concept_missed_short || 'Unknown Concept',
              auto_created_skill: true,
              creation_confidence: contentSkill.confidence
            });
            autoCreatedSkills++;
            contentSkillsFound++;
          } else if (newSkillResult.action === 'queued') {
            // Add to mappings but mark as suggested
            mappingInserts.push({
              exam_id: examId,
              question_number: mapping.question_number,
              skill_type: 'content',
              skill_id: null, // No skill ID yet
              skill_name: contentSkill.skill_name,
              skill_weight: Math.min(Math.max(contentSkill.weight || 1.0, 0), 2.0),
              confidence: Math.min(Math.max(contentSkill.confidence || 1.0, 0), 1.0),
              concept_missed_short: contentSkill.concept_missed_short || 'Unknown Concept',
              auto_created_skill: false,
              suggested_skill_name: contentSkill.skill_name,
              suggested_skill_description: contentSkill.skill_description,
              creation_confidence: contentSkill.confidence
            });
            skillsQueuedForReview++;
          }
        } else {
          // Handle existing skill validation
          if (!validContentSkillIds.has(contentSkill.skill_id)) {
            console.warn(`Rejected invalid content skill ID: ${contentSkill.skill_id} for Q${mapping.question_number}`);
            invalidSkillsRejected++;
            continue;
          }
          
          mappingInserts.push({
            exam_id: examId,
            question_number: mapping.question_number,
            skill_type: 'content',
            skill_id: contentSkill.skill_id,
            skill_name: contentSkill.skill_name,
            skill_weight: Math.min(Math.max(contentSkill.weight || 1.0, 0), 2.0),
            confidence: Math.min(Math.max(contentSkill.confidence || 1.0, 0), 1.0),
            concept_missed_short: contentSkill.concept_missed_short || 'Unknown Concept',
            auto_created_skill: false
          });
          contentSkillsFound++;
        }
      }
      
      // Process subject skills (similar logic)
      for (const subjectSkill of mapping.subject_skills || []) {
        if (subjectSkill.is_new_skill) {
          const newSkillResult = await createOrQueueSkill(
            supabase,
            'subject',
            subjectSkill,
            examData,
            examId
          );
          
          if (newSkillResult.action === 'created') {
            mappingInserts.push({
              exam_id: examId,
              question_number: mapping.question_number,
              skill_type: 'subject',
              skill_id: newSkillResult.skillId,
              skill_name: subjectSkill.skill_name,
              skill_weight: Math.min(Math.max(subjectSkill.weight || 1.0, 0), 2.0),
              confidence: Math.min(Math.max(subjectSkill.confidence || 1.0, 0), 1.0),
              concept_missed_short: subjectSkill.concept_missed_short || 'Unknown Concept',
              auto_created_skill: true,
              creation_confidence: subjectSkill.confidence
            });
            autoCreatedSkills++;
            subjectSkillsFound++;
          } else if (newSkillResult.action === 'queued') {
            mappingInserts.push({
              exam_id: examId,
              question_number: mapping.question_number,
              skill_type: 'subject',
              skill_id: null,
              skill_name: subjectSkill.skill_name,
              skill_weight: Math.min(Math.max(subjectSkill.weight || 1.0, 0), 2.0),
              confidence: Math.min(Math.max(subjectSkill.confidence || 1.0, 0), 1.0),
              concept_missed_short: subjectSkill.concept_missed_short || 'Unknown Concept',
              auto_created_skill: false,
              suggested_skill_name: subjectSkill.skill_name,
              suggested_skill_description: subjectSkill.skill_description,
              creation_confidence: subjectSkill.confidence
            });
            skillsQueuedForReview++;
          }
        } else {
          if (!validSubjectSkillIds.has(subjectSkill.skill_id)) {
            console.warn(`Rejected invalid subject skill ID: ${subjectSkill.skill_id} for Q${mapping.question_number}`);
            invalidSkillsRejected++;
            continue;
          }
          
          mappingInserts.push({
            exam_id: examId,
            question_number: mapping.question_number,
            skill_type: 'subject',
            skill_id: subjectSkill.skill_id,
            skill_name: subjectSkill.skill_name,
            skill_weight: Math.min(Math.max(subjectSkill.weight || 1.0, 0), 2.0),
            confidence: Math.min(Math.max(subjectSkill.confidence || 1.0, 0), 1.0),
            concept_missed_short: subjectSkill.concept_missed_short || 'Unknown Concept',
            auto_created_skill: false
          });
          subjectSkillsFound++;
        }
      }
    }

    // Insert validated mappings
    if (mappingInserts.length > 0) {
      const { error: mappingsError } = await supabase
        .from('exam_skill_mappings')
        .insert(mappingInserts);
        
      if (mappingsError) {
        console.error('Error inserting skill mappings:', mappingsError);
        throw new Error('Failed to store skill mappings');
      }
    }

    // Update analysis record with completion
    await supabase
      .from('exam_skill_analysis')
      .update({
        analysis_status: 'completed',
        mapped_questions: skillMappings.mappings?.length || 0,
        content_skills_found: contentSkillsFound,
        subject_skills_found: subjectSkillsFound,
        analysis_completed_at: new Date().toISOString(),
        ai_analysis_data: {
          ...skillMappings,
          auto_creation_stats: {
            auto_created_skills: autoCreatedSkills,
            skills_queued_for_review: skillsQueuedForReview,
            invalid_skills_rejected: invalidSkillsRejected,
            class_id: examData.class_id,
            class_name: examData.classes?.name || 'Unknown',
            used_class_specific_skills: !usingFallbackSkills,
            used_fallback_skills: usingFallbackSkills,
            concept_grouping_enabled: true,
            unique_concepts_identified: skillMappings.summary?.unique_concepts_identified || 0
          }
        }
      })
      .eq('id', analysisRecord.id);

    console.log('Enhanced skill analysis with auto-creation completed successfully');
    console.log(`Mapped ${skillMappings.mappings?.length || 0} questions with ${contentSkillsFound} content skills and ${subjectSkillsFound} subject skills`);
    console.log(`Auto-created ${autoCreatedSkills} skills, queued ${skillsQueuedForReview} for review`);

    return new Response(
      JSON.stringify({
        status: 'completed',
        exam_id: examId,
        class_id: examData.class_id,
        class_name: examData.classes?.name || 'Unknown',
        total_questions: answerKeys?.length || 0,
        mapped_questions: skillMappings.mappings?.length || 0,
        content_skills_found: contentSkillsFound,
        subject_skills_found: subjectSkillsFound,
        auto_created_skills: autoCreatedSkills,
        skills_queued_for_review: skillsQueuedForReview,
        invalid_skills_rejected: invalidSkillsRejected,
        concept_grouping_enabled: true,
        unique_concepts_identified: skillMappings.summary?.unique_concepts_identified || 0,
        auto_creation_enabled: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in enhanced analyze-exam-skills function:', error);
    
    // Update analysis record with error
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { examId } = await req.json();
      
      await supabase
        .from('exam_skill_analysis')
        .update({
          analysis_status: 'failed',
          error_message: error.message
        })
        .eq('exam_id', examId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})

// Helper function to create or queue skills based on confidence
async function createOrQueueSkill(
  supabase: any,
  skillType: 'content' | 'subject',
  skillData: any,
  examData: any,
  examId: string
): Promise<{ action: 'created' | 'queued' | 'rejected', skillId?: string }> {
  const confidence = skillData.confidence || 0;
  
  // High confidence: auto-create
  if (confidence > 0.8) {
    try {
      const newSkillData = {
        skill_name: skillData.skill_name,
        skill_description: skillData.skill_description,
        subject: examData.classes?.subject || 'Math',
        grade: examData.classes?.grade || 'Grade 10',
        ...(skillType === 'content' && { topic: 'Auto-Generated' })
      };

      const tableName = skillType === 'content' ? 'content_skills' : 'subject_skills';
      const { data: newSkill, error } = await supabase
        .from(tableName)
        .insert(newSkillData)
        .select()
        .single();

      if (error) throw error;

      // Link to class
      const linkTableName = skillType === 'content' ? 'class_content_skills' : 'class_subject_skills';
      const linkColumnName = skillType === 'content' ? 'content_skill_id' : 'subject_skill_id';
      
      await supabase
        .from(linkTableName)
        .insert({
          class_id: examData.class_id,
          [linkColumnName]: newSkill.id
        });

      // Log auto-creation
      await supabase
        .from('skill_auto_creation_log')
        .insert({
          skill_id: newSkill.id,
          skill_name: skillData.skill_name,
          skill_type: skillType,
          skill_description: skillData.skill_description,
          confidence: confidence,
          reasoning: `Auto-created with high confidence (${confidence}) during exam analysis`,
          exam_id: examId,
          class_id: examData.class_id,
          context_data: { auto_created: true }
        });

      console.log(`Auto-created ${skillType} skill: ${skillData.skill_name} (ID: ${newSkill.id})`);
      return { action: 'created', skillId: newSkill.id };

    } catch (error) {
      console.error(`Failed to auto-create ${skillType} skill:`, error);
      // Fall back to review queue
      return await queueSkillForReview(supabase, skillType, skillData, examData, examId, confidence);
    }
  }
  
  // Medium confidence: queue for review
  if (confidence >= 0.6) {
    return await queueSkillForReview(supabase, skillType, skillData, examData, examId, confidence);
  }
  
  // Low confidence: reject
  console.log(`Rejected ${skillType} skill suggestion due to low confidence: ${skillData.skill_name} (${confidence})`);
  return { action: 'rejected' };
}

async function queueSkillForReview(
  supabase: any,
  skillType: 'content' | 'subject',
  skillData: any,
  examData: any,
  examId: string,
  confidence: number
): Promise<{ action: 'queued' }> {
  try {
    await supabase
      .from('skill_review_queue')
      .insert({
        skill_name: skillData.skill_name,
        skill_type: skillType,
        skill_description: skillData.skill_description,
        topic: skillType === 'content' ? 'Pending Review' : null,
        subject: examData.classes?.subject || 'Math',
        grade: examData.classes?.grade || 'Grade 10',
        confidence: confidence,
        reasoning: `Suggested during exam analysis with medium confidence (${confidence})`,
        context_evidence: `Question mapping suggested this skill was needed but not found in existing skill set`,
        exam_id: examId,
        class_id: examData.class_id
      });

    console.log(`Queued ${skillType} skill for review: ${skillData.skill_name} (confidence: ${confidence})`);
    return { action: 'queued' };

  } catch (error) {
    console.error(`Failed to queue ${skillType} skill for review:`, error);
    return { action: 'queued' }; // Still return queued even if logging failed
  }
}
