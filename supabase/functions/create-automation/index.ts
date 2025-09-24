// supabase/functions/create-automation/index.ts

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

    const { name, description, githubToken, workflowJson } = await req.json();
    if (!name || !githubToken || !workflowJson) throw new Error("Missing required parameters.");
    
    let parsedWorkflowJson;
    try {
        parsedWorkflowJson = JSON.parse(workflowJson);
    } catch (e) {
        throw new Error("The provided workflow data is not valid JSON.");
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: profile } = await supabaseAdmin.from('profiles').select('workspace_id').eq('id', user.id).single();
    if (!profile) throw new Error("Could not find user profile.");

    // Get workspace repository URL
    const { data: workspace } = await supabaseAdmin.from('workspaces').select('git_repository').eq('id', profile.workspace_id).single();
    if (!workspace?.git_repository) {
        throw new Error("Workspace repository not found. Please run migration first or contact support.");
    }

    // Create workflow folder structure
    const workflowFolderName = name.toLowerCase().replace(/\s+/g, '-');
    const workflowPath = `workflows/${workflowFolderName}`;
    const repoPath = new URL(workspace.git_repository).pathname.substring(1);

    // Check if workflow folder already exists
    const checkExistingResponse = await fetch(`https://api.github.com/repos/${repoPath}/contents/${workflowPath}`, {
        headers: { 'Authorization': `token ${githubToken}` },
    });
    
    if (checkExistingResponse.ok) {
        throw new Error(`A workflow with the name "${name}" already exists. Please choose a different name.`);
    }

    // Create workflow definition file
    const definitionContent = JSON.stringify(parsedWorkflowJson, null, 2);
    const definitionEncoded = encode(definitionContent);

    await fetch(`https://api.github.com/repos/${repoPath}/contents/${workflowPath}/definition.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ 
            message: `Create new workflow: ${name}`, 
            content: definitionEncoded 
        }),
    });

    // Create deployments folder with README
    const deploymentsReadme = `# Deployments for ${name}

This folder contains client-specific deployment configurations for the ${name} workflow.

Each deployment file represents a specific client instance of this workflow.
`;
    const deploymentsReadmeEncoded = encode(deploymentsReadme);
    
    await fetch(`https://api.github.com/repos/${repoPath}/contents/${workflowPath}/deployments/README.md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ 
            message: `Create deployments folder for ${name}`, 
            content: deploymentsReadmeEncoded 
        }),
    });

    // Insert automation record with new structure
    const { data: newAutomation, error: dbError } = await supabaseAdmin
      .from('automations')
      .insert({ 
          name, 
          description, 
          workspace_id: profile.workspace_id, 
          git_repository: workspace.git_repository, 
          workflow_path: workflowPath,
          workflow_json: parsedWorkflowJson 
      })
      .select('id, name, description').single();
    if (dbError) throw dbError;

    return new Response(JSON.stringify(newAutomation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})