// src/pages/SpacesPage.tsx

import { useState, useEffect, type FormEvent } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useSession } from '../../../context/SessionContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Import Shadcn Components
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";

interface Space {
  id: string;
  name: string;
  description?: string;
  space_type: 'client' | 'internal' | 'demo' | 'testing' | 'staging' | 'production';
  platform: 'n8n' | 'make';
  email?: string;
  is_active: boolean;
  created_at: string;
}

const SPACE_TYPE_OPTIONS = [
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'demo', label: 'Demo' },
  { value: 'testing', label: 'Testing' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];

const PLATFORM_OPTIONS = [
  { value: 'n8n', label: 'N8N' },
  { value: 'make', label: 'Make.com' },
];

export default function SpacesPage() {
  const { profile } = useSession();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [newSpaceType, setNewSpaceType] = useState<string>('client');
  const [newSpacePlatform, setNewSpacePlatform] = useState<string>('n8n');
  const [newSpaceEmail, setNewSpaceEmail] = useState('');

  useEffect(() => {
    if (profile) {
      fetchSpaces();
    }
  }, [profile]);

  const fetchSpaces = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      // Get current session for authentication
      const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        console.log('No session found, cannot fetch spaces');
        return;
      }

      // Make direct API call to Django backend
      const response = await fetch('http://localhost:8000/api/spaces/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch spaces');
      }

      const spacesData = await response.json();
      console.log('📦 Raw spaces response:', spacesData);
      
      // Handle Django REST Framework pagination
      const spaces = spacesData.results || spacesData || [];
      console.log('✅ Processed spaces:', spaces);
      setSpaces(spaces);
    } catch (error: any) {
      console.error('Error fetching spaces:', error);
      toast.error('Failed to fetch spaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSpace = async (event: FormEvent) => {
    event.preventDefault();
    if (!newSpaceName.trim() || !profile) return;
    setIsCreating(true);

    try {
      // Get current session for authentication
      const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        toast.error("You must be logged in to create a space.");
        return;
      }

      const spaceData = {
        name: newSpaceName,
        description: newSpaceDescription || '',
        space_type: newSpaceType,
        platform: newSpacePlatform,
        email: newSpaceEmail || '',
        // workspace is automatically set by the backend from the authenticated user
      };

      // Make direct API call to Django backend
      const response = await fetch('http://localhost:8000/api/spaces/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(spaceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle validation errors (like duplicate names)
        if (errorData.name) {
          throw new Error(errorData.name[0] || errorData.name);
        }
        throw new Error(errorData.detail || errorData.error || 'Failed to create space');
      }

      const newSpace = await response.json();
      
      // Add the new space to the beginning of the list
      setSpaces([newSpace, ...spaces]);
      
      // Reset form
      setNewSpaceName('');
      setNewSpaceDescription('');
      setNewSpaceType('client');
      setNewSpacePlatform('n8n');
      setNewSpaceEmail('');
      
      toast.success('Space created successfully!');
    } catch (error: any) {
      console.error('Error creating space:', error);
      toast.error(error.message || 'Failed to create space');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (window.confirm('Are you sure you want to delete this space? This will also delete all of its deployments.')) {
      try {
        // Get current session for authentication
        const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
        if (sessionError || !sessionData?.session) {
          toast.error("You must be logged in to delete a space.");
          return;
        }

        // Make direct API call to Django backend
        const response = await fetch(`http://localhost:8000/api/spaces/${spaceId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete space');
        }

        // Remove space from local state
        setSpaces(spaces.filter((space) => space.id !== spaceId));
        toast.success('Space deleted successfully.');
      } catch (error: any) {
        console.error('Error deleting space:', error);
        toast.error('Failed to delete space');
      }
    }
  };

  const getSpaceTypeColor = (type: string) => {
    const colors = {
      client: 'bg-blue-100 text-blue-800',
      internal: 'bg-green-100 text-green-800',
      demo: 'bg-yellow-100 text-yellow-800',
      testing: 'bg-purple-100 text-purple-800',
      staging: 'bg-orange-100 text-orange-800',
      production: 'bg-red-100 text-red-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      n8n: 'bg-indigo-100 text-indigo-800',
      make: 'bg-purple-100 text-purple-800',
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Spaces</h1>
      
      {/* Create Space Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Space</CardTitle>
          <CardDescription>Spaces organize your automation deployments by purpose, client, or environment.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSpace} className="grid gap-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="spaceName">Space Name *</Label>
                <Input
                  id="spaceName"
                  type="text"
                  placeholder="e.g., Acme Corp, Demo Environment"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  disabled={isCreating}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="spaceEmail">Contact Email</Label>
                <Input
                  id="spaceEmail"
                  type="email"
                  placeholder="contact@client.com"
                  value={newSpaceEmail}
                  onChange={(e) => setNewSpaceEmail(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="spaceDescription">Description</Label>
              <Textarea
                id="spaceDescription"
                placeholder="Describe the purpose of this space..."
                value={newSpaceDescription}
                onChange={(e) => setNewSpaceDescription(e.target.value)}
                disabled={isLoading}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="spaceType">Space Type</Label>
                <Select value={newSpaceType} onValueChange={setNewSpaceType} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select space type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPACE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="spacePlatform">Platform</Label>
                <Select value={newSpacePlatform} onValueChange={setNewSpacePlatform} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button type="submit" disabled={isCreating} className="w-fit">
              {isCreating ? 'Creating...' : 'Create Space'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Spaces List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Spaces</CardTitle>
          <CardDescription>Manage your automation deployment spaces.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            {isLoading ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">Loading spaces...</p>
              </div>
            ) : spaces.length > 0 ? (
              <ul className="divide-y">
                {spaces.map((space) => (
                  <li key={space.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link 
                            to={`/space/${space.id}`} 
                            className="font-medium text-primary hover:underline text-lg"
                          >
                            {space.name}
                          </Link>
                          <Badge className={getSpaceTypeColor(space.space_type)}>
                            {SPACE_TYPE_OPTIONS.find(opt => opt.value === space.space_type)?.label}
                          </Badge>
                          <Badge className={getPlatformColor(space.platform)}>
                            {PLATFORM_OPTIONS.find(opt => opt.value === space.platform)?.label}
                          </Badge>
                          {!space.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {space.description && (
                          <p className="text-sm text-muted-foreground mb-2">{space.description}</p>
                        )}
                        {space.email && (
                          <p className="text-sm text-muted-foreground">Contact: {space.email}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(space.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteSpace(space.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold">No Spaces Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first space using the form above to organize your automation deployments.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
