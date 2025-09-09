"""
Test configuration and settings for execution analytics API tests
"""

import os
from django.conf import settings

# Test database configuration
TEST_DATABASE_CONFIG = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Test settings
TEST_SETTINGS = {
    'DEBUG': True,
    'SECRET_KEY': 'test-secret-key-for-testing-only',
    'ALLOWED_HOSTS': ['localhost', '127.0.0.1'],
    'INSTALLED_APPS': [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'corsheaders',
        'django_extensions',
        'api',
    ],
    'MIDDLEWARE': [
        'corsheaders.middleware.CorsMiddleware',
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
    ],
    'ROOT_URLCONF': 'stencil_flow_api.urls',
    'DATABASES': TEST_DATABASE_CONFIG,
    'REST_FRAMEWORK': {
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'api.authentication.JWTAuthentication',
        ],
        'DEFAULT_PERMISSION_CLASSES': [
            'rest_framework.permissions.IsAuthenticated',
        ],
    },
    'CORS_ALLOWED_ORIGINS': [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
    'CORS_ALLOW_CREDENTIALS': True,
    'USE_TZ': True,
    'TIME_ZONE': 'UTC',
}

# Test data constants
TEST_WORKFLOW_ID = "1000"
TEST_N8N_INSTANCE_URL = "https://n8n.example.com"
TEST_API_KEY = "test-api-key-123"
TEST_USER_EMAIL = "test@example.com"
TEST_WORKSPACE_NAME = "Test Workspace"

# Mock n8n API responses
MOCK_N8N_RESPONSES = {
    'successful_execution': {
        "id": 1001,
        "workflowId": "1000",
        "startedAt": "2025-01-21T10:00:00.000Z",
        "stoppedAt": "2025-01-21T10:05:00.000Z",
        "finished": True,
        "mode": "cli",
        "data": {
            "resultData": {
                "error": None
            }
        }
    },
    'failed_execution': {
        "id": 1002,
        "workflowId": "1000",
        "startedAt": "2025-01-21T11:00:00.000Z",
        "stoppedAt": "2025-01-21T11:05:00.000Z",
        "finished": True,
        "mode": "cli",
        "data": {
            "resultData": {
                "error": {
                    "message": "Test error message",
                    "code": "EXECUTION_ERROR"
                }
            }
        }
    },
    'unfinished_execution': {
        "id": 1003,
        "workflowId": "1000",
        "startedAt": "2025-01-21T12:00:00.000Z",
        "stoppedAt": None,
        "finished": False,
        "mode": "cli",
        "data": {}
    }
}

# Test execution patterns
EXECUTION_PATTERNS = {
    'high_success_rate': {
        'successful_per_day': 8,
        'failed_per_day': 1,
        'expected_success_rate': 88.89
    },
    'low_success_rate': {
        'successful_per_day': 2,
        'failed_per_day': 6,
        'expected_success_rate': 25.0
    },
    'mixed_pattern': {
        'successful_per_day': 5,
        'failed_per_day': 3,
        'expected_success_rate': 62.5
    }
}

# Performance test thresholds
PERFORMANCE_THRESHOLDS = {
    'max_response_time_seconds': 5.0,
    'max_memory_usage_mb': 100,
    'max_executions_processed': 1000
}

# Test coverage expectations
COVERAGE_EXPECTATIONS = {
    'minimum_coverage_percentage': 90,
    'critical_paths': [
        'api.views.get_execution_analytics',
        'api.serializers.ExecutionAnalyticsRequestSerializer',
        'api.serializers.ExecutionAnalyticsResponseSerializer',
        'api.serializers.DailyExecutionStatsSerializer'
    ]
}
