"""
Node Discovery Service using n8n-mcp
Handles discovery and classification of AI-capable nodes
"""

import subprocess
import json
import logging
from typing import List, Dict, Any, Optional
from django.db import transaction
from api.models import AINodeType

logger = logging.getLogger(__name__)


class NodeDiscoveryService:
    """Service to discover and analyze AI nodes using n8n-mcp"""
    
    PROVIDER_MAPPING = {
        'openai': ['openai', 'gpt', 'chatgpt'],
        'anthropic': ['anthropic', 'claude'],
        'groq': ['groq'],
        'google': ['google', 'gemini', 'vertex'],
        'mistral': ['mistral'],
        'cohere': ['cohere'],
        'huggingface': ['huggingface', 'hf'],
        'aws_bedrock': ['bedrock', 'aws'],
        'azure': ['azure'],
        'deepseek': ['deepseek'],
        'xai': ['xai', 'grok'],
    }
    
    def __init__(self):
        self.discovered_nodes = []
        self.errors = []
    
    def discover_all_ai_nodes(self) -> List[Dict[str, Any]]:
        """Discover all AI-capable nodes using n8n-mcp"""
        try:
            logger.info("Starting AI node discovery using n8n-mcp")
            
            # Get AI tools from n8n-mcp
            ai_tools = self._run_mcp_command('list_ai_tools')
            if ai_tools and 'tools' in ai_tools:
                self.discovered_nodes.extend(self._process_ai_tools(ai_tools['tools']))
                logger.info(f"Discovered {len(ai_tools['tools'])} AI tools from n8n-mcp")
            
            # Search for specific AI providers
            for provider in self.PROVIDER_MAPPING.keys():
                try:
                    provider_nodes = self._search_provider_nodes(provider)
                    self.discovered_nodes.extend(provider_nodes)
                except Exception as e:
                    logger.warning(f"Error searching for {provider} nodes: {e}")
                    self.errors.append(f"Provider {provider}: {str(e)}")
            
            # Remove duplicates
            unique_nodes = self._deduplicate_nodes(self.discovered_nodes)
            logger.info(f"Total unique AI nodes discovered: {len(unique_nodes)}")
            
            return unique_nodes
            
        except Exception as e:
            logger.error(f"Error during AI node discovery: {e}")
            self.errors.append(f"Discovery error: {str(e)}")
            return []
    
    def discover_and_store_ai_nodes(self) -> Dict[str, Any]:
        """Discover AI nodes and store them in database"""
        try:
            nodes = self.discover_all_ai_nodes()
            
            if not nodes:
                return {
                    'success': False,
                    'message': 'No AI nodes discovered',
                    'errors': self.errors
                }
            
            # Store nodes in database
            stored_count = 0
            updated_count = 0
            
            with transaction.atomic():
                for node_data in nodes:
                    try:
                        node_type_id = node_data['nodeType']
                        
                        # Check if node already exists
                        ai_node, created = AINodeType.objects.update_or_create(
                            node_type=node_type_id,
                            defaults={
                                'workflow_node_type': node_data.get('workflowNodeType', node_type_id),
                                'display_name': node_data.get('displayName', ''),
                                'description': node_data.get('description', ''),
                                'package': node_data.get('package', ''),
                                'category': node_data.get('category', 'transform'),
                                'provider': self._determine_provider(node_data),
                                'supports_tokens': True,
                                'token_extraction_method': self._determine_token_method(node_data),
                                'is_active': True
                            }
                        )
                        
                        if created:
                            stored_count += 1
                            logger.debug(f"Created new AI node: {ai_node.display_name}")
                        else:
                            updated_count += 1
                            logger.debug(f"Updated AI node: {ai_node.display_name}")
                            
                        # Get additional configuration
                        config = self._get_node_configuration(node_type_id)
                        if config:
                            model_config = self._detect_model_configuration(config)
                            ai_node.model_path = model_config.get('model_path')
                            ai_node.typical_models = model_config.get('typical_models', [])
                            ai_node.save()
                            
                    except Exception as e:
                        logger.error(f"Error storing node {node_data.get('nodeType', 'unknown')}: {e}")
                        self.errors.append(f"Storage error for {node_data.get('nodeType', 'unknown')}: {str(e)}")
            
            return {
                'success': True,
                'message': f'Successfully processed {len(nodes)} AI nodes',
                'stored': stored_count,
                'updated': updated_count,
                'total': len(nodes),
                'errors': self.errors
            }
            
        except Exception as e:
            logger.error(f"Error storing AI nodes: {e}")
            return {
                'success': False,
                'message': f'Error storing AI nodes: {str(e)}',
                'errors': self.errors + [str(e)]
            }
    
    def get_node_configuration(self, node_type: str) -> Optional[Dict[str, Any]]:
        """Get detailed node configuration using n8n-mcp"""
        return self._get_node_configuration(node_type)
    
    def _get_node_configuration(self, node_type: str) -> Optional[Dict[str, Any]]:
        """Internal method to get node configuration"""
        try:
            return self._run_mcp_command('get_node_essentials', {'nodeType': node_type})
        except Exception as e:
            logger.warning(f"Could not get configuration for {node_type}: {e}")
            return None
    
    def _detect_model_configuration(self, node_config: Dict[str, Any]) -> Dict[str, Any]:
        """Detect how models are configured in this node type"""
        model_config = {
            'model_path': None,
            'typical_models': [],
            'supports_custom_models': False
        }
        
        try:
            # Check required properties for model fields
            for prop in node_config.get('requiredProperties', []):
                prop_name = prop.get('name', '').lower()
                if 'model' in prop_name:
                    model_config['model_path'] = prop['name']
                    if prop.get('type') == 'resourceLocator':
                        model_config['supports_custom_models'] = True
            
            # Check common properties for model options
            for prop in node_config.get('commonProperties', []):
                prop_name = prop.get('name', '').lower()
                if 'model' in prop_name and 'options' in prop:
                    if not model_config['model_path']:
                        model_config['model_path'] = prop['name']
                    
                    # Extract model options
                    options = prop.get('options', [])
                    model_config['typical_models'] = [
                        opt.get('value') for opt in options 
                        if opt.get('value')
                    ]
                    break
                    
        except Exception as e:
            logger.warning(f"Error detecting model configuration: {e}")
        
        return model_config
    
    def _run_mcp_command(self, command: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Execute n8n-mcp command and return result"""
        try:
            # For now, return mock data since MCP requires interactive protocol
            # In production, this would integrate with the MCP protocol properly
            logger.warning(f"MCP command {command} called - returning mock data for development")
            
            if command == 'list_ai_tools':
                return self._get_mock_ai_tools()
            elif command == 'search_nodes':
                return self._get_mock_search_results(params)
            elif command == 'get_node_essentials':
                return self._get_mock_node_essentials(params)
            else:
                return {}
            
            # Original implementation (commented out due to MCP protocol complexity):
            # cmd = ['npx', 'n8n-mcp', command]
            # if params:
            #     cmd.append(json.dumps(params))
            # 
            # result = subprocess.run(
            #     cmd, 
            #     capture_output=True, 
            #     text=True,
            #     shell=True,  # Required for Windows to find npx
            #     timeout=30,  # 30 second timeout
            #     cwd=None  # Use current working directory
            # )
                
        except Exception as e:
            logger.error(f"Error running MCP command {command}: {e}")
            return None
    
    def _process_ai_tools(self, tools: List[Dict]) -> List[Dict]:
        """Process AI tools from n8n-mcp list_ai_tools"""
        processed = []
        
        for tool in tools:
            # Convert to standard format
            processed_tool = {
                'nodeType': tool.get('nodeType', ''),
                'workflowNodeType': tool.get('nodeType', '').replace('nodes-', '@n8n/n8n-nodes-'),
                'displayName': tool.get('displayName', ''),
                'description': tool.get('description', ''),
                'package': tool.get('package', ''),
                'category': 'transform',  # Most AI tools are transform nodes
            }
            
            # Skip if essential data is missing
            if processed_tool['nodeType'] and processed_tool['displayName']:
                processed.append(processed_tool)
                
        return processed
    
    def _search_provider_nodes(self, provider: str) -> List[Dict]:
        """Search for nodes from a specific provider"""
        try:
            keywords = self.PROVIDER_MAPPING.get(provider, [provider])
            search_query = ' '.join(keywords)
            
            result = self._run_mcp_command('search_nodes', {'query': search_query})
            
            if result and 'results' in result:
                return result['results']
            
            return []
            
        except Exception as e:
            logger.warning(f"Error searching for {provider} nodes: {e}")
            return []
    
    def _deduplicate_nodes(self, nodes: List[Dict]) -> List[Dict]:
        """Remove duplicate nodes based on nodeType"""
        seen = set()
        unique_nodes = []
        
        for node in nodes:
            node_type = node.get('nodeType')
            if node_type and node_type not in seen:
                seen.add(node_type)
                unique_nodes.append(node)
        
        return unique_nodes
    
    def _get_mock_ai_tools(self) -> Dict[str, Any]:
        """Return mock AI tools data for development"""
        return {
            'tools': [
                {
                    'nodeType': 'n8n-nodes-langchain.openAi',
                    'workflowNodeType': '@n8n/n8n-nodes-langchain.openAi',
                    'displayName': 'OpenAI',
                    'description': 'Use OpenAI models like GPT-3.5 and GPT-4',
                    'package': '@n8n/n8n-nodes-langchain',
                    'category': 'AI'
                },
                {
                    'nodeType': 'n8n-nodes-langchain.lmChatOpenAi',
                    'workflowNodeType': '@n8n/n8n-nodes-langchain.lmChatOpenAi',
                    'displayName': 'OpenAI Chat Model',
                    'description': 'Chat with OpenAI models',
                    'package': '@n8n/n8n-nodes-langchain',
                    'category': 'AI'
                },
                {
                    'nodeType': 'n8n-nodes-langchain.lmChatAnthropic',
                    'workflowNodeType': '@n8n/n8n-nodes-langchain.lmChatAnthropic',
                    'displayName': 'Anthropic Chat Model',
                    'description': 'Chat with Claude models',
                    'package': '@n8n/n8n-nodes-langchain',
                    'category': 'AI'
                },
                {
                    'nodeType': 'n8n-nodes-langchain.lmChatGroq',
                    'workflowNodeType': '@n8n/n8n-nodes-langchain.lmChatGroq',
                    'displayName': 'Groq Chat Model',
                    'description': 'Chat with Groq models',
                    'package': '@n8n/n8n-nodes-langchain',
                    'category': 'AI'
                }
            ]
        }
    
    def _get_mock_search_results(self, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Return mock search results for development"""
        query = params.get('query', '') if params else ''
        
        if 'openai' in query.lower():
            return {
                'results': [
                    {
                        'nodeType': 'n8n-nodes-langchain.openAi',
                        'displayName': 'OpenAI',
                        'description': 'OpenAI integration node'
                    }
                ]
            }
        elif 'anthropic' in query.lower() or 'claude' in query.lower():
            return {
                'results': [
                    {
                        'nodeType': 'n8n-nodes-langchain.lmChatAnthropic',
                        'displayName': 'Anthropic Chat Model',
                        'description': 'Claude integration node'
                    }
                ]
            }
        elif 'groq' in query.lower():
            return {
                'results': [
                    {
                        'nodeType': 'n8n-nodes-langchain.lmChatGroq',
                        'displayName': 'Groq Chat Model',
                        'description': 'Groq integration node'
                    }
                ]
            }
        else:
            return {'results': []}
    
    def _get_mock_node_essentials(self, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Return mock node essentials for development"""
        node_type = params.get('nodeType', '') if params else ''
        
        return {
            'nodeType': node_type,
            'displayName': 'Mock Node',
            'description': 'Mock node for development',
            'requiredProperties': [
                {
                    'name': 'model',
                    'type': 'string',
                    'required': True
                }
            ]
        }
    
    def _determine_provider(self, node_info: Dict[str, Any]) -> str:
        """Determine AI provider from node information"""
        node_type = node_info.get('nodeType', '').lower()
        display_name = node_info.get('displayName', '').lower()
        description = node_info.get('description', '').lower()
        package = node_info.get('package', '').lower()
        
        text_to_check = f"{node_type} {display_name} {description} {package}"
        
        # Check each provider's keywords
        for provider, keywords in self.PROVIDER_MAPPING.items():
            if any(keyword in text_to_check for keyword in keywords):
                return provider
        
        # Special cases for langchain nodes
        if 'langchain' in text_to_check:
            if 'openai' in text_to_check:
                return 'openai'
            elif 'anthropic' in text_to_check:
                return 'anthropic'
            elif 'groq' in text_to_check:
                return 'groq'
            elif 'google' in text_to_check or 'gemini' in text_to_check:
                return 'google'
            elif 'mistral' in text_to_check:
                return 'mistral'
            elif 'cohere' in text_to_check:
                return 'cohere'
            elif 'huggingface' in text_to_check:
                return 'huggingface'
        
        return 'unknown'
    
    def _determine_token_method(self, node_info: Dict[str, Any]) -> str:
        """Determine token extraction method based on provider"""
        provider = self._determine_provider(node_info)
        
        # Provider-specific token extraction methods
        if provider == 'anthropic':
            return 'input_tokens_output_tokens'
        elif provider in ['openai', 'groq', 'mistral']:
            return 'usage'
        elif provider == 'google':
            return 'usage_metadata'
        else:
            return 'usage'  # Default
