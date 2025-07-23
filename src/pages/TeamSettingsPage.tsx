// src/pages/TeamSettingsPage.tsx

import { useState, type FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Import Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from '@/supabaseClient';
import { useSession } from '@/context/SessionContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface TeamMember {
    id: string;
    full_name: string | null;
    email: string | undefined;
    role: string;
  }

export default function TeamSettingsPage() {
    const { profile } = useSession();
  
    // State for inviting new members
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
  
    // State for the master n8n credentials
    const [masterUrl, setMasterUrl] = useState('');
    const [masterApiKey, setMasterApiKey] = useState('');
    const [isSavingMasterCreds, setIsSavingMasterCreds] = useState(false);

    const [isGitHubConnected, setIsGitHubConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    
    // NEW: Real state for the team members list
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
    useEffect(() => {
      if (!profile) return;
  
      // This function now fetches both org settings and team members
      const loadPageData = async () => {
        // Fetch Org Settings
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('n8n_instances(instance_url)')
          .eq('id', profile.organization_id)
          .single();
  
        if (orgError && orgError.code !== 'PGRST116') {
          toast.error("Could not load organization settings.");
        } else if (orgData && orgData.n8n_instances && Array.isArray(orgData.n8n_instances) && orgData.n8n_instances[0]) {
          setMasterUrl(orgData.n8n_instances[0].instance_url || '');
        }

        // Fetch Team Members using our new database function
        const { data: membersData, error: membersError } = await supabase
          .rpc('get_team_members', { org_id: profile.organization_id });
  
        if (membersError) {
          toast.error("Could not load team members.");
        } else {
          setTeamMembers(membersData);
        }

        try {
            const { data, error } = await supabase.functions.invoke('check-github-connection');
            if (error) throw error;
            setIsGitHubConnected(data.isConnected);
          } catch (e: any) {
            toast.error("Failed to check GitHub connection: " + e.message);
          } finally {
            setIsConnecting(false);
          }
      };
  
      loadPageData();
    }, [profile]);

  // Logic for inviting a user
  const handleInviteUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in to invite users.");

      const { data, error } = await supabase.functions.invoke('invite-user', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: { emailToInvite: inviteEmail },
      });

      if (error) throw error;

      toast.success(
        (t) => (
          <div className="flex flex-col gap-2">
            <span>Invite link generated!</span>
            <p className="text-xs">Copy this link and send it to your teammate.</p>
            <Input readOnly defaultValue={data.invitationLink} />
            <Button size="sm" onClick={() => toast.dismiss(t.id)}>Dismiss</Button>
          </div>
        ), { duration: 15000 }
      );
      setInviteEmail('');

    } catch (error: any) {
      toast.error(`Failed to send invite: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  // Logic for saving master credentials
  const handleSaveMasterCreds = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setIsSavingMasterCreds(true);
  
    try {
      const { error } = await supabase.rpc('upsert_and_link_master_instance', {
        p_organization_id: profile.organization_id,
        p_instance_url: masterUrl,
        p_api_key: masterApiKey
      });
  
      if (error) throw error;
      
      toast.success('Master n8n instance saved!');
    } catch (error: any) {
      toast.error(`Failed to save credentials: ${error.message}`);
    } finally {
      setIsSavingMasterCreds(false);
    }
  };

  const handleConnectGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo',
        redirectTo: `${window.location.origin}/github-callback`,
      },
    });
    if (error) toast.error(error.message);
  };

  const handleDisconnectGitHub = async () => {
    setIsConnecting(true);
    try {
        const { error } = await supabase.functions.invoke('disconnect-github');
        if (error) throw error;
        toast.success("GitHub account disconnected.");
        setIsGitHubConnected(false);
    } catch(e: any) {
        toast.error("Failed to disconnect GitHub: " + e.message);
    } finally {
        setIsConnecting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8">
        <Button asChild variant="ghost" className="mb-2 -ml-4">
          <Link to="/">&larr; Back to Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </header>

      <main className="grid gap-8">
      <Card>
          <CardHeader>
            <CardTitle>GitHub Connection</CardTitle>
            <CardDescription>Connect your GitHub account to enable version control for automations.</CardDescription>
          </CardHeader>
          <CardContent>
            {isConnecting ? <p>Checking status...</p> : (
              isGitHubConnected ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-600">✓ GitHub Account Connected</p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Disconnect</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Disconnecting your GitHub account will prevent you from creating or updating automations. You can reconnect at any time.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDisconnectGitHub}>Yes, Disconnect</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              ) : (
                <Button onClick={handleConnectGitHub}>Connect with GitHub</Button>
              )
            )}
          </CardContent>
        </Card>
        {/* Card for Master n8n Instance */}
        <Card>
          <CardHeader>
            <CardTitle>My n8n Instance</CardTitle>
            <CardDescription>
              Connect to your own n8n instance to enable direct automation imports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveMasterCreds} className="space-y-4 max-w-sm">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="master-url">Your n8n URL</Label>
                <Input
                  id="master-url"
                  type="url"
                  placeholder="https://my-agency.n8n.cloud"
                  value={masterUrl}
                  onChange={(e) => setMasterUrl(e.target.value)}
                  disabled={isSavingMasterCreds}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="master-api-key">Your n8n API Key</Label>
                <Input
                  id="master-api-key"
                  type="password"
                  placeholder="Enter new key to update..."
                  value={masterApiKey}
                  onChange={(e) => setMasterApiKey(e.target.value)}
                  disabled={isSavingMasterCreds}
                />
              </div>
              <Button type="submit" disabled={isSavingMasterCreds}>
                {isSavingMasterCreds ? 'Saving...' : 'Save Credentials'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Card for Inviting New Members */}
        <Card>
          <CardHeader>
            <CardTitle>Invite New Member</CardTitle>
            <CardDescription>Invite a new member to your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteUser} className="flex items-center gap-2 max-w-sm">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={isInviting}
                />
              </div>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card for Listing Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage members of your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <ul className="divide-y">
                {teamMembers.map((member) => (
                  <li key={member.email} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{member.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}   