// src/components/AutomationList.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
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
  const { profile } = useSession();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchAutomations();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchAutomations = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('automations')
      .select('id, name, description')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false });

    if (error) toast.error(`Failed to fetch automations: ${error.message}`);
    else if (data) setAutomations(data);
    setLoading(false);
  };
  
  const handleDeleteAutomation = async (automationId: string) => {
    if (window.confirm('Are you sure you want to delete this automation?')) {
        const { error } = await supabase.from('automations').delete().eq('id', automationId);
        if (error) {
            toast.error(error.message);
        } else {
            setAutomations(automations.filter((auto) => auto.id !== automationId));
            toast.success('Automation deleted.');
        }
    }
  };

  if (!profile) {
    return (
      <Card>
        <CardHeader><CardTitle>Existing Automations</CardTitle></CardHeader>
        <CardContent><p>Loading user profile...</p></CardContent>
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