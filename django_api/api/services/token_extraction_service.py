"""
Token Extraction Service
Handles provider-specific token extraction and cost calculation
"""

import logging
from typing import Dict, Any, Optional, List
from api.models import AINodeType

logger = logging.getLogger(__name__)


class TokenExtractionService:
    """Enhanced token extraction with provider-specific logic"""
    
    # Enhanced token pricing per 1K tokens (as of 2024/2025)
    ENHANCED_PRICING = {
        # OpenAI models
        'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015},
        'gpt-4': {'input': 0.03, 'output': 0.06},
        'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
        'gpt-4o': {'input': 0.005, 'output': 0.015},
        'gpt-4o-mini': {'input': 0.00015, 'output': 0.0006},
        
        # Claude models
        'claude-3-haiku': {'input': 0.00025, 'output': 0.00125},
        'claude-3-haiku-20240307': {'input': 0.00025, 'output': 0.00125},
        'claude-3-sonnet': {'input': 0.003, 'output': 0.015},
        'claude-3-sonnet-20240229': {'input': 0.003, 'output': 0.015},
        'claude-3-opus': {'input': 0.015, 'output': 0.075},
        'claude-3-opus-20240229': {'input': 0.015, 'output': 0.075},
        'claude-3-5-sonnet': {'input': 0.003, 'output': 0.015},
        'claude-3-5-sonnet-20241022': {'input': 0.003, 'output': 0.015},
        'claude-3-5-sonnet-20240620': {'input': 0.003, 'output': 0.015},
        'claude-3-5-haiku': {'input': 0.001, 'output': 0.005},
        'claude-3-5-haiku-20241022': {'input': 0.001, 'output': 0.005},
        
        # Legacy Claude models
        'claude-2': {'input': 0.008, 'output': 0.024},
        'claude-2.1': {'input': 0.008, 'output': 0.024},
        'claude-instant-1': {'input': 0.0008, 'output': 0.0024},
        'claude-instant-1.2': {'input': 0.0008, 'output': 0.0024},
        
        # Groq models
        'groq/llama3-8b': {'input': 0.0001, 'output': 0.0001},
        'groq/llama3-70b': {'input': 0.0006, 'output': 0.0008},
        'groq/mixtral-8x7b': {'input': 0.00027, 'output': 0.00027},
        'groq/gemma-7b': {'input': 0.0001, 'output': 0.0001},
        'groq/gemma2-9b': {'input': 0.0002, 'output': 0.0002},
        'llama3-8b-8192': {'input': 0.0001, 'output': 0.0001},
        'llama3-70b-8192': {'input': 0.0006, 'output': 0.0008},
        'mixtral-8x7b-32768': {'input': 0.00027, 'output': 0.00027},
        'gemma-7b-it': {'input': 0.0001, 'output': 0.0001},
        'gemma2-9b-it': {'input': 0.0002, 'output': 0.0002},
        
        # Google models
        'gemini-pro': {'input': 0.00025, 'output': 0.0005},
        'gemini-1.5-pro': {'input': 0.00125, 'output': 0.005},
        'gemini-1.5-flash': {'input': 0.000075, 'output': 0.0003},
        
        # Mistral models
        'mistral-small': {'input': 0.0006, 'output': 0.0018},
        'mistral-medium': {'input': 0.00275, 'output': 0.0081},
        'mistral-large': {'input': 0.004, 'output': 0.012},
        
        # Cohere models
        'command': {'input': 0.001, 'output': 0.002},
        'command-light': {'input': 0.0003, 'output': 0.0006},
        'command-nightly': {'input': 0.001, 'output': 0.002},
        
        # DeepSeek models
        'deepseek-chat': {'input': 0.0001, 'output': 0.0002},
        'deepseek-coder': {'input': 0.0001, 'output': 0.0002},
        
        # xAI models
        'grok-beta': {'input': 0.005, 'output': 0.015},
    }
    
    def __init__(self, ai_node_types: Optional[List[AINodeType]] = None):
        """Initialize with optional AI node types for context"""
        self.ai_node_types = ai_node_types or []
        self._node_type_cache = {}
        
        # Build node type cache for faster lookups
        for node_type in self.ai_node_types:
            self._node_type_cache[node_type.workflow_node_type] = node_type
    
    @classmethod
    def get_enhanced_pricing(cls) -> Dict[str, Dict[str, float]]:
        """Get enhanced pricing dictionary"""
        return cls.ENHANCED_PRICING
    
    def extract_tokens_by_provider(
        self, 
        execution_data: Dict[str, Any], 
        node_name: str, 
        node_type_hint: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Extract tokens using provider-specific logic"""
        
        # Find node type configuration
        node_type_obj = self._find_node_type(node_name, node_type_hint)
        
        if not node_type_obj:
            return self._extract_generic_tokens(execution_data)
        
        provider = node_type_obj.provider
        extraction_method = node_type_obj.token_extraction_method
        
        logger.debug(f"Extracting tokens for {node_name} using {provider} provider with {extraction_method} method")
        
        # Provider-specific extraction
        if provider == 'openai':
            return self._extract_openai_tokens(execution_data, extraction_method)
        elif provider == 'anthropic':
            return self._extract_anthropic_tokens(execution_data, extraction_method)
        elif provider == 'groq':
            return self._extract_groq_tokens(execution_data, extraction_method)
        elif provider == 'google':
            return self._extract_google_tokens(execution_data, extraction_method)
        elif provider == 'mistral':
            return self._extract_mistral_tokens(execution_data, extraction_method)
        elif provider == 'cohere':
            return self._extract_cohere_tokens(execution_data, extraction_method)
        else:
            return self._extract_generic_tokens(execution_data)
    
    def detect_model_from_execution(
        self, 
        execution_data: Dict[str, Any], 
        node_name: Optional[str] = None
    ) -> str:
        """Detect the specific model used from execution data"""
        
        # Common model field locations
        model_paths = [
            'model',
            'modelId', 
            'modelName',
            'model_name',
            'parameters.model',
            'parameters.modelId',
            'config.model',
            'request.model',
            'body.model'
        ]
        
        for path in model_paths:
            model = self._get_nested_value(execution_data, path)
            if model:
                return str(model).strip()
        
        # Try to extract from response headers or metadata
        if 'response' in execution_data:
            response = execution_data['response']
            if isinstance(response, dict):
                for key in ['model', 'modelId', 'model_name']:
                    if key in response:
                        return str(response[key]).strip()
        
        logger.debug(f"Could not detect model from execution data for node: {node_name}")
        return 'unknown'
    
    def calculate_cost(
        self, 
        token_info: Dict[str, Any], 
        model_name: str, 
        provider: Optional[str] = None
    ) -> float:
        """Calculate cost based on token usage and model"""
        
        try:
            prompt_tokens = token_info.get('prompt_tokens', 0) or token_info.get('input_tokens', 0)
            completion_tokens = token_info.get('completion_tokens', 0) or token_info.get('output_tokens', 0)
            
            if not prompt_tokens and not completion_tokens:
                return 0.0
            
            # Get pricing for model
            pricing = self._get_model_pricing(model_name, provider)
            
            input_cost = (prompt_tokens / 1000) * pricing['input']
            output_cost = (completion_tokens / 1000) * pricing['output']
            
            return input_cost + output_cost
            
        except Exception as e:
            logger.warning(f"Error calculating cost for model {model_name}: {e}")
            return 0.0
    
    def _extract_openai_tokens(self, data: Dict[str, Any], method: str) -> Optional[Dict[str, Any]]:
        """Extract tokens from OpenAI response format"""
        try:
            # OpenAI standard format
            if 'usage' in data:
                usage = data['usage']
                return {
                    'prompt_tokens': usage.get('prompt_tokens', 0),
                    'completion_tokens': usage.get('completion_tokens', 0),
                    'total_tokens': usage.get('total_tokens', 0)
                }
            
            # Alternative locations
            for alt_path in ['response.usage', 'result.usage', 'data.usage']:
                usage = self._get_nested_value(data, alt_path)
                if usage and isinstance(usage, dict):
                    return {
                        'prompt_tokens': usage.get('prompt_tokens', 0),
                        'completion_tokens': usage.get('completion_tokens', 0),
                        'total_tokens': usage.get('total_tokens', 0)
                    }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting OpenAI tokens: {e}")
            return None
    
    def _extract_anthropic_tokens(self, data: Dict[str, Any], method: str) -> Optional[Dict[str, Any]]:
        """Extract tokens from Claude/Anthropic response format"""
        try:
            # Anthropic format uses input_tokens/output_tokens
            if 'usage' in data:
                usage = data['usage']
                input_tokens = usage.get('input_tokens', 0)
                output_tokens = usage.get('output_tokens', 0)
                return {
                    'prompt_tokens': input_tokens,
                    'completion_tokens': output_tokens,
                    'total_tokens': input_tokens + output_tokens,
                    'input_tokens': input_tokens,
                    'output_tokens': output_tokens
                }
            
            # Alternative formats
            for alt_path in ['response.usage', 'result.usage']:
                usage = self._get_nested_value(data, alt_path)
                if usage and isinstance(usage, dict):
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)
                    return {
                        'prompt_tokens': input_tokens,
                        'completion_tokens': output_tokens,
                        'total_tokens': input_tokens + output_tokens,
                        'input_tokens': input_tokens,
                        'output_tokens': output_tokens
                    }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting Anthropic tokens: {e}")
            return None
    
    def _extract_groq_tokens(self, data: Dict[str, Any], method: str) -> Optional[Dict[str, Any]]:
        """Extract tokens from Groq response format"""
        try:
            # Groq uses OpenAI-compatible format
            return self._extract_openai_tokens(data, method)
            
        except Exception as e:
            logger.debug(f"Error extracting Groq tokens: {e}")
            return None
    
    def _extract_google_tokens(self, data: Dict[str, Any], method: str) -> Optional[Dict[str, Any]]:
        """Extract tokens from Google/Gemini response format"""
        try:
            # Google format
            if 'usage' in data:
                usage = data['usage']
                return {
                    'prompt_tokens': usage.get('promptTokenCount', 0),
                    'completion_tokens': usage.get('candidatesTokenCount', 0),
                    'total_tokens': usage.get('totalTokenCount', 0)
                }
            
            # Alternative format
            if 'usageMetadata' in data:
                usage = data['usageMetadata']
                return {
                    'prompt_tokens': usage.get('promptTokenCount', 0),
                    'completion_tokens': usage.get('candidatesTokenCount', 0),
                    'total_tokens': usage.get('totalTokenCount', 0)
                }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting Google tokens: {e}")
            return None
    
    def _extract_mistral_tokens(self, data: Dict[str, Any], method: str) -> Optional[Dict[str, Any]]:
        """Extract tokens from Mistral response format"""
        try:
            # Mistral uses OpenAI-compatible format
            return self._extract_openai_tokens(data, method)
            
        except Exception as e:
            logger.debug(f"Error extracting Mistral tokens: {e}")
            return None
    
    def _extract_cohere_tokens(self, data: Dict[str, Any], method: str) -> Optional[Dict[str, Any]]:
        """Extract tokens from Cohere response format"""
        try:
            # Cohere format
            if 'meta' in data and 'tokens' in data['meta']:
                tokens = data['meta']['tokens']
                input_tokens = tokens.get('input_tokens', 0)
                output_tokens = tokens.get('output_tokens', 0)
                return {
                    'prompt_tokens': input_tokens,
                    'completion_tokens': output_tokens,
                    'total_tokens': input_tokens + output_tokens
                }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting Cohere tokens: {e}")
            return None
    
    def _extract_generic_tokens(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generic token extraction for unknown formats"""
        try:
            # Try multiple common patterns
            token_patterns = [
                'usage',
                'tokenUsage', 
                'tokens',
                'token_usage',
                'response.usage',
                'result.usage',
                'data.usage'
            ]
            
            for pattern in token_patterns:
                token_data = self._get_nested_value(data, pattern)
                if token_data and isinstance(token_data, dict):
                    # Try to extract tokens from various field names
                    prompt_tokens = (
                        token_data.get('prompt_tokens', 0) or
                        token_data.get('input_tokens', 0) or
                        token_data.get('input', 0)
                    )
                    completion_tokens = (
                        token_data.get('completion_tokens', 0) or
                        token_data.get('output_tokens', 0) or
                        token_data.get('output', 0)
                    )
                    total_tokens = (
                        token_data.get('total_tokens', 0) or
                        token_data.get('total', 0) or
                        (prompt_tokens + completion_tokens)
                    )
                    
                    if total_tokens > 0:
                        return {
                            'prompt_tokens': prompt_tokens,
                            'completion_tokens': completion_tokens,
                            'total_tokens': total_tokens
                        }
            
            # Last resort: try to estimate from response length
            return self._estimate_tokens_from_content(data)
            
        except Exception as e:
            logger.debug(f"Error in generic token extraction: {e}")
            return None
    
    def _estimate_tokens_from_content(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Estimate tokens from response content length"""
        try:
            content_fields = ['content', 'text', 'response', 'completion', 'output']
            
            for field in content_fields:
                content = self._get_nested_value(data, field)
                if content and isinstance(content, str) and len(content) > 0:
                    # Rough estimation: 1 token ≈ 4 characters for English text
                    estimated_tokens = max(1, len(content) // 4)
                    return {
                        'prompt_tokens': estimated_tokens // 3,  # Assume 1/3 input
                        'completion_tokens': (estimated_tokens * 2) // 3,  # Assume 2/3 output
                        'total_tokens': estimated_tokens,
                        'estimated': True
                    }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error estimating tokens from content: {e}")
            return None
    
    def _find_node_type(self, node_name: str, node_type_hint: Optional[str] = None) -> Optional[AINodeType]:
        """Find AINodeType from cache or database"""
        try:
            # Try cache first if we have node type hint
            if node_type_hint and node_type_hint in self._node_type_cache:
                return self._node_type_cache[node_type_hint]
            
            # Search by node name patterns
            for node_type in self.ai_node_types:
                if (node_name.lower() in node_type.display_name.lower() or
                    node_type.display_name.lower() in node_name.lower()):
                    return node_type
            
            # Fallback to database query if not in memory
            if not self.ai_node_types:
                return AINodeType.objects.filter(
                    is_active=True,
                    display_name__icontains=node_name.split()[0]  # Try first word
                ).first()
            
            return None
            
        except Exception as e:
            logger.debug(f"Error finding node type for {node_name}: {e}")
            return None
    
    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get nested value using dot notation path"""
        try:
            current = data
            for key in path.split('.'):
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return None
            return current
        except Exception:
            return None
    
    def _get_model_pricing(self, model_name: str, provider: Optional[str] = None) -> Dict[str, float]:
        """Get pricing for a specific model with fallbacks"""
        
        # Direct model match
        if model_name in self.ENHANCED_PRICING:
            return self.ENHANCED_PRICING[model_name]
        
        # Clean model name and try again
        clean_model = model_name.lower().strip()
        for pricing_model, pricing in self.ENHANCED_PRICING.items():
            if clean_model in pricing_model.lower() or pricing_model.lower() in clean_model:
                return pricing
        
        # Provider-based fallback
        if provider:
            provider_defaults = {
                'openai': self.ENHANCED_PRICING['gpt-3.5-turbo'],
                'anthropic': self.ENHANCED_PRICING['claude-3-haiku'],
                'groq': self.ENHANCED_PRICING['llama3-8b-8192'],
                'google': self.ENHANCED_PRICING['gemini-pro'],
                'mistral': self.ENHANCED_PRICING['mistral-small'],
                'cohere': self.ENHANCED_PRICING['command-light'],
            }
            
            if provider in provider_defaults:
                return provider_defaults[provider]
        
        # Ultimate fallback - GPT-3.5 pricing
        logger.warning(f"No pricing found for model {model_name}, using GPT-3.5 fallback")
        return self.ENHANCED_PRICING['gpt-3.5-turbo']
