// supabase/functions/create-blueprint/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create a Supabase admin client
const createAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
  
    try {
      // Get user from the request token to verify they are logged in
      const supabaseUserClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      )
      const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated.");
  
      // Get blueprint details AND the token directly from the request body
      const { name, description, githubToken } = await req.json();
      if (!name) throw new Error("Blueprint name is required.");
      if (!githubToken) throw new Error("GitHub token was not provided.");
  
      // Create the GitHub repository using the provided token
      const githubResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          name: name.toLowerCase().replace(/\s+/g, '-'),
          description: description,
          private: true,
        }),
      });
  
      if (!githubResponse.ok) {
        const errorBody = await githubResponse.json();
        throw new Error(`GitHub API Error: ${errorBody.message}`);
      }
      const repoData = await githubResponse.json();
  
      // Get profile and save the blueprint (logic requires admin client)
      const supabaseAdmin = createAdminClient();
      const { data: profile } = await supabaseAdmin.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!profile) throw new Error("Could not find user profile.");
  
      const { data: newBlueprint, error: dbError } = await supabaseAdmin
        .from('blueprints')
        .insert({
          name: name,
          description: description,
          organization_id: profile.organization_id,
          git_repository: repoData.html_url,
        })
        .select('id, name, description')
        .single();
  
      if (dbError) throw dbError;
  
      return new Response(JSON.stringify(newBlueprint), {
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