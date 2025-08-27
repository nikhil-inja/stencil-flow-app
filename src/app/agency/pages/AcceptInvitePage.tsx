// src/pages/AcceptInvitePage.tsx

import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';

// Import Shadcn Components
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    // Get the invitation token from the URL query parameter
    const inviteToken = searchParams.get('token');
    if (inviteToken) {
      setToken(inviteToken);
    } else {
      toast.error("Invitation token not found.");
    }
  }, [searchParams]);

  const navigate = useNavigate(); // <-- Initialize the hook

  const handleAcceptInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      toast.error("Invalid invitation link.");
      return;
    }
    setLoading(true);
  
    try {
      const { error } = await apiClient.functions.invoke('accept-invite', {
        body: {
          token,
        },
      });
  
      if (error) throw error;
  
      toast.success("Welcome to the team! Please log in to continue.");
      navigate('/login'); // Redirect to the login page on success
  
    } catch (error: any) {
      toast.error(`Failed to accept invite: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="mx-auto w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl">Accept Your Invitation</CardTitle>
          <CardDescription>
            Create an account to join your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <p className="text-destructive">This invitation link is invalid or has expired.</p>
          ) : (
            <form onSubmit={handleAcceptInvite} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Joining...' : 'Accept & Join Team'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}