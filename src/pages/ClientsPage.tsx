// src/pages/ClientsPage.tsx

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Import Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Client {
  id: string;
  name: string;
}

export default function ClientsPage() {
  const { profile } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchClients();
    }
  }, [profile]);

  const fetchClients = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch clients: ' + error.message);
    } else {
      setClients(data || []);
    }
  };

  const handleAddClient = async (event: FormEvent) => {
    event.preventDefault();
    if (!newClientName.trim() || !profile) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name: newClientName, organization_id: profile.organization_id }])
      .select('id, name')
      .single();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setClients([data, ...clients]);
      setNewClientName('');
      toast.success('Client added!');
    }
    setIsLoading(false);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client? This will also delete all of their deployments.')) {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) {
        toast.error(error.message);
      } else {
        setClients(clients.filter((client) => client.id !== clientId));
        toast.success('Client deleted.');
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Clients</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Clients</CardTitle>
          <CardDescription>Add, view, or remove client projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddClient} className="flex items-center gap-2 mb-6 max-w-sm">
            <Input
              type="text"
              placeholder="New client name"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Client'}
            </Button>
          </form>

          <div className="border rounded-md">
            {/* THIS IS THE CHANGE: Check if the list is empty */}
            {clients.length > 0 ? (
              <ul className="divide-y">
                {clients.map((client) => (
                  <li key={client.id} className="flex items-center justify-between p-3">
                    <Link to={`/client/${client.id}`} className="font-medium text-primary hover:underline">
                      {client.name}
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.id)}>
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold">No Clients Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first client using the form above to get started.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}