# UI Mockup - Workflow Analytics Dashboard

## Current SpaceDetailPage Layout

```
┌─────────────────────────────────────────────────────────┐
│ Customer Support Space                    [Active]      │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Deployed Workflows                                  │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Customer Support Bot              [Active]      │ │ │
│ │ │ ┌─────────┐ [Update]                            │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ Available Automations                              │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Email Processing Bot              [Deploy]      │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ n8n Instance Connection                            │ │
│ │ URL: https://n8n.example.com                       │ │
│ │ API Key: ••••••••••••••••••••                      │ │
│ │ [Save Connection] [Delete Connection]              │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Enhanced SpaceDetailPage with Analytics

```
┌─────────────────────────────────────────────────────────┐
│ Customer Support Space                    [Active]      │
│                                                         │
│ [Deployments] [Analytics] [Settings]                    │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Customer Support Bot                    [Active]   │ │
│ │ Workflow ID: 1000                                   │ │
│ │                                                     │ │
│ │ [Overview] [AI Tokens] [Flow Diagram]              │ │
│ │                                                     │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐               │ │
│ │ │   150   │ │   120   │ │   30    │               │ │
│ │ │ Total   │ │Success  │ │ Failed  │               │ │
│ │ │Executions│ │         │ │         │               │ │
│ │ └─────────┘ └─────────┘ └─────────┘               │ │
│ │                                                     │ │
│ │ Success Rate Trend (7 Days)                        │ │
│ │ ████████████████████████████████████████████████  │ │
│ │ Mon Tue Wed Thu Fri Sat Sun                        │ │
│ │ 80% 85% 75% 90% 88% 82% 85%                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Email Processing Bot                    [Inactive] │ │
│ │ Workflow ID: 1001                                   │ │
│ │                                                     │ │
│ │ [Overview] [AI Tokens] [Flow Diagram]              │ │
│ │                                                     │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐               │ │
│ │ │    0    │ │    0    │ │    0    │               │ │
│ │ │ Total   │ │Success  │ │ Failed  │               │ │
│ │ │Executions│ │         │ │         │               │ │
│ │ └─────────┘ └─────────┘ └─────────┘               │ │
│ │                                                     │ │
│ │ No execution data available                         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## AI Tokens Tab View

```
┌─────────────────────────────────────────────────────────┐
│ Customer Support Bot                        [Active]   │
│ Workflow ID: 1000                                       │
│                                                         │
│ [Overview] [AI Tokens] [Flow Diagram]                  │
│                                                         │
│ ┌─────────────┐ ┌─────────────┐                       │
│ │  15,420     │ │   $0.023    │                       │
│ │ Total Tokens│ │ Total Cost  │                       │
│ │    Used     │ │             │                       │
│ └─────────────┘ └─────────────┘                       │
│                                                         │
│ Daily Token Usage                                       │
│ ████████████████████████████████████████████████████  │
│ Mon Tue Wed Thu Fri Sat Sun                            │
│ 2.1K 1.8K 2.4K 1.9K 2.2K 2.1K 2.9K                   │
│                                                         │
│ Cost Breakdown:                                         │
│ • Input Tokens: 8,200 ($0.012)                         │
│ • Output Tokens: 7,220 ($0.011)                        │
└─────────────────────────────────────────────────────────┘
```

## Flow Diagram Tab View

```
┌─────────────────────────────────────────────────────────┐
│ Customer Support Bot                        [Active]   │
│ Workflow ID: 1000                                       │
│                                                         │
│ [Overview] [AI Tokens] [Flow Diagram]                  │
│                                                         │
│ Workflow Flow Diagram                                   │
│ Visual representation of your workflow logic            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ graph TD                                            │ │
│ │     A[Start] --> B[Webhook Trigger]                 │ │
│ │     B --> C{Check Data}                              │ │
│ │     C -->|Valid| D[Process Data]                    │ │
│ │     C -->|Invalid| E[Send Error Email]              │ │
│ │     D --> F[Call AI API]                            │ │
│ │     F --> G[Generate Response]                      │ │
│ │     G --> H[Send Response]                          │ │
│ │     H --> I[Log Results]                            │ │
│ │     I --> J[End]                                    │ │
│ │     E --> K[Log Error]                              │ │
│ │     K --> J                                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Last updated: 1/21/2025, 10:30 AM                      │
│ [Refresh Diagram]                                       │
└─────────────────────────────────────────────────────────┘
```

## Mobile Responsive Layout

```
┌─────────────────────────────────────────┐
│ Customer Support Space        [Active]  │
│                                         │
│ [Deployments] [Analytics] [Settings]    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Customer Support Bot    [Active]   │ │
│ │ Workflow ID: 1000                  │ │
│ │                                     │ │
│ │ [Overview] [AI Tokens] [Flow]      │ │
│ │                                     │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐            │ │
│ │ │ 150 │ │ 120 │ │ 30  │            │ │
│ │ │Total│ │Success│ │Failed│            │ │
│ │ └─────┘ └─────┘ └─────┘            │ │
│ │                                     │ │
│ │ Success Rate: 80%                   │ │
│ │ ████████████████████████████████   │ │
│ │ Last 7 days                         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Key Design Principles

1. **Hierarchical Information**: Space → Workflow → Analytics
2. **Progressive Disclosure**: Tabs reveal more detailed information
3. **Visual Consistency**: Consistent color coding and spacing
4. **Responsive Design**: Adapts to different screen sizes
5. **Clear Data Presentation**: Charts, cards, and diagrams
6. **Action-Oriented**: Easy access to controls and updates

## Color Coding System

- **Green (#10b981)**: Success, active status, positive metrics
- **Red (#ef4444)**: Failures, errors, negative metrics  
- **Amber (#f59e0b)**: Warnings, moderate performance
- **Blue (#3b82f6)**: Information, neutral data
- **Purple (#8b5cf6)**: AI-related metrics, special features
- **Gray (#6b7280)**: Muted text, inactive elements

This design provides a comprehensive yet intuitive interface for monitoring and analyzing workflow performance across all three analytics dimensions.
