// src/components/CreateAutomationForm.tsx

import { useState, type FormEvent } from 'react';
import { apiClient } from '@/lib/apiClient';
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
      const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch('http://localhost:8000/api/functions/create-automation/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          name,
          description,
          github_token: 'placeholder_token', // TODO: Implement GitHub OAuth
          workflow_json: workflowJson,
        }),
      });

      if (response.ok) {
        // Reset form and notify parent to refresh the list
        setName('');
        setDescription('');
        setWorkflowJson('');
        toast.success('Automation and GitHub repo created!');
        onAutomationCreated();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create automation');
      }
  
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