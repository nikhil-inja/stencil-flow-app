// supabase/functions/deploy-automation/index.ts

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
    // 1. Authenticate the user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get data from the request body
    const { automationId, clientId, githubToken } = await req.json();
    if (!automationId || !clientId || !githubToken) throw new Error("Missing automationId, clientId, or githubToken.");

    // 3. Get automation, client, and n8n instance details
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    
    const { data: automation } = await supabaseAdmin.from('automations').select('name, workflow_json, git_repository, workflow_path').eq('id', automationId).single();
    if (!automation) throw new Error("Automation not found.");

    // Fetch the client's name along with the instance details
    const { data: client } = await supabaseAdmin.from('clients').select('name, n8n_instances(instance_url, api_key)').eq('id', clientId).single();
    const instance = client?.n8n_instances;
    if (!instance || !client) throw new Error("n8n instance details or client name not found.");

    // 4. Sanitize the workflow JSON
    const userWorkflow = automation.workflow_json as any;
    const workflowToDeploy = {
        name: automation.name,
        nodes: userWorkflow.nodes,
        connections: userWorkflow.connections || {},
        settings: userWorkflow.settings || {},
    };
    
    // 5. Make the API call to the client's n8n instance
    // instance may be an array if n8n_instances is a relation; handle accordingly
    const n8nInstance = Array.isArray(instance) ? instance[0] : instance;
    if (!n8nInstance?.instance_url || !n8nInstance?.api_key) {
      throw new Error("n8n instance details are missing or malformed.");
    }
    const cleanedUrl = n8nInstance.instance_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows`;
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nInstance.api_key,
      },
      body: JSON.stringify(workflowToDeploy),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error (Status ${response.status}): ${errorText}`);
    }

    const n8nWorkflowData = await response.json();
    const n8nWorkflowId = n8nWorkflowData.id;

    // 6. Get latest commit SHA from the main branch
    const repoPath = new URL(automation.git_repository).pathname.substring(1);
    const mainBranchInfo = await fetch(`https://api.github.com/repos/${repoPath}/branches/main`, {
      headers: { 'Authorization': `token ${githubToken}` },
    });
    if (!mainBranchInfo.ok) throw new Error("Could not find main branch in repository.");
    const mainBranchData = await mainBranchInfo.json();
    const mainBranchSha = mainBranchData.commit.sha;

    // 7. Create deployment configuration file
    const clientFileName = client.name.toLowerCase().replace(/\s+/g, '-');
    const deploymentFilePath = `${automation.workflow_path}/deployments/${clientFileName}.json`;
    
    const deploymentConfig = {
      clientId: clientId,
      clientName: client.name,
      n8nWorkflowId: n8nWorkflowId,
      deployedCommitSha: mainBranchSha,
      deployedAt: new Date().toISOString(),
      automationName: automation.name,
      status: 'active'
    };

    const deploymentContent = JSON.stringify(deploymentConfig, null, 2);
    const deploymentEncoded = encode(deploymentContent);

    // Check if deployment file already exists and get its SHA if it does
    let existingFileSha = null;
    const existingFileResponse = await fetch(`https://api.github.com/repos/${repoPath}/contents/${deploymentFilePath}`, {
      headers: { 'Authorization': `token ${githubToken}` },
    });
    
    if (existingFileResponse.ok) {
      const existingFileData = await existingFileResponse.json();
      existingFileSha = existingFileData.sha;
    }

    // Create or update deployment file
    const fileBody: any = {
      message: existingFileSha 
        ? `Update deployment: ${automation.name} for ${client.name}` 
        : `Create deployment: ${automation.name} for ${client.name}`,
      content: deploymentEncoded
    };
    
    if (existingFileSha) {
      fileBody.sha = existingFileSha;
    }

    await fetch(`https://api.github.com/repos/${repoPath}/contents/${deploymentFilePath}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `token ${githubToken}`, 
        'Accept': 'application/vnd.github.v3+json' 
      },
      body: JSON.stringify(fileBody),
    });

    // 8. Record the deployment in our database
    const { data: newDeployment, error: deploymentError } = await supabaseAdmin
      .from('deployments')
      .upsert({
        automation_id: automationId,
        client_id: clientId,
        n8n_workflow_id: n8nWorkflowId,
        deployed_commit_sha: mainBranchSha,
        deployment_file_path: deploymentFilePath,
      }, { onConflict: 'automation_id, client_id' })
      .select('id')
      .single();

    if (deploymentError || !newDeployment) throw deploymentError || new Error("Failed to create or retrieve deployment record.");

    return new Response(JSON.stringify({ message: `Successfully deployed '${automation.name}'!` }), {
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