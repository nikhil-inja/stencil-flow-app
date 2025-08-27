// src/components/AutomationList.tsx

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient'; // Changed from supabaseClient
import { useSession } from '@/context/SessionContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface Automation {
  id: string;
  name: string;
  description: string | null;
}

export default function AutomationList() {
  const { profile, loading: sessionLoading, refreshSession } = useSession();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Only proceed if session loading is complete
    if (sessionLoading) {
      console.log('🔄 Session still loading, waiting...');
      return;
    }

    if (profile) {
      console.log('✅ Profile loaded, fetching automations:', profile);
      fetchAutomations();
    } else {
      console.log('❌ No profile available after session load');
      setLoading(false);
      
      // Retry logic for transient issues
      if (retryCount < 3) {
        console.log(`🔁 Retrying session load (${retryCount + 1}/3)`);
        setTimeout(async () => {
          await refreshSession();
          setRetryCount(prev => prev + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      }
    }
  }, [profile, sessionLoading, retryCount, refreshSession]);

  const fetchAutomations = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Get authentication token
      const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch('http://localhost:8000/api/automations/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.ok) {
        const automationsData = await response.json();
        const automations = automationsData.results || automationsData || [];
        setAutomations(automations);
      } else {
        throw new Error('Failed to fetch automations');
      }
    } catch (error: any) {
      console.error('Error fetching automations:', error);
      toast.error('Failed to fetch automations');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAutomation = async (automationId: string) => {
    if (window.confirm('Are you sure you want to delete this automation?')) {
        try {
          // Get authentication token
          const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
          if (sessionError || !sessionData?.session) {
            toast.error("Authentication required");
            return;
          }

          const response = await fetch(`http://localhost:8000/api/automations/${automationId}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${sessionData.session.access_token}`,
            },
          });

          if (response.ok) {
            setAutomations(automations.filter((auto) => auto.id !== automationId));
            toast.success('Automation deleted.');
          } else {
            throw new Error('Failed to delete automation');
          }
        } catch (error: any) {
          console.error('Error deleting automation:', error);
          toast.error('Failed to delete automation');
        }
    }
  };

  if (sessionLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Existing Automations</CardTitle></CardHeader>
        <CardContent><p>Loading session...</p></CardContent>
      </Card>
    );
  }

  if (!profile) {
    // Show loading during retry attempts
    if (retryCount < 3) {
      return (
        <Card>
          <CardHeader><CardTitle>Existing Automations</CardTitle></CardHeader>
          <CardContent><p>Loading session...</p></CardContent>
        </Card>
      );
    }
    
    // Show error state only after all retries failed
    return (
      <Card>
        <CardHeader><CardTitle>Existing Automations</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center p-4">
            <p className="text-muted-foreground mb-4">Unable to load user profile.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={refreshSession} size="sm" variant="outline">
                Retry Session
              </Button>
              <Button onClick={() => window.location.reload()} size="sm">
                Reload Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Existing Automations</CardTitle>
                <CardDescription>Manage your saved automation templates.</CardDescription>
            </div>
            <Button asChild>
                <Link to="/import/n8n">
                    <PlusCircle className="mr-2 h-4 w-4" /> Import from n8n
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading automations...</p> : (
          automations.length > 0 ? (
            <ul className="divide-y border rounded-md">
            {automations.map((auto) => (
              <li key={auto.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{auto.name}</p>
                  <p className="text-sm text-muted-foreground">{auto.description || 'No description.'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/automation/${auto.id}/edit`}>Edit</Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAutomation(auto.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
            </ul>
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <h3 className="text-lg font-semibold">No Automations Found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first automation on the right or import one from n8n.
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}