"""
Configuration and utilities for Mermaid chart generation tests
"""

import os
import sys
from unittest.mock import patch, Mock

# Add Django project to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from django.test import TestCase
    from django.contrib.auth.models import User
    from rest_framework.test import APITestCase, APIClient
    from rest_framework import status
    from django.utils import timezone
    from django.urls import reverse
    
    # Import models
    from api.models import (
        Workspace, Profile, Space, N8nInstance, 
        Automation, Deployment, Invitation, GitHubToken
    )
    
    # Import authentication
    from api.authentication import generate_jwt_token
    
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    sys.exit(1)


class MermaidTestMixin:
    """Mixin class providing common test utilities for Mermaid chart tests"""
    
    def create_test_user(self, username='testuser', email='test@example.com'):
        """Create a test user"""
        return User.objects.create_user(
            username=username,
            email=email,
            password='testpass123'
        )
    
    def create_test_workspace(self, name='Test Workspace'):
        """Create a test workspace"""
        return Workspace.objects.create(
            name=name,
            description=f'{name} for unit tests'
        )
    
    def create_test_profile(self, user, workspace):
        """Create a test profile"""
        return Profile.objects.create(
            user=user,
            workspace=workspace,
            full_name=f'{user.first_name} {user.last_name}' or user.username,
            avatar_url=f'https://example.com/avatar-{user.id}.jpg'
        )
    
    def create_test_space(self, workspace, name='Test Space'):
        """Create a test space"""
        return Space.objects.create(
            name=name,
            description=f'{name} for unit tests',
            workspace=workspace
        )
    
    def create_test_n8n_instance(self, workspace, space=None, url='https://n8n.example.com'):
        """Create a test n8n instance"""
        return N8nInstance.objects.create(
            workspace=workspace,
            space=space,
            instance_url=url,
            api_key='test-api-key-123'
        )
    
    def create_test_automation(self, workspace, name='Test Automation'):
        """Create a test automation"""
        return Automation.objects.create(
            name=name,
            description=f'{name} for unit tests',
            workspace=workspace,
            git_repository='https://github.com/test/repo',
            workflow_path='workflows/test-automation',
            workflow_json={'nodes': [], 'connections': {}}
        )
    
    def create_test_deployment(self, automation, space, workflow_id='test-workflow-123'):
        """Create a test deployment"""
        return Deployment.objects.create(
            automation=automation,
            space=space,
            n8n_workflow_id=workflow_id,
            is_active=True
        )
    
    def setup_complete_test_environment(self):
        """Set up a complete test environment with all required objects"""
        # Create user
        self.user = self.create_test_user()
        
        # Create workspace
        self.workspace = self.create_test_workspace()
        
        # Create profile
        self.profile = self.create_test_profile(self.user, self.workspace)
        
        # Create space
        self.space = self.create_test_space(self.workspace)
        
        # Create n8n instance
        self.n8n_instance = self.create_test_n8n_instance(self.workspace, self.space)
        
        # Create automation
        self.automation = self.create_test_automation(self.workspace)
        
        # Create deployment
        self.deployment = self.create_test_deployment(self.automation, self.space)
        
        # Generate JWT token
        self.token = generate_jwt_token(self.user)
        
        # Set up API client
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def mock_n8n_workflow_response(self, workflow_id='test-workflow-123', workflow_name='Test Workflow'):
        """Create a mock n8n workflow response"""
        return {
            'id': workflow_id,
            'name': workflow_name,
            'nodes': [
                {'id': 'start', 'name': 'Start', 'type': 'n8n-nodes-base.start'},
                {'id': 'webhook', 'name': 'Webhook', 'type': 'n8n-nodes-base.webhook'},
                {'id': 'end', 'name': 'End', 'type': 'n8n-nodes-base.stop'}
            ],
            'connections': {
                'start': [{'node': 'webhook'}],
                'webhook': [{'node': 'end'}]
            }
        }
    
    def mock_n8n_api_success(self, workflow_data):
        """Mock successful n8n API response"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.status_code = 200
        mock_response.json.return_value = workflow_data
        mock_response.text = str(workflow_data)
        return mock_response
    
    def mock_n8n_api_error(self, status_code=404, error_text='Workflow not found'):
        """Mock n8n API error response"""
        mock_response = Mock()
        mock_response.ok = False
        mock_response.status_code = status_code
        mock_response.text = error_text
        return mock_response
    
    def mock_n8n_api_connection_error(self):
        """Mock n8n API connection error"""
        mock_response = Mock()
        mock_response.side_effect = Exception("Connection failed")
        return mock_response
    
    def assert_valid_mermaid_response(self, response_data):
        """Assert that response data contains valid Mermaid chart fields"""
        required_fields = [
            'workflow_id', 'mermaid_diagram', 'workflow_name',
            'node_count', 'connection_count', 'last_updated', 'generation_method'
        ]
        
        for field in required_fields:
            self.assertIn(field, response_data, f"Missing required field: {field}")
        
        # Validate Mermaid diagram structure
        mermaid_diagram = response_data['mermaid_diagram']
        self.assertIn('graph TD', mermaid_diagram, "Mermaid diagram should start with 'graph TD'")
        
        # Validate counts are non-negative integers
        self.assertIsInstance(response_data['node_count'], int)
        self.assertIsInstance(response_data['connection_count'], int)
        self.assertGreaterEqual(response_data['node_count'], 0)
        self.assertGreaterEqual(response_data['connection_count'], 0)
        
        # Validate generation method
        valid_methods = ['llm_analysis', 'template']
        self.assertIn(response_data['generation_method'], valid_methods)


class MermaidChartTestCase(APITestCase, MermaidTestMixin):
    """Base test case for Mermaid chart tests with common setup"""
    
    def setUp(self):
        """Set up test environment"""
        self.setup_complete_test_environment()


class MermaidChartPerformanceTestCase(TestCase, MermaidTestMixin):
    """Test case for performance-related Mermaid chart tests"""
    
    def setUp(self):
        """Set up test environment"""
        self.setup_complete_test_environment()


# Test data fixtures
SAMPLE_WORKFLOWS = {
    'simple': {
        'id': 'simple-workflow',
        'name': 'Simple Workflow',
        'nodes': [
            {'id': 'start', 'name': 'Start', 'type': 'n8n-nodes-base.start'},
            {'id': 'end', 'name': 'End', 'type': 'n8n-nodes-base.stop'}
        ],
        'connections': {
            'start': [{'node': 'end'}]
        }
    },
    'complex': {
        'id': 'complex-workflow',
        'name': 'Complex Workflow',
        'nodes': [
            {'id': 'webhook', 'name': 'Webhook Trigger', 'type': 'n8n-nodes-base.webhook'},
            {'id': 'parse', 'name': 'Parse JSON', 'type': 'n8n-nodes-base.function'},
            {'id': 'validate', 'name': 'Validate Data', 'type': 'n8n-nodes-base.if'},
            {'id': 'process', 'name': 'Process Data', 'type': 'n8n-nodes-base.function'},
            {'id': 'email', 'name': 'Send Email', 'type': 'n8n-nodes-base.email'},
            {'id': 'error', 'name': 'Error Handler', 'type': 'n8n-nodes-base.function'},
            {'id': 'end', 'name': 'End', 'type': 'n8n-nodes-base.stop'}
        ],
        'connections': {
            'webhook': [{'node': 'parse'}],
            'parse': [{'node': 'validate'}],
            'validate': [{'node': 'process'}, {'node': 'error'}],
            'process': [{'node': 'email'}],
            'email': [{'node': 'end'}],
            'error': [{'node': 'end'}]
        }
    },
    'with_icons': {
        'id': 'icon-workflow',
        'name': 'Workflow with Icons',
        'nodes': [
            {'id': 'webhook', 'name': 'Webhook', 'type': 'n8n-nodes-base.webhook'},
            {'id': 'condition', 'name': 'Check Data', 'type': 'n8n-nodes-base.if'},
            {'id': 'process', 'name': 'Process', 'type': 'n8n-nodes-base.function'},
            {'id': 'end', 'name': 'End', 'type': 'n8n-nodes-base.stop'}
        ],
        'connections': {
            'webhook': [{'node': 'condition'}],
            'condition': [{'node': 'process'}],
            'process': [{'node': 'end'}]
        }
    }
}

SAMPLE_MERMAID_DIAGRAMS = {
    'simple': """graph TD
    A["Start"] --> B["End"]""",
    
    'complex': """graph TD
    A["Webhook Trigger"] --> B["Parse JSON"]
    B --> C{"Validate Data"}
    C -->|Valid| D["Process Data"]
    C -->|Invalid| E["Error Handler"]
    D --> F["Send Email"]
    F --> G["End"]
    E --> G""",
    
    'with_icons': """graph TD
    A["🚀 Webhook"] --> B{"❓ Check Data"}
    B --> C["⚙️ Process"]
    C --> D["🏁 End"]"""
}

# Error scenarios for testing
ERROR_SCENARIOS = {
    'workflow_not_found': {
        'status_code': 404,
        'error_text': 'Workflow not found',
        'expected_status': status.HTTP_404_NOT_FOUND
    },
    'unauthorized': {
        'status_code': 401,
        'error_text': 'Unauthorized',
        'expected_status': status.HTTP_401_UNAUTHORIZED
    },
    'connection_error': {
        'exception': Exception("Connection failed"),
        'expected_status': status.HTTP_502_BAD_GATEWAY
    },
    'invalid_json': {
        'response_text': 'invalid json response',
        'expected_status': status.HTTP_502_BAD_GATEWAY
    },
    'empty_response': {
        'response_text': '',
        'expected_status': status.HTTP_502_BAD_GATEWAY
    }
}
