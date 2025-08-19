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

    let repoData = null;
    let attempt = 0;
    const baseRepoName = name.toLowerCase().replace(/\s+/g, '-');
    let currentRepoName = baseRepoName;

    while (repoData === null) {
      if (attempt > 0) { currentRepoName = `${baseRepoName}-${attempt}`; }
      const githubResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ name: currentRepoName, description, private: true }),
      });
      if (githubResponse.ok) {
        repoData = await githubResponse.json();
      } else if (githubResponse.status === 422) {
        const errorBody = await githubResponse.json();
        if (errorBody.errors?.some((e: any) => e.message.includes('name already exists'))) {
          attempt++;
        } else { throw new Error(`GitHub API Error: ${errorBody.message}`); }
      } else {
        const errorBody = await githubResponse.json();
        throw new Error(`GitHub API Error: ${errorBody.message}`);
      }
      if (attempt > 10) throw new Error("Could not find an available repository name.");
    }
    
    const owner = repoData.owner.login;
    const repo = repoData.name;
    const path = 'workflow.json';
    const contentEncoded = encode(JSON.stringify(parsedWorkflowJson, null, 2));

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ message: 'Initial commit: Add workflow.json', content: contentEncoded }),
    });

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: profile } = await supabaseAdmin.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) throw new Error("Could not find user profile.");
    
    const { data: newAutomation, error: dbError } = await supabaseAdmin
      .from('automations')
      .insert({ name, description, organization_id: profile.organization_id, git_repository: repoData.html_url, workflow_json: parsedWorkflowJson })
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