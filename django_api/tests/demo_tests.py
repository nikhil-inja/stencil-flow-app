#!/usr/bin/env python3
"""
Simple test demonstration script for Execution Analytics API
This script shows how to run the tests and what to expect
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    missing_deps = []
    
    try:
        import django
    except ImportError:
        missing_deps.append("django")
    
    try:
        import rest_framework
    except ImportError:
        missing_deps.append("djangorestframework")
    
    try:
        import decouple
    except ImportError:
        missing_deps.append("python-decouple")
    
    try:
        import corsheaders
    except ImportError:
        missing_deps.append("django-cors-headers")
    
    if missing_deps:
        print("❌ Missing required dependencies:")
        for dep in missing_deps:
            print(f"   • {dep}")
        print("\n📦 Install missing dependencies:")
        print("   pip install python-decouple django djangorestframework django-cors-headers")
        print("\n   Or install from requirements file:")
        print("   pip install -r tests/requirements-test.txt")
        return False
    
    return True

def run_django_tests():
    """Run Django tests for the execution analytics API"""
    
    # Check dependencies first
    if not check_dependencies():
        return
    
    # Change to Django project directory
    django_dir = Path(__file__).parent.parent
    os.chdir(django_dir)
    
    print("🧪 Running Execution Analytics API Tests")
    print("=" * 50)
    
    # Test commands to run
    test_commands = [
        {
            "name": "Unit Tests",
            "command": ["python", "manage.py", "test", "tests.test_execution_analytics", "--verbosity=2"],
            "description": "Tests individual components and serializers"
        },
        {
            "name": "Integration Tests", 
            "command": ["python", "manage.py", "test", "tests.test_integration", "--verbosity=2"],
            "description": "Tests complete workflows and component interactions"
        },
        {
            "name": "All Tests",
            "command": ["python", "manage.py", "test", "tests", "--verbosity=2"],
            "description": "Runs the complete test suite"
        }
    ]
    
    for test_info in test_commands:
        print(f"\n📋 {test_info['name']}")
        print(f"   {test_info['description']}")
        print(f"   Command: {' '.join(test_info['command'])}")
        print("-" * 30)
        
        try:
            result = subprocess.run(
                test_info['command'],
                capture_output=True,
                text=True,
                timeout=60  # 60 second timeout
            )
            
            if result.returncode == 0:
                print("✅ Tests passed!")
                # Show summary if available
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'Ran' in line and 'test' in line:
                        print(f"   {line.strip()}")
            else:
                print("❌ Tests failed!")
                print("STDOUT:", result.stdout)
                print("STDERR:", result.stderr)
                
        except subprocess.TimeoutExpired:
            print("⏰ Tests timed out after 60 seconds")
        except FileNotFoundError:
            print("❌ Django manage.py not found. Make sure you're in the correct directory.")
        except Exception as e:
            print(f"❌ Error running tests: {e}")
    
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    print("The test suite includes:")
    print("• Serializer validation tests")
    print("• API endpoint functionality tests") 
    print("• Error handling scenarios")
    print("• Authentication and authorization tests")
    print("• Integration workflow tests")
    print("• Performance tests with large datasets")
    print("• Mock n8n API response handling")
    print("\nFor detailed test documentation, see:")
    print("• django_api/tests/README.md")
    print("• django_api/EXECUTION_ANALYTICS_API.md")

def show_test_structure():
    """Show the test directory structure"""
    print("\n📁 Test Directory Structure")
    print("=" * 30)
    
    tests_dir = Path(__file__).parent
    for file_path in sorted(tests_dir.rglob("*.py")):
        if file_path.name != "__pycache__":
            relative_path = file_path.relative_to(tests_dir)
            print(f"   {relative_path}")

def show_test_examples():
    """Show example test cases"""
    print("\n🔍 Example Test Cases")
    print("=" * 30)
    
    examples = [
        {
            "name": "test_get_execution_analytics_success",
            "description": "Tests successful API call with mock n8n data",
            "assertions": ["HTTP 200 response", "Correct execution counts", "Valid daily stats"]
        },
        {
            "name": "test_get_execution_analytics_no_master_instance", 
            "description": "Tests error when no n8n instance is configured",
            "assertions": ["HTTP 400 response", "Error message about missing instance"]
        },
        {
            "name": "test_get_execution_analytics_daily_stats_calculation",
            "description": "Tests daily statistics calculation over 7 days",
            "assertions": ["7 days of data", "Correct success percentages", "Proper aggregation"]
        },
        {
            "name": "test_execution_analytics_with_large_dataset",
            "description": "Tests performance with 1000 executions",
            "assertions": ["Response time < 5 seconds", "Correct data processing", "Memory efficiency"]
        }
    ]
    
    for example in examples:
        print(f"\n📝 {example['name']}")
        print(f"   Purpose: {example['description']}")
        print("   Verifies:")
        for assertion in example['assertions']:
            print(f"     • {assertion}")

if __name__ == "__main__":
    print("🚀 Execution Analytics API Test Suite")
    print("=" * 50)
    
    # Show test structure
    show_test_structure()
    
    # Show example test cases
    show_test_examples()
    
    # Ask user if they want to run tests
    print("\n" + "=" * 50)
    response = input("Would you like to run the tests? (y/n): ").lower().strip()
    
    if response in ['y', 'yes']:
        run_django_tests()
    else:
        print("\n📚 To run tests manually, use:")
        print("   python manage.py test tests")
        print("   python manage.py test tests.test_execution_analytics")
        print("   python manage.py test tests.test_integration")
        print("\nFor more information, see django_api/tests/README.md")
