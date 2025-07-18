// supabase/functions/update-deployed-workflow/index.ts

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
    // 1. Authenticate user and get data from request
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { deploymentId } = await req.json();
    if (!deploymentId) throw new Error("Missing deploymentId.");

    // 2. Get all deployment details from your database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: deploymentDetails } = await supabaseAdmin
      .from('deployments')
      .select(`
        n8n_workflow_id,
        blueprint_id, 
        blueprints ( name, workflow_json ),
        clients ( n8n_instances (instance_url, api_key) )
      `)
      .eq('id', deploymentId)
      .single();

    const { n8n_workflow_id, blueprints: blueprint, clients: client } = deploymentDetails as any;
    const n8n_instance = client?.n8n_instances;
    if (!blueprint || !n8n_instance) throw new Error("Could not retrieve blueprint or n8n instance details.");

    // 3. Sanitize the workflow JSON
    const workflowToUpdate = {
        name: blueprint.name,
        nodes: (blueprint.workflow_json as any).nodes,
        connections: (blueprint.workflow_json as any).connections || {},
        settings: (blueprint.workflow_json as any).settings || {},
    };

    // 4. Make the PUT request to update the workflow
    const cleanedUrl = n8n_instance.instance_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows/${n8n_workflow_id}`;
    
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8n_instance.api_key,
      },
      body: JSON.stringify(workflowToUpdate),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error (Status ${response.status}): ${errorText}`);
    }

    // =================================================================
    // ## NEW DEBUGGING STEP: Verify the update ##
    // =================================================================
    console.log("Update API call successful. Now verifying the saved data...");
    
    const verificationResponse = await fetch(targetUrl, {
        headers: {
            'X-N8N-API-KEY': n8n_instance.api_key,
        },
    });

    const verifiedData = await verificationResponse.json();
    console.log("VERIFICATION DATA:", JSON.stringify(verifiedData, null, 2));
    // =================================================================

    // This part is likely unnecessary now, as the Git repo is the source of truth,
    // but we'll leave it for now.
    await supabaseAdmin
      .from('blueprints')
      .update({ workflow_json: blueprint.workflow_json })
      .eq('id', deploymentDetails?.blueprint_id);

    return new Response(JSON.stringify({ message: `Successfully updated '${blueprint.name}'!` }), {
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