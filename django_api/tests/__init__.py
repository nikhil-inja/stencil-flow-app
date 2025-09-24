# Test configuration for Django API tests
import os
import sys
import django
from django.conf import settings

# Add the Django project to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django settings for testing
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')

# Handle missing dependencies gracefully
try:
    django.setup()
    
    # Import Django test utilities
    from django.test import TestCase, Client
    from django.contrib.auth.models import User
    from rest_framework.test import APITestCase, APIClient
    from rest_framework import status
    from unittest.mock import patch, Mock
    import json
    from datetime import datetime, timedelta
    from django.utils import timezone

    # Import models
    from api.models import Workspace, Profile, N8nInstance, Automation, Deployment, Space
    from api.serializers import ExecutionAnalyticsRequestSerializer, ExecutionAnalyticsResponseSerializer
    from api.views import get_execution_analytics
    from api.authentication import generate_jwt_token
    
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Please install required dependencies:")
    print("pip uninstall decouple -y")
    print("pip install python-decouple==3.8 django djangorestframework django-cors-headers")
    print("\nOr run tests using Django's manage.py:")
    print("python manage.py test tests")
