// src/components/BlueprintsManager.tsx

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; 

// Import the Shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
}

export default function BlueprintsManager() {
  const { profile } = useSession();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');

  useEffect(() => {
    if (profile) {
      fetchBlueprints();
    }
  }, [profile]);

  const fetchBlueprints = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('blueprints')
      .select('id, name, description')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (error) toast.error(`Failed to fetch blueprints: ${error.message}`);
    else if (data) setBlueprints(data);
  };
  
  const handleDeleteBlueprint = async (blueprintId: string) => {
    if (window.confirm('Are you sure you want to delete this blueprint?')) {
        const { error } = await supabase.from('blueprints').delete().eq('id', blueprintId);
        if (error) {
            toast.error(error.message);
        } else {
            setBlueprints(blueprints.filter((bp) => bp.id !== blueprintId));
            toast.success('Blueprint deleted.');
        }
    }
  };

  const handleAddBlueprint = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Blueprint name is required.');
      return;
    }
  
    try {
      // Get the current session to find the provider_token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not logged in.");
  
      const githubToken = session.provider_token;
      if (!githubToken) {
        throw new Error("You must be logged in with GitHub to create a blueprint.");
      }
  
      // Call the function, now passing the token in the body
      const { data: newBlueprint, error } = await supabase.functions.invoke('create-blueprint', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: { 
          name, 
          description,
          githubToken,
          workflowJson
        },
      });
  
      if (error) throw error;
  
      setBlueprints([newBlueprint, ...blueprints]);
      setName('');
      setDescription('');
      toast.success('Blueprint and GitHub repo created!');
  
    } catch (error: any) {
      toast.error(`Failed to create blueprint: ${error.message}`);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Form for creating new blueprints */}
      <form onSubmit={handleAddBlueprint} className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="bp-name">Blueprint Name</Label>
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
                placeholder="A brief description of what this blueprint does."
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
        <Button type="submit">Create Blueprint</Button>
      </form>

      {/* List of existing blueprints */}
      <div className="border rounded-md">
        <ul className="divide-y">
          {blueprints.map((bp) => (
            <li key={bp.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{bp.name}</p>
              <p className="text-sm text-muted-foreground">{bp.description || 'No description.'}</p>
            </div>
          
            {/* START OF CHANGES */}
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/blueprint/${bp.id}/edit`}>Edit</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteBlueprint(bp.id)}>
                Delete
              </Button>
            </div>
            {/* END OF CHANGES */}
          </li>
          ))}
        </ul>
      </div>
    </div>
  );
}