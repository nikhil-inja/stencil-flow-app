"""
Test cases for AI Token Usage API
"""

import json
from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch, Mock
from rest_framework.test import APITestCase
from api.models import Workspace, Profile, Space, N8nInstance, Automation, Deployment
from api.authentication import generate_jwt_token
from api.serializers import AITokenUsageRequestSerializer, AITokenUsageResponseSerializer


class AITokenUsageAPITests(APITestCase):
    def setUp(self):
        """Set up test data"""
        # Create test user and workspace
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.workspace = Workspace.objects.create(
            name='Test Workspace',
            description='Test workspace for AI token usage'
        )
        
        self.profile = Profile.objects.create(
            user=self.user,
            workspace=self.workspace,
            full_name='Test User'
        )
        
        # Create space
        self.space = Space.objects.create(
            name='Test Space',
            workspace=self.workspace
        )
        
        # Create n8n instance
        self.n8n_instance = N8nInstance.objects.create(
            workspace=self.workspace,
            space=self.space,
            instance_url='https://test-n8n.example.com',
            api_key='test-api-key'
        )
        
        # Create automation
        self.automation = Automation.objects.create(
            name='Test AI Automation',
            workspace=self.workspace,
            description='Test automation with AI nodes',
            workflow_json={'nodes': [], 'connections': {}}  # Required field
        )
        
        # Create deployment
        self.deployment = Deployment.objects.create(
            automation=self.automation,
            space=self.space,
            n8n_workflow_id='fvghFHEBjMlDx4FE'
        )
        
        # Generate JWT token for authentication
        self.token = generate_jwt_token(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_ai_token_usage_request_serializer_valid(self):
        """Test valid request serializer"""
        data = {'workflow_id': 'fvghFHEBjMlDx4FE'}
        serializer = AITokenUsageRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_ai_token_usage_request_serializer_invalid(self):
        """Test invalid request serializer"""
        data = {}  # Missing workflow_id
        serializer = AITokenUsageRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('workflow_id', serializer.errors)

    def test_ai_token_usage_response_serializer_valid(self):
        """Test valid response serializer"""
        data = {
            'workflow_id': 'fvghFHEBjMlDx4FE',
            'total_tokens_used': 15420,
            'total_cost': 0.023,
            'daily_token_usage': [
                {'date': '2025-01-15', 'tokens_used': 2100, 'cost': 0.003},
                {'date': '2025-01-16', 'tokens_used': 1800, 'cost': 0.0027}
            ],
            'period_start': '2025-01-15',
            'period_end': '2025-01-21',
            'ai_nodes_found': ['@n8n/n8n-nodes-langchain.openAi']
        }
        serializer = AITokenUsageResponseSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    @patch('api.views.requests.get')
    def test_get_ai_token_usage_success(self, mock_get):
        """Test successful AI token usage API call"""
        # Mock n8n API response with execution data (no pagination)
        mock_executions_data = {
            'data': [
                {
                    'id': '525',
                    'startedAt': '2025-09-10T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Message a model': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 100,
                                                'completion_tokens': 50,
                                                'total_tokens': 150
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            'nextCursor': None  # No more pages
        }
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = mock_executions_data
        mock_get.return_value = mock_response
        
        # Make API call using Django test client
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'fvghFHEBjMlDx4FE'}),
            content_type='application/json')
        
        # Assertions
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['workflow_id'], 'fvghFHEBjMlDx4FE')
        self.assertEqual(response_data['total_tokens_used'], 150)
        self.assertGreater(response_data['total_cost'], 0)
        self.assertIn('daily_token_usage', response_data)

    def test_get_ai_token_usage_no_deployment(self):
        """Test AI token usage API with non-existent deployment"""
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'nonexistent-workflow'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 404)
        response_data = response.json()
        self.assertIn('error', response_data)

    def test_get_ai_token_usage_no_n8n_instance(self):
        """Test AI token usage API with no n8n instance"""
        # Delete the n8n instance
        self.n8n_instance.delete()
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'fvghFHEBjMlDx4FE'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertIn('error', response_data)

    def test_get_ai_token_usage_unauthenticated(self):
        """Test AI token usage API without authentication"""
        # Clear authentication
        self.client.credentials()
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'fvghFHEBjMlDx4FE'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 403)

    @patch('api.views.requests.get')
    def test_get_ai_token_usage_n8n_api_error(self, mock_get):
        """Test AI token usage API with n8n API error"""
        mock_response = Mock()
        mock_response.ok = False
        mock_response.status_code = 401
        mock_response.json.return_value = {'message': 'Unauthorized'}
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'fvghFHEBjMlDx4FE'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 401)
        response_data = response.json()
        self.assertIn('error', response_data)

    @patch('api.views.requests.get')
    def test_get_ai_token_usage_empty_executions(self, mock_get):
        """Test AI token usage API with empty executions"""
        mock_executions_data = {'data': [], 'nextCursor': None}
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = mock_executions_data
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'fvghFHEBjMlDx4FE'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['total_tokens_used'], 0)
        self.assertEqual(response_data['total_cost'], 0)

    @patch('api.views.requests.get')
    def test_get_ai_token_usage_token_extraction_methods(self, mock_get):
        """Test different token extraction methods"""
        # Test with different token data structures
        mock_executions_data = {
            'data': [
                {
                    'id': '526',
                    'startedAt': '2025-09-10T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'AI Agent': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'tokenUsage': {
                                                'input_tokens': 200,
                                                'output_tokens': 100,
                                                'total_tokens': 300
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            'nextCursor': None
        }
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = mock_executions_data
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'fvghFHEBjMlDx4FE'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['total_tokens_used'], 300)
        self.assertGreater(response_data['total_cost'], 0)

    @patch('api.views.requests.get')
    def test_get_ai_token_usage_pagination(self, mock_get):
        """Test AI token usage API with pagination"""
        # Mock first page response
        first_page_data = {
            'data': [
                {
                    'id': '525',
                    'startedAt': '2025-09-10T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Message a model': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 100,
                                                'completion_tokens': 50,
                                                'total_tokens': 150
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            'nextCursor': 'cursor123'
        }
        
        # Mock second page response
        second_page_data = {
            'data': [
                {
                    'id': '526',
                    'startedAt': '2025-09-10T11:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'AI Agent': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 200,
                                                'completion_tokens': 100,
                                                'total_tokens': 300
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            'nextCursor': None  # No more pages
        }
        
        # Configure mock to return different responses for different calls
        mock_get.side_effect = [
            Mock(ok=True, json=lambda: first_page_data),
            Mock(ok=True, json=lambda: second_page_data)
        ]
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'fvghFHEBjMlDx4FE'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['total_tokens_used'], 450)  # 150 + 300
        self.assertGreater(response_data['total_cost'], 0)
        
        # Verify that requests.get was called twice (for pagination)
        self.assertEqual(mock_get.call_count, 2)
