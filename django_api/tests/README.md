# Execution Analytics API - Test Suite Documentation

This document describes the comprehensive test suite for the Execution Analytics API.

## Test Structure

The test suite is organized into several modules:

```
django_api/tests/
├── __init__.py                 # Test package initialization
├── test_utils.py              # Test utilities and factories
├── test_execution_analytics.py # Unit tests for the API
├── test_integration.py        # Integration tests
├── test_config.py             # Test configuration and constants
└── run_tests.py              # Test runner script
```

## Test Categories

### 1. Unit Tests (`test_execution_analytics.py`)

**Purpose**: Test individual components in isolation

**Coverage**:
- Serializer validation and serialization
- API endpoint functionality
- Error handling scenarios
- Authentication and authorization
- Data processing logic

**Key Test Cases**:
- `test_execution_analytics_request_serializer_valid()` - Valid request data
- `test_execution_analytics_request_serializer_missing_workflow_id()` - Missing required field
- `test_get_execution_analytics_success()` - Successful API call
- `test_get_execution_analytics_no_master_instance()` - Missing n8n instance
- `test_get_execution_analytics_invalid_workflow_id()` - Invalid workflow ID
- `test_get_execution_analytics_n8n_api_error()` - n8n API errors
- `test_get_execution_analytics_connection_error()` - Network errors
- `test_get_execution_analytics_unauthenticated()` - Authentication failures
- `test_get_execution_analytics_daily_stats_calculation()` - Daily stats calculation
- `test_get_execution_analytics_unfinished_executions()` - Unfinished execution handling
- `test_get_execution_analytics_empty_executions()` - Empty response handling

### 2. Integration Tests (`test_integration.py`)

**Purpose**: Test complete workflows and component interactions

**Coverage**:
- End-to-end API workflows
- Realistic data scenarios
- Error handling in integration contexts
- Performance with large datasets
- Malformed response handling

**Key Test Cases**:
- `test_full_execution_analytics_workflow()` - Complete workflow test
- `test_execution_analytics_with_realistic_n8n_response()` - Realistic n8n responses
- `test_execution_analytics_error_handling_integration()` - Integration error handling
- `test_execution_analytics_with_malformed_n8n_response()` - Malformed data handling
- `test_execution_analytics_with_invalid_execution_data()` - Invalid execution data
- `test_execution_analytics_with_large_dataset()` - Performance with large datasets

### 3. Test Utilities (`test_utils.py`)

**Purpose**: Provide reusable test components and mock data

**Components**:
- `TestDataFactory` - Creates test database objects
- `MockN8nResponseFactory` - Creates mock n8n API responses
- `TestHelper` - Utility methods for tests

## Test Data Factories

### TestDataFactory

Creates test database objects:

```python
# Create test user
user = TestDataFactory.create_test_user(email="test@example.com")

# Create test workspace
workspace = TestDataFactory.create_test_workspace(name="Test Workspace")

# Create test profile
profile = TestDataFactory.create_test_profile(user, workspace)

# Create test n8n instance
n8n_instance = TestDataFactory.create_test_n8n_instance(workspace)

# Create test space and automation
space = TestDataFactory.create_test_space(workspace)
automation = TestDataFactory.create_test_automation(workspace)
deployment = TestDataFactory.create_test_deployment(automation, space)
```

### MockN8nResponseFactory

Creates mock n8n API responses:

```python
# Create successful execution
successful_execution = MockN8nResponseFactory.create_successful_execution(
    execution_id=1001,
    started_at="2025-01-21T10:00:00.000Z"
)

# Create failed execution
failed_execution = MockN8nResponseFactory.create_failed_execution(
    execution_id=1002,
    started_at="2025-01-21T11:00:00.000Z"
)

# Create unfinished execution
unfinished_execution = MockN8nResponseFactory.create_unfinished_execution(
    execution_id=1003,
    started_at="2025-01-21T12:00:00.000Z"
)

# Create complete response
response = MockN8nResponseFactory.create_executions_response(executions)
```

## Running Tests

### Using Django Test Runner

```bash
# Run all tests
python manage.py test tests

# Run specific test module
python manage.py test tests.test_execution_analytics

# Run specific test class
python manage.py test tests.test_execution_analytics.ExecutionAnalyticsAPITests

# Run specific test method
python manage.py test tests.test_execution_analytics.ExecutionAnalyticsAPITests.test_get_execution_analytics_success
```

### Using Custom Test Runner

```bash
# Run tests with custom runner
python tests/run_tests.py
```

### Using pytest (if installed)

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=api --cov-report=html

# Run specific test
pytest tests/test_execution_analytics.py::ExecutionAnalyticsAPITests::test_get_execution_analytics_success
```

## Test Configuration

### Database Configuration

Tests use an in-memory SQLite database for speed:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
```

### Mock Configuration

Tests mock external dependencies:

- **n8n API calls** - Mocked using `unittest.mock.patch`
- **Authentication** - Uses test JWT tokens
- **Database operations** - Uses test database

## Test Scenarios

### Success Scenarios

1. **Basic Success**: Valid workflow ID with executions
2. **High Success Rate**: 90%+ success rate scenarios
3. **Low Success Rate**: 10%+ failure rate scenarios
4. **Mixed Patterns**: Varied success/failure patterns
5. **Empty Results**: No executions in time period

### Error Scenarios

1. **Authentication Errors**: Invalid/missing JWT tokens
2. **Authorization Errors**: User without workspace access
3. **Validation Errors**: Missing/invalid request data
4. **n8n API Errors**: 401, 404, 500 responses
5. **Network Errors**: Connection timeouts, DNS failures
6. **Data Errors**: Malformed n8n responses

### Edge Cases

1. **Unfinished Executions**: Executions that haven't completed
2. **Invalid Timestamps**: Malformed date/time data
3. **Large Datasets**: 1000+ executions
4. **Boundary Dates**: Executions at time period boundaries
5. **Missing Fields**: n8n responses with missing data

## Performance Testing

### Benchmarks

- **Response Time**: < 5 seconds for 1000 executions
- **Memory Usage**: < 100MB peak memory
- **Concurrent Requests**: Handle multiple simultaneous requests

### Load Testing Scenarios

1. **Small Dataset**: 10-50 executions
2. **Medium Dataset**: 100-500 executions
3. **Large Dataset**: 500-1000 executions
4. **Concurrent Users**: Multiple users requesting analytics

## Coverage Requirements

### Minimum Coverage

- **Overall Coverage**: 90%+
- **Critical Paths**: 100% coverage required
- **Error Handling**: 95%+ coverage required

### Critical Paths

1. `api.views.get_execution_analytics` - Main API endpoint
2. `api.serializers.ExecutionAnalyticsRequestSerializer` - Request validation
3. `api.serializers.ExecutionAnalyticsResponseSerializer` - Response serialization
4. `api.serializers.DailyExecutionStatsSerializer` - Daily stats serialization

## Continuous Integration

### GitHub Actions (if configured)

```yaml
name: Test Execution Analytics API

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run tests
        run: python manage.py test tests
      - name: Generate coverage report
        run: coverage run --source='.' manage.py test tests
```

## Debugging Tests

### Common Issues

1. **Import Errors**: Ensure Django is properly set up
2. **Database Issues**: Check test database configuration
3. **Mock Issues**: Verify mock patches are applied correctly
4. **Authentication Issues**: Check JWT token generation

### Debugging Commands

```bash
# Run tests with verbose output
python manage.py test tests --verbosity=2

# Run tests with debug output
python manage.py test tests --debug-mode

# Run tests with coverage
coverage run --source='.' manage.py test tests
coverage report
coverage html
```

## Test Maintenance

### Adding New Tests

1. **Identify Test Category**: Unit, Integration, or Performance
2. **Create Test Method**: Follow naming convention `test_<scenario>`
3. **Add Documentation**: Document test purpose and expected behavior
4. **Update Coverage**: Ensure new code paths are covered

### Updating Existing Tests

1. **Review Test Logic**: Ensure tests still validate correct behavior
2. **Update Mock Data**: Keep mock responses current with API changes
3. **Verify Assertions**: Check that assertions match expected outcomes
4. **Update Documentation**: Keep test documentation current

## Best Practices

### Test Design

1. **Single Responsibility**: Each test should verify one specific behavior
2. **Clear Naming**: Test names should describe what is being tested
3. **Independent Tests**: Tests should not depend on each other
4. **Deterministic**: Tests should produce consistent results

### Mock Usage

1. **Minimal Mocking**: Only mock external dependencies
2. **Realistic Data**: Use realistic mock data
3. **Error Scenarios**: Test both success and failure cases
4. **Cleanup**: Ensure mocks are properly cleaned up

### Assertions

1. **Specific Assertions**: Use specific assertions rather than generic ones
2. **Multiple Checks**: Verify multiple aspects of the response
3. **Error Messages**: Check error messages for clarity
4. **Edge Cases**: Test boundary conditions

This test suite provides comprehensive coverage of the Execution Analytics API, ensuring reliability, performance, and maintainability.
