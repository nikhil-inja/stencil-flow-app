// src/pages/ImportPage.tsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import toast from 'react-hot-toast';

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

// Define the shape of the n8n workflow data
interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ImportPage() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("You must be logged in.");

        const { data, error: funcError } = await supabase.functions.invoke('list-n8n-workflows', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (funcError) throw funcError;

        // THIS IS THE FIX: We access the 'data' property of the returned object
        // and provide an empty array as a fallback to prevent crashes.
        if (data && Array.isArray(data.data)) {
            setWorkflows(data.data);
        } else {
            setWorkflows([]); // Set to empty array if structure is not what we expect
            console.warn("Received unexpected data structure for workflows:", data);
        }

      } catch (e: any) {
        setError(e.message);
        toast.error(`Failed to load workflows: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, []);

  const handleImport = async (workflow: N8nWorkflow) => {
    setImportingId(workflow.id);
    const toastId = toast.loading(`Importing '${workflow.name}'...`);
  
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) throw new Error("You must be logged in with GitHub to import.");
  
      // Step 1: Get the full workflow details
      const { data: fullWorkflow, error: detailsError } = await supabase.functions.invoke('get-n8n-workflow-details', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
            workflowId: workflow.id,
            githubToken: session.provider_token
        },
      });
      if (detailsError) throw detailsError;
  
      // Step 2: Call the create-automation function with the full data
      const { error: createError } = await supabase.functions.invoke('create-automation', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          name: fullWorkflow.name,
          description: `Imported from n8n on ${new Date().toLocaleDateString()}`,
          githubToken: session.provider_token,
          workflowJson: JSON.stringify(fullWorkflow), // Pass the full object as a string
        },
      });
      if (createError) throw createError;
  
      toast.success(`'${workflow.name}' imported successfully!`, { id: toastId });
  
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`, { id: toastId });
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8">
        <Button asChild variant="ghost" className="mb-2 -ml-4">
          <Link to="/">&larr; Back to Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Import from n8n</h1>
      </header>
      <main>
        <Card>
          <CardHeader>
            <CardTitle>Your n8n Workflows</CardTitle>
            <CardDescription>
              Select a workflow to import as a new Automation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading workflows...</p>}
            {error && <p className="text-destructive">Error: {error}</p>}
            {!loading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.length > 0 ? (
                    workflows.map((wf) => (
                      <TableRow key={wf.id}>
                        <TableCell className="font-medium">{wf.name}</TableCell>
                        <TableCell>{wf.active ? 'Active' : 'Inactive'}</TableCell>
                        <TableCell>{new Date(wf.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleImport(wf)}>
                            Import
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center">No workflows found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}   