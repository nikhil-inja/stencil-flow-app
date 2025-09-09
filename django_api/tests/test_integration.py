"""
Integration tests for the Execution Analytics API
These tests verify the complete flow from API request to response
"""

import json
from unittest.mock import patch, Mock
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.test import APITestCase
from rest_framework import status

from api.models import Workspace, Profile, N8nInstance, Automation, Space, Deployment
from api.authentication import generate_jwt_token
from .test_utils import TestDataFactory, MockN8nResponseFactory, TestHelper


class ExecutionAnalyticsIntegrationTests(APITestCase):
    """Integration tests for execution analytics API"""
    
    def setUp(self):
        """Set up comprehensive test data"""
        # Create user and workspace
        self.user = TestDataFactory.create_test_user()
        self.workspace = TestDataFactory.create_test_workspace()
        self.profile = TestDataFactory.create_test_profile(self.user, self.workspace)
        
        # Create n8n instance
        self.n8n_instance = TestDataFactory.create_test_n8n_instance(
            self.workspace,
            instance_url="https://n8n.example.com",
            api_key="test-api-key-123"
        )
        
        # Create space and automation
        self.space = TestDataFactory.create_test_space(self.workspace)
        self.automation = TestDataFactory.create_test_automation(self.workspace)
        self.deployment = TestDataFactory.create_test_deployment(
            self.automation, 
            self.space, 
            n8n_workflow_id="1000"
        )
        
        # Generate JWT token for authentication
        from api.authentication import generate_jwt_token
        self.token = generate_jwt_token(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_full_execution_analytics_workflow(self):
        """Test complete workflow from request to response"""
        # Create realistic execution data spanning 7 days
        executions = []
        execution_id = 1000
        
        # Create varied execution patterns over 7 days
        for i in range(7):
            date = timezone.now().date() - timedelta(days=6-i)
            
            # Day 1: 2 successful, 1 failed
            if i == 0:
                counts = [(2, 1)]
            # Day 2: 5 successful, 0 failed
            elif i == 1:
                counts = [(5, 0)]
            # Day 3: 1 successful, 3 failed
            elif i == 2:
                counts = [(1, 3)]
            # Days 4-7: 3 successful, 1 failed each
            else:
                counts = [(3, 1)]
            
            for success_count, fail_count in counts:
                # Add successful executions
                for j in range(success_count):
                    started_at = datetime.combine(date, datetime.min.time()).replace(
                        tzinfo=timezone.utc
                    ) + timedelta(hours=j)
                    executions.append(
                        MockN8nResponseFactory.create_successful_execution(
                            execution_id,
                            TestHelper.format_datetime_for_n8n(started_at)
                        )
                    )
                    execution_id += 1
                
                # Add failed executions
                for j in range(fail_count):
                    started_at = datetime.combine(date, datetime.min.time()).replace(
                        tzinfo=timezone.utc
                    ) + timedelta(hours=j+10)
                    executions.append(
                        MockN8nResponseFactory.create_failed_execution(
                            execution_id,
                            TestHelper.format_datetime_for_n8n(started_at)
                        )
                    )
                    execution_id += 1
        
        mock_response_data = MockN8nResponseFactory.create_executions_response(executions)
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_response.ok = True
            mock_get.return_value = mock_response
            
            # Make API request
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            # Verify response
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            
            # Verify structure
            required_fields = [
                'workflow_id', 'total_executions', 'total_successful', 
                'total_failed', 'overall_success_percentage', 'daily_stats',
                'period_start', 'period_end'
            ]
            for field in required_fields:
                self.assertIn(field, data)
            
            # Verify daily stats structure
            self.assertEqual(len(data['daily_stats']), 7)
            for day_stat in data['daily_stats']:
                required_day_fields = [
                    'date', 'total_executions', 'successful_executions',
                    'failed_executions', 'success_percentage'
                ]
                for field in required_day_fields:
                    self.assertIn(field, day_stat)
            
            # Verify calculations
            total_executions = sum(day['total_executions'] for day in data['daily_stats'])
            total_successful = sum(day['successful_executions'] for day in data['daily_stats'])
            total_failed = sum(day['failed_executions'] for day in data['daily_stats'])
            
            self.assertEqual(data['total_executions'], total_executions)
            self.assertEqual(data['total_successful'], total_successful)
            self.assertEqual(data['total_failed'], total_failed)
            
            # Verify percentages are calculated correctly
            expected_percentage = (total_successful / total_executions * 100) if total_executions > 0 else 0
            self.assertAlmostEqual(data['overall_success_percentage'], expected_percentage, places=2)
    
    def test_execution_analytics_with_realistic_n8n_response(self):
        """Test with realistic n8n API response structure"""
        # Create a realistic n8n response with pagination
        executions = []
        for i in range(50):  # Simulate 50 executions
            date = timezone.now().date() - timedelta(days=i%7)
            started_at = datetime.combine(date, datetime.min.time()).replace(
                tzinfo=timezone.utc
            ) + timedelta(hours=i%24)
            
            if i % 4 == 0:  # 25% failure rate
                executions.append(
                    MockN8nResponseFactory.create_failed_execution(
                        1000 + i,
                        TestHelper.format_datetime_for_n8n(started_at)
                    )
                )
            else:
                executions.append(
                    MockN8nResponseFactory.create_successful_execution(
                        1000 + i,
                        TestHelper.format_datetime_for_n8n(started_at)
                    )
                )
        
        mock_response_data = {
            "data": executions,
            "nextCursor": "MTIzZTQ1NjctZTg5Yi0xMmQzLWENTYtNDI2NjE0MTc0MDA"
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_response.ok = True
            mock_get.return_value = mock_response
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            
            # Verify that only executions from the past 7 days are counted
            self.assertLessEqual(data['total_executions'], 50)
            
            # Verify that the response is properly structured
            self.assertIsInstance(data['daily_stats'], list)
            self.assertEqual(len(data['daily_stats']), 7)
    
    def test_execution_analytics_error_handling_integration(self):
        """Test error handling in integration scenarios"""
        # Test 500 error from n8n
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.ok = False
            mock_get.return_value = mock_response
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
            self.assertIn('n8n API error', response.json()['error'])
    
    def test_execution_analytics_with_malformed_n8n_response(self):
        """Test handling of malformed n8n responses"""
        # Test with missing 'data' field
        malformed_response = {
            "executions": [],  # Wrong field name
            "nextCursor": None
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = malformed_response
            mock_response.ok = True
            mock_get.return_value = mock_response
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            # Should handle gracefully and return empty results
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            self.assertEqual(data['total_executions'], 0)
    
    def test_execution_analytics_with_invalid_execution_data(self):
        """Test handling of executions with invalid timestamps"""
        executions = [
            # Valid execution
            MockN8nResponseFactory.create_successful_execution(
                1001,
                TestHelper.format_datetime_for_n8n(timezone.now())
            ),
            # Invalid timestamp
            {
                "id": 1002,
                "workflowId": "1000",
                "startedAt": "invalid-timestamp",
                "finished": True,
                "data": {}
            },
            # Missing startedAt
            {
                "id": 1003,
                "workflowId": "1000",
                "finished": True,
                "data": {}
            }
        ]
        
        mock_response_data = MockN8nResponseFactory.create_executions_response(executions)
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_response.ok = True
            mock_get.return_value = mock_response
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            # Should handle gracefully and only count valid executions
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            self.assertEqual(data['total_executions'], 1)  # Only the valid execution


class ExecutionAnalyticsPerformanceTests(TestCase):
    """Performance tests for execution analytics API"""
    
    def setUp(self):
        """Set up test data for performance tests"""
        self.user = TestDataFactory.create_test_user()
        self.workspace = TestDataFactory.create_test_workspace()
        self.profile = TestDataFactory.create_test_profile(self.user, self.workspace)
        self.n8n_instance = TestDataFactory.create_test_n8n_instance(self.workspace)
    
    def test_execution_analytics_with_large_dataset(self):
        """Test performance with large number of executions"""
        # Create 1000 executions
        executions = []
        for i in range(1000):
            date = timezone.now().date() - timedelta(days=i%7)
            started_at = datetime.combine(date, datetime.min.time()).replace(
                tzinfo=timezone.utc
            ) + timedelta(hours=i%24, minutes=i%60)
            
            executions.append(
                MockN8nResponseFactory.create_successful_execution(
                    1000 + i,
                    TestHelper.format_datetime_for_n8n(started_at)
                )
            )
        
        mock_response_data = MockN8nResponseFactory.create_executions_response(executions)
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_response.ok = True
            mock_get.return_value = mock_response
            
            # Time the request
            import time
            start_time = time.time()
            
            from api.views import get_execution_analytics
            from django.test import RequestFactory
            from api.authentication import generate_jwt_token
            
            factory = RequestFactory()
            token = generate_jwt_token(self.user)
            request = factory.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Bearer {token}'
            )
            request.user = self.user
            
            response = get_execution_analytics(request)
            
            end_time = time.time()
            processing_time = end_time - start_time
            
            # Should complete within reasonable time (adjust threshold as needed)
            self.assertLess(processing_time, 5.0)  # 5 seconds max
            self.assertEqual(response.status_code, status.HTTP_200_OK)
