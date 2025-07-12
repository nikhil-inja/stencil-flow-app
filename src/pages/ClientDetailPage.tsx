// src/pages/ClientDetailPage.tsx

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import toast from 'react-hot-toast';

// Import Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Define data shapes
interface Client { id: string; name: string; }
interface N8nInstance { id: string; instance_url: string; }
interface Blueprint { id: string; name: string; }

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { profile } = useSession();

  const [client, setClient] = useState<Client | null>(null);
  const [instance, setInstance] = useState<N8nInstance | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);

  // Form state
  const [instanceUrl, setInstanceUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (profile && clientId) {
      fetchClientAndInstance();
      fetchBlueprints();
    }
  }, [profile, clientId]);

  const fetchClientAndInstance = async () => {
    setLoading(true);
    const { data: clientData } = await supabase.from('clients').select('id, name').eq('id', clientId).single();
    setClient(clientData);

    const { data: instanceData, error: instanceError } = await supabase.from('n8n_instances').select('id, instance_url').eq('client_id', clientId).single();
    if (instanceError && instanceError.code !== 'PGRST116') {
      toast.error('Error fetching instance: ' + instanceError.message);
    } else if (instanceData) {
      setInstance(instanceData);
      setInstanceUrl(instanceData.instance_url);
    }
    setLoading(false);
  };

  const fetchBlueprints = async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('blueprints').select('id, name').eq('organization_id', profile.organization_id);
    if (error) toast.error('Error fetching blueprints: ' + error.message);
    else if (data) setBlueprints(data);
  };

  const handleSaveInstance = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !clientId) return;
    const { error } = await supabase.from('n8n_instances').upsert({ client_id: clientId, instance_url: instanceUrl, api_key: apiKey }, { onConflict: 'client_id' });
    if (error) {
      toast.error('Error saving instance: ' + error.message);
    } else {
      toast.success('n8n instance details saved!');
      fetchClientAndInstance();
    }
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
        toast.success('Connection deleted.');
      }
    }
  };

  const handleDeploy = async (blueprintId: string) => {
    if (!clientId || !instance) {
      toast.error('Please save n8n connection details before deploying.');
      return;
    }
    const blueprintToDeploy = blueprints.find(bp => bp.id === blueprintId);
    if (!window.confirm(`Are you sure you want to deploy the "${blueprintToDeploy?.name}" blueprint to ${client?.name}?`)) return;

    setDeploying(blueprintId);
    try {
      const { data, error } = await supabase.functions.invoke('deploy-blueprint', { body: { clientId, blueprintId } });
      if (error) throw error;
      toast.success(data.message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Deployment failed: ${errorMessage}`);
    } finally {
      setDeploying(null);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      {/* Page Header */}
      <header className="mb-8">
        <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link to="/">&larr; Back to Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Client: {client?.name}</h1>
      </header>

      <main className="grid md:grid-cols-2 gap-8">
        {/* Left Column: Deployment */}
        <Card>
          <CardHeader>
            <CardTitle>Deploy a Blueprint</CardTitle>
            <CardDescription>Select a master blueprint to deploy to this client.</CardDescription>
          </CardHeader>
          <CardContent>
            {!instance ? (
                <p className="text-sm text-destructive font-medium">Please save n8n connection details below before deploying.</p>
            ) : (
                <div className="border rounded-md">
                    <ul className="divide-y">
                        {blueprints.map(bp => (
                        <li key={bp.id} className="flex items-center justify-between p-3">
                            <span className="font-medium">{bp.name}</span>
                            <Button 
                                size="sm"
                                onClick={() => handleDeploy(bp.id)}
                                disabled={deploying === bp.id}
                            >
                            {deploying === bp.id ? 'Deploying...' : 'Deploy'}
                            </Button>
                        </li>
                        ))}
                    </ul>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: n8n Connection */}
        <Card>
          <CardHeader>
            <CardTitle>n8n Instance Connection</CardTitle>
            <CardDescription>Enter this client's n8n credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveInstance} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="url">n8n Instance URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://n8n.my-client.com"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  required
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="apiKey">n8n API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={instance ? '•••••••••••••••••••• (Enter new key to update)' : 'Enter API Key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required={!instance}
                />
              </div>
              <Button type="submit" className="w-full">
                {instance ? 'Update Connection' : 'Save Connection'}
              </Button>
            </form>
            {instance && (
                <>
                    <Separator className="my-4" />
                    <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={handleDeleteInstance}
                    >
                        Delete Connection
                    </Button>
                </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}