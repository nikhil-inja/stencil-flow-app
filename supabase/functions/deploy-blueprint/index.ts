// supabase/functions/deploy-blueprint/index.ts

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
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get data from the request body
    const { blueprintId, clientId } = await req.json();
    if (!blueprintId || !clientId) throw new Error("Missing blueprintId or clientId.");

    // 3. Get blueprint and client n8n instance details
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    
    const { data: blueprint } = await supabaseAdmin.from('blueprints').select('name, workflow_json').eq('id', blueprintId).single();
    if (!blueprint) throw new Error("Blueprint not found.");

    const { data: instance } = await supabaseAdmin.from('n8n_instances').select('instance_url, api_key').eq('client_id', clientId).single();
    if (!instance) throw new Error("n8n instance details for this client not found.");

    // 4. Sanitize the workflow JSON to create a valid payload
    const userWorkflow = blueprint.workflow_json as Record<string, unknown>;
    const workflowToDeploy = {
        name: blueprint.name,
        nodes: userWorkflow.nodes,
        connections: userWorkflow.connections || {},
        settings: userWorkflow.settings || {},
        // The 'active: false' property has been removed from this object
    };
    
    // 5. Make the API call to the client's n8n instance
    const cleanedUrl = instance.instance_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows`;
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': instance.api_key,
      },
      body: JSON.stringify(workflowToDeploy),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error (Status ${response.status}): ${errorText}`);
    }

    return new Response(JSON.stringify({ message: `Successfully deployed '${blueprint.name}'!` }), {
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