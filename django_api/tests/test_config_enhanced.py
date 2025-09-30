"""
Enhanced test configuration for AI Token Usage API tests
Supports n8n-mcp integration testing and multi-provider scenarios
"""

import os
from django.test import TestCase
from unittest.mock import patch


class EnhancedTestConfig:
    """Configuration for enhanced AI token usage tests"""
    
    # Test AI node types based on n8n-mcp discovery
    TEST_AI_NODE_TYPES = {
        'openai': {
            'node_types': [
                '@n8n/n8n-nodes-langchain.openAi',
                '@n8n/n8n-nodes-langchain.lmChatOpenAi',
                '@n8n/n8n-nodes-langchain.lmOpenAi',
                'n8n-nodes-base.openAi'
            ],
            'models': [
                'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'
            ],
            'token_format': 'usage',
            'pricing': {
                'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015},
                'gpt-4': {'input': 0.03, 'output': 0.06},
                'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
                'gpt-4o': {'input': 0.005, 'output': 0.015},
                'gpt-4o-mini': {'input': 0.00015, 'output': 0.0006}
            }
        },
        'anthropic': {
            'node_types': [
                '@n8n/n8n-nodes-langchain.anthropic',
                '@n8n/n8n-nodes-langchain.lmChatAnthropic'
            ],
            'models': [
                'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229',
                'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
                'claude-3-5-haiku-20241022'
            ],
            'token_format': 'input_tokens/output_tokens',
            'pricing': {
                'claude-3-5-sonnet-20241022': {'input': 0.003, 'output': 0.015},
                'claude-3-opus-20240229': {'input': 0.015, 'output': 0.075},
                'claude-3-sonnet-20240229': {'input': 0.003, 'output': 0.015},
                'claude-3-haiku-20240307': {'input': 0.00025, 'output': 0.00125},
                'claude-3-5-haiku-20241022': {'input': 0.001, 'output': 0.005}
            }
        },
        'groq': {
            'node_types': [
                '@n8n/n8n-nodes-langchain.lmChatGroq'
            ],
            'models': [
                'llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768',
                'gemma-7b-it', 'gemma2-9b-it'
            ],
            'token_format': 'usage',
            'pricing': {
                'llama3-8b-8192': {'input': 0.0001, 'output': 0.0001},
                'llama3-70b-8192': {'input': 0.0006, 'output': 0.0008},
                'mixtral-8x7b-32768': {'input': 0.00027, 'output': 0.00027},
                'gemma-7b-it': {'input': 0.0001, 'output': 0.0001},
                'gemma2-9b-it': {'input': 0.0002, 'output': 0.0002}
            }
        },
        'google': {
            'node_types': [
                '@n8n/n8n-nodes-langchain.googleGemini',
                '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
                '@n8n/n8n-nodes-langchain.lmChatGoogleVertex'
            ],
            'models': [
                'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'
            ],
            'token_format': 'usage',
            'pricing': {
                'gemini-pro': {'input': 0.00025, 'output': 0.0005},
                'gemini-1.5-pro': {'input': 0.00125, 'output': 0.005},
                'gemini-1.5-flash': {'input': 0.000075, 'output': 0.0003}
            }
        },
        'mistral': {
            'node_types': [
                'n8n-nodes-base.mistralAi',
                '@n8n/n8n-nodes-langchain.lmChatMistralCloud'
            ],
            'models': [
                'mistral-small', 'mistral-medium', 'mistral-large'
            ],
            'token_format': 'usage',
            'pricing': {
                'mistral-small': {'input': 0.0006, 'output': 0.0018},
                'mistral-medium': {'input': 0.00275, 'output': 0.0081},
                'mistral-large': {'input': 0.004, 'output': 0.012}
            }
        },
        'cohere': {
            'node_types': [
                '@n8n/n8n-nodes-langchain.lmChatCohere',
                '@n8n/n8n-nodes-langchain.lmCohere'
            ],
            'models': [
                'command', 'command-light', 'command-nightly'
            ],
            'token_format': 'usage',
            'pricing': {
                'command': {'input': 0.001, 'output': 0.002},
                'command-light': {'input': 0.0003, 'output': 0.0006},
                'command-nightly': {'input': 0.001, 'output': 0.002}
            }
        }
    }
    
    # Mock n8n-mcp responses for testing
    MOCK_MCP_RESPONSES = {
        'list_ai_tools': {
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
                },
                {
                    "nodeType": "nodes-langchain.lmChatGroq",
                    "displayName": "Groq Chat Model",
                    "description": "Language Model Groq",
                    "package": "@n8n/n8n-nodes-langchain"
                }
            ],
            "totalCount": 269,
            "requirements": {
                "environmentVariable": "N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true",
                "nodeProperty": "usableAsTool: true"
            }
        },
        'search_nodes_langchain': {
            "query": "langchain AI LLM chat",
            "results": [
                {
                    "nodeType": "nodes-langchain.agent",
                    "workflowNodeType": "@n8n/n8n-nodes-langchain.agent",
                    "displayName": "AI Agent",
                    "description": "Generates an action plan and executes it. Can use external tools.",
                    "category": "transform",
                    "package": "@n8n/n8n-nodes-langchain"
                },
                {
                    "nodeType": "nodes-langchain.chainLlm",
                    "workflowNodeType": "@n8n/n8n-nodes-langchain.chainLlm",
                    "displayName": "Basic LLM Chain",
                    "description": "A simple chain to prompt a large language model",
                    "category": "transform",
                    "package": "@n8n/n8n-nodes-langchain"
                }
            ],
            "totalCount": 20
        }
    }
    
    # Test execution data templates for different providers
    EXECUTION_TEMPLATES = {
        'openai_success': {
            'executionStatus': 'success',
            'data': {
                'usage': {
                    'prompt_tokens': 100,
                    'completion_tokens': 50,
                    'total_tokens': 150
                },
                'model': 'gpt-4-turbo',
                'choices': [
                    {'message': {'content': 'AI response here'}}
                ]
            }
        },
        'anthropic_success': {
            'executionStatus': 'success',
            'data': {
                'usage': {
                    'input_tokens': 120,
                    'output_tokens': 80,
                    'total_tokens': 200
                },
                'model': 'claude-3-5-sonnet-20241022',
                'content': [
                    {'text': 'Claude response here'}
                ]
            }
        },
        'groq_success': {
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
        },
        'failed_execution': {
            'executionStatus': 'error',
            'error': 'API rate limit exceeded'
        },
        'missing_tokens': {
            'executionStatus': 'success',
            'data': {
                'response': 'AI response without token data',
                'model': 'unknown-model'
            }
        },
        'custom_format': {
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
    }
    
    @classmethod
    def get_mock_execution_data(cls, provider, template_type='success', node_name=None):
        """Generate mock execution data for testing"""
        if node_name is None:
            node_name = f"{provider.title()} Node"
        
        template_key = f"{provider}_{template_type}"
        if template_key not in cls.EXECUTION_TEMPLATES:
            template_key = 'openai_success'  # fallback
        
        execution_template = cls.EXECUTION_TEMPLATES[template_key].copy()
        
        return {
            'id': '12345',
            'startedAt': '2025-01-20T10:00:00.000Z',
            'finished': True,
            'data': {
                'resultData': {
                    'runData': {
                        node_name: [execution_template]
                    }
                }
            }
        }
    
    @classmethod
    def get_mock_n8n_response(cls, executions_list, has_next_page=False):
        """Generate mock n8n API response"""
        return {
            'data': executions_list,
            'nextCursor': 'next_page_cursor' if has_next_page else None
        }
    
    @classmethod
    def calculate_expected_cost(cls, provider, model, prompt_tokens, completion_tokens):
        """Calculate expected cost for testing validation"""
        if provider not in cls.TEST_AI_NODE_TYPES:
            # Default to OpenAI GPT-3.5-turbo pricing
            return (prompt_tokens / 1000 * 0.0005) + (completion_tokens / 1000 * 0.0015)
        
        pricing = cls.TEST_AI_NODE_TYPES[provider]['pricing']
        if model not in pricing:
            # Use first available model pricing as fallback
            model = list(pricing.keys())[0]
        
        model_pricing = pricing[model]
        return (prompt_tokens / 1000 * model_pricing['input']) + (completion_tokens / 1000 * model_pricing['output'])


class MockN8nMCPService:
    """Mock service to simulate n8n-mcp functionality for testing"""
    
    @staticmethod
    def mock_list_ai_tools():
        """Mock list_ai_tools n8n-mcp command"""
        return EnhancedTestConfig.MOCK_MCP_RESPONSES['list_ai_tools']
    
    @staticmethod
    def mock_search_nodes(query):
        """Mock search_nodes n8n-mcp command"""
        if 'langchain' in query.lower():
            return EnhancedTestConfig.MOCK_MCP_RESPONSES['search_nodes_langchain']
        return {"results": [], "totalCount": 0}
    
    @staticmethod
    def mock_get_node_essentials(node_type):
        """Mock get_node_essentials n8n-mcp command"""
        # Return different mock data based on node type
        if 'openai' in node_type.lower():
            return {
                "nodeType": node_type,
                "displayName": "OpenAI",
                "requiredProperties": [
                    {
                        "name": "modelId",
                        "displayName": "Model",
                        "type": "resourceLocator",
                        "required": True
                    }
                ],
                "commonProperties": [
                    {
                        "name": "model",
                        "displayName": "Model",
                        "default": "gpt-4-turbo",
                        "options": [
                            {"value": "gpt-3.5-turbo", "label": "GPT-3.5 Turbo"},
                            {"value": "gpt-4", "label": "GPT-4"},
                            {"value": "gpt-4-turbo", "label": "GPT-4 Turbo"}
                        ]
                    }
                ]
            }
        elif 'anthropic' in node_type.lower():
            return {
                "nodeType": node_type,
                "displayName": "Anthropic Chat Model",
                "commonProperties": [
                    {
                        "name": "model",
                        "displayName": "Model",
                        "default": "claude-3-5-sonnet-20241022",
                        "options": [
                            {"value": "claude-3-5-sonnet-20241022", "label": "Claude 3.5 Sonnet"},
                            {"value": "claude-3-opus-20240229", "label": "Claude 3 Opus"}
                        ]
                    }
                ]
            }
        else:
            return {
                "nodeType": node_type,
                "displayName": "Unknown Node",
                "commonProperties": []
            }


class TestDataFactory:
    """Factory for creating test data for enhanced AI usage tests"""
    
    @staticmethod
    def create_multi_provider_execution(providers=['openai', 'anthropic', 'groq']):
        """Create execution data with multiple AI providers"""
        executions = []
        
        for i, provider in enumerate(providers):
            execution = EnhancedTestConfig.get_mock_execution_data(
                provider, 'success', f"{provider.title()} Node {i+1}"
            )
            execution['id'] = str(1000 + i)
            executions.append(execution)
        
        return EnhancedTestConfig.get_mock_n8n_response(executions)
    
    @staticmethod
    def create_daily_breakdown_execution(days=7):
        """Create execution data spread across multiple days"""
        from datetime import datetime, timedelta
        
        executions = []
        base_date = datetime(2025, 1, 20)
        
        for i in range(days):
            date = base_date - timedelta(days=i)
            execution = EnhancedTestConfig.get_mock_execution_data('openai', 'success')
            execution['id'] = str(2000 + i)
            execution['startedAt'] = date.strftime('%Y-%m-%dT10:00:00.000Z')
            executions.append(execution)
        
        return EnhancedTestConfig.get_mock_n8n_response(executions)
    
    @staticmethod
    def create_edge_case_execution():
        """Create execution data with edge cases"""
        executions = [
            EnhancedTestConfig.get_mock_execution_data('openai', 'failed_execution', 'Failed Node'),
            EnhancedTestConfig.get_mock_execution_data('anthropic', 'missing_tokens', 'Incomplete Node'),
            EnhancedTestConfig.get_mock_execution_data('groq', 'custom_format', 'Custom Node')
        ]
        
        for i, execution in enumerate(executions):
            execution['id'] = str(3000 + i)
        
        return EnhancedTestConfig.get_mock_n8n_response(executions)


# Environment setup for tests
TEST_ENVIRONMENT_VARIABLES = {
    'N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE': 'true',
    'OPENAI_API_KEY': 'test-openai-key',
    'ANTHROPIC_API_KEY': 'test-anthropic-key',
    'GROQ_API_KEY': 'test-groq-key'
}


def setup_test_environment():
    """Setup test environment variables"""
    for key, value in TEST_ENVIRONMENT_VARIABLES.items():
        os.environ[key] = value


def cleanup_test_environment():
    """Cleanup test environment variables"""
    for key in TEST_ENVIRONMENT_VARIABLES.keys():
        if key in os.environ:
            del os.environ[key]
