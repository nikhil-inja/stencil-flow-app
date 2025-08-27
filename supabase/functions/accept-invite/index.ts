// supabase/functions/accept-invite/index.ts

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
    const { token, email, password, fullName } = await req.json();
    if (!token || !email || !password || !fullName) throw new Error("Missing required fields.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the pending invitation to get the workspace_id
    const { data: invitation, error: tokenError } = await supabaseAdmin
      .from('invitations')
      .select('id, workspace_id')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (tokenError || !invitation) throw new Error("This invitation is invalid or has already been accepted.");

    // Create the new user with special metadata attached
    const { data: { user }, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      // THIS IS THE KEY: We pass the workspace ID in the user_metadata
      user_metadata: { 
        full_name: fullName,
        invited_to_workspace: invitation.workspace_id 
      },
    });

    if (createUserError) throw createUserError;
    if (!user) throw new Error("Failed to create user account.");

    // Mark the invitation as 'accepted'
    await supabaseAdmin
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    // The trigger now handles profile creation and workspace assignment. No more work needed here!

    return new Response(JSON.stringify({ message: 'Account created successfully!' }), {
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