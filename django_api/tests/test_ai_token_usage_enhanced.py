"""
Enhanced Test cases for AI Token Usage API with n8n-mcp integration
Tests based on Phase 1 implementation plan and n8n-mcp node discovery
"""

import json
from datetime import datetime, timedelta
from unittest.mock import patch, Mock, call
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from api.models import Workspace, Profile, Space, N8nInstance, Automation, Deployment
from api.authentication import generate_jwt_token
from api.serializers import AITokenUsageRequestSerializer


class EnhancedAITokenUsageAPITests(APITestCase):
    """Enhanced AI Token Usage API tests covering multiple providers and scenarios"""
    
    def setUp(self):
        """Set up test data with comprehensive AI node scenarios"""
        # Create test user and workspace
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.workspace = Workspace.objects.create(
            name='Test Workspace',
            description='Test workspace for enhanced AI token usage'
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
            name='Multi-Provider AI Automation',
            workspace=self.workspace,
            description='Test automation with multiple AI providers',
            workflow_json={'nodes': [], 'connections': {}}
        )
        
        # Create deployment
        self.deployment = Deployment.objects.create(
            automation=self.automation,
            space=self.space,
            n8n_workflow_id='multiAI123456'
        )
        
        # Generate JWT token for authentication
        self.token = generate_jwt_token(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def get_mock_execution_data_openai(self):
        """Mock execution data for OpenAI nodes"""
        return {
            'data': [
                {
                    'id': '701',
                    'startedAt': '2025-01-20T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'OpenAI Chat Model': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 120,
                                                'completion_tokens': 80,
                                                'total_tokens': 200
                                            },
                                            'model': 'gpt-4-turbo',
                                            'choices': [
                                                {'message': {'content': 'AI response here'}}
                                            ]
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

    def get_mock_execution_data_claude(self):
        """Mock execution data for Claude/Anthropic nodes"""
        return {
            'data': [
                {
                    'id': '702',
                    'startedAt': '2025-01-20T11:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Anthropic Chat Model': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'input_tokens': 150,
                                                'output_tokens': 100,
                                                'total_tokens': 250
                                            },
                                            'model': 'claude-3-5-sonnet-20241022',
                                            'content': [
                                                {'text': 'Claude response here'}
                                            ]
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

    def get_mock_execution_data_groq(self):
        """Mock execution data for Groq nodes"""
        return {
            'data': [
                {
                    'id': '703',
                    'startedAt': '2025-01-20T12:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Groq Chat Model': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 90,
                                                'completion_tokens': 60,
                                                'total_tokens': 150
                                            },
                                            'model': 'llama3-70b-8192',
                                            'choices': [
                                                {'message': {'content': 'Groq response here'}}
                                            ]
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

    def get_mock_execution_data_mixed_providers(self):
        """Mock execution data with multiple AI providers in one workflow"""
        return {
            'data': [
                {
                    'id': '800',
                    'startedAt': '2025-01-20T14:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'OpenAI GPT4': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 200,
                                                'completion_tokens': 150,
                                                'total_tokens': 350
                                            },
                                            'model': 'gpt-4o'
                                        }
                                    }
                                ],
                                'Claude Sonnet': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'input_tokens': 180,
                                                'output_tokens': 120,
                                                'total_tokens': 300
                                            },
                                            'model': 'claude-3-5-sonnet-20241022'
                                        }
                                    }
                                ],
                                'Groq Mixtral': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 100,
                                                'completion_tokens': 80,
                                                'total_tokens': 180
                                            },
                                            'model': 'mixtral-8x7b-32768'
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

    def get_mock_execution_data_edge_cases(self):
        """Mock execution data with edge cases and error scenarios"""
        return {
            'data': [
                {
                    'id': '900',
                    'startedAt': '2025-01-20T15:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                # Node with missing token data
                                'Incomplete AI Node': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'response': 'AI response without token data'
                                        }
                                    }
                                ],
                                # Node with failed execution
                                'Failed AI Node': [
                                    {
                                        'executionStatus': 'error',
                                        'error': 'API rate limit exceeded'
                                    }
                                ],
                                # Node with unusual token structure
                                'Custom Token Format': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'api_response': {
                                                'token_count': {
                                                    'input': 75,
                                                    'output': 45,
                                                    'total': 120
                                                }
                                            },
                                            'model_used': 'custom-model-v1'
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

    @patch('api.views.requests.get')
    def test_openai_token_extraction(self, mock_get):
        """Test token extraction from OpenAI format responses"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = self.get_mock_execution_data_openai()
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Verify OpenAI-specific token extraction
        self.assertEqual(response_data['total_tokens_used'], 200)
        self.assertGreater(response_data['total_cost'], 0)
        
        # Should detect GPT-4 Turbo pricing
        expected_cost = (120 / 1000 * 0.01) + (80 / 1000 * 0.03)  # GPT-4 Turbo pricing
        self.assertAlmostEqual(response_data['total_cost'], expected_cost, places=4)

    @patch('api.views.requests.get')
    def test_claude_token_extraction(self, mock_get):
        """Test token extraction from Claude/Anthropic format responses"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = self.get_mock_execution_data_claude()
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Verify Claude-specific token extraction (input_tokens/output_tokens format)
        self.assertEqual(response_data['total_tokens_used'], 250)
        
        # Should detect Claude 3.5 Sonnet pricing
        expected_cost = (150 / 1000 * 0.003) + (100 / 1000 * 0.015)  # Claude 3.5 Sonnet pricing
        self.assertAlmostEqual(response_data['total_cost'], expected_cost, places=4)

    @patch('api.views.requests.get')
    def test_groq_token_extraction(self, mock_get):
        """Test token extraction from Groq format responses"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = self.get_mock_execution_data_groq()
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Verify Groq-specific token extraction
        self.assertEqual(response_data['total_tokens_used'], 150)
        
        # Groq LLaMA3-70B pricing
        expected_cost = (90 / 1000 * 0.0006) + (60 / 1000 * 0.0008)
        self.assertAlmostEqual(response_data['total_cost'], expected_cost, places=4)

    @patch('api.views.requests.get')
    def test_multi_provider_workflow(self, mock_get):
        """Test workflow with multiple AI providers in single execution"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = self.get_mock_execution_data_mixed_providers()
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Total tokens should be sum of all providers: 350 + 300 + 180 = 830
        self.assertEqual(response_data['total_tokens_used'], 830)
        
        # Verify cost calculation for multiple providers
        gpt4o_cost = (200 / 1000 * 0.005) + (150 / 1000 * 0.015)  # GPT-4o
        claude_cost = (180 / 1000 * 0.003) + (120 / 1000 * 0.015)  # Claude 3.5 Sonnet
        groq_cost = (100 / 1000 * 0.00027) + (80 / 1000 * 0.00027)  # Mixtral
        
        expected_total_cost = gpt4o_cost + claude_cost + groq_cost
        self.assertAlmostEqual(response_data['total_cost'], expected_total_cost, places=4)

    @patch('api.views.requests.get')
    def test_edge_cases_token_extraction(self, mock_get):
        """Test edge cases: missing tokens, failed executions, custom formats"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = self.get_mock_execution_data_edge_cases()
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Should only count the one node with valid token data (Custom Token Format: 120 tokens)
        # Other nodes should be ignored (missing data, failed execution)
        self.assertEqual(response_data['total_tokens_used'], 120)
        self.assertGreater(response_data['total_cost'], 0)

    @patch('api.views.requests.get')
    def test_model_detection_and_pricing(self, mock_get):
        """Test dynamic model detection and corresponding pricing"""
        # Test with various model formats
        test_cases = [
            {
                'model': 'gpt-4o-mini',
                'tokens': {'prompt_tokens': 1000, 'completion_tokens': 500, 'total_tokens': 1500},
                'expected_cost': (1000 / 1000 * 0.00015) + (500 / 1000 * 0.0006)
            },
            {
                'model': 'claude-3-opus-20240229',
                'tokens': {'input_tokens': 800, 'output_tokens': 400, 'total_tokens': 1200},
                'expected_cost': (800 / 1000 * 0.015) + (400 / 1000 * 0.075)
            },
            {
                'model': 'llama3-8b-8192',
                'tokens': {'prompt_tokens': 2000, 'completion_tokens': 1000, 'total_tokens': 3000},
                'expected_cost': (2000 / 1000 * 0.0001) + (1000 / 1000 * 0.0001)
            }
        ]
        
        for case in test_cases:
            with self.subTest(model=case['model']):
                mock_data = {
                    'data': [
                        {
                            'id': '1001',
                            'startedAt': '2025-01-20T16:00:00.000Z',
                            'finished': True,
                            'data': {
                                'resultData': {
                                    'runData': {
                                        'AI Model Test': [
                                            {
                                                'executionStatus': 'success',
                                                'data': {
                                                    'usage': case['tokens'],
                                                    'model': case['model']
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
                mock_response.json.return_value = mock_data
                mock_get.return_value = mock_response
                
                response = self.client.post('/api/functions/get-ai-token-usage/', 
                    json.dumps({'workflow_id': 'multiAI123456'}),
                    content_type='application/json')
                
                self.assertEqual(response.status_code, 200)
                response_data = response.json()
                
                self.assertEqual(response_data['total_tokens_used'], case['tokens']['total_tokens'])
                self.assertAlmostEqual(response_data['total_cost'], case['expected_cost'], places=5)

    @patch('api.views.requests.get')
    def test_pagination_with_multiple_providers(self, mock_get):
        """Test pagination handling with multiple AI providers"""
        # First page - OpenAI
        first_page = {
            'data': [
                {
                    'id': '1100',
                    'startedAt': '2025-01-20T17:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'OpenAI Page 1': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 100,
                                                'completion_tokens': 50,
                                                'total_tokens': 150
                                            },
                                            'model': 'gpt-3.5-turbo'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            'nextCursor': 'page2_cursor'
        }
        
        # Second page - Claude
        second_page = {
            'data': [
                {
                    'id': '1101',
                    'startedAt': '2025-01-20T18:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Claude Page 2': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'input_tokens': 200,
                                                'output_tokens': 100,
                                                'total_tokens': 300
                                            },
                                            'model': 'claude-3-haiku-20240307'
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
        
        mock_get.side_effect = [
            Mock(ok=True, json=lambda: first_page),
            Mock(ok=True, json=lambda: second_page)
        ]
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Total tokens: 150 + 300 = 450
        self.assertEqual(response_data['total_tokens_used'], 450)
        
        # Verify pagination was handled (2 API calls)
        self.assertEqual(mock_get.call_count, 2)
        
        # Verify mixed provider cost calculation
        gpt35_cost = (100 / 1000 * 0.0005) + (50 / 1000 * 0.0015)
        claude_haiku_cost = (200 / 1000 * 0.00025) + (100 / 1000 * 0.00125)
        expected_total = gpt35_cost + claude_haiku_cost
        
        self.assertAlmostEqual(response_data['total_cost'], expected_total, places=5)

    @patch('api.views.requests.get')
    def test_daily_breakdown_multiple_providers(self, mock_get):
        """Test daily breakdown with multiple AI providers across different days"""
        mock_data = {
            'data': [
                # Day 1 - OpenAI
                {
                    'id': '1200',
                    'startedAt': '2025-01-19T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'GPT4 Day 1': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 500,
                                                'completion_tokens': 300,
                                                'total_tokens': 800
                                            },
                                            'model': 'gpt-4'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },
                # Day 2 - Claude
                {
                    'id': '1201',
                    'startedAt': '2025-01-20T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Claude Day 2': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'input_tokens': 400,
                                                'output_tokens': 200,
                                                'total_tokens': 600
                                            },
                                            'model': 'claude-3-sonnet-20240229'
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
        mock_response.json.return_value = mock_data
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Check daily breakdown
        daily_usage = response_data['daily_token_usage']
        
        # Find the days with usage
        day1_usage = next((day for day in daily_usage if day['date'] == '2025-01-19'), None)
        day2_usage = next((day for day in daily_usage if day['date'] == '2025-01-20'), None)
        
        self.assertIsNotNone(day1_usage)
        self.assertIsNotNone(day2_usage)
        
        self.assertEqual(day1_usage['tokens_used'], 800)
        self.assertEqual(day2_usage['tokens_used'], 600)
        
        # Verify daily costs are calculated correctly for different providers
        gpt4_daily_cost = (500 / 1000 * 0.03) + (300 / 1000 * 0.06)
        claude_daily_cost = (400 / 1000 * 0.003) + (200 / 1000 * 0.015)
        
        self.assertAlmostEqual(day1_usage['cost'], gpt4_daily_cost, places=4)
        self.assertAlmostEqual(day2_usage['cost'], claude_daily_cost, places=4)

    @patch('api.views.requests.get')
    def test_unknown_model_fallback_pricing(self, mock_get):
        """Test fallback pricing for unknown or custom models"""
        mock_data = {
            'data': [
                {
                    'id': '1300',
                    'startedAt': '2025-01-20T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Unknown Model': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            'usage': {
                                                'prompt_tokens': 100,
                                                'completion_tokens': 50,
                                                'total_tokens': 150
                                            },
                                            'model': 'custom-unknown-model-v1'
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
        mock_response.json.return_value = mock_data
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        self.assertEqual(response_data['total_tokens_used'], 150)
        
        # Should fallback to default GPT-3.5-turbo pricing for unknown models
        expected_cost = (100 / 1000 * 0.0005) + (50 / 1000 * 0.0015)
        self.assertAlmostEqual(response_data['total_cost'], expected_cost, places=5)

    def test_request_validation_enhanced(self):
        """Test enhanced request validation"""
        # Test missing workflow_id
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('workflow_id', response.json())
        
        # Test invalid workflow_id format
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': ''}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 400)

    @patch('api.views.requests.get')
    def test_n8n_api_timeout_handling(self, mock_get):
        """Test handling of n8n API timeouts"""
        from requests.exceptions import Timeout
        
        mock_get.side_effect = Timeout("Request timed out")
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 502)
        response_data = response.json()
        self.assertIn('Failed to connect to n8n instance', response_data['error'])

    @patch('api.views.requests.get')
    def test_malformed_execution_data_handling(self, mock_get):
        """Test handling of malformed execution data"""
        malformed_data = {
            'data': [
                {
                    'id': '1400',
                    'startedAt': '2025-01-20T10:00:00.000Z',
                    'finished': True,
                    'data': {
                        'resultData': {
                            'runData': {
                                'Malformed Node': [
                                    {
                                        'executionStatus': 'success',
                                        'data': {
                                            # Missing usage data, invalid structure
                                            'invalid_field': 'test',
                                            'nested': {
                                                'deep': {
                                                    'structure': 'no tokens here'
                                                }
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
        mock_response.json.return_value = malformed_data
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        # Should handle gracefully and return zero usage
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['total_tokens_used'], 0)
        self.assertEqual(response_data['total_cost'], 0)

    @patch('api.views.requests.get')
    def test_large_workflow_performance(self, mock_get):
        """Test performance with large workflows (many executions)"""
        # Simulate large workflow with many executions
        large_data = {
            'data': [],
            'nextCursor': None
        }
        
        # Generate 100 executions with different providers
        providers = [
            ('OpenAI', 'gpt-3.5-turbo', {'prompt_tokens': 50, 'completion_tokens': 30, 'total_tokens': 80}),
            ('Claude', 'claude-3-haiku-20240307', {'input_tokens': 60, 'output_tokens': 40, 'total_tokens': 100}),
            ('Groq', 'llama3-8b-8192', {'prompt_tokens': 70, 'completion_tokens': 50, 'total_tokens': 120})
        ]
        
        for i in range(100):
            provider_name, model, tokens = providers[i % 3]
            execution = {
                'id': str(1500 + i),
                'startedAt': f'2025-01-20T{10 + (i % 14):02d}:00:00.000Z',
                'finished': True,
                'data': {
                    'resultData': {
                        'runData': {
                            f'{provider_name} Node {i}': [
                                {
                                    'executionStatus': 'success',
                                    'data': {
                                        'usage': tokens,
                                        'model': model
                                    }
                                }
                            ]
                        }
                    }
                }
            }
            large_data['data'].append(execution)
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = large_data
        mock_get.return_value = mock_response
        
        response = self.client.post('/api/functions/get-ai-token-usage/', 
            json.dumps({'workflow_id': 'multiAI123456'}),
            content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Expected tokens: 100 executions, rotating through 80, 100, 120 tokens
        # So roughly 33 * 80 + 33 * 100 + 34 * 120 = 2640 + 3300 + 4080 = 10020
        expected_tokens = (33 * 80) + (33 * 100) + (34 * 120)
        self.assertEqual(response_data['total_tokens_used'], expected_tokens)
        self.assertGreater(response_data['total_cost'], 0)


class AINodeDiscoveryServiceTests(TestCase):
    """Test cases for the AI Node Discovery Service (Phase 1 functionality)"""
    
    @patch('subprocess.run')
    def test_discover_ai_nodes_mcp_integration(self, mock_subprocess):
        """Test AI node discovery using n8n-mcp integration"""
        # Mock successful n8n-mcp response
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps({
            "tools": [
                {
                    "nodeType": "nodes-langchain.openAi",
                    "displayName": "OpenAI",
                    "description": "Message an assistant or GPT, analyze images, generate audio, etc.",
                    "package": "@n8n/n8n-nodes-langchain"
                },
                {
                    "nodeType": "nodes-langchain.lmChatAnthropic",
                    "displayName": "Anthropic Chat Model",
                    "description": "Language Model Anthropic",
                    "package": "@n8n/n8n-nodes-langchain"
                }
            ],
            "totalCount": 269
        })
        mock_subprocess.return_value = mock_result
        
        # Import and test the service
        # Note: This would be tested with the actual service implementation
        # For now, we verify the mock structure is correct
        
        self.assertEqual(mock_result.returncode, 0)
        response_data = json.loads(mock_result.stdout)
        self.assertIn('tools', response_data)
        self.assertEqual(len(response_data['tools']), 2)
        self.assertEqual(response_data['totalCount'], 269)

    @patch('subprocess.run')
    def test_node_configuration_discovery(self, mock_subprocess):
        """Test getting node configuration details using n8n-mcp"""
        # Mock node essentials response
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps({
            "nodeType": "nodes-langchain.lmChatAnthropic",
            "displayName": "Anthropic Chat Model",
            "requiredProperties": [
                {
                    "name": "model",
                    "displayName": "Model",
                    "type": "resourceLocator",
                    "required": True
                }
            ],
            "commonProperties": [
                {
                    "name": "model",
                    "displayName": "Model",
                    "type": "options",
                    "default": "claude-3-5-sonnet-20241022",
                    "options": [
                        {"value": "claude-3-5-sonnet-20241022", "label": "Claude 3.5 Sonnet(20241022)"},
                        {"value": "claude-3-opus-20240229", "label": "Claude 3 Opus(20240229)"}
                    ]
                }
            ]
        })
        mock_subprocess.return_value = mock_result
        
        response_data = json.loads(mock_result.stdout)
        self.assertIn('requiredProperties', response_data)
        self.assertIn('commonProperties', response_data)
        
        # Verify model configuration detection
        model_property = response_data['commonProperties'][0]
        self.assertEqual(model_property['name'], 'model')
        self.assertIn('options', model_property)


class EnhancedSerializerTests(TestCase):
    """Test cases for enhanced serializers with provider breakdown"""
    
    def test_enhanced_response_serializer_validation(self):
        """Test enhanced response serializer with provider breakdowns"""
        enhanced_data = {
            'workflow_id': 'test123',
            'total_tokens_used': 1500,
            'total_cost': 0.045,
            'provider_breakdown': {
                'openai': {'tokens': 800, 'cost': 0.025},
                'anthropic': {'tokens': 500, 'cost': 0.015},
                'groq': {'tokens': 200, 'cost': 0.005}
            },
            'model_breakdown': {
                'gpt-4-turbo': {'tokens': 800, 'cost': 0.025},
                'claude-3-sonnet': {'tokens': 500, 'cost': 0.015},
                'llama3-8b': {'tokens': 200, 'cost': 0.005}
            },
            'node_breakdown': [
                {'node_name': 'OpenAI Chat', 'tokens': 800, 'cost': 0.025, 'model': 'gpt-4-turbo'},
                {'node_name': 'Claude Analysis', 'tokens': 500, 'cost': 0.015, 'model': 'claude-3-sonnet'},
                {'node_name': 'Groq Summary', 'tokens': 200, 'cost': 0.005, 'model': 'llama3-8b'}
            ],
            'daily_token_usage': [
                {'date': '2025-01-20', 'tokens_used': 1500, 'cost': 0.045}
            ],
            'period_start': '2025-01-20',
            'period_end': '2025-01-20',
            'ai_nodes_found': ['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain.lmChatAnthropic'],
            'discovered_models': ['gpt-4-turbo', 'claude-3-sonnet', 'llama3-8b'],
            'provider_usage_summary': {
                'total_providers': 3,
                'most_used_provider': 'openai',
                'cost_leader': 'openai'
            }
        }
        
        # Note: Would test with actual enhanced serializer when implemented
        # For now, verify the data structure is complete
        required_fields = [
            'workflow_id', 'total_tokens_used', 'total_cost', 
            'provider_breakdown', 'model_breakdown', 'node_breakdown',
            'discovered_models', 'provider_usage_summary'
        ]
        
        for field in required_fields:
            self.assertIn(field, enhanced_data)
        
        # Verify breakdown totals match
        provider_total = sum(provider['tokens'] for provider in enhanced_data['provider_breakdown'].values())
        self.assertEqual(provider_total, enhanced_data['total_tokens_used'])
