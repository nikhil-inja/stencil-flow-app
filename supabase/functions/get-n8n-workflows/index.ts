// supabase/functions/get-n8n-workflows/index.ts
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

    // 2. Get clientId from request body
    const { clientId } = await req.json();
    if (!clientId) throw new Error("Missing clientId.");

    // 3. Get n8n instance credentials
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: instance } = await supabaseAdmin.from('n8n_instances').select('instance_url, api_key').eq('client_id', clientId).single();
    if (!instance) throw new Error("n8n instance details for this client not found.");

    // 4. Fetch all workflows from the n8n instance
    const cleanedUrl = instance.instance_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows`;

    const response = await fetch(targetUrl, {
      headers: { 'X-N8N-API-KEY': instance.api_key },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error (Status ${response.status}): ${errorText}`);
    }

    const workflows = await response.json();

    return new Response(JSON.stringify(workflows), {
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