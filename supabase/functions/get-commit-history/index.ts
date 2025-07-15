// supabase/functions/get-commit-history/index.ts

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

    // 2. Get blueprintId and githubToken from the request body
    const { blueprintId, githubToken } = await req.json();
    if (!blueprintId) throw new Error("Blueprint ID is required.");
    if (!githubToken) throw new Error("GitHub token was not provided.");

    // 3. Get the blueprint's repo URL from our database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: blueprint } = await supabaseAdmin
      .from('blueprints')
      .select('git_repository')
      .eq('id', blueprintId)
      .single();

    if (!blueprint) throw new Error("Blueprint not found.");
    
    const repoUrl = blueprint.git_repository;
    const repoPath = new URL(repoUrl).pathname.substring(1);

    // 4. Call the GitHub API to get the list of commits
    const commitsResponse = await fetch(`https://api.github.com/repos/${repoPath}/commits`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!commitsResponse.ok) {
      const errorBody = await commitsResponse.json();
      throw new Error(`GitHub Commits API Error: ${errorBody.message}`);
    }

    const commitsData = await commitsResponse.json();

    // 5. Simplify the data to send back only what we need
    const history = commitsData.map((c: Record<string, unknown>) => ({
      sha: (c.sha as string),
      message: ((c.commit as Record<string, unknown>).message as string),
      author: (((c.commit as Record<string, unknown>).author as Record<string, unknown>).name as string),
      date: (((c.commit as Record<string, unknown>).author as Record<string, unknown>).date as string),
    }));

    return new Response(JSON.stringify(history), {
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