"""
Test runner script for execution analytics API tests
"""

import os
import sys

# Add the Django project to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django settings for testing
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')

# Handle missing dependencies gracefully
try:
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    django.setup()
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Please install required dependencies:")
    print("pip uninstall decouple -y")
    print("pip install python-decouple==3.8 django djangorestframework django-cors-headers")
    sys.exit(1)

def run_tests():
    """Run all tests for the execution analytics API"""
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Test patterns to run
    test_patterns = [
        'tests.test_execution_analytics',
        'tests.test_integration',
        'tests.test_utils',
    ]
    
    failures = test_runner.run_tests(test_patterns)
    return failures

if __name__ == '__main__':
    failures = run_tests()
    if failures:
        sys.exit(1)
