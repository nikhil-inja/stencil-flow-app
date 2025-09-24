// src/pages/SpaceDetailPage.tsx

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { useSession } from '../../../context/SessionContext';
import toast from 'react-hot-toast';

// Import Shadcn Components
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Switch } from '@/shared/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import WorkflowAnalyticsDashboard from '@/shared/components/WorkflowAnalyticsDashboard';

// Define data shapes
interface Space { 
  id: string; 
  name: string; 
  description?: string;
  space_type: string;
  platform: string;
  email?: string;
  is_active: boolean;
}
interface N8nInstance { id: string; instance_url: string; }
interface Automation { id: string; name: string; }
interface Deployment {
  id: string;
  automation_id: string;
  n8n_workflow_id: string;
}
interface N8nWorkflowStatus {
  id: string;
  active: boolean;
}

export default function SpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { profile } = useSession();

  const [space, setSpace] = useState<Space | null>(null);
  const [instance, setInstance] = useState<N8nInstance | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<Map<string, boolean>>(new Map());
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [deploymentToUpdate, setDeploymentToUpdate] = useState<{ deploymentId: string; automationId: string } | null>(null);

  // Form state - Use localStorage to pre-fill
  const [instanceUrl, setInstanceUrl] = useState(() => localStorage.getItem(`form_url_${spaceId}`) || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(`form_apiKey_${spaceId}`) || '');
  
  // When the user types, save the data to localStorage
  useEffect(() => {
    localStorage.setItem(`form_url_${spaceId}`, instanceUrl);
  }, [instanceUrl, spaceId]);

  useEffect(() => {
    localStorage.setItem(`form_apiKey_${spaceId}`, apiKey);
  }, [apiKey, spaceId]);

  const clearPersistedFormData = () => {
    localStorage.removeItem(`form_url_${spaceId}`);
    localStorage.removeItem(`form_apiKey_${spaceId}`);
  };

  const fetchAllData = async () => {
    if (!profile || !spaceId) {
      console.log('🚫 Missing profile or spaceId:', { profile: !!profile, spaceId });
      return;
    }
    
    console.log('🔍 Fetching space details for:', spaceId);
    setLoading(true);

    try {
        // Get authentication token
        const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
        if (sessionError || !sessionData?.session) {
            toast.error("Authentication required");
            return;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
        };

        // Fetch space details
        const spaceResponse = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'}/api/spaces/${spaceId}/`, {
            method: 'GET',
            headers,
        });

        if (spaceResponse.ok) {
            const spaceData = await spaceResponse.json();
            console.log('✅ Space data loaded:', spaceData);
            setSpace(spaceData);
        } else {
            console.error('❌ Failed to load space:', spaceResponse.status, await spaceResponse.text());
            toast.error("Failed to load space details");
        }

        // Fetch n8n instances for this space
        const instanceResponse = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'}/api/n8n-instances/?space_id=${spaceId}`, {
            method: 'GET',
            headers,
        });

        if (instanceResponse.ok) {
            const instancesData = await instanceResponse.json();
            const instances = instancesData.results || instancesData || [];
            const instanceData = instances[0]; // Get first instance for this space
            setInstance(instanceData);
            
            // Only overwrite the form state if there is saved data in the database
            if (instanceData?.instance_url) {
                setInstanceUrl(instanceData.instance_url);
            }
        }

        // Fetch automations for the workspace
        const automationResponse = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'}/api/automations/`, {
            method: 'GET',
            headers,
        });

        if (automationResponse.ok) {
            const automationData = await automationResponse.json();
            const automations = automationData.results || automationData || [];
            setAutomations(automations);
        } else {
            toast.error("Failed to fetch automations");
        }

        // Fetch deployments for this space
        const deploymentsResponse = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'}/api/deployments/space/${spaceId}/`, {
            method: 'GET',
            headers,
        });

        if (deploymentsResponse.ok) {
            const deploymentsData = await deploymentsResponse.json();
            const deployments = deploymentsData.results || deploymentsData || [];
            setDeployments(deployments);
        } else {
            console.log("No deployments found for this space");
            setDeployments([]);
        }
        
        // TODO: Implement workflow status fetching when n8n integration is ready
        setWorkflowStatuses(new Map());

    } catch (e: any) {
        console.error("Error loading space data:", e);
        toast.error("An error occurred while loading page data.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [profile, spaceId]);

  // Set first workflow as selected when deployments load
  useEffect(() => {
    if (deployments.length > 0 && !selectedWorkflowId) {
      setSelectedWorkflowId(deployments[0].n8n_workflow_id);
    }
  }, [deployments, selectedWorkflowId]);

  const handleSaveInstance = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !spaceId) return;
    setIsSaving(true);
    
    try {
      // Get authentication token
      const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'}/api/n8n-instances/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          space_id: spaceId,
          instance_url: instanceUrl,
          api_key: apiKey,
          workspace_id: profile.workspace.id,
        }),
      });

      if (response.ok) {
        toast.success('n8n instance details saved!');
        clearPersistedFormData();
        fetchAllData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save instance');
      }
    } catch (error: any) {
      toast.error('Error saving instance: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteInstance = async () => {
    if (!instance) return;
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        // Get authentication token
        const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
        if (sessionError || !sessionData?.session) {
          toast.error("Authentication required");
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'}/api/n8n-instances/${instance.id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (response.ok) {
          setInstance(null);
          setInstanceUrl('');
          setApiKey('');
          clearPersistedFormData();
          toast.success('Connection deleted.');
        } else {
          throw new Error('Failed to delete instance');
        }
      } catch (error: any) {
        toast.error('Error deleting instance: ' + error.message);
      }
    }
  };

  const handleDeploy = async (automationId: string) => {
    if (!spaceId || !instance) return toast.error('Space details or n8n instance connection is missing.');
    setDeployingId(automationId);
    try {
      const { data: sessionData } = await apiClient.auth.getSession();
      if (!sessionData?.session) throw new Error("You must be logged in.");
      const session = sessionData.session;
      const { data, error } = await apiClient.functions.invoke('deploy-automation', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: { automation_id: automationId, space_id: spaceId },
      });
      if (error) throw error;
      toast.success(data.message);
      fetchAllData();
    } catch (error: any) {
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setDeployingId(null);
    }
  };
  
  const proceedWithUpdate = async () => {
    if (!deploymentToUpdate) return;
    const { deploymentId, automationId } = deploymentToUpdate;
    setDeployingId(automationId);
    try {
      const { data: sessionData } = await apiClient.auth.getSession();
      if (!sessionData?.session) throw new Error("You must be logged in via GitHub.");
      const session = sessionData.session;
      const { data, error } = await apiClient.functions.invoke('update-deployed-workflow', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { deployment_id: deploymentId },
      });
      if (error) throw error;
      toast.success(data.message);
      fetchAllData();
    } catch (e: any) {
      toast.error(`Update failed: ${e.message}`);
    } finally {
      setDeployingId(null);
      setDeploymentToUpdate(null);
    }
  };

  const handleUpdate = (deployment: Deployment) => {
    const isActive = workflowStatuses.get(deployment.n8n_workflow_id) ?? false;
    setDeploymentToUpdate({ deploymentId: deployment.id, automationId: deployment.automation_id });
    if (isActive) {
      setIsWarningModalOpen(true);
    } else {
      proceedWithUpdate();
    }
  };

  const handleToggleActive = async (deployment: Deployment, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    setTogglingId(deployment.id);
    const newStatuses = new Map(workflowStatuses);
    newStatuses.set(deployment.n8n_workflow_id, !currentStatus);
    setWorkflowStatuses(newStatuses);

    try {
        const { data: sessionData } = await apiClient.auth.getSession();
        if (!sessionData?.session) throw new Error("You must be logged in.");
        const session = sessionData.session;
        const { error } = await apiClient.functions.invoke('toggle-workflow-activation', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: { deployment_id: deployment.id, action },
        });
        if (error) throw error;
        toast.success(`Workflow ${action}d successfully.`);
    } catch (e: any) {
        toast.error(`Failed to ${action} workflow: ${e.message}`);
        const revertedStatuses = new Map(workflowStatuses);
        revertedStatuses.set(deployment.n8n_workflow_id, currentStatus);
        setWorkflowStatuses(revertedStatuses);
    } finally {
        setTogglingId(null);
    }
  };

  const deployedAutomationIds = new Set(deployments.map(d => d.automation_id));
  const availableAutomations = automations.filter(auto => !deployedAutomationIds.has(auto.id));

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <p>Loading space details...</p>
        <p className="text-sm text-muted-foreground mt-2">Space ID: {spaceId}</p>
        <p className="text-sm text-muted-foreground">Profile: {profile ? 'Loaded' : 'Missing'}</p>
      </div>
    </div>
  );

  if (!space) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p>Space not found</p>
          <p className="text-sm text-muted-foreground mt-2">Space ID: {spaceId}</p>
          <Button asChild className="mt-4">
            <Link to="/spaces">&larr; Back to Spaces</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8">
        <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link to="/spaces">&larr; Back to Spaces</Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{space?.name}</h1>
          {space && (
            <div className="flex gap-2">
              <Badge variant="secondary">{space.space_type}</Badge>
              <Badge variant="outline">{space.platform}</Badge>
              {!space.is_active && <Badge variant="destructive">Inactive</Badge>}
            </div>
          )}
        </div>
        {space?.description && (
          <p className="text-muted-foreground">{space.description}</p>
        )}
        {space?.email && (
          <p className="text-sm text-muted-foreground">Contact: {space.email}</p>
        )}
      </header>

      <main className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Deployed Workflows</CardTitle>
                    <CardDescription>Activate, deactivate, or update deployed workflows.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!instance ? (
                        <div className="text-center p-8 text-sm text-muted-foreground">
                            Please connect to this space's n8n instance to see deployed workflows.
                        </div>
                    ) : (
                        <div className="border rounded-md">
                        <ul className="divide-y">
                            {deployments.length > 0 ? deployments.map(dep => {
                            const isActive = workflowStatuses.get(dep.n8n_workflow_id) ?? false;
                            const automationInfo = automations.find(a => a.id === dep.automation_id);
                            const isUpdating = deployingId === dep.automation_id;
                            const isToggling = togglingId === dep.id;
                            
                            const statusText = isActive ? 'Active' : 'Inactive';
                            const statusColor = isActive ? 'text-green-500' : 'text-orange-500';

                            return (
                                <li key={dep.id} className="flex items-center justify-between p-3">
                                <div>
                                    <p className="font-medium">{automationInfo?.name || 'Unknown Automation'}</p>
                                    <p className={`text-xs font-semibold ${statusColor}`}>{statusText}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Switch
                                                    checked={isActive}
                                                    onCheckedChange={() => handleToggleActive(dep, isActive)}
                                                    disabled={isToggling || isUpdating}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isActive ? 'Deactivate' : 'Activate'} Workflow</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Button variant="outline" size="sm" onClick={() => handleUpdate(dep)} disabled={isToggling || isUpdating}>
                                      {isUpdating ? 'Updating...' : 'Update'}
                                    </Button>
                                </div>
                                </li>
                            );
                            }) : <p className="p-4 text-sm text-muted-foreground text-center">No workflows have been deployed to this space.</p>}
                        </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Available Automations</CardTitle>
                    <CardDescription>Deploy new automations to this space.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!instance ? (
                        <div className="text-center p-8 text-sm text-muted-foreground">
                            Please connect to this space's n8n instance to deploy automations.
                        </div>
                    ) : (
                        <div className="border rounded-md">
                        <ul className="divide-y">
                            {availableAutomations.length > 0 ? availableAutomations.map(auto => (
                            <li key={auto.id} className="flex items-center justify-between p-3">
                                <p className="font-medium">{auto.name}</p>
                                <Button variant="outline" size="sm" onClick={() => handleDeploy(auto.id)} disabled={deployingId === auto.id}>
                                  {deployingId === auto.id ? 'Deploying...' : 'Deploy'}
                                </Button>
                            </li>
                            )) : <p className="p-4 text-sm text-muted-foreground text-center">No new automations available to deploy.</p>}
                        </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>n8n Instance Connection</CardTitle>
            <CardDescription>Enter this space's n8n credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveInstance} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="url">n8n Instance URL</Label>
                <Input id="url" value={instanceUrl} onChange={(e) => setInstanceUrl(e.target.value)} required disabled={isSaving}/>
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="apiKey">n8n API Key</Label>
                <Input id="apiKey" type="password" placeholder={instance ? '••••••••••••••••••••' : ''} value={apiKey} onChange={(e) => setApiKey(e.target.value)} required={!instance} disabled={isSaving}/>
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Connection'}
              </Button>
            </form>
            {instance && (<>
                <Separator className="my-4" />
                <Button variant="destructive" className="w-full" onClick={handleDeleteInstance}>Delete Connection</Button>
            </>)}
          </CardContent>
        </Card>
      </main>
      {instance && deployments.length > 0 && (
        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Analytics</CardTitle>
              <CardDescription>Execution analytics, AI token usage, and flow diagrams for deployed workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Workflow Selection Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="workflow-select">Select Workflow</Label>
                <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Choose a workflow to view analytics" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {deployments.map(dep => {
                      const automationInfo = automations.find(a => a.id === dep.automation_id);
                      const isActive = workflowStatuses.get(dep.n8n_workflow_id) ?? false;
                      return (
                        <SelectItem key={dep.id} value={dep.n8n_workflow_id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{automationInfo?.name || 'Unknown Automation'}</span>
                            <Badge variant={isActive ? "default" : "secondary"} className="ml-2">
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Workflow Analytics */}
              {selectedWorkflowId && (() => {
                const selectedDeployment = deployments.find(dep => dep.n8n_workflow_id === selectedWorkflowId);
                if (!selectedDeployment) return null;
                
                const automationInfo = automations.find(a => a.id === selectedDeployment.automation_id);
                const isActive = workflowStatuses.get(selectedWorkflowId) ?? false;
                
                return (
                  <WorkflowAnalyticsDashboard
                    key={selectedWorkflowId}
                    workflowId={selectedWorkflowId}
                    automationName={automationInfo?.name || 'Unknown Automation'}
                    isActive={isActive}
                  />
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
      <AlertDialog open={isWarningModalOpen} onOpenChange={setIsWarningModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Active Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This workflow is currently active. Pushing an update may disrupt its ongoing executions.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeploymentToUpdate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithUpdate}>Yes, Proceed with Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
