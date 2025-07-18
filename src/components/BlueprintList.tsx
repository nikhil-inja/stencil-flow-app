// src/components/BlueprintList.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
}

export default function BlueprintList() {
  const { profile } = useSession();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchBlueprints();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchBlueprints = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('blueprints')
      .select('id, name, description')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (error) toast.error(`Failed to fetch blueprints: ${error.message}`);
    else if (data) setBlueprints(data);
    setLoading(false);
  };
  
  const handleDeleteBlueprint = async (blueprintId: string) => {
    if (window.confirm('Are you sure you want to delete this blueprint?')) {
        const { error } = await supabase.from('blueprints').delete().eq('id', blueprintId);
        if (error) {
            toast.error(error.message);
        } else {
            setBlueprints(blueprints.filter((bp) => bp.id !== blueprintId));
            toast.success('Blueprint deleted.');
        }
    }
  };

  if (!profile) {
    return (
      <Card>
        <CardHeader><CardTitle>Existing Blueprints</CardTitle></CardHeader>
        <CardContent><p>Loading user profile...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Existing Blueprints</CardTitle>
                <CardDescription>Manage your saved workflow templates.</CardDescription>
            </div>
            <Button asChild>
                <Link to="/import/n8n">
                    <PlusCircle className="mr-2 h-4 w-4" /> Import from n8n
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading blueprints...</p> : (
          blueprints.length > 0 ? (
            <ul className="divide-y border rounded-md">
            {blueprints.map((bp) => (
              <li key={bp.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{bp.name}</p>
                  <p className="text-sm text-muted-foreground">{bp.description || 'No description.'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/blueprint/${bp.id}/edit`}>Edit</Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteBlueprint(bp.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
            </ul>
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <h3 className="text-lg font-semibold">No Blueprints Found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first blueprint on the right or import one from n8n.
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}