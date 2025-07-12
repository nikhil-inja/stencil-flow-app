// src/pages/DashboardPage.tsx

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';

// Define the shape of our Client data
interface Client {
  id: string;
  name: string;
  created_at: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [user, setUser] = useState<User | null>(null);

  // Fetch user session and clients on component load
  useEffect(() => {
    const getInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchClients();
      }
      setLoading(false);
    };
    getInitialData();
  }, []);

  // READ: Function to fetch clients from the database
  const fetchClients = async () => {
    // For this MVP, we assume the user's organization_id is hardcoded or fetched elsewhere.
    // A real app would get this from the user's profile.
    const { data, error } = await supabase.from('clients').select('*');
    if (error) {
      console.error('Error fetching clients:', error);
    } else if (data) {
      setClients(data);
    }
  };

  // CREATE: Function to add a new client
  const handleAddClient = async (event: FormEvent) => {
    event.preventDefault();
    if (!newClientName.trim()) return;

    // We'd need to get the user's actual organization_id here.
    // For now, let's pretend it's a placeholder.
    const placeholderOrgId = '00000000-0000-0000-0000-000000000000'; // Replace with real logic later

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name: newClientName, organization_id: placeholderOrgId }])
      .select();

    if (error) {
      alert(error.message);
    } else if (data) {
      setClients([...clients, data[0]]);
      setNewClientName('');
    }
  };

  // DELETE: Function to remove a client
  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) {
        alert(error.message);
      } else {
        setClients(clients.filter((client) => client.id !== clientId));
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The router will redirect the user to the login page.
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>No user session found. Please log in.</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '48px auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <div>
          <span>{user.email}</span>
          <button onClick={handleLogout} style={{ marginLeft: '1rem' }}>Logout</button>
        </div>
      </header>
      <hr />
      <main>
        <h3>Manage Clients</h3>
        <form onSubmit={handleAddClient}>
          <input
            type="text"
            placeholder="New client name"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />
          <button type="submit">Add Client</button>
        </form>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {clients.map((client) => (
            <li key={client.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' }}>
              <span>{client.name}</span>
              <button onClick={() => handleDeleteClient(client.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}