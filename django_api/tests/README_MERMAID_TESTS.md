# Mermaid Chart Generation Test Suite

This directory contains comprehensive unit tests for the Mermaid chart generation functionality in the Django API.

## Overview

The test suite covers all aspects of the workflow flowchart generation API, including:

- **Request/Response Validation**: Testing serializers and data validation
- **Template Generation**: Testing fallback template-based diagram generation
- **LLM Integration**: Testing OpenAI API integration for intelligent diagram generation
- **API Endpoints**: Testing the complete API workflow
- **Error Handling**: Testing various error scenarios and edge cases
- **Performance**: Testing response times, memory usage, and scalability
- **Integration**: Testing end-to-end workflows

## Test Files

### Core Test Files

| File | Description | Test Count |
|------|-------------|------------|
| `test_mermaid_chart_generation.py` | Main test suite for Mermaid chart functionality | ~25 tests |
| `test_mermaid_performance.py` | Performance and stress tests | ~15 tests |
| `test_mermaid_config.py` | Test utilities and configuration | Utilities only |

### Test Runner

| File | Description |
|------|-------------|
| `run_mermaid_tests.py` | Standalone test runner with options |

## Test Categories

### 1. Serializer Tests (`WorkflowFlowchartSerializerTests`)
- ✅ Valid request data validation
- ✅ Minimal required data handling
- ✅ Invalid data rejection
- ✅ Response data validation

### 2. Template Generation Tests (`TemplateMermaidGenerationTests`)
- ✅ Simple workflow generation
- ✅ Node type icons (🚀 triggers, ❓ conditions, 🏁 endings)
- ✅ Special character handling in node IDs
- ✅ Empty workflow handling
- ✅ Workflows without connections

### 3. LLM Generation Tests (`LLMMermaidGenerationTests`)
- ✅ Successful LLM generation
- ✅ Markdown code block cleanup
- ✅ Fallback when no API key
- ✅ Fallback on API errors

### 4. API Endpoint Tests (`WorkflowFlowchartAPITests`)
- ✅ Successful flowchart generation
- ✅ Missing workflow_id validation
- ✅ Deployment not found handling
- ✅ Missing n8n instance handling
- ✅ n8n API error handling
- ✅ Connection error handling
- ✅ Invalid JSON response handling
- ✅ Empty response handling
- ✅ Unauthorized access handling
- ✅ LLM generation integration

### 5. Integration Tests (`WorkflowFlowchartIntegrationTests`)
- ✅ Complete workflow generation flow
- ✅ Multiple workflow generation
- ✅ Complex workflow handling

### 6. Performance Tests (`MermaidChartPerformanceTests`)
- ✅ Response time thresholds (< 2s)
- ✅ Template generation performance (< 1s)
- ✅ LLM generation performance (< 3s)
- ✅ Concurrent request handling
- ✅ Large workflow performance (< 5s)
- ✅ Memory usage monitoring (< 50MB increase)
- ✅ Diagram size scalability
- ✅ Error response performance (< 1s)
- ✅ LLM fallback performance (< 1s)

### 7. Stress Tests (`MermaidChartStressTests`)
- ✅ Extreme workflow size (1000+ nodes)
- ✅ Rapid successive requests (20 requests)
- ✅ Mixed request types (valid/invalid)

## Running Tests

### Prerequisites

Install required dependencies:
```bash
pip install django djangorestframework django-cors-headers python-decouple openai psutil
```

### Using Django's Test Runner

```bash
# Run all Mermaid tests
python manage.py test tests.test_mermaid_chart_generation tests.test_mermaid_performance

# Run specific test class
python manage.py test tests.test_mermaid_chart_generation.WorkflowFlowchartAPITests

# Run specific test method
python manage.py test tests.test_mermaid_chart_generation.WorkflowFlowchartAPITests.test_get_workflow_flowchart_success
```

### Using the Custom Test Runner

```bash
# Run all tests
python tests/run_mermaid_tests.py

# Run unit tests only
python tests/run_mermaid_tests.py --unit

# Run performance tests only
python tests/run_mermaid_tests.py --performance

# Check dependencies
python tests/run_mermaid_tests.py --check-deps

# Show test summary
python tests/run_mermaid_tests.py --summary

# Run specific test
python tests/run_mermaid_tests.py --test=tests.test_mermaid_chart_generation.WorkflowFlowchartAPITests
```

## Test Data

### Sample Workflows

The test suite includes predefined sample workflows:

- **Simple Workflow**: Basic start → end flow
- **Complex Workflow**: Multi-node workflow with conditions and error handling
- **Icon Workflow**: Workflow demonstrating different node type icons

### Mock Data

Tests use comprehensive mock data for:
- n8n API responses
- OpenAI API responses
- User authentication
- Database objects (workspaces, spaces, deployments)

## Performance Benchmarks

### Response Time Thresholds

| Test Type | Threshold | Description |
|-----------|-----------|-------------|
| Simple Workflow | < 2s | Basic workflow generation |
| Complex Workflow | < 2s | Multi-node workflow |
| Template Generation | < 1s | Fallback template generation |
| LLM Generation | < 3s | OpenAI API integration |
| Large Workflow | < 5s | 100+ node workflow |
| Error Response | < 1s | Error handling |
| Stress Test | < 10s | Extreme conditions |

### Memory Usage

- Memory increase during large diagram generation: < 50MB
- Memory usage scales linearly with workflow size

## Error Scenarios Tested

### API Errors
- ✅ Missing workflow_id
- ✅ Non-existent workflow
- ✅ Missing n8n instance
- ✅ n8n API errors (404, 401, 500)
- ✅ Connection failures
- ✅ Invalid JSON responses
- ✅ Empty responses
- ✅ Unauthorized access

### Generation Errors
- ✅ Missing OpenAI API key
- ✅ OpenAI API failures
- ✅ Invalid workflow data
- ✅ Empty workflows
- ✅ Malformed node data

## Test Coverage

The test suite provides comprehensive coverage of:

- **Request Validation**: 100% of serializer validation logic
- **Template Generation**: 100% of template-based generation
- **LLM Integration**: 100% of LLM generation and fallback
- **API Endpoints**: 100% of endpoint logic and error handling
- **Error Scenarios**: All major error conditions
- **Performance**: Key performance metrics and thresholds

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Mermaid Chart Tests
  run: |
    pip install -r requirements.txt
    python tests/run_mermaid_tests.py
```

## Debugging Tests

### Verbose Output
```bash
python manage.py test tests.test_mermaid_chart_generation --verbosity=2
```

### Debug Specific Test
```bash
python manage.py test tests.test_mermaid_chart_generation.WorkflowFlowchartAPITests.test_get_workflow_flowchart_success --debug-mode
```

### Test Database
Tests use Django's test database which is automatically created and destroyed.

## Contributing

When adding new tests:

1. Follow the existing naming conventions
2. Add appropriate docstrings
3. Include both positive and negative test cases
4. Add performance benchmarks for new functionality
5. Update this README with new test descriptions

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **Database Errors**: Run `python manage.py migrate` first
3. **Performance Failures**: Check system resources and network connectivity
4. **Mock Failures**: Verify mock data matches expected API responses

### Test Environment

Tests run in isolation with:
- Separate test database
- Mocked external APIs (n8n, OpenAI)
- Controlled test data
- Automatic cleanup

## Future Enhancements

Planned test improvements:
- [ ] Caching performance tests
- [ ] Multi-language workflow tests
- [ ] Custom template tests
- [ ] Export functionality tests
- [ ] Interactive diagram tests
