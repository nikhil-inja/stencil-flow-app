// supabase/functions/update-blueprint/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // FIX 1: Add the Authorization header to correctly identify the user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Get data from the request body
    const { blueprintId, description, workflowJson, githubToken } = await req.json();
    if (!blueprintId) throw new Error("Blueprint ID is required.");
    if (!githubToken) throw new Error("GitHub token was not provided.");
    if (!workflowJson) throw new Error("Workflow JSON is required.");

    // Get the blueprint's repo URL from our database
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    const { data: blueprint, error: fetchError } = await supabaseAdmin
      .from('blueprints')
      .select('git_repository')
      .eq('id', blueprintId)
      .single();

    if (fetchError || !blueprint) throw new Error("Blueprint not found.");
    
    const repoUrl = blueprint.git_repository;
    const repoPath = new URL(repoUrl).pathname.substring(1); 
    const filePath = `repos/${repoPath}/contents/workflow.json`;

    // Get the current SHA of the file to be updated
    const getFileResponse = await fetch(`https://api.github.com/${filePath}`, {
      headers: { 'Authorization': `token ${githubToken}` },
    });
    if (!getFileResponse.ok) throw new Error("Could not find original workflow file in GitHub.");
    const fileData = await getFileResponse.json();
    const currentSha = fileData.sha;

    // Create a new commit by updating the file content
    const contentEncoded = btoa(JSON.stringify(workflowJson, null, 2));
    const commitResponse = await fetch(`https://api.github.com/${filePath}`, {
      method: 'PUT',
      // FIX 2: Add missing Content-Type and Accept headers
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Update workflow: ${new Date().toISOString()}`,
        content: contentEncoded,
        sha: currentSha,
      }),
    });

    if (!commitResponse.ok) {
      const errorBody = await commitResponse.json();
      throw new Error(`GitHub Commit Error: ${errorBody.message}`);
    }

    // Update the record in our database
    const { error: dbError } = await supabaseAdmin
      .from('blueprints')
      .update({
        description: description,
        workflow_json: workflowJson,
      })
      .eq('id', blueprintId);

    if (dbError) throw dbError;

    // FIX 3: Add explicit status code
    return new Response(JSON.stringify({ message: 'Blueprint updated successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    // FIX 3: Add explicit status code
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})