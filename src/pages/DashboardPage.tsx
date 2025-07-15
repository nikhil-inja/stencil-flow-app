// src/pages/DashboardPage.tsx

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../supabaseClient'; // <-- THIS IMPORT IS NEEDED
import BlueprintsManager from '../components/BlueprintsManager';
import { useSession } from '../context/SessionContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Import the new Shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Client {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { user, profile } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState('');

  // These functions all use the 'supabase' client
  useEffect(() => {
    if (profile) fetchClients();
  }, [profile]);

  const fetchClients = async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('clients').select('id, name').eq('organization_id', profile.organization_id);
    if (error) toast.error(error.message);
    else if (data) setClients(data);
  };

  const handleAddClient = async (event: FormEvent) => {
    event.preventDefault();
    if (!newClientName.trim() || !profile) return;
    const { data, error } = await supabase
      .from('clients')
      .insert([{ name: newClientName, organization_id: profile.organization_id }])
      .select('id, name')
      .single();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      setClients([...clients, data]);
      setNewClientName('');
      toast.success('Client added!');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) {
        toast.error(error.message);
      } else {
        setClients(clients.filter((client) => client.id !== clientId));
        toast.success('Client deleted.');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out.');
  };

  if (!profile) return <div className="flex h-screen items-center justify-center">Loading session...</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      {/* Page Header */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>

            <Button asChild variant="secondary" size="sm">
                <Link to="/settings/team">Team Settings</Link>
            </Button>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="grid gap-8">
        {/* Manage Clients Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Clients</CardTitle>
            <CardDescription>Add, view, or remove client projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddClient} className="flex items-center gap-2 mb-4 max-w-sm">
              <Input
                type="text"
                placeholder="New client name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <Button type="submit">Add Client</Button>
            </form>
            <div className="border rounded-md">
              <ul className="divide-y">
                {clients.map((client) => (
                  <li key={client.id} className="flex items-center justify-between p-3">
                    <Link to={`/client/${client.id}`} className="font-medium text-primary hover:underline">
                      {client.name}
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.id)}>Delete</Button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Manage Blueprints Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Blueprints</CardTitle>
            <CardDescription>Create or update your master workflow templates.</CardDescription>
            <Button asChild variant="secondary" size="sm">
                <Link to="/import/n8n">Import from n8n</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <BlueprintsManager />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}