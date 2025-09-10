# Workflow Flowchart API Documentation

## Overview

The Workflow Flowchart API generates Mermaid diagram visualizations for n8n workflows using LLM analysis. This API fetches workflow data from n8n instances and uses OpenAI's GPT models to create clean, readable flowchart diagrams.

## API Endpoint

```
POST /api/functions/get-workflow-flowchart/
```

## Authentication

Requires JWT authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Request Format

### Headers
```
Content-Type: application/json
Authorization: Bearer <jwt-token>
```

### Request Body
```json
{
  "workflow_id": "string",
  "include_execution_data": boolean (optional, default: false)
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workflow_id` | string | Yes | The n8n workflow ID to generate a flowchart for |
| `include_execution_data` | boolean | No | Whether to include execution data in the analysis (future feature) |

## Response Format

### Success Response (200 OK)
```json
{
  "workflow_id": "QQNsgt7c1U10NLjM",
  "mermaid_diagram": "graph TD\n    A[\"Start\"] --> B[\"Webhook Trigger\"]\n    B --> C{\"Check Data\"}\n    C -->|Valid| D[\"Process Data\"]\n    C -->|Invalid| E[\"Send Error Email\"]\n    D --> F[\"Call AI API\"]\n    F --> G[\"Generate Response\"]\n    G --> H[\"Send Response\"]\n    H --> I[\"Log Results\"]\n    I --> J[\"End\"]\n    E --> K[\"Log Error\"]\n    K --> J",
  "workflow_name": "Customer Support Bot",
  "node_count": 11,
  "connection_count": 10,
  "last_updated": "2025-01-21T15:30:45.123456Z",
  "generation_method": "llm_analysis"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `workflow_id` | string | The n8n workflow ID |
| `mermaid_diagram` | string | Mermaid diagram syntax for rendering |
| `workflow_name` | string | Name of the workflow from n8n |
| `node_count` | integer | Number of nodes in the workflow |
| `connection_count` | integer | Number of connections between nodes |
| `last_updated` | datetime | When the diagram was generated |
| `generation_method` | string | Method used ("llm_analysis" or "template") |

## Error Responses

### 400 Bad Request
```json
{
  "workflow_id": ["This field is required."]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 404 Not Found
```json
{
  "error": "Workflow QQNsgt7c1U10NLjM not found in deployments"
}
```

### 502 Bad Gateway
```json
{
  "error": "n8n API error: Workflow not found",
  "details": {
    "status_code": 404,
    "url": "https://n8n.example.com/api/v1/workflows/QQNsgt7c1U10NLjM"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error: OpenAI API key not configured"
}
```

## Implementation Details

### LLM Integration

The API uses OpenAI's GPT-3.5-turbo model to analyze workflow structure and generate Mermaid diagrams. The LLM receives:

1. **Workflow metadata**: Name, node count, connection count
2. **Node information**: ID, name, type, parameters
3. **Connection data**: Source and target node relationships

### Fallback Mechanism

If LLM generation fails (no API key, API error, etc.), the system falls back to a template-based approach that:

1. Creates basic node shapes based on node types
2. Uses emojis for visual distinction (🚀 triggers, ❓ conditions, 🏁 endings)
3. Generates simple connections between nodes

### Node Type Mapping

| n8n Node Type | Mermaid Shape | Icon |
|---------------|---------------|------|
| Trigger/Webhook | Rectangle | 🚀 |
| Condition/IF | Diamond | ❓ |
| End/Stop | Rectangle | 🏁 |
| Default | Rectangle | ⚙️ |

## Environment Configuration

### Required Environment Variables

```bash
# OpenAI API Key (optional - falls back to template generation)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Existing n8n configuration
DEFAULT_N8N_INSTANCE_URL=https://your-n8n-instance.com
DEFAULT_N8N_API_KEY=your-n8n-api-key
```

### Installation

```bash
# Install OpenAI dependency
pip install openai==1.3.0

# Or install all requirements
pip install -r requirements.txt
```

## Usage Examples

### Python Example

```python
import requests

# API endpoint
url = "http://localhost:8000/api/functions/get-workflow-flowchart/"

# Headers
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-jwt-token"
}

# Request data
data = {
    "workflow_id": "QQNsgt7c1U10NLjM",
    "include_execution_data": False
}

# Make request
response = requests.post(url, json=data, headers=headers)

if response.status_code == 200:
    result = response.json()
    print(f"Generated diagram for: {result['workflow_name']}")
    print(f"Nodes: {result['node_count']}, Connections: {result['connection_count']}")
    print("Mermaid Diagram:")
    print(result['mermaid_diagram'])
else:
    print(f"Error: {response.json()}")
```

### JavaScript Example

```javascript
const response = await fetch('/api/functions/get-workflow-flowchart/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    workflow_id: 'QQNsgt7c1U10NLjM',
    include_execution_data: false
  })
});

if (response.ok) {
  const data = await response.json();
  console.log('Mermaid Diagram:', data.mermaid_diagram);
} else {
  const error = await response.json();
  console.error('Error:', error);
}
```

## Frontend Integration

The API is integrated into the `WorkflowAnalyticsDashboard` component:

```typescript
// Fetch workflow flowchart
const fetchWorkflowFlowchart = async () => {
  const { data, error } = await apiClient.functions.getWorkflowFlowchart({
    workflow_id: workflowId,
    include_execution_data: false
  });

  if (error) {
    // Handle error with fallback to mock data
  } else {
    setWorkflowFlowchart(data);
  }
};
```

## Performance Considerations

1. **Caching**: Consider implementing caching for frequently accessed workflows
2. **Rate Limiting**: OpenAI API has rate limits - implement retry logic
3. **Timeout**: API calls to n8n and OpenAI have 30-second timeouts
4. **Fallback**: Always provide template-based fallback for reliability

## Security Notes

1. **API Keys**: Store OpenAI API keys securely in environment variables
2. **Authentication**: All requests require valid JWT tokens
3. **Workflow Access**: Users can only access workflows in their workspace/spaces
4. **Data Privacy**: Workflow data is processed by OpenAI - ensure compliance

## Troubleshooting

### Common Issues

1. **"No n8n instance found"**: Ensure the workflow's space has a configured n8n instance
2. **"Workflow not found in n8n"**: Verify the workflow ID exists in the n8n instance
3. **"OpenAI API key not configured"**: Set OPENAI_API_KEY environment variable
4. **"LLM generation failed"**: Check OpenAI API key validity and rate limits

### Debug Mode

Enable debug logging by setting Django's LOG_LEVEL to DEBUG:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'api': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

## Future Enhancements

1. **Execution Data Integration**: Include execution statistics in diagram generation
2. **Custom Templates**: Allow users to define custom diagram templates
3. **Interactive Diagrams**: Generate clickable diagrams with node details
4. **Export Options**: Add PDF/SVG export functionality
5. **Caching**: Implement Redis-based caching for improved performance
6. **Multiple LLM Providers**: Support for Anthropic, Google, etc.

## API Versioning

Current version: v1

Future versions will maintain backward compatibility while adding new features.
