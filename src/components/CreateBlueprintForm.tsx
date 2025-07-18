// src/components/CreateBlueprintForm.tsx

import { useState, type FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type CreateBlueprintFormProps = {
  onBlueprintCreated: () => void;
};

export default function CreateBlueprintForm({ onBlueprintCreated }: CreateBlueprintFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAddBlueprint = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Blueprint name is required.');
      return;
    }
    setIsCreating(true);
  
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not logged in.");
      if (!session.provider_token) throw new Error("You must be logged in with GitHub to create a blueprint.");
  
      // NOTE: The function now returns the full blueprint object, not just a partial one.
      const { error } = await supabase.functions.invoke('create-blueprint', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: { 
          name, 
          description,
          githubToken: session.provider_token,
          workflowJson,
        },
      });
  
      if (error) throw error;
  
      // Reset form and notify parent to refresh the list
      setName('');
      setDescription('');
      setWorkflowJson('');
      toast.success('Blueprint and GitHub repo created!');
      onBlueprintCreated();
  
    } catch (error: any) {
      toast.error(`Failed to create blueprint: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Blueprint</CardTitle>
        <CardDescription>Manually create a blueprint by pasting its JSON.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddBlueprint} className="space-y-4">
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="bp-description">Description</Label>
            <Textarea
              id="bp-description"
              placeholder="A brief description of what this blueprint does."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
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
            {isCreating ? 'Creating...' : 'Create Blueprint'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

}