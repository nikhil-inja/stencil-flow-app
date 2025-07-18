// supabase/functions/toggle-workflow-activation/index.ts

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
    const { deploymentId, action } = await req.json();
    if (!deploymentId || !action) throw new Error("Missing deploymentId or action.");
    if (action !== 'activate' && action !== 'deactivate') throw new Error("Invalid action.");

    // 3. Get deployment and n8n instance details from the database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: deploymentDetails } = await supabaseAdmin
      .from('deployments')
      .select(`
        n8n_workflow_id,
        clients ( n8n_instances (instance_url, api_key) )
      `)
      .eq('id', deploymentId)
      .single();

    const { n8n_workflow_id, clients: client } = deploymentDetails as any;
    const n8n_instance = client?.n8n_instances;
    if (!n8n_workflow_id || !n8n_instance) throw new Error("Could not retrieve deployment details.");

    // 4. Make the API call to the n8n instance to activate or deactivate
    const cleanedUrl = n8n_instance.instance_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows/${n8n_workflow_id}/${action}`;
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': n8n_instance.api_key },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error (Status ${response.status}): ${errorText}`);
    }

    const responseData = await response.json();

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})