// src/pages/BlueprintsPage.tsx

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BlueprintsManager from "@/components/BlueprintsManager";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import toast from "react-hot-toast";

export default function BlueprintsPage() {
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGitHubConnection = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        setIsGitHubConnected(true);
      } else {
        setIsGitHubConnected(false);
      }
      setLoading(false);
    };
    checkGitHubConnection();
  }, []);

  const handleConnectGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { 
          scopes: 'repo',
          queryParams: { prompt: 'consent' } 
        },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Blueprints</h1>
        <Button asChild><Link to="/import/n8n">Import from n8n</Link></Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>GitHub Connection</CardTitle>
          <CardDescription>
            {isGitHubConnected 
              ? "Your account is connected to GitHub. If you experience issues, you can refresh the connection."
              : "Connect your GitHub account to enable version control for blueprints."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Checking status...</p> : (
            <Button onClick={handleConnectGitHub}>
                {isGitHubConnected ? 'Refresh GitHub Connection' : 'Connect with GitHub'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Blueprints</CardTitle>
          <CardDescription>Create or update your master workflow templates.</CardDescription>
        </CardHeader>
        <CardContent>
          <BlueprintsManager />
        </CardContent>
      </Card>
    </div>
  );
}