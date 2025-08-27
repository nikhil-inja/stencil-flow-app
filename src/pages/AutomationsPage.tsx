// src/pages/AutomationsPage.tsx

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import toast from "react-hot-toast";
import AutomationList from "@/shared/components/AutomationList";
import CreateAutomationForm from "@/shared/components/CreateAutomationForm";
// import { PlusCircle } from "lucide-react";

export default function AutomationsPage() {
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State to refresh the list after a new automation is created
  const [refreshKey, setRefreshKey] = useState(0);

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
        <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
      </div>
      
      {/* GitHub Connection Card remains the same */}
      <Card className="mb-6">
        <CardHeader>
            <CardTitle>GitHub Connection</CardTitle>
            <CardDescription>
            {isGitHubConnected 
                ? "Your account is connected to GitHub. If you experience issues, you can refresh the connection."
                : "Connect your GitHub account to enable version control for automations."
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

      {/* New Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Existing Automations */}
        <div className="flex flex-col gap-4">
            <AutomationList key={refreshKey} />
        </div>

        {/* Right Column: Create New Automation */}
        <div className="flex flex-col gap-4">
            <CreateAutomationForm onAutomationCreated={() => setRefreshKey(prev => prev + 1)} />
        </div>

      </div>
    </div>
  );
}