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
    // 1. Authenticate the user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get data from the request body
    const { name, description, githubToken, workflowJson } = await req.json();
    if (!name || !githubToken || !workflowJson) {
        throw new Error("Missing required parameters: name, githubToken, or workflowJson.");
    }
    
    // 3. Parse the incoming JSON string into an object
    let parsedWorkflowJson;
    try {
        parsedWorkflowJson = JSON.parse(workflowJson);
    } catch (e) {
        throw new Error("The provided workflow data is not valid JSON.");
    }

    // 4. Create the GitHub repository
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

    // 5. Create and commit the initial workflow file
    const owner = repoData.owner.login;
    const repo = repoData.name;
    const path = 'workflow.json';

    // GitHub API requires the file content to be Base64 encoded.
    const contentEncoded = btoa(JSON.stringify(parsedWorkflowJson, null, 2));

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
            message: 'Initial commit: Add workflow.json',
            content: contentEncoded,
        }),
    });

    // 6. Get profile and save blueprint to your Supabase DB
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
        workflow_json: parsedWorkflowJson, // Save the parsed object
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