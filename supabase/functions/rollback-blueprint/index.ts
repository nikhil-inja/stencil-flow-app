// supabase/functions/rollback-blueprint/index.ts

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
    // 1. Authenticate the user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get data from the request body
    const { blueprintId, commitSha, githubToken } = await req.json();
    if (!blueprintId || !commitSha || !githubToken) {
      throw new Error("Missing required parameters.");
    }

    // 3. Get blueprint's repo URL from our database
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    const { data: blueprint } = await supabaseAdmin
      .from('blueprints')
      .select('git_repository')
      .eq('id', blueprintId)
      .single();

    if (!blueprint) throw new Error("Blueprint not found.");
    
    const repoPath = new URL(blueprint.git_repository).pathname.substring(1);
    const filePath = `repos/${repoPath}/contents/workflow.json`;

    // 4. Get the content of the file AT THE OLD COMMIT
    const oldFileResponse = await fetch(`https://api.github.com/${filePath}?ref=${commitSha}`, {
      headers: { 'Authorization': `token ${githubToken}` },
    });
    if (!oldFileResponse.ok) throw new Error("Could not find the specified version in GitHub.");
    const oldFileData = await oldFileResponse.json();
    const oldContentBase64 = oldFileData.content; // This is the Base64 content
    const oldContentDecoded = atob(oldContentBase64);
    const rolledBackJson = JSON.parse(oldContentDecoded);

    // 5. Get the SHA of the CURRENT file on the main branch
    const currentFileResponse = await fetch(`https://api.github.com/${filePath}`, {
      headers: { 'Authorization': `token ${githubToken}` },
    });
    if (!currentFileResponse.ok) throw new Error("Could not find the current workflow file in GitHub.");
    const currentFileData = await currentFileResponse.json();
    
    // 6. Create a NEW commit with the OLD content
    const rollbackCommitResponse = await fetch(`https://api.github.com/${filePath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Rollback to version ${commitSha.substring(0, 7)}`,
        content: oldContentBase64, // Re-use the Base64 content
        sha: currentFileData.sha, // Provide the SHA of the file we are updating
      }),
    });
    if (!rollbackCommitResponse.ok) {
        const errorBody = await rollbackCommitResponse.json();
        throw new Error(`GitHub Commit Error: ${errorBody.message}`);
    }

    // 7. Update our database with the rolled-back JSON
    const { error: dbError } = await supabaseAdmin
      .from('blueprints')
      .update({ workflow_json: rolledBackJson })
      .eq('id', blueprintId);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ message: 'Rollback successful!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})