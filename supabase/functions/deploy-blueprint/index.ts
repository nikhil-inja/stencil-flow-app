// supabase/functions/deploy-blueprint/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define a single CORS headers object to use for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeployRequest {
  clientId: string;
  blueprintId: string;
}

serve(async (req) => {
  // Handle the preflight CORS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clientId, blueprintId }: DeployRequest = await req.json();
    if (!clientId || !blueprintId) {
      throw new Error("Client ID and Blueprint ID are required.");
    }

    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('n8n_instances')
      .select('instance_url, api_key')
      .eq('client_id', clientId)
      .single();
    if (instanceError) throw instanceError;
    if (!instance) throw new Error("No n8n instance found for this client.");

    const { data: blueprint, error: blueprintError } = await supabaseAdmin
      .from('blueprints')
      .select('name, workflow_json')
      .eq('id', blueprintId)
      .single();
    if (blueprintError) throw blueprintError;
    if (!blueprint.workflow_json) {
      throw new Error("The selected blueprint is empty and has no workflow data to deploy.");
    }

         // We now precisely build the payload instead of spreading the whole object.
     const userWorkflow = blueprint.workflow_json as Record<string, unknown>;

    if (!userWorkflow.nodes) {
        throw new Error("Blueprint JSON is invalid and is missing the required 'nodes' property.");
    }

    const workflowToDeploy = {
        name: blueprint.name,
        nodes: userWorkflow.nodes,
        connections: userWorkflow.connections || {},
        settings: userWorkflow.settings || {}
    };

    const targetUrl = `${instance.instance_url}/api/v1/workflows`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': instance.api_key,
      },
      body: JSON.stringify(workflowToDeploy),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`n8n API Error: ${errorBody.message}`);
    }

    // Return a success message with the CORS headers
    return new Response(JSON.stringify({ message: `Successfully deployed '${blueprint.name}'!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Return an error message with the CORS headers
    console.error('Function error:', error); 
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})