// src/components/CreateAutomationForm.tsx

import { useState, type FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

type CreateAutomationFormProps = {
  onAutomationCreated: () => void;
};

export default function CreateAutomationForm({ onAutomationCreated }: CreateAutomationFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAddAutomation = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Automation name is required.');
      return;
    }
    setIsCreating(true);
  
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not logged in.");
      if (!session.provider_token) throw new Error("You must be logged in with GitHub to create an automation.");
  
      // NOTE: The function now returns the full automation object, not just a partial one.
      const { error } = await supabase.functions.invoke('create-automation', {
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
      toast.success('Automation and GitHub repo created!');
      onAutomationCreated();
  
    } catch (error: any) {
      toast.error(`Failed to create automation: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Automation</CardTitle>
        <CardDescription>Manually create an automation by pasting its JSON.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddAutomation} className="space-y-4">
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="bp-description">Description</Label>
            <Textarea
              id="bp-description"
              placeholder="A brief description of what this automation does."
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
            {isCreating ? 'Creating...' : 'Create Automation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

}