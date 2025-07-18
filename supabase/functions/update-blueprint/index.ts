// supabase/functions/update-blueprint/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { blueprintId, description, workflowJson, githubToken } = await req.json();
    if (!blueprintId || !githubToken || !workflowJson) {
      throw new Error("Missing required parameters.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: blueprint } = await supabaseAdmin.from('blueprints').select('git_repository').eq('id', blueprintId).single();
    if (!blueprint) throw new Error("Blueprint not found.");
    
    const repoPath = new URL(blueprint.git_repository).pathname.substring(1); 
    const filePath = `repos/${repoPath}/contents/workflow.json`;

    const getFileResponse = await fetch(`https://api.github.com/${filePath}`, { headers: { 'Authorization': `token ${githubToken}` } });
    if (!getFileResponse.ok) throw new Error("Could not find original workflow file in GitHub.");
    const fileData = await getFileResponse.json();
    const currentSha = fileData.sha;

    const stringifiedJson = JSON.stringify(workflowJson, null, 2);
    const contentUint8 = new TextEncoder().encode(stringifiedJson);
    const contentEncoded = encode(contentUint8);

    const commitResponse = await fetch(`https://api.github.com/${filePath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify({ message: `Update workflow: ${new Date().toISOString()}`, content: contentEncoded, sha: currentSha }),
    });
    if (!commitResponse.ok) {
      const errorBody = await commitResponse.json();
      throw new Error(`GitHub Commit Error: ${errorBody.message}`);
    }

    const { error: dbError } = await supabaseAdmin.from('blueprints').update({ description, workflow_json: workflowJson }).eq('id', blueprintId);
    if (dbError) throw dbError;

    return new Response(JSON.stringify({ message: 'Blueprint updated successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})