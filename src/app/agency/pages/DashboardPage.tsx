// src/pages/DashboardPage.tsx

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from '@/shared/components/ui/badge';

// Define the shape of the data we expect from our API
interface DashboardStats {
  automation_count: number;
  space_count: number; // Updated from client_count
  deployment_count: number;
  recent_activity: ActivityLogItem[];
}

interface ActivityLogItem {
  action_type: string;
  status: 'success' | 'failure';
  user_email: string;
  details: {
    automationName?: string;
    errorMessage?: string;
  };
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching dashboard stats...');
        const { data, error } = await apiClient.rpc('get-dashboard-stats');

        if (error) {
          console.error('❌ Dashboard API error:', error);
          toast.error('Failed to load dashboard stats: ' + error.message);
          setStats(null);
        } else {
          console.log('✅ Dashboard stats loaded:', data);
          setStats(data);
        }
      } catch (err: any) {
        console.error('❌ Error fetching dashboard stats:', err);
        toast.error('Failed to load dashboard stats');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Overview</h1>

      {/* Stat Cards using a responsive grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Automations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.automation_count ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managed Spaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.space_count ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deployment_count ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity in a full-width card */}
      <Card className="col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.action_type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{item.user_email}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No recent activity.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}