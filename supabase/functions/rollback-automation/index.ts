// supabase/functions/rollback-automation/index.ts

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
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { automationId, commitSha, githubToken } = await req.json();
    if (!automationId || !commitSha || !githubToken) {
      throw new Error("Missing required parameters.");
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    const { data: automation } = await supabaseAdmin.from('automations').select('git_repository').eq('id', automationId).single();
    if (!automation) throw new Error("Automation not found.");
    
    const repoPath = new URL(automation.git_repository).pathname.substring(1);
    const filePath = `repos/${repoPath}/contents/workflow.json`;

    const oldFileResponse = await fetch(`https://api.github.com/${filePath}?ref=${commitSha}`, { headers: { 'Authorization': `token ${githubToken}` } });
    if (!oldFileResponse.ok) throw new Error("Could not find the specified version in GitHub.");
    const oldFileData = await oldFileResponse.json();
    const oldContentBase64 = oldFileData.content;
    const oldContentDecoded = atob(oldContentBase64);
    const rolledBackJson = JSON.parse(oldContentDecoded);

    const currentFileResponse = await fetch(`https://api.github.com/${filePath}`, { headers: { 'Authorization': `token ${githubToken}` } });
    if (!currentFileResponse.ok) throw new Error("Could not find the current workflow file in GitHub.");
    const currentFileData = await currentFileResponse.json();
    
    await fetch(`https://api.github.com/${filePath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify({ message: `Rollback to version ${commitSha.substring(0, 7)}`, content: oldContentBase64, sha: currentFileData.sha }),
    });

    await supabaseAdmin.from('automations').update({ workflow_json: rolledBackJson }).eq('id', automationId);

    return new Response(JSON.stringify({ message: 'Rollback successful!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})