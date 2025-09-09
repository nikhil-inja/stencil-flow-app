# Execution Analytics API

This document describes the new Execution Analytics API endpoint that provides insights into workflow execution performance from n8n.

## Overview

The Execution Analytics API fetches execution data from n8n for a specific workflow and provides:
- Total execution counts (successful vs failed)
- Overall success percentage
- Daily time-series data for the past 7 days
- Success percentage trends

## Endpoint

```
POST /api/functions/get-execution-analytics/
```

## Authentication

Requires JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Request

### Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{
    "workflow_id": "1000"
}
```

### Parameters
- `workflow_id` (string, required): The n8n workflow ID to get analytics for

## Response

### Success Response (200 OK)
```json
{
    "workflow_id": "1000",
    "total_executions": 45,
    "total_successful": 42,
    "total_failed": 3,
    "overall_success_percentage": 93.33,
    "daily_stats": [
        {
            "date": "2025-01-15",
            "total_executions": 7,
            "successful_executions": 6,
            "failed_executions": 1,
            "success_percentage": 85.71
        },
        {
            "date": "2025-01-16",
            "total_executions": 8,
            "successful_executions": 8,
            "failed_executions": 0,
            "success_percentage": 100.0
        }
        // ... more daily entries
    ],
    "period_start": "2025-01-15",
    "period_end": "2025-01-21"
}
```

### Response Fields
- `workflow_id`: The workflow ID that was queried
- `total_executions`: Total number of executions in the 7-day period
- `total_successful`: Number of successful executions
- `total_failed`: Number of failed executions
- `overall_success_percentage`: Overall success rate as a percentage
- `daily_stats`: Array of daily statistics
  - `date`: Date in YYYY-MM-DD format
  - `total_executions`: Total executions on that day
  - `successful_executions`: Successful executions on that day
  - `failed_executions`: Failed executions on that day
  - `success_percentage`: Success rate for that day
- `period_start`: Start date of the 7-day period
- `period_end`: End date of the 7-day period

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
    "error": "Invalid n8n API key"
}
```

### 404 Not Found
```json
{
    "error": "Workflow 1000 not found"
}
```

### 400 Bad Request (No Master Instance)
```json
{
    "error": "No master n8n instance configured for this workspace"
}
```

### 502 Bad Gateway
```json
{
    "error": "Failed to connect to n8n instance: Connection timeout"
}
```

## Implementation Details

### Execution Status Logic
The API determines execution success/failure based on:
1. **Finished executions**: Check if the execution data contains error information
2. **Unfinished executions**: Treated as failed for analytics purposes

### Date Range
- Always returns data for the past 7 days (including today)
- Uses the execution's `startedAt` timestamp for date grouping
- Days with no executions show zero counts

### n8n API Integration
- Uses the `/api/v1/executions` endpoint from n8n
- Filters by `workflowId` parameter
- Sets `includeData=false` for better performance
- Uses `limit=1000` to get maximum executions

### Performance Considerations
- API call timeout set to 30 seconds
- Only fetches execution metadata, not full execution data
- Processes up to 1000 executions per request

## Prerequisites

1. **Master n8n Instance**: The workspace must have a master n8n instance configured
2. **Valid API Key**: The n8n instance must have a valid API key
3. **Workflow Access**: The workflow must exist and be accessible via the n8n API
4. **Authentication**: User must be authenticated and have access to the workspace

## Usage Examples

### Python Example
```python
import requests
import json

# API endpoint
url = "http://localhost:8000/api/functions/get-execution-analytics/"

# Request payload
payload = {
    "workflow_id": "1000"
}

# Headers
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
}

# Make request
response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    data = response.json()
    print(f"Overall success rate: {data['overall_success_percentage']}%")
    
    for day in data['daily_stats']:
        print(f"{day['date']}: {day['success_percentage']}% success rate")
else:
    print(f"Error: {response.json()}")
```

### JavaScript Example
```javascript
const response = await fetch('/api/functions/get-execution-analytics/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
    },
    body: JSON.stringify({
        workflow_id: '1000'
    })
});

const data = await response.json();

if (response.ok) {
    console.log(`Overall success rate: ${data.overall_success_percentage}%`);
    
    data.daily_stats.forEach(day => {
        console.log(`${day.date}: ${day.success_percentage}% success rate`);
    });
} else {
    console.error('Error:', data.error);
}
```

## Integration with Frontend

This API is designed to work with charting libraries for visualization:

### Chart.js Example
```javascript
// Process the daily stats for Chart.js
const chartData = {
    labels: data.daily_stats.map(day => day.date),
    datasets: [{
        label: 'Success Rate (%)',
        data: data.daily_stats.map(day => day.success_percentage),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1
    }]
};
```

### Recharts Example
```javascript
// Process for Recharts
const chartData = data.daily_stats.map(day => ({
    date: day.date,
    successRate: day.success_percentage,
    totalExecutions: day.total_executions,
    successfulExecutions: day.successful_executions,
    failedExecutions: day.failed_executions
}));
```

## Monitoring and Alerts

This API can be used to:
1. **Monitor workflow health**: Track success rates over time
2. **Set up alerts**: Alert when success rate drops below threshold
3. **Performance analysis**: Identify patterns in execution failures
4. **Capacity planning**: Understand execution volume trends

## Future Enhancements

Potential improvements for future versions:
1. **Configurable date ranges**: Allow custom date ranges beyond 7 days
2. **Pagination**: Handle workflows with more than 1000 executions
3. **Caching**: Cache results for better performance
4. **Real-time updates**: WebSocket support for live updates
5. **Advanced filtering**: Filter by execution mode, user, etc.
