import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

// Import Shadcn Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from '@/shared/components/ui/badge';
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Separator } from "@/shared/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';

// Types for the analytics data
interface ExecutionAnalytics {
  workflow_id: string;
  total_executions: number;
  total_successful: number;
  total_failed: number;
  overall_success_percentage: number;
  daily_stats: DailyExecutionStats[];
  period_start: string;
  period_end: string;
}

interface DailyExecutionStats {
  date: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_percentage: number;
}

interface AITokenUsage {
  workflow_id: string;
  total_tokens_used: number;
  total_cost: number;
  daily_token_usage: DailyTokenUsage[];
  period_start: string;
  period_end: string;
}

interface DailyTokenUsage {
  date: string;
  tokens_used: number;
  cost: number;
}

interface WorkflowFlowchart {
  workflow_id: string;
  mermaid_diagram: string;
  last_updated: string;
}

interface WorkflowAnalyticsDashboardProps {
  workflowId: string;
  automationName: string;
  isActive: boolean;
}

export default function WorkflowAnalyticsDashboard({ 
  workflowId, 
  automationName, 
  isActive 
}: WorkflowAnalyticsDashboardProps) {
  const [executionAnalytics, setExecutionAnalytics] = useState<ExecutionAnalytics | null>(null);
  const [aiTokenUsage, setAiTokenUsage] = useState<AITokenUsage | null>(null);
  const [workflowFlowchart, setWorkflowFlowchart] = useState<WorkflowFlowchart | null>(null);
  const [loading, setLoading] = useState({
    execution: false,
    aiTokens: false,
    flowchart: false
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch execution analytics
  const fetchExecutionAnalytics = async () => {
    setLoading(prev => ({ ...prev, execution: true }));
    try {
      const { data, error } = await apiClient.functions.getExecutionAnalytics({
        workflow_id: workflowId
      });

      if (error) {
        console.error('❌ Execution analytics error:', error);
        toast.error('Failed to load execution analytics: ' + error.message);
      } else {
        console.log('✅ Execution analytics loaded:', data);
        setExecutionAnalytics(data);
      }
    } catch (err: any) {
      console.error('❌ Execution analytics fetch error:', err);
      toast.error('Failed to load execution analytics: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, execution: false }));
    }
  };

  // Fetch AI token usage (placeholder for future API)
  const fetchAITokenUsage = async () => {
    setLoading(prev => ({ ...prev, aiTokens: true }));
    try {
      // TODO: Replace with actual API call when implemented
      // const { data, error } = await apiClient.functions.getAITokenUsage({
      //   workflow_id: workflowId
      // });
      
      // Mock data for now
      const mockData: AITokenUsage = {
        workflow_id: workflowId,
        total_tokens_used: 15420,
        total_cost: 0.023,
        daily_token_usage: [
          { date: '2025-01-15', tokens_used: 2100, cost: 0.003 },
          { date: '2025-01-16', tokens_used: 1800, cost: 0.0027 },
          { date: '2025-01-17', tokens_used: 2400, cost: 0.0036 },
          { date: '2025-01-18', tokens_used: 1900, cost: 0.0029 },
          { date: '2025-01-19', tokens_used: 2200, cost: 0.0033 },
          { date: '2025-01-20', tokens_used: 2100, cost: 0.003 },
          { date: '2025-01-21', tokens_used: 2920, cost: 0.0044 }
        ],
        period_start: '2025-01-15',
        period_end: '2025-01-21'
      };
      
      setAiTokenUsage(mockData);
    } catch (err: any) {
      console.error('❌ AI token usage fetch error:', err);
      toast.error('Failed to load AI token usage: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, aiTokens: false }));
    }
  };

  // Fetch workflow flowchart (placeholder for future API)
  const fetchWorkflowFlowchart = async () => {
    setLoading(prev => ({ ...prev, flowchart: true }));
    try {
      // TODO: Replace with actual API call when implemented
      // const { data, error } = await apiClient.functions.getWorkflowFlowchart({
      //   workflow_id: workflowId
      // });
      
      // Mock data for now
      const mockData: WorkflowFlowchart = {
        workflow_id: workflowId,
        mermaid_diagram: `graph TD
    A[Start] --> B[Webhook Trigger]
    B --> C{Check Data}
    C -->|Valid| D[Process Data]
    C -->|Invalid| E[Send Error Email]
    D --> F[Call AI API]
    F --> G[Generate Response]
    G --> H[Send Response]
    H --> I[Log Results]
    I --> J[End]
    E --> K[Log Error]
    K --> J`,
        last_updated: '2025-01-21T10:30:00Z'
      };
      
      setWorkflowFlowchart(mockData);
    } catch (err: any) {
      console.error('❌ Workflow flowchart fetch error:', err);
      toast.error('Failed to load workflow flowchart: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, flowchart: false }));
    }
  };

  // Load data when component mounts
  useEffect(() => {
    if (workflowId) {
      fetchExecutionAnalytics();
      fetchAITokenUsage();
      fetchWorkflowFlowchart();
    }
  }, [workflowId]);

  // Render execution analytics chart (simplified for now)
  const renderExecutionChart = () => {
    if (!executionAnalytics) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {executionAnalytics.total_executions}
              </div>
              <p className="text-xs text-muted-foreground">Total Executions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {executionAnalytics.total_successful}
              </div>
              <p className="text-xs text-muted-foreground">Successful</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {executionAnalytics.total_failed}
              </div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Success Rate Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {executionAnalytics.daily_stats.map((day, index) => (
                <TooltipProvider key={day.date}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="bg-blue-500 rounded-t flex-1 min-h-[4px] cursor-pointer"
                        style={{ 
                          height: `${Math.max(day.success_percentage, 4)}%`,
                          backgroundColor: day.success_percentage >= 80 ? '#10b981' : 
                                          day.success_percentage >= 60 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-semibold">{new Date(day.date).toLocaleDateString()}</p>
                        <p>Success: {day.success_percentage.toFixed(1)}%</p>
                        <p>Total: {day.total_executions}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{new Date(executionAnalytics.period_start).toLocaleDateString()}</span>
              <span>{new Date(executionAnalytics.period_end).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render AI token usage chart
  const renderAITokenChart = () => {
    if (!aiTokenUsage) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {aiTokenUsage.total_tokens_used.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Tokens Used</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                ${aiTokenUsage.total_cost.toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {aiTokenUsage.daily_token_usage.map((day, index) => {
                const maxTokens = Math.max(...aiTokenUsage.daily_token_usage.map(d => d.tokens_used));
                const height = (day.tokens_used / maxTokens) * 100;
                
                return (
                  <TooltipProvider key={day.date}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="bg-purple-500 rounded-t flex-1 min-h-[4px] cursor-pointer"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <p className="font-semibold">{new Date(day.date).toLocaleDateString()}</p>
                          <p>Tokens: {day.tokens_used.toLocaleString()}</p>
                          <p>Cost: ${day.cost.toFixed(4)}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{new Date(aiTokenUsage.period_start).toLocaleDateString()}</span>
              <span>{new Date(aiTokenUsage.period_end).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render workflow flowchart
  const renderWorkflowFlowchart = () => {
    if (!workflowFlowchart) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Flow Diagram</CardTitle>
          <CardDescription>
            Visual representation of your workflow logic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {workflowFlowchart.mermaid_diagram}
            </pre>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Last updated: {new Date(workflowFlowchart.last_updated).toLocaleString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={fetchWorkflowFlowchart}
            disabled={loading.flowchart}
          >
            {loading.flowchart ? 'Refreshing...' : 'Refresh Diagram'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{automationName}</CardTitle>
            <CardDescription>
              Workflow ID: {workflowId}
            </CardDescription>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai-tokens">AI Tokens</TabsTrigger>
            <TabsTrigger value="flowchart">Flow Diagram</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            {loading.execution ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading execution analytics...</p>
                </div>
              </div>
            ) : (
              renderExecutionChart()
            )}
          </TabsContent>
          
          <TabsContent value="ai-tokens" className="mt-6">
            {loading.aiTokens ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading AI token usage...</p>
                </div>
              </div>
            ) : (
              renderAITokenChart()
            )}
          </TabsContent>
          
          <TabsContent value="flowchart" className="mt-6">
            {loading.flowchart ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading workflow diagram...</p>
                </div>
              </div>
            ) : (
              renderWorkflowFlowchart()
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
