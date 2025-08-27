// src/pages/ClientDetailPage.tsx

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
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

// Define data shapes
interface Client { id: string; name: string; }
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

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { profile } = useSession();

  const [client, setClient] = useState<Client | null>(null);
  const [instance, setInstance] = useState<N8nInstance | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<Map<string, boolean>>(new Map());
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [deploymentToUpdate, setDeploymentToUpdate] = useState<{ deploymentId: string; automationId: string } | null>(null);

  // Form state - Use localStorage to pre-fill
  const [instanceUrl, setInstanceUrl] = useState(() => localStorage.getItem(`form_url_${clientId}`) || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(`form_apiKey_${clientId}`) || '');
  
  // When the user types, save the data to localStorage
  useEffect(() => {
    localStorage.setItem(`form_url_${clientId}`, instanceUrl);
  }, [instanceUrl, clientId]);

  useEffect(() => {
    localStorage.setItem(`form_apiKey_${clientId}`, apiKey);
  }, [apiKey, clientId]);

  const clearPersistedFormData = () => {
    localStorage.removeItem(`form_url_${clientId}`);
    localStorage.removeItem(`form_apiKey_${clientId}`);
  };

  const fetchAllData = async () => {
    if (!profile || !clientId) return;
    setLoading(true);

    try {
        const { data: clientData } = await supabase.from('clients').select('id, name').eq('id', clientId).single();
        setClient(clientData);

        const { data: instanceData } = await supabase.from('n8n_instances').select('id, instance_url').eq('client_id', clientId).single();
        setInstance(instanceData);
        
        // Only overwrite the form state if there is saved data in the database
        if (instanceData?.instance_url) {
            setInstanceUrl(instanceData.instance_url);
        }

        const automationPromise = supabase.from('automations').select('id, name').eq('workspace_id', profile.workspace_id);
        const deploymentsPromise = supabase.from('deployments').select('id, automation_id, n8n_workflow_id').eq('client_id', clientId);
        
        const [automationResult, deploymentsResult] = await Promise.all([automationPromise, deploymentsPromise]);

        if (automationResult.error) toast.error('Failed to fetch automations.'); else setAutomations(automationResult.data || []);
        if (deploymentsResult.error) toast.error("Failed to fetch deployments."); else setDeployments(deploymentsResult.data || []);
        
        if (instanceData) {
            const { data: statusesResult, error: statusesError } = await supabase.functions.invoke('get-n8n-workflows', { 
                headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
                body: { clientId } 
            });
            if (statusesError) {
                toast.error("Could not get workflow statuses from n8n.");
            } else if (statusesResult?.data) {
                const statusMap = new Map((statusesResult.data as N8nWorkflowStatus[]).map((wf) => [wf.id, wf.active]));
                setWorkflowStatuses(statusMap);
            }
        } else {
            setWorkflowStatuses(new Map());
        }

    } catch (e: any) {
        toast.error("An error occurred while loading page data.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [profile, clientId]);

  const handleSaveInstance = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !clientId) return;
    setIsSaving(true);
    const { error } = await supabase.from('n8n_instances').upsert({ client_id: clientId, instance_url: instanceUrl, api_key: apiKey, workspace_id: profile.workspace_id }, { onConflict: 'client_id' });
    if (error) {
      toast.error('Error saving instance: ' + error.message);
    } else {
      toast.success('n8n instance details saved!');
      clearPersistedFormData();
      fetchAllData();
    }
    setIsSaving(false);
  };
  
  const handleDeleteInstance = async () => {
    if (!instance) return;
    if (window.confirm('Are you sure you want to delete this connection?')) {
      const { error } = await supabase.from('n8n_instances').delete().eq('id', instance.id);
      if (error) {
        toast.error(error.message);
      } else {
        setInstance(null);
        setInstanceUrl('');
        setApiKey('');
        clearPersistedFormData();
        toast.success('Connection deleted.');
      }
    }
  };

  const handleDeploy = async (automationId: string) => {
    if (!clientId || !instance) return toast.error('Client details or n8n instance connection is missing.');
    setDeployingId(automationId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in.");
      const { data, error } = await supabase.functions.invoke('deploy-automation', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: { automationId, clientId, githubToken: session.provider_token },
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) throw new Error("You must be logged in via GitHub.");
      const { data, error } = await supabase.functions.invoke('update-deployed-workflow', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { deploymentId, githubToken: session.provider_token },
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("You must be logged in.");
        const { error } = await supabase.functions.invoke('toggle-workflow-activation', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: { deploymentId: deployment.id, action },
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

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8">
        <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link to="/">&larr; Back to Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Client: {client?.name}</h1>
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
                            Please connect to the client's n8n instance to see deployed workflows.
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
                            }) : <p className="p-4 text-sm text-muted-foreground text-center">No workflows have been deployed for this client.</p>}
                        </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Available Automations</CardTitle>
                    <CardDescription>Deploy new automations to this client.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!instance ? (
                        <div className="text-center p-8 text-sm text-muted-foreground">
                            Please connect to the client's n8n instance to deploy automations.
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
            <CardDescription>Enter this client's n8n credentials.</CardDescription>
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