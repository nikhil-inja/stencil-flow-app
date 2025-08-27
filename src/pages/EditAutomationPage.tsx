// src/pages/EditAutomationPage.tsx

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// Import Shadcn components
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";

// Define the shape of a commit object
interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export default function EditAutomationPage() {
  const { automationId } = useParams<{ automationId: string }>();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rollingBackSha, setRollingBackSha] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');
  const [history, setHistory] = useState<Commit[]>([]);

  // We will define this as a standalone function to reuse it
  const fetchAllData = async () => {
    if (!automationId) return;
    setLoading(true);
    
    try {
      const { data: automationData, error: automationError } = await supabase
        .from('automations')
        .select('name, description, workflow_json')
        .eq('id', automationId)
        .single();

      if (automationError) throw automationError;
      
      if (automationData) {
        setName(automationData.name);
        setDescription(automationData.description || '');
        setWorkflowJson(JSON.stringify(automationData.workflow_json, null, 2));
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) { 
        const { data: commitHistory, error: historyError } = await supabase.functions.invoke('get-commit-history', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: { 
            automationId,
            githubToken: session.provider_token // Ensure this is being sent
          }, 
        });
        if (historyError) throw historyError;
        setHistory(commitHistory);
      }
    } catch (e: any) {
      toast.error(`Failed to load page data: ${e.message}`);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [automationId]);
  
  const handleSaveChanges = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(workflowJson);
    } catch (e) {
      toast.error('The workflow data is not valid JSON.');
      setIsSaving(false);
      return;
    }
  
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in.");
  
      const { error } = await supabase.functions.invoke('update-automation', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          automationId,
          description,
          workflowJson: parsedJson,
          // The githubToken is no longer needed here
        },
      });
  
      if (error) throw error;
      toast.success('Automation updated successfully!');
      fetchAllData();
  
    } catch (error: any) {
      toast.error(`Failed to save changes: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async (commitSha: string) => {
    if (!window.confirm(`Are you sure you want to roll back to this version? Your current edits will be lost.`)) {
      return;
    }
    setRollingBackSha(commitSha);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in.");
  
      const { error } = await supabase.functions.invoke('rollback-automation', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          automationId,
          commitSha,
          // The githubToken is no longer needed here
        },
      });
  
      if (error) throw error;
      
      toast.success('Rollback successful! Refreshing data...');
      fetchAllData();
  
    } catch (error: any) {
      toast.error(`Rollback failed: ${error.message}`);
    } finally {
      setRollingBackSha(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.provider_token) {
          throw new Error("You must be logged in via GitHub to sync.");
        }

        const { data, error } = await supabase.functions.invoke('sync-automation-from-n8n', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: { 
                automationId,
                githubToken: session.provider_token // <-- This was missing
            },
        });

        if (error) throw error;
        toast.success(data.message);
        fetchAllData(); // Refresh all page data to show the new version
    } catch (e: any) {
        toast.error(`Sync failed: ${e.message}`);
    } finally {
        setIsSyncing(false);
    }
};


  if (loading) return <div className="flex h-screen items-center justify-center">Loading Automation...</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8">
        <Button asChild variant="ghost" className="mb-2 -ml-4">
          <Link to="/">&larr; Back to Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Automation</h1>
      </header>

      <main className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              {/* START OF CHANGES */}
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{name}</CardTitle>
                  <CardDescription>Make changes and save the new version as a commit.</CardDescription>
                </div>
                <Button variant="secondary" onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? 'Syncing...' : 'Sync from n8n'}
                </Button>
              </div>
              {/* END OF CHANGES */}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveChanges} className="space-y-6">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="bp-description">Description</Label>
                  <Input id="bp-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="bp-json">n8n Workflow JSON</Label>
                  <Textarea id="bp-json" value={workflowJson} onChange={(e) => setWorkflowJson(e.target.value)} required className="font-mono h-96" />
                </div>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes & Commit'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>Past versions of this automation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {history.map(commit => (
                  <li key={commit.sha} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium leading-none">{commit.message}</p>
                      <p className="text-sm text-muted-foreground">{commit.author} on {new Date(commit.date).toLocaleDateString()}</p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRollback(commit.sha)}
                        disabled={rollingBackSha === commit.sha}
                    >
                        {rollingBackSha === commit.sha ? 'Rolling back...' : 'Rollback'}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}