// supabase/functions/list-n8n-workflows/index.ts

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
    )
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get the user's organization ID from their profile
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error("Could not find user profile.");

    // 3. Get the master n8n credentials from the organization record
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('master_n8n_instance_id, n8n_instances!master_n8n_instance_id(instance_url, api_key)')
      .eq('id', profile.organization_id)
      .single();

    const masterInstanceArr = organization?.n8n_instances;
    const masterInstance = Array.isArray(masterInstanceArr) ? masterInstanceArr[0] : masterInstanceArr;
    if (
      !organization ||
      !masterInstance ||
      !masterInstance.instance_url ||
      !masterInstance.api_key
    ) {
      throw new Error("Master n8n credentials are not configured in settings.");
    }

    // 4. Call the user's n8n instance API to get the list of workflows
    const cleanedUrl = masterInstance.instance_url.replace(/\/$/, "");
    const targetUrl = `${cleanedUrl}/api/v1/workflows`;
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-N8N-API-KEY': masterInstance.api_key,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error (Status ${response.status}): ${errorText}`);
    }

    const workflows = await response.json();

    // 5. Return the list of workflows
    return new Response(JSON.stringify(workflows), {
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