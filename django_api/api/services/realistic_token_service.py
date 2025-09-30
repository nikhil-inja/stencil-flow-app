"""
Realistic Token Extraction Service
Handles the reality that most n8n executions don't include token usage data
"""

import re
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class TokenEstimate:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    confidence: str  # 'high', 'medium', 'low'
    method: str  # 'exact', 'estimated', 'guessed'

class RealisticTokenService:
    """
    Realistic token extraction that handles missing token data gracefully
    """
    
    # Token estimation ratios (varies by model and language)
    ESTIMATION_RATIOS = {
        'gpt-3.5-turbo': 3.5,  # ~3.5 chars per token
        'gpt-4': 3.8,          # ~3.8 chars per token  
        'gpt-4-turbo': 3.8,
        'gpt-4o': 3.8,
        'claude-3-sonnet': 4.0,
        'claude-3-haiku': 4.0,
        'claude-3-opus': 4.0,
        'groq/llama3': 4.2,
        'groq/mixtral': 4.0,
        'default': 4.0  # Fallback ratio
    }
    
    def extract_tokens_realistic(self, execution_data: Dict[str, Any], node_name: str) -> Optional[TokenEstimate]:
        """
        Extract tokens using multiple fallback methods
        Returns None if no data can be extracted
        """
        
        # Method 1: Look for exact token usage data (rare but ideal)
        exact_tokens = self._extract_exact_tokens(execution_data)
        if exact_tokens:
            return TokenEstimate(
                prompt_tokens=exact_tokens['prompt_tokens'],
                completion_tokens=exact_tokens['completion_tokens'], 
                total_tokens=exact_tokens['total_tokens'],
                confidence='high',
                method='exact'
            )
        
        # Method 2: Extract from response content and estimate
        estimated_tokens = self._extract_from_content(execution_data, node_name)
        if estimated_tokens:
            return TokenEstimate(
                prompt_tokens=estimated_tokens['prompt_tokens'],
                completion_tokens=estimated_tokens['completion_tokens'],
                total_tokens=estimated_tokens['total_tokens'],
                confidence='medium',
                method='estimated'
            )
        
        # Method 3: Look for any text content and make rough estimate
        rough_tokens = self._extract_rough_estimate(execution_data)
        if rough_tokens:
            return TokenEstimate(
                prompt_tokens=rough_tokens['prompt_tokens'],
                completion_tokens=rough_tokens['completion_tokens'],
                total_tokens=rough_tokens['total_tokens'],
                confidence='low',
                method='guessed'
            )
        
        # No token data available
        return None
    
    def _extract_exact_tokens(self, data: Dict[str, Any]) -> Optional[Dict[str, int]]:
        """Look for exact token usage data (rare)"""
        token_locations = [
            'usage',
            'tokenUsage', 
            'tokens',
            'response.usage',
            'data.usage',
            'result.usage'
        ]
        
        for location in token_locations:
            token_data = self._get_nested_value(data, location)
            if token_data and isinstance(token_data, dict):
                prompt_tokens = token_data.get('prompt_tokens', 0)
                completion_tokens = token_data.get('completion_tokens', 0)
                total_tokens = token_data.get('total_tokens', 0)
                
                if prompt_tokens > 0 or completion_tokens > 0:
                    return {
                        'prompt_tokens': prompt_tokens,
                        'completion_tokens': completion_tokens,
                        'total_tokens': total_tokens or (prompt_tokens + completion_tokens)
                    }
        
        return None
    
    def _extract_from_content(self, data: Dict[str, Any], node_name: str) -> Optional[Dict[str, int]]:
        """Extract tokens by analyzing response content"""
        
        # Get response text
        response_text = self._get_response_text(data)
        prompt_text = self._get_prompt_text(data)
        
        if not response_text:
            return None
        
        # Detect model from node name or data
        model = self._detect_model(node_name, data)
        
        if prompt_text and response_text:
            # We have both prompt and response - good estimation
            prompt_tokens = self._estimate_tokens(prompt_text, model)
            completion_tokens = self._estimate_tokens(response_text, model)
            
            return {
                'prompt_tokens': prompt_tokens,
                'completion_tokens': completion_tokens,
                'total_tokens': prompt_tokens + completion_tokens
            }
        elif response_text:
            # Only have response - rough estimate
            total_tokens = self._estimate_tokens(response_text, model)
            # Assume 70% response, 30% prompt for chat models
            return {
                'prompt_tokens': int(total_tokens * 0.3),
                'completion_tokens': int(total_tokens * 0.7),
                'total_tokens': total_tokens
            }
        
        return None
    
    def _extract_rough_estimate(self, data: Dict[str, Any]) -> Optional[Dict[str, int]]:
        """Make rough estimate from any available text"""
        
        # Look for any text content in the response
        all_text = self._extract_all_text(data)
        
        if all_text and len(all_text) > 10:  # Minimum content threshold
            total_tokens = self._estimate_tokens(all_text, 'default')
            
            # Rough split for chat-like interactions
            return {
                'prompt_tokens': int(total_tokens * 0.4),
                'completion_tokens': int(total_tokens * 0.6),
                'total_tokens': total_tokens
            }
        
        return None
    
    def _get_response_text(self, data: Dict[str, Any]) -> str:
        """Extract response text from various possible locations"""
        response_fields = [
            'response',
            'content', 
            'output',
            'message',
            'text',
            'result',
            'choices[0].message.content',
            'completion',
            'generated_text'
        ]
        
        for field in response_fields:
            text = self._get_nested_value(data, field)
            if text and isinstance(text, str) and len(text.strip()) > 0:
                return text.strip()
        
        return ""
    
    def _get_prompt_text(self, data: Dict[str, Any]) -> str:
        """Extract prompt/input text from various locations"""
        prompt_fields = [
            'prompt',
            'input',
            'query',
            'question',
            'message',
            'user_input',
            'messages[-1].content',  # Last message in conversation
            'system_prompt'
        ]
        
        for field in prompt_fields:
            text = self._get_nested_value(data, field)
            if text and isinstance(text, str) and len(text.strip()) > 0:
                return text.strip()
        
        return ""
    
    def _extract_all_text(self, data: Dict[str, Any]) -> str:
        """Extract all text content from response for rough estimation"""
        all_text = []
        
        def extract_strings(obj):
            if isinstance(obj, str):
                all_text.append(obj)
            elif isinstance(obj, dict):
                for value in obj.values():
                    extract_strings(value)
            elif isinstance(obj, list):
                for item in obj:
                    extract_strings(item)
        
        extract_strings(data)
        
        # Join all text and clean up
        combined_text = ' '.join(all_text)
        # Remove very short strings and clean up
        words = [word for word in combined_text.split() if len(word) > 2]
        return ' '.join(words)
    
    def _detect_model(self, node_name: str, data: Dict[str, Any]) -> str:
        """Detect AI model from node name or data"""
        node_lower = node_name.lower()
        data_str = str(data).lower()
        
        # Model detection patterns
        if 'gpt-4' in node_lower or 'gpt-4' in data_str:
            return 'gpt-4'
        elif 'gpt-3.5' in node_lower or 'gpt-3.5' in data_str:
            return 'gpt-3.5-turbo'
        elif 'claude' in node_lower or 'claude' in data_str:
            return 'claude-3-sonnet'
        elif 'llama' in node_lower or 'llama' in data_str:
            return 'groq/llama3'
        elif 'mixtral' in node_lower or 'mixtral' in data_str:
            return 'groq/mixtral'
        else:
            return 'default'
    
    def _estimate_tokens(self, text: str, model: str) -> int:
        """Estimate token count for given text and model"""
        if not text:
            return 0
        
        # Get model-specific ratio
        ratio = self.ESTIMATION_RATIOS.get(model, self.ESTIMATION_RATIOS['default'])
        
        # Basic estimation
        char_count = len(text)
        estimated_tokens = int(char_count / ratio)
        
        # Adjust for special characters and whitespace
        # Remove extra whitespace
        clean_text = re.sub(r'\s+', ' ', text.strip())
        word_count = len(clean_text.split())
        
        # Use the higher of character-based or word-based estimation
        word_based_tokens = word_count * 1.3  # ~1.3 tokens per word
        
        return max(estimated_tokens, int(word_based_tokens))
    
    def _get_nested_value(self, data: Dict[str, Any], key_path: str) -> Any:
        """Get nested value from dictionary using dot notation"""
        keys = key_path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            elif isinstance(current, list) and key.isdigit():
                index = int(key)
                if 0 <= index < len(current):
                    current = current[index]
                else:
                    return None
            else:
                return None
        
        return current

# Example usage:
def demonstrate_realistic_extraction():
    """Show how the realistic token service works"""
    
    service = RealisticTokenService()
    
    # Example 1: No token data (most common case)
    execution_data_no_tokens = {
        'response': 'This is a sample AI response that we need to estimate tokens for.',
        'input': 'What is the weather like today?'
    }
    
    result = service.extract_tokens_realistic(execution_data_no_tokens, 'OpenAI Chat')
    if result:
        print(f"Estimated: {result.total_tokens} tokens ({result.method}, confidence: {result.confidence})")
    else:
        print("No token data available")
    
    # Example 2: Exact token data (rare)
    execution_data_with_tokens = {
        'usage': {
            'prompt_tokens': 25,
            'completion_tokens': 150,
            'total_tokens': 175
        },
        'response': 'Detailed AI response here...'
    }
    
    result = service.extract_tokens_realistic(execution_data_with_tokens, 'OpenAI Chat')
    if result:
        print(f"Exact: {result.total_tokens} tokens ({result.method}, confidence: {result.confidence})")

if __name__ == "__main__":
    demonstrate_realistic_extraction()
