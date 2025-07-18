// supabase/functions/store-github-token/index.ts

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

    // 2. The provider_token is only available in the session right after OAuth
    const { data: { session } } = await supabaseUserClient.auth.getSession();
    const githubToken = session?.provider_token;
    if (!githubToken) throw new Error("GitHub token not found in session.");

    // 3. Create an admin client to interact with the Vault
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Create a unique name for the secret based on the user's ID
    const secretName = `github_token_${user.id}`;

    // 5. Use vault.create_secret to securely store the token.
    const { error: vaultError } = await supabaseAdmin.rpc('vault.create_secret', {
        name: secretName,
        secret: githubToken,
        description: `GitHub token for user ${user.email}`
    });

    if (vaultError) throw new Error(`Vault Error: ${vaultError.message}`);

    return new Response(JSON.stringify({ message: 'GitHub token stored securely.' }), {
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