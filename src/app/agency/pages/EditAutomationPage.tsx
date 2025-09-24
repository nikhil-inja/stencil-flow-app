// src/pages/EditAutomationPage.tsx

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { config } from '@/config';
import toast from 'react-hot-toast';

// Import Shadcn components
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";

// Define the shape of a workflow version object
interface WorkflowVersion {
  version: string;
  file_path: string;
  sha: string;
  size: number;
  updated_at: string;
}

export default function EditAutomationPage() {
  const { automationId } = useParams<{ automationId: string }>();
  
  // Simple test - if this doesn't render, there's a basic component issue
  if (!automationId) {
    return <div>No automation ID in URL</div>;
  }

  // Temporary test render to check if basic rendering works
  // return <div>Simple test render for automation: {automationId}</div>;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rollingBackSha, setRollingBackSha] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);

  // Debug logging
  console.log('EditAutomationPage render:', { 
    automationId, 
    loading, 
    error, 
    name, 
    hasWorkflowJson: !!workflowJson,
    versionsLength: versions.length 
  });

  // We will define this as a standalone function to reuse it
  const fetchAllData = useCallback(async () => {
    console.log('fetchAllData called with automationId:', automationId);
    
    if (!automationId) {
      console.log('No automation ID provided');
      setError('No automation ID provided');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching automation data...');
      // Fetch automation data using direct API call
      const automationResponse = await fetch(`${config.API_BASE_URL}/automations/${automationId}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Automation response status:', automationResponse.status);

      if (!automationResponse.ok) {
        if (automationResponse.status === 404) {
          console.log('Automation not found (404)');
          setError('Automation not found');
          return;
        }
        if (automationResponse.status === 401) {
          console.log('Unauthorized (401)');
          setError('You are not authorized to view this automation');
          return;
        }
        const errorData = await automationResponse.json();
        throw new Error(errorData.error || errorData.detail || 'Failed to fetch automation');
      }

      const automationData = await automationResponse.json();
      console.log('Automation data received:', automationData);
      
      if (automationData) {
        console.log('Setting automation data...');
        setName(automationData.name);
        setDescription(automationData.description || '');
        setWorkflowJson(JSON.stringify(automationData.workflow_json, null, 2));
      }

      // Fetch workflow versions using function endpoint
      const { data: sessionData } = await apiClient.auth.getSession();
      if (sessionData?.session) { 
        const { data: workflowVersions, error: versionsError } = await apiClient.functions.invoke('get-workflow-versions', {
          headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` },
          body: { 
            automation_id: automationId
          }, 
        });
        if (versionsError) {
          console.warn('Failed to load workflow versions:', versionsError);
          setVersions([]); // Set empty array instead of failing
        } else {
          // Ensure we always set an array, even if the API returns something else
          const versionsArray = Array.isArray(workflowVersions?.versions) ? workflowVersions.versions : [];
          console.log('Setting versions to:', versionsArray);
          setVersions(versionsArray);
        }
      }
    } catch (e: any) {
      console.error('Error loading automation data:', e);
      setError(`Failed to load automation: ${e.message}`);
      toast.error(`Failed to load automation: ${e.message}`);
    } finally {
        console.log('Setting loading to false');
        setLoading(false);
    }
  }, [automationId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
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
      const { data: sessionData } = await apiClient.auth.getSession();
      if (!sessionData?.session) throw new Error("You must be logged in.");
  
      const { error } = await apiClient.functions.invoke('update-automation', {
        headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` },
        body: {
          automation_id: automationId,
          description,
          workflow_json: parsedJson,
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

  const handleRollback = async (versionTimestamp: string) => {
    if (!window.confirm(`Are you sure you want to roll back to this version? Your current edits will be lost.`)) {
      return;
    }
    setRollingBackSha(versionTimestamp);
    try {
      const { data: sessionData } = await apiClient.auth.getSession();
      if (!sessionData?.session) throw new Error("You must be logged in.");
  
      const { error } = await apiClient.functions.invoke('rollback-automation', {
        headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` },
        body: {
          automation_id: automationId,
          version_timestamp: versionTimestamp,
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
      const { data: sessionData } = await apiClient.auth.getSession();
      if (!sessionData?.session) throw new Error("You must be logged in.");
  
      const { error } = await apiClient.functions.invoke('sync-automation-from-n8n', {
        headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` },
        body: {
          automation_id: automationId,
        },
      });
  
      if (error) throw error;
      toast.success('Sync successful! Refreshing data...');
      fetchAllData();
  
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-8">
          <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link to="/">&larr; Back to Dashboard</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Automation</h1>
        </header>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Loading...</h2>
            <p className="text-muted-foreground mt-2">Please wait while we load the automation data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-8">
          <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link to="/">&larr; Back to Dashboard</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Automation</h1>
        </header>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Error</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
          <Button onClick={fetchAllData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  console.log('Rendering main content');
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
              <CardDescription>Stored versions of this automation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {Array.isArray(versions) && versions.length > 0 ? (
                  versions.map(version => (
                    <li key={version.version} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium leading-none">Version {version.version}</p>
                        <p className="text-sm text-muted-foreground">{new Date(version.updated_at).toLocaleDateString()}</p>
                      </div>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRollback(version.version)}
                          disabled={rollingBackSha === version.version}
                      >
                          {rollingBackSha === version.version ? 'Rolling back...' : 'Rollback'}
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">No version history available</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}