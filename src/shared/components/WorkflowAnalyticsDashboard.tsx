import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import mermaid from 'mermaid';

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

// Enhanced AI Token Usage interfaces
interface AITokenUsage {
  workflow_id: string;
  total_tokens_used: number;
  total_cost: number;
  analysis_method: string;
  
  // Enhanced breakdowns
  provider_breakdown: Record<string, ProviderBreakdown>;
  model_breakdown: Record<string, ModelBreakdown>;
  node_breakdown: NodeBreakdown[];
  
  // Existing fields
  daily_token_usage: DailyTokenUsage[];
  period_start: string;
  period_end: string;
  ai_nodes_found: string[];
  
  // New metadata fields
  discovered_models: string[];
  provider_usage_summary: ProviderUsageSummary;
  total_executions_analyzed: number;
  
  // Token estimation confidence
  token_confidence?: 'exact' | 'estimated' | 'rough';
  estimation_method?: string;
}

interface ProviderBreakdown {
  tokens: number;
  cost: number;
  executions: number;
}

interface ModelBreakdown {
  tokens: number;
  cost: number;
  executions: number;
  provider: string;
}

interface NodeBreakdown {
  node_name: string;
  node_type?: string;
  tokens: number;
  cost: number;
  model?: string;
  provider?: string;
  executions: number;
}

interface ProviderUsageSummary {
  total_providers: number;
  most_used_provider: string;
  cost_leader: string;
}

interface DailyTokenUsage {
  date: string;
  tokens_used: number;
  cost: number;
}

// Enhanced Workflow Flowchart interface
interface WorkflowFlowchart {
  workflow_id: string;
  mermaid_diagram: string;
  workflow_name: string;
  node_count: number;
  connection_count: number;
  last_updated: string;
  generation_method: string;
}

interface WorkflowAnalyticsDashboardProps {
  workflowId: string;
  automationName: string;
  isActive: boolean;
}

// Mermaid Diagram Component
function MermaidDiagram({ diagram }: { diagram: string }) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!diagram) return;

    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });

    // Generate SVG from Mermaid diagram
    const generateDiagram = async () => {
      try {
        const { svg } = await mermaid.render('mermaid-diagram', diagram);
        setSvgContent(svg);
        setError('');
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Failed to render diagram');
        setSvgContent('');
      }
    };

    generateDiagram();
  }, [diagram]);

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        {error}
        <pre className="mt-2 text-xs text-gray-600">{diagram}</pre>
      </div>
    );
  }

  if (!svgContent) {
    return <div className="text-gray-500">Rendering diagram...</div>;
  }

  return (
    <div 
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
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

  // Fetch AI token usage using enhanced API
  const fetchAITokenUsage = async () => {
    setLoading(prev => ({ ...prev, aiTokens: true }));
    try {
      const { data, error } = await apiClient.functions.getAITokenUsage({
        workflow_id: workflowId
      });

      if (error) {
        console.error('❌ AI token usage error:', error);
        toast.error('Failed to load AI token usage: ' + error.message);
      } else {
        console.log('✅ Enhanced AI token usage loaded:', data);
        setAiTokenUsage(data);
      }
    } catch (err: any) {
      console.error('❌ AI token usage fetch error:', err);
      toast.error('Failed to load AI token usage: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, aiTokens: false }));
    }
  };

  // Fetch workflow flowchart using enhanced API
  const fetchWorkflowFlowchart = async () => {
    setLoading(prev => ({ ...prev, flowchart: true }));
    try {
      const { data, error } = await apiClient.functions.getWorkflowFlowchart({
        workflow_id: workflowId,
        include_execution_data: false
      });

      if (error) {
        console.error('❌ Workflow flowchart error:', error);
        toast.error('Failed to load workflow flowchart: ' + error.message);
      } else {
        console.log('✅ Enhanced workflow flowchart loaded:', data);
        setWorkflowFlowchart(data);
      }
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

  // Render enhanced AI token usage dashboard
  const renderAITokenChart = () => {
    if (!aiTokenUsage) return null;

    return (
      <div className="space-y-6">
        {/* Token Estimation Disclaimer */}
        {aiTokenUsage.token_confidence && aiTokenUsage.token_confidence !== 'exact' && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <div className="text-amber-600">⚠️</div>
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Estimated Token Usage</p>
                  <p className="text-amber-700">
                    Token data is {aiTokenUsage.token_confidence} - calculated from response content. 
                    Actual usage may vary. Consider this data for trend analysis rather than exact billing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-purple-600">
                  {aiTokenUsage.total_tokens_used.toLocaleString()}
                </div>
                {aiTokenUsage.token_confidence && (
                  <Badge 
                    variant={aiTokenUsage.token_confidence === 'exact' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {aiTokenUsage.token_confidence.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total Tokens
                {aiTokenUsage.estimation_method && (
                  <span className="ml-1">({aiTokenUsage.estimation_method})</span>
                )}
              </p>
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
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {aiTokenUsage.provider_usage_summary?.total_providers || 0}
              </div>
              <p className="text-xs text-muted-foreground">AI Providers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {aiTokenUsage.total_executions_analyzed || 0}
              </div>
              <p className="text-xs text-muted-foreground">Executions</p>
            </CardContent>
          </Card>
        </div>

        {/* Provider Breakdown */}
        {aiTokenUsage.provider_breakdown && Object.keys(aiTokenUsage.provider_breakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage by AI Provider</CardTitle>
              <CardDescription>
                Most used: {aiTokenUsage.provider_usage_summary?.most_used_provider?.toUpperCase() || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(aiTokenUsage.provider_breakdown).map(([provider, stats]) => (
                  <div key={provider} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="capitalize">
                        {provider}
                      </Badge>
                      <div className="text-sm">
                        <div className="font-medium">{stats.tokens.toLocaleString()} tokens</div>
                        <div className="text-muted-foreground">{stats.executions} executions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${stats.cost.toFixed(4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Breakdown */}
        {aiTokenUsage.model_breakdown && Object.keys(aiTokenUsage.model_breakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage by Model</CardTitle>
              <CardDescription>
                Discovered models: {aiTokenUsage.discovered_models?.join(', ') || 'None'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(aiTokenUsage.model_breakdown).map(([model, stats]) => (
                  <div key={model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm">
                        <div className="font-medium">{model}</div>
                        <div className="text-muted-foreground">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {stats.provider}
                          </Badge>
                          {' '}{stats.executions} executions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{stats.tokens.toLocaleString()}</div>
                      <div className="text-sm text-green-600">${stats.cost.toFixed(4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Node-Level Breakdown */}
        {aiTokenUsage.node_breakdown && aiTokenUsage.node_breakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Node-Level Usage</CardTitle>
              <CardDescription>
                Token consumption by workflow nodes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aiTokenUsage.node_breakdown.map((node, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm">
                        <div className="font-medium">{node.node_name}</div>
                        <div className="text-muted-foreground">
                          {node.model && (
                            <Badge variant="outline" className="text-xs mr-1">
                              {node.model}
                            </Badge>
                          )}
                          {node.provider && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {node.provider}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{node.tokens.toLocaleString()}</div>
                      <div className="text-sm text-green-600">${node.cost.toFixed(4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
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

  // Render enhanced workflow flowchart
  const renderWorkflowFlowchart = () => {
    if (!workflowFlowchart) return null;

    return (
      <div className="space-y-4">
        {/* Workflow Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {workflowFlowchart.node_count || 0}
              </div>
              <p className="text-xs text-muted-foreground">Nodes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {workflowFlowchart.connection_count || 0}
              </div>
              <p className="text-xs text-muted-foreground">Connections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-purple-600">
                {workflowFlowchart.generation_method === 'llm_analysis' ? 'AI Generated' : 'Template'}
              </div>
              <p className="text-xs text-muted-foreground">Generation Method</p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Diagram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {workflowFlowchart.workflow_name || 'Workflow Flow Diagram'}
            </CardTitle>
            <CardDescription>
              Visual representation of your workflow logic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <MermaidDiagram diagram={workflowFlowchart.mermaid_diagram} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(workflowFlowchart.last_updated).toLocaleString()}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchWorkflowFlowchart}
                disabled={loading.flowchart}
              >
                {loading.flowchart ? 'Refreshing...' : 'Refresh Diagram'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
            <TabsTrigger value="overview">
              Overview
              {executionAnalytics && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {executionAnalytics.overall_success_percentage.toFixed(0)}%
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai-tokens">
              AI Tokens
              {aiTokenUsage && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  ${aiTokenUsage.total_cost.toFixed(3)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flowchart">
              Flow Diagram
              {workflowFlowchart && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {workflowFlowchart.node_count} nodes
                </Badge>
              )}
            </TabsTrigger>
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
