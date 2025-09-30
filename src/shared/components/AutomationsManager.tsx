// src/components/AutomationsManager.tsx

import { useState, useEffect, type FormEvent } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useSession } from '@/context/SessionContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; 

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";

interface Automation {
  id: string;
  name: string;
  description: string | null;
}

export default function AutomationsManager() {
  const { profile } = useSession();
  const [automations, setAutomations] = useState<Automation[]>([]);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchAutomations();
    }
  }, [profile]);

  const fetchAutomations = async () => {
    if (!profile) return;
    try {
      // Get authentication token
      const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        toast.error("Authentication required");
        return;
      }

      const { data: automationsData, error } = await apiClient.from('automations').select('*');
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch automations');
      } else {
        const automations = automationsData || [];
        setAutomations(automations);
      }
    } catch (error: any) {
      console.error('Error fetching automations:', error);
      toast.error('Failed to fetch automations');
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

          let error: any;
          await apiClient.from('automations').delete().eq('id', automationId).then((resolve) => {
            error = resolve.error;
          });

          if (error) {
            throw new Error(error?.message || 'Failed to delete automation');
          } else {
            setAutomations(automations.filter((auto) => auto.id !== automationId));
            toast.success('Automation deleted.');
          }
        } catch (error: any) {
          console.error('Error deleting automation:', error);
          toast.error('Failed to delete automation');
        }
    }
  };

  const handleAddAutomation = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Automation name is required.');
      return;
    }
    setIsCreating(true);
  
    try {
      const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        toast.error("Authentication required");
        return;
      }

      const { data: newAutomation, error } = await apiClient.functions.invoke('create-automation', {
        body: {
          name,
          description,
          workflow_json: workflowJson,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create automation');
      } else {
        setAutomations([newAutomation, ...automations]);
        setName('');
        setDescription('');
        setWorkflowJson('');
        toast.success('Automation and GitHub repo created!');
      }
  
    } catch (error: any) {
      toast.error(`Failed to create automation: ${error.message}`);
    } finally {
        setIsCreating(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddAutomation} className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="bp-name">Automation Name</Label>
            <Input
                id="bp-name"
                type="text"
                placeholder="e.g., 'New Client Onboarding'"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
        </div>
        <div className="grid w-full gap-1.5">
            <Label htmlFor="bp-description">Description</Label>
            <Textarea
                id="bp-description"
                placeholder="A brief description of what this automation does."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
        </div>
        <div className="grid w-full gap-1.5">
            <Label htmlFor="bp-json">n8n Workflow JSON</Label>
            <Textarea
                id="bp-json"
                placeholder='Paste your exported n8n workflow JSON here.'
                value={workflowJson}
                onChange={(e) => setWorkflowJson(e.target.value)}
                required
                className="font-mono h-48"
            />
        </div>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Automation'}
        </Button>
      </form>

      <div className="border rounded-md">
        {/* THIS IS THE CHANGE: Check if the list is empty */}
        {automations.length > 0 ? (
            <ul className="divide-y">
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
            <div className="text-center p-8">
                <h3 className="text-lg font-semibold">No Automations Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Create your first automation above or import one from n8n.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}