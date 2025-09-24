"""
Unit tests for the Execution Analytics API
"""

import json
from unittest.mock import patch, Mock
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.test import APITestCase
from rest_framework import status

from api.models import Workspace, Profile, N8nInstance
from api.serializers import ExecutionAnalyticsRequestSerializer, ExecutionAnalyticsResponseSerializer
from api.views import get_execution_analytics
from api.authentication import generate_jwt_token
from .test_utils import TestDataFactory, MockN8nResponseFactory, TestHelper


class ExecutionAnalyticsSerializerTests(TestCase):
    """Test serializers for execution analytics API"""
    
    def test_execution_analytics_request_serializer_valid(self):
        """Test valid request serializer"""
        data = {"workflow_id": "1000"}
        serializer = ExecutionAnalyticsRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['workflow_id'], "1000")
    
    def test_execution_analytics_request_serializer_missing_workflow_id(self):
        """Test request serializer with missing workflow_id"""
        data = {}
        serializer = ExecutionAnalyticsRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('workflow_id', serializer.errors)
    
    def test_execution_analytics_response_serializer_valid(self):
        """Test valid response serializer"""
        data = {
            "workflow_id": "1000",
            "total_executions": 10,
            "total_successful": 8,
            "total_failed": 2,
            "overall_success_percentage": 80.0,
            "daily_stats": [
                {
                    "date": "2025-01-15",
                    "total_executions": 5,
                    "successful_executions": 4,
                    "failed_executions": 1,
                    "success_percentage": 80.0
                }
            ],
            "period_start": "2025-01-15",
            "period_end": "2025-01-21"
        }
        serializer = ExecutionAnalyticsResponseSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_daily_execution_stats_serializer_valid(self):
        """Test daily execution stats serializer"""
        from api.serializers import DailyExecutionStatsSerializer
        
        data = {
            "date": "2025-01-15",
            "total_executions": 5,
            "successful_executions": 4,
            "failed_executions": 1,
            "success_percentage": 80.0
        }
        serializer = DailyExecutionStatsSerializer(data=data)
        self.assertTrue(serializer.is_valid())


class ExecutionAnalyticsAPITests(APITestCase):
    """Test the execution analytics API endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.user = TestDataFactory.create_test_user()
        self.workspace = TestDataFactory.create_test_workspace()
        self.profile = TestDataFactory.create_test_profile(self.user, self.workspace)
        self.n8n_instance = TestDataFactory.create_test_n8n_instance(self.workspace)
        
        # Generate JWT token for authentication
        self.token = generate_jwt_token(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_get_execution_analytics_success(self):
        """Test successful execution analytics request"""
        # Mock n8n API response
        mock_executions = [
            MockN8nResponseFactory.create_successful_execution(
                1001, 
                TestHelper.format_datetime_for_n8n(timezone.now() - timedelta(days=1))
            ),
            MockN8nResponseFactory.create_failed_execution(
                1002, 
                TestHelper.format_datetime_for_n8n(timezone.now() - timedelta(days=1))
            ),
            MockN8nResponseFactory.create_successful_execution(
                1003, 
                TestHelper.format_datetime_for_n8n(timezone.now())
            )
        ]
        
        mock_response_data = MockN8nResponseFactory.create_executions_response(mock_executions)
        
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
            
            # Assertions
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            
            self.assertEqual(data['workflow_id'], "1000")
            self.assertEqual(data['total_executions'], 3)
            self.assertEqual(data['total_successful'], 2)
            self.assertEqual(data['total_failed'], 1)
            self.assertAlmostEqual(data['overall_success_percentage'], 66.67, places=1)
            self.assertIn('daily_stats', data)
            self.assertIn('period_start', data)
            self.assertIn('period_end', data)
    
    def test_get_execution_analytics_no_master_instance(self):
        """Test execution analytics request when no master n8n instance exists"""
        # Delete the n8n instance
        self.n8n_instance.delete()
        
        response = self.client.post(
            '/api/functions/get-execution-analytics/',
            data=json.dumps({"workflow_id": "1000"}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())
        self.assertIn('No master n8n instance', response.json()['error'])
    
    def test_get_execution_analytics_invalid_workflow_id(self):
        """Test execution analytics request with invalid workflow ID"""
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.ok = False
            mock_get.return_value = mock_response
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "9999"}),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertIn('error', response.json())
            self.assertIn('Workflow 9999 not found', response.json()['error'])
    
    def test_get_execution_analytics_n8n_api_error(self):
        """Test execution analytics request when n8n API returns error"""
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.ok = False
            mock_get.return_value = mock_response
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertIn('error', response.json())
            self.assertIn('Invalid n8n API key', response.json()['error'])
    
    def test_get_execution_analytics_connection_error(self):
        """Test execution analytics request when n8n connection fails"""
        with patch('requests.get') as mock_get:
            import requests
            mock_get.side_effect = requests.exceptions.ConnectionError("Connection timeout")
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
            self.assertIn('error', response.json())
            self.assertIn('Failed to connect to n8n instance', response.json()['error'])
    
    def test_get_execution_analytics_missing_workflow_id(self):
        """Test execution analytics request without workflow_id"""
        response = self.client.post(
            '/api/functions/get-execution-analytics/',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('workflow_id', response.json())
    
    def test_get_execution_analytics_unauthenticated(self):
        """Test execution analytics request without authentication"""
        # Remove authentication
        self.client.credentials()
        
        response = self.client.post(
            '/api/functions/get-execution-analytics/',
            data=json.dumps({"workflow_id": "1000"}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_get_execution_analytics_daily_stats_calculation(self):
        """Test daily stats calculation over 7 days"""
        # Create executions for the past 7 days
        executions = []
        execution_id = 1000
        
        for i in range(7):
            date = timezone.now().date() - timedelta(days=6-i)
            # Add 3 successful and 1 failed execution per day
            for j in range(3):
                started_at = datetime.combine(date, datetime.min.time()).replace(tzinfo=timezone.utc)
                executions.append(
                    MockN8nResponseFactory.create_successful_execution(
                        execution_id,
                        TestHelper.format_datetime_for_n8n(started_at)
                    )
                )
                execution_id += 1
            
            started_at = datetime.combine(date, datetime.min.time()).replace(tzinfo=timezone.utc)
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
            
            response = self.client.post(
                '/api/functions/get-execution-analytics/',
                data=json.dumps({"workflow_id": "1000"}),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            
            # Check that we have 7 days of data
            self.assertEqual(len(data['daily_stats']), 7)
            
            # Check that each day has 4 executions (3 successful, 1 failed)
            for day_stat in data['daily_stats']:
                self.assertEqual(day_stat['total_executions'], 4)
                self.assertEqual(day_stat['successful_executions'], 3)
                self.assertEqual(day_stat['failed_executions'], 1)
                self.assertEqual(day_stat['success_percentage'], 75.0)
            
            # Check overall stats
            self.assertEqual(data['total_executions'], 28)  # 7 days * 4 executions
            self.assertEqual(data['total_successful'], 21)  # 7 days * 3 successful
            self.assertEqual(data['total_failed'], 7)  # 7 days * 1 failed
            self.assertEqual(data['overall_success_percentage'], 75.0)
    
    def test_get_execution_analytics_unfinished_executions(self):
        """Test handling of unfinished executions"""
        mock_executions = [
            MockN8nResponseFactory.create_unfinished_execution(
                1001,
                TestHelper.format_datetime_for_n8n(timezone.now())
            ),
            MockN8nResponseFactory.create_successful_execution(
                1002,
                TestHelper.format_datetime_for_n8n(timezone.now())
            )
        ]
        
        mock_response_data = MockN8nResponseFactory.create_executions_response(mock_executions)
        
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
            
            # Unfinished execution should be counted as failed
            self.assertEqual(data['total_executions'], 2)
            self.assertEqual(data['total_successful'], 1)
            self.assertEqual(data['total_failed'], 1)
            self.assertEqual(data['overall_success_percentage'], 50.0)
    
    def test_get_execution_analytics_empty_executions(self):
        """Test handling when no executions are returned"""
        mock_response_data = MockN8nResponseFactory.create_executions_response([])
        
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
            
            self.assertEqual(data['total_executions'], 0)
            self.assertEqual(data['total_successful'], 0)
            self.assertEqual(data['total_failed'], 0)
            self.assertEqual(data['overall_success_percentage'], 0.0)
            self.assertEqual(len(data['daily_stats']), 7)  # Still return 7 days with zero counts
