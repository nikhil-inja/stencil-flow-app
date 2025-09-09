
"""
Test utilities and fixtures for execution analytics API tests
"""

from django.contrib.auth.models import User
from api.models import Workspace, Profile, N8nInstance, Space, Automation, Deployment
from api.authentication import generate_jwt_token
from datetime import datetime, timedelta
from django.utils import timezone
import json


class TestDataFactory:
    """Factory class to create test data"""
    
    @staticmethod
    def create_test_user(email="test@example.com", password="testpass123"):
        """Create a test user"""
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password
        )
        return user
    
    @staticmethod
    def create_test_workspace(name="Test Workspace", description="Test workspace description"):
        """Create a test workspace"""
        workspace = Workspace.objects.create(
            name=name,
            description=description
        )
        return workspace
    
    @staticmethod
    def create_test_profile(user, workspace, full_name="Test User"):
        """Create a test profile"""
        profile = Profile.objects.create(
            user=user,
            workspace=workspace,
            full_name=full_name
        )
        return profile
    
    @staticmethod
    def create_test_n8n_instance(workspace, instance_url="https://n8n.example.com", api_key="test-api-key", space=None):
        """Create a test n8n instance"""
        instance = N8nInstance.objects.create(
            workspace=workspace,
            space=space,  # None for master instance (workspace-level)
            instance_url=instance_url,
            api_key=api_key
        )
        return instance
    
    @staticmethod
    def create_test_space(workspace, name="Test Space", space_type="client"):
        """Create a test space"""
        space = Space.objects.create(
            name=name,
            workspace=workspace,
            space_type=space_type
        )
        return space
    
    @staticmethod
    def create_test_automation(workspace, name="Test Automation"):
        """Create a test automation"""
        automation = Automation.objects.create(
            name=name,
            workspace=workspace,
            workflow_json={"nodes": [], "connections": {}}
        )
        return automation
    
    @staticmethod
    def create_test_deployment(automation, space, n8n_workflow_id="1000"):
        """Create a test deployment"""
        deployment = Deployment.objects.create(
            automation=automation,
            space=space,
            n8n_workflow_id=n8n_workflow_id
        )
        return deployment


class MockN8nResponseFactory:
    """Factory class to create mock n8n API responses"""
    
    @staticmethod
    def create_executions_response(executions_data):
        """Create a mock n8n executions API response"""
        return {
            "data": executions_data,
            "nextCursor": None
        }
    
    @staticmethod
    def create_successful_execution(execution_id, started_at, finished=True):
        """Create a mock successful execution"""
        return {
            "id": execution_id,
            "workflowId": "1000",
            "startedAt": started_at,
            "stoppedAt": started_at if finished else None,
            "finished": finished,
            "mode": "cli",
            "data": {
                "resultData": {
                    "error": None  # No error = successful
                }
            }
        }
    
    @staticmethod
    def create_failed_execution(execution_id, started_at, finished=True):
        """Create a mock failed execution"""
        return {
            "id": execution_id,
            "workflowId": "1000",
            "startedAt": started_at,
            "stoppedAt": started_at if finished else None,
            "finished": finished,
            "mode": "cli",
            "data": {
                "resultData": {
                    "error": {
                        "message": "Test error message",
                        "code": "EXECUTION_ERROR"
                    }
                }
            }
        }
    
    @staticmethod
    def create_unfinished_execution(execution_id, started_at):
        """Create a mock unfinished execution"""
        return {
            "id": execution_id,
            "workflowId": "1000",
            "startedAt": started_at,
            "stoppedAt": None,
            "finished": False,
            "mode": "cli",
            "data": {}
        }


class TestHelper:
    """Helper methods for tests"""
    
    @staticmethod
    def get_auth_headers(user):
        """Get authentication headers for a user"""
        token = generate_jwt_token(user)
        return {
            'HTTP_AUTHORIZATION': f'Bearer {token}',
            'CONTENT_TYPE': 'application/json'
        }
    
    @staticmethod
    def format_datetime_for_n8n(dt):
        """Format datetime for n8n API response"""
        return dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    
    @staticmethod
    def create_executions_for_date_range(start_date, end_date, success_count=5, failure_count=2):
        """Create mock executions for a date range"""
        executions = []
        execution_id = 1000
        
        current_date = start_date
        while current_date <= end_date:
            # Add successful executions
            for i in range(success_count):
                started_at = current_date.replace(hour=9 + i, minute=0, second=0, microsecond=0)
                executions.append(
                    MockN8nResponseFactory.create_successful_execution(
                        execution_id, 
                        TestHelper.format_datetime_for_n8n(started_at)
                    )
                )
                execution_id += 1
            
            # Add failed executions
            for i in range(failure_count):
                started_at = current_date.replace(hour=15 + i, minute=0, second=0, microsecond=0)
                executions.append(
                    MockN8nResponseFactory.create_failed_execution(
                        execution_id, 
                        TestHelper.format_datetime_for_n8n(started_at)
                    )
                )
                execution_id += 1
            
            current_date += timedelta(days=1)
        
        return executions
