# Workflow Analytics Dashboard - UI Design & Implementation Guide

## Overview

This document outlines the design and implementation of a comprehensive analytics dashboard for deployed workflows in your Stencil Flow application. The dashboard integrates three key APIs:

1. **Execution Analytics** - Success/failure rates and time-series data
2. **AI Token Usage** - Token consumption and cost tracking
3. **Workflow Flowchart** - Visual diagram generation using LLM + Mermaid.js

## UI Architecture

### 1. Tab-Based Navigation
The SpaceDetailPage now uses a tabbed interface with three main sections:

```
┌─────────────────────────────────────────────────────────┐
│ Space Name                                    [Active]  │
├─────────────────────────────────────────────────────────┤
│ [Deployments] [Analytics] [Settings]                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab Content Area                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Analytics Dashboard Component Structure

Each deployed workflow gets its own analytics dashboard card:

```
┌─────────────────────────────────────────────────────────┐
│ Automation Name                              [Active]   │
│ Workflow ID: 1000                                        │
├─────────────────────────────────────────────────────────┤
│ [Overview] [AI Tokens] [Flow Diagram]                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab Content (Charts, Data, Diagrams)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Component Hierarchy

```
SpaceDetailPageWithAnalytics
├── Tabs (Main Navigation)
│   ├── TabsContent (Deployments)
│   │   ├── Deployed Workflows List
│   │   └── Available Automations List
│   ├── TabsContent (Analytics)
│   │   └── WorkflowAnalyticsDashboard[] (One per deployment)
│   │       ├── Tabs (Analytics Navigation)
│   │       │   ├── TabsContent (Overview)
│   │       │   │   ├── Execution Stats Cards
│   │       │   │   └── Success Rate Chart
│   │       │   ├── TabsContent (AI Tokens)
│   │       │   │   ├── Token Usage Cards
│   │       │   │   └── Daily Token Chart
│   │       │   └── TabsContent (Flow Diagram)
│   │       │       └── Mermaid Diagram Display
│   └── TabsContent (Settings)
│       └── n8n Instance Configuration
```

### 2. Data Flow

```
Frontend Component
    ↓
API Client (apiClient.functions.getExecutionAnalytics)
    ↓
Django API (/api/functions/get-execution-analytics/)
    ↓
n8n API (/api/v1/executions)
    ↓
Data Processing & Response
    ↓
Frontend Rendering (Charts, Cards, Tables)
```

## Visual Design Specifications

### 1. Color Scheme

- **Success**: `#10b981` (Green-500)
- **Warning**: `#f59e0b` (Amber-500) 
- **Error**: `#ef4444` (Red-500)
- **Info**: `#3b82f6` (Blue-500)
- **Purple**: `#8b5cf6` (Purple-500) - For AI tokens
- **Muted**: `#6b7280` (Gray-500) - For secondary text

### 2. Chart Types

#### Execution Analytics Overview
- **Bar Chart**: Daily success rates (7-day period)
- **Cards**: Total executions, successful, failed counts
- **Color Coding**: 
  - Green: ≥80% success rate
  - Amber: 60-79% success rate  
  - Red: <60% success rate

#### AI Token Usage
- **Bar Chart**: Daily token consumption
- **Cards**: Total tokens used, total cost
- **Purple Theme**: Consistent purple color scheme

#### Workflow Flowchart
- **Mermaid Diagram**: Rendered in monospace font
- **Refresh Button**: Manual diagram regeneration
- **Last Updated**: Timestamp display

### 3. Responsive Design

- **Mobile**: Single column layout, stacked cards
- **Tablet**: Two-column grid for stats cards
- **Desktop**: Three-column grid for optimal space usage

## API Integration Points

### 1. Execution Analytics API (✅ Implemented)

```typescript
// Current API
POST /api/functions/get-execution-analytics/
{
  "workflow_id": "1000"
}

// Response
{
  "workflow_id": "1000",
  "total_executions": 150,
  "total_successful": 120,
  "total_failed": 30,
  "overall_success_percentage": 80.0,
  "daily_stats": [
    {
      "date": "2025-01-15",
      "total_executions": 25,
      "successful_executions": 20,
      "failed_executions": 5,
      "success_percentage": 80.0
    }
    // ... 6 more days
  ],
  "period_start": "2025-01-15",
  "period_end": "2025-01-21"
}
```

### 2. AI Token Usage API (🔄 To Implement)

```typescript
// Proposed API
POST /api/functions/get-ai-token-usage/
{
  "workflow_id": "1000"
}

// Response
{
  "workflow_id": "1000",
  "total_tokens_used": 15420,
  "total_cost": 0.023,
  "daily_token_usage": [
    {
      "date": "2025-01-15",
      "tokens_used": 2100,
      "cost": 0.003
    }
    // ... 6 more days
  ],
  "period_start": "2025-01-15",
  "period_end": "2025-01-21"
}
```

### 3. Workflow Flowchart API (🔄 To Implement)

```typescript
// Proposed API
POST /api/functions/get-workflow-flowchart/
{
  "workflow_id": "1000"
}

// Response
{
  "workflow_id": "1000",
  "mermaid_diagram": "graph TD\n    A[Start] --> B[Webhook Trigger]\n    ...",
  "last_updated": "2025-01-21T10:30:00Z"
}
```

## Implementation Steps

### Phase 1: Basic Analytics Integration ✅
- [x] Create WorkflowAnalyticsDashboard component
- [x] Integrate execution analytics API
- [x] Add tabbed navigation to SpaceDetailPage
- [x] Implement basic charts and data display

### Phase 2: Enhanced Visualizations 🔄
- [ ] Add proper chart library (Chart.js, Recharts, or D3)
- [ ] Implement interactive tooltips
- [ ] Add loading states and error handling
- [ ] Implement data refresh functionality

### Phase 3: AI Token Usage Integration 🔄
- [ ] Design AI token usage API endpoint
- [ ] Implement token tracking in n8n workflows
- [ ] Add cost calculation logic
- [ ] Create token usage visualization

### Phase 4: Workflow Flowchart Generation 🔄
- [ ] Design flowchart generation API
- [ ] Integrate LLM for workflow analysis
- [ ] Implement Mermaid.js rendering
- [ ] Add diagram refresh and caching

### Phase 5: Advanced Features 🔄
- [ ] Add export functionality (PDF, CSV)
- [ ] Implement alerting for low success rates
- [ ] Add comparison between workflows
- [ ] Implement historical data archiving

## Usage Examples

### 1. Basic Integration

```typescript
// In your SpaceDetailPage component
import WorkflowAnalyticsDashboard from '@/shared/components/WorkflowAnalyticsDashboard';

// Render analytics for each deployment
{deployments.map(dep => {
  const automationInfo = automations.find(a => a.id === dep.automation_id);
  const isActive = workflowStatuses.get(dep.n8n_workflow_id) ?? false;
  
  return (
    <WorkflowAnalyticsDashboard
      key={dep.id}
      workflowId={dep.n8n_workflow_id}
      automationName={automationInfo?.name || 'Unknown Automation'}
      isActive={isActive}
    />
  );
})}
```

### 2. Custom Styling

```typescript
// Customize the dashboard appearance
<WorkflowAnalyticsDashboard
  workflowId="1000"
  automationName="Customer Support Bot"
  isActive={true}
  className="custom-dashboard-style"
/>
```

## Benefits of This Design

### 1. **Scalable Architecture**
- Each workflow gets its own analytics dashboard
- Easy to add new analytics types
- Modular component design

### 2. **User Experience**
- Intuitive tabbed navigation
- Clear visual hierarchy
- Responsive design for all devices

### 3. **Developer Experience**
- Reusable components
- Type-safe API integration
- Clear separation of concerns

### 4. **Future-Proof**
- Easy to add new analytics APIs
- Extensible chart system
- Flexible data visualization

## Next Steps

1. **Install Required Dependencies**:
   ```bash
   npm install @radix-ui/react-tabs
   npm install chart.js react-chartjs-2  # For better charts
   ```

2. **Update Your SpaceDetailPage**:
   - Replace the current SpaceDetailPage with SpaceDetailPageWithAnalytics
   - Or gradually integrate the analytics components

3. **Test the Integration**:
   - Deploy a workflow to a space
   - Navigate to the Analytics tab
   - Verify execution analytics are displayed

4. **Implement Additional APIs**:
   - AI token usage tracking
   - Workflow flowchart generation

This design provides a solid foundation for your analytics dashboard while maintaining the existing functionality and providing a clear path for future enhancements.
