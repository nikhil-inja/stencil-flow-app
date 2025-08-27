// supabase/functions/sync-automation-from-n8n/index.ts

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
    // 1. Authenticate user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get automationId and githubToken from request body
    const { automationId, githubToken } = await req.json();
    if (!automationId || !githubToken) {
      throw new Error("Missing automationId or githubToken.");
    }
    
    // 3. Get automation and workspace details
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: automationData } = await supabaseAdmin
      .from('automations')
      .select(`
        git_repository,
        workflow_json,
        workflow_path,
        workspace:workspaces (master_n8n_url, master_n8n_api_key)
      `)
      .eq('id', automationId)
      .single();

    if (!automationData) throw new Error("Automation not found.");
    const { git_repository, workflow_json, workflow_path, workspace } = automationData as any;
    if (!workspace?.master_n8n_url || !workspace?.master_n8n_api_key) {
      throw new Error("Master n8n credentials are not configured in settings.");
    }

    const n8nWorkflowId = (workflow_json as any)?.id;
    if (!n8nWorkflowId) throw new Error("Could not find source n8n workflow ID in automation.");

    // 4. Fetch the LATEST version from the user's master n8n instance
    const cleanedUrl = workspace.master_n8n_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows/${n8nWorkflowId}`;
    const n8nResponse = await fetch(targetUrl, {
      headers: { 'X-N8N-API-KEY': workspace.master_n8n_api_key },
    });
    if (!n8nResponse.ok) throw new Error("Could not fetch latest workflow from your n8n instance.");
    const newWorkflowJson = await n8nResponse.json();

    // 5. Commit the updated workflow to the GitHub repository
    const repoPath = new URL(git_repository).pathname.substring(1);
    const definitionFilePath = `${workflow_path}/definition.json`;
    const filePath = `repos/${repoPath}/contents/${definitionFilePath}`;

    const getFileResponse = await fetch(`https://api.github.com/${filePath}`, {
      headers: { 'Authorization': `token ${githubToken}` },
    });
    if (!getFileResponse.ok) throw new Error("Could not find workflow definition file in GitHub repo to update.");
    const fileData = await getFileResponse.json();
    const currentSha = fileData.sha;

    const contentEncoded = encode(new TextEncoder().encode(JSON.stringify(newWorkflowJson, null, 2)));

    await fetch(`https://api.github.com/${filePath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: 'Sync update from master n8n instance',
        content: contentEncoded,
        sha: currentSha,
      }),
    });

    // 6. Update the workflow_json in our own database
    await supabaseAdmin
      .from('automations')
      .update({ workflow_json: newWorkflowJson })
      .eq('id', automationId);

    return new Response(JSON.stringify({ message: 'Automation synced successfully!' }), {
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