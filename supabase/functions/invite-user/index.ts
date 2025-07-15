// supabase/functions/invite-user/index.ts

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
    // 1. Authenticate the user sending the invitation
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 2. Get the email to invite from the request body
    const { emailToInvite } = await req.json();
    if (!emailToInvite) throw new Error("Email to invite is required.");

    // 3. Get the inviter's profile to find their organization_id
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) throw new Error("Could not find inviter's profile.");

    // 4. Generate a secure, random token for the invitation
    const token = crypto.randomUUID();

    // 5. Insert the new invitation into the database
    const { error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        organization_id: profile.organization_id,
        invited_by_user_id: user.id,
        invited_user_email: emailToInvite,
        token: token,
      });
    
    if (inviteError) {
        // Handle the case where the user has already been invited
        if (inviteError.code === '23505') { // "unique_violation"
            throw new Error(`${emailToInvite} has already been invited.`);
        }
        throw inviteError;
    }
    
    // 6. Return the full invitation link to the frontend
    const invitationLink = `${Deno.env.get('SITE_URL')}/accept-invite?token=${token}`;

    return new Response(JSON.stringify({ invitationLink }), {
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