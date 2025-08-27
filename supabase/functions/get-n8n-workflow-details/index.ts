// supabase/functions/get-n8n-workflow-details/index.ts

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
    // 1. Authenticate user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get the workflow ID from the request body
    const { workflowId } = await req.json();
    if (!workflowId) throw new Error("Workflow ID is required.");

    // 3. Get the user's workspace and master n8n credentials
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: profile } = await supabaseAdmin.from('profiles').select('workspace_id').eq('id', user.id).single();
    if (!profile) throw new Error("Could not find user profile.");

    const { data: workspace } = await supabaseAdmin.from('workspaces').select('n8n_instances (instance_url, api_key)').eq('id', profile.workspace_id).single();
    if (!workspace?.n8n_instances || workspace?.n8n_instances?.length === 0) {
        throw new Error("No n8n instances configured in settings.");
    }

    // 4. Call the n8n API to get the full details for the specific workflow
    // workspace.n8n_instances is an array, so use the first instance
    const n8nInstance = Array.isArray(workspace.n8n_instances)
      ? workspace.n8n_instances[0]
      : workspace.n8n_instances;

    const cleanedUrl = n8nInstance.instance_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows/${workflowId}`;

    const response = await fetch(targetUrl, {
      headers: { 'X-N8N-API-KEY': n8nInstance.api_key },
    });

    if (!response.ok) {
      throw new Error(`n8n API Error (Status ${response.status})`);
    }

    const workflowDetails = await response.json();

    // 5. Return the full workflow object
    return new Response(JSON.stringify(workflowDetails), {
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