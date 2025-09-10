"""
Performance tests for Mermaid chart generation API
Tests response times, memory usage, and scalability
"""

import json
import time
import os
import sys
from unittest.mock import patch, Mock
from datetime import datetime

# Add Django project to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from django.test import TestCase, TransactionTestCase
    from django.contrib.auth.models import User
    from rest_framework.test import APITestCase, APIClient
    from rest_framework import status
    from django.utils import timezone
    from django.urls import reverse
    from django.test.utils import override_settings
    
    # Import models
    from api.models import (
        Workspace, Profile, Space, N8nInstance, 
        Automation, Deployment, Invitation, GitHubToken
    )
    
    # Import views
    from api.views import (
        get_workflow_flowchart,
        generate_mermaid_diagram_with_llm,
        generate_template_mermaid_diagram
    )
    
    # Import authentication
    from api.authentication import generate_jwt_token
    
    # Import test utilities
    from .test_mermaid_config import MermaidChartPerformanceTestCase, SAMPLE_WORKFLOWS
    
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Please install required dependencies:")
    print("pip install django djangorestframework django-cors-headers python-decouple openai")
    sys.exit(1)


class MermaidChartPerformanceTests(MermaidChartPerformanceTestCase):
    """Performance tests for Mermaid chart generation"""
    
    def setUp(self):
        """Set up performance test environment"""
        super().setUp()
        self.performance_threshold = 2.0  # 2 seconds max response time
    
    def test_simple_workflow_response_time(self):
        """Test response time for simple workflow"""
        workflow_data = SAMPLE_WORKFLOWS['simple']
        
        with patch('requests.get') as mock_get:
            mock_response = self.mock_n8n_api_success(workflow_data)
            mock_get.return_value = mock_response
            
            start_time = time.time()
            
            url = reverse('get_workflow_flowchart')
            data = {'workflow_id': 'simple-workflow'}
            response = self.client.post(url, data, format='json')
            
            end_time = time.time()
            response_time = end_time - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(response_time, self.performance_threshold, 
                       f"Response time {response_time:.2f}s exceeds threshold {self.performance_threshold}s")
    
    def test_complex_workflow_response_time(self):
        """Test response time for complex workflow"""
        workflow_data = SAMPLE_WORKFLOWS['complex']
        
        with patch('requests.get') as mock_get:
            mock_response = self.mock_n8n_api_success(workflow_data)
            mock_get.return_value = mock_response
            
            start_time = time.time()
            
            url = reverse('get_workflow_flowchart')
            data = {'workflow_id': 'complex-workflow'}
            response = self.client.post(url, data, format='json')
            
            end_time = time.time()
            response_time = end_time - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(response_time, self.performance_threshold, 
                       f"Response time {response_time:.2f}s exceeds threshold {self.performance_threshold}s")
    
    def test_template_generation_performance(self):
        """Test template-based generation performance"""
        workflow_name = "Performance Test Workflow"
        nodes = [
            {'id': f'node_{i}', 'name': f'Node {i}', 'type': 'n8n-nodes-base.function'}
            for i in range(50)  # Large number of nodes
        ]
        connections = {
            f'node_{i}': [{'node': f'node_{i+1}'}]
            for i in range(49)  # Chain connections
        }
        
        start_time = time.time()
        result = generate_template_mermaid_diagram(workflow_name, nodes, connections)
        end_time = time.time()
        
        generation_time = end_time - start_time
        
        self.assertLess(generation_time, 1.0, 
                       f"Template generation time {generation_time:.2f}s exceeds 1s threshold")
        self.assertIn('graph TD', result)
        self.assertIn('node_0', result)
        self.assertIn('node_49', result)
    
    def test_llm_generation_performance(self):
        """Test LLM-based generation performance"""
        workflow_name = "LLM Performance Test"
        nodes = [
            {'id': 'start', 'name': 'Start', 'type': 'n8n-nodes-base.start'},
            {'id': 'process', 'name': 'Process', 'type': 'n8n-nodes-base.function'},
            {'id': 'end', 'name': 'End', 'type': 'n8n-nodes-base.stop'}
        ]
        connections = {
            'start': [{'node': 'process'}],
            'process': [{'node': 'end'}]
        }
        
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = """
        graph TD
            A["Start"] --> B["Process"]
            B --> C["End"]
        """
        
        mock_client = Mock()
        mock_client.chat.completions.create.return_value = mock_response
        
        with patch('openai.OpenAI') as mock_openai_class:
            mock_openai_class.return_value = mock_client
            
            start_time = time.time()
            
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}):
                result = generate_mermaid_diagram_with_llm(workflow_name, nodes, connections)
            
            end_time = time.time()
            generation_time = end_time - start_time
        
        self.assertLess(generation_time, 3.0, 
                       f"LLM generation time {generation_time:.2f}s exceeds 3s threshold")
        self.assertIn('graph TD', result)
        mock_client.chat.completions.create.assert_called_once()
    
    def test_concurrent_requests_performance(self):
        """Test performance with multiple concurrent requests"""
        workflow_data = SAMPLE_WORKFLOWS['simple']
        
        with patch('requests.get') as mock_get:
            mock_response = self.mock_n8n_api_success(workflow_data)
            mock_get.return_value = mock_response
            
            start_time = time.time()
            
            # Simulate multiple requests
            responses = []
            for i in range(5):
                url = reverse('get_workflow_flowchart')
                data = {'workflow_id': f'simple-workflow-{i}'}
                response = self.client.post(url, data, format='json')
                responses.append(response)
            
            end_time = time.time()
            total_time = end_time - start_time
        
        # All requests should succeed
        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Total time should be reasonable (not 5x individual time due to caching/sharing)
        self.assertLess(total_time, self.performance_threshold * 3, 
                       f"Concurrent requests time {total_time:.2f}s exceeds threshold")
    
    def test_large_workflow_performance(self):
        """Test performance with large workflow (many nodes and connections)"""
        # Create a large workflow
        nodes = []
        connections = {}
        
        # Add 100 nodes
        for i in range(100):
            nodes.append({
                'id': f'node_{i}',
                'name': f'Node {i}',
                'type': 'n8n-nodes-base.function'
            })
        
        # Add connections (each node connects to next 3 nodes)
        for i in range(97):  # Leave last 3 nodes without outgoing connections
            connections[f'node_{i}'] = [
                {'node': f'node_{i+1}'},
                {'node': f'node_{i+2}'},
                {'node': f'node_{i+3}'}
            ]
        
        workflow_data = {
            'id': 'large-workflow',
            'name': 'Large Performance Test Workflow',
            'nodes': nodes,
            'connections': connections
        }
        
        with patch('requests.get') as mock_get:
            mock_response = self.mock_n8n_api_success(workflow_data)
            mock_get.return_value = mock_response
            
            start_time = time.time()
            
            url = reverse('get_workflow_flowchart')
            data = {'workflow_id': 'large-workflow'}
            response = self.client.post(url, data, format='json')
            
            end_time = time.time()
            response_time = end_time - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(response_time, 5.0, 
                       f"Large workflow response time {response_time:.2f}s exceeds 5s threshold")
        
        response_data = response.json()
        self.assertEqual(response_data['node_count'], 100)
        self.assertGreater(response_data['connection_count'], 200)  # Many connections
    
    def test_memory_usage_with_large_diagram(self):
        """Test memory usage with large Mermaid diagram generation"""
        import psutil
        import gc
        
        # Get initial memory usage
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Generate large diagram
        workflow_name = "Memory Test Workflow"
        nodes = [
            {'id': f'node_{i}', 'name': f'Node {i}', 'type': 'n8n-nodes-base.function'}
            for i in range(200)  # Very large number of nodes
        ]
        connections = {
            f'node_{i}': [{'node': f'node_{i+1}'}]
            for i in range(199)
        }
        
        # Generate diagram multiple times
        for _ in range(10):
            result = generate_template_mermaid_diagram(workflow_name, nodes, connections)
            self.assertIn('graph TD', result)
        
        # Force garbage collection
        gc.collect()
        
        # Check final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 50MB)
        self.assertLess(memory_increase, 50, 
                       f"Memory usage increased by {memory_increase:.1f}MB, exceeds 50MB threshold")
    
    def test_diagram_size_scalability(self):
        """Test how diagram size affects generation time"""
        sizes = [10, 50, 100, 200]
        times = []
        
        for size in sizes:
            workflow_name = f"Scalability Test Workflow ({size} nodes)"
            nodes = [
                {'id': f'node_{i}', 'name': f'Node {i}', 'type': 'n8n-nodes-base.function'}
                for i in range(size)
            ]
            connections = {
                f'node_{i}': [{'node': f'node_{i+1}'}]
                for i in range(size - 1)
            }
            
            start_time = time.time()
            result = generate_template_mermaid_diagram(workflow_name, nodes, connections)
            end_time = time.time()
            
            generation_time = end_time - start_time
            times.append(generation_time)
            
            # Each size should complete within reasonable time
            self.assertLess(generation_time, 2.0, 
                           f"Generation time {generation_time:.2f}s for {size} nodes exceeds 2s threshold")
        
        # Times should scale reasonably (not exponentially)
        for i in range(1, len(times)):
            ratio = times[i] / times[i-1]
            self.assertLess(ratio, 3.0, 
                           f"Time scaling ratio {ratio:.2f} exceeds 3x threshold between {sizes[i-1]} and {sizes[i]} nodes")
    
    def test_error_response_performance(self):
        """Test that error responses are fast"""
        with patch('requests.get') as mock_get:
            mock_response = self.mock_n8n_api_error(404, 'Workflow not found')
            mock_get.return_value = mock_response
            
            start_time = time.time()
            
            url = reverse('get_workflow_flowchart')
            data = {'workflow_id': 'non-existent-workflow'}
            response = self.client.post(url, data, format='json')
            
            end_time = time.time()
            response_time = end_time - start_time
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertLess(response_time, 1.0, 
                       f"Error response time {response_time:.2f}s exceeds 1s threshold")
    
    def test_llm_fallback_performance(self):
        """Test performance when LLM fails and falls back to template"""
        workflow_name = "LLM Fallback Test"
        nodes = [
            {'id': 'start', 'name': 'Start', 'type': 'n8n-nodes-base.start'},
            {'id': 'end', 'name': 'End', 'type': 'n8n-nodes-base.stop'}
        ]
        connections = {
            'start': [{'node': 'end'}]
        }
        
        # Mock OpenAI to raise an exception
        mock_client = Mock()
        mock_client.chat.completions.create.side_effect = Exception("API Error")
        
        with patch('openai.OpenAI') as mock_openai_class:
            mock_openai_class.return_value = mock_client
            
            start_time = time.time()
            
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}):
                result = generate_mermaid_diagram_with_llm(workflow_name, nodes, connections)
            
            end_time = time.time()
            fallback_time = end_time - start_time
        
        # Fallback should be fast
        self.assertLess(fallback_time, 1.0, 
                       f"LLM fallback time {fallback_time:.2f}s exceeds 1s threshold")
        self.assertIn('graph TD', result)
        self.assertIn('Start', result)


class MermaidChartStressTests(MermaidChartPerformanceTestCase):
    """Stress tests for Mermaid chart generation under extreme conditions"""
    
    def setUp(self):
        """Set up stress test environment"""
        super().setUp()
        self.stress_threshold = 10.0  # 10 seconds max for stress tests
    
    def test_extreme_workflow_size(self):
        """Test with extremely large workflow"""
        # Create workflow with 1000 nodes
        nodes = [
            {'id': f'node_{i}', 'name': f'Node {i}', 'type': 'n8n-nodes-base.function'}
            for i in range(1000)
        ]
        
        # Create connections (each node connects to next 5 nodes)
        connections = {}
        for i in range(995):
            connections[f'node_{i}'] = [
                {'node': f'node_{i+j}'}
                for j in range(1, 6)
            ]
        
        workflow_data = {
            'id': 'extreme-workflow',
            'name': 'Extreme Size Test Workflow',
            'nodes': nodes,
            'connections': connections
        }
        
        with patch('requests.get') as mock_get:
            mock_response = self.mock_n8n_api_success(workflow_data)
            mock_get.return_value = mock_response
            
            start_time = time.time()
            
            url = reverse('get_workflow_flowchart')
            data = {'workflow_id': 'extreme-workflow'}
            response = self.client.post(url, data, format='json')
            
            end_time = time.time()
            response_time = end_time - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(response_time, self.stress_threshold, 
                       f"Extreme workflow response time {response_time:.2f}s exceeds {self.stress_threshold}s threshold")
        
        response_data = response.json()
        self.assertEqual(response_data['node_count'], 1000)
        self.assertGreater(response_data['connection_count'], 4000)
    
    def test_rapid_successive_requests(self):
        """Test rapid successive requests"""
        workflow_data = SAMPLE_WORKFLOWS['simple']
        
        with patch('requests.get') as mock_get:
            mock_response = self.mock_n8n_api_success(workflow_data)
            mock_get.return_value = mock_response
            
            start_time = time.time()
            
            # Make 20 rapid requests
            responses = []
            for i in range(20):
                url = reverse('get_workflow_flowchart')
                data = {'workflow_id': f'rapid-workflow-{i}'}
                response = self.client.post(url, data, format='json')
                responses.append(response)
            
            end_time = time.time()
            total_time = end_time - start_time
        
        # All requests should succeed
        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Total time should be reasonable
        self.assertLess(total_time, self.stress_threshold, 
                       f"Rapid requests time {total_time:.2f}s exceeds {self.stress_threshold}s threshold")
    
    def test_mixed_request_types_performance(self):
        """Test performance with mixed request types (valid and invalid)"""
        workflow_data = SAMPLE_WORKFLOWS['simple']
        
        with patch('requests.get') as mock_get:
            def side_effect(*args, **kwargs):
                # Return success for some requests, error for others
                if 'valid' in str(args):
                    return self.mock_n8n_api_success(workflow_data)
                else:
                    return self.mock_n8n_api_error(404, 'Not found')
            
            mock_get.side_effect = side_effect
            
            start_time = time.time()
            
            # Mix of valid and invalid requests
            responses = []
            for i in range(10):
                url = reverse('get_workflow_flowchart')
                workflow_id = f'valid-workflow-{i}' if i % 2 == 0 else f'invalid-workflow-{i}'
                data = {'workflow_id': workflow_id}
                response = self.client.post(url, data, format='json')
                responses.append(response)
            
            end_time = time.time()
            total_time = end_time - start_time
        
        # Check that we got mixed results
        success_count = sum(1 for r in responses if r.status_code == status.HTTP_200_OK)
        error_count = sum(1 for r in responses if r.status_code == status.HTTP_404_NOT_FOUND)
        
        self.assertGreater(success_count, 0, "Should have some successful requests")
        self.assertGreater(error_count, 0, "Should have some error requests")
        
        # Total time should be reasonable
        self.assertLess(total_time, self.stress_threshold, 
                       f"Mixed requests time {total_time:.2f}s exceeds {self.stress_threshold}s threshold")


if __name__ == '__main__':
    # Run performance tests if executed directly
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    
    if not settings.configured:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')
        django.setup()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['tests.test_mermaid_performance'])
    
    if failures:
        sys.exit(1)
    else:
        print("✅ All Mermaid chart performance tests passed!")
