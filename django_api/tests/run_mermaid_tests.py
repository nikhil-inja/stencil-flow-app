#!/usr/bin/env python3
"""
Test runner for Mermaid chart generation tests
Runs all Mermaid-related tests with proper configuration and reporting
"""

import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner
from django.core.management import execute_from_command_line

# Add Django project to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def setup_django():
    """Set up Django for testing"""
    if not settings.configured:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')
        django.setup()

def run_mermaid_tests():
    """Run all Mermaid chart generation tests"""
    setup_django()
    
    # Test modules to run
    test_modules = [
        'tests.test_mermaid_chart_generation',
        'tests.test_mermaid_performance',
    ]
    
    print("🧪 Running Mermaid Chart Generation Tests")
    print("=" * 50)
    
    # Get test runner
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2, interactive=False)
    
    # Run tests
    failures = test_runner.run_tests(test_modules)
    
    if failures:
        print("\n❌ Some Mermaid chart tests failed!")
        return False
    else:
        print("\n✅ All Mermaid chart tests passed!")
        return True

def run_specific_test(test_name):
    """Run a specific test"""
    setup_django()
    
    print(f"🧪 Running specific test: {test_name}")
    print("=" * 50)
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2, interactive=False)
    
    failures = test_runner.run_tests([test_name])
    
    if failures:
        print(f"\n❌ Test {test_name} failed!")
        return False
    else:
        print(f"\n✅ Test {test_name} passed!")
        return True

def run_performance_tests_only():
    """Run only performance tests"""
    setup_django()
    
    print("🚀 Running Mermaid Chart Performance Tests")
    print("=" * 50)
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2, interactive=False)
    
    failures = test_runner.run_tests(['tests.test_mermaid_performance'])
    
    if failures:
        print("\n❌ Some performance tests failed!")
        return False
    else:
        print("\n✅ All performance tests passed!")
        return True

def run_unit_tests_only():
    """Run only unit tests"""
    setup_django()
    
    print("🔬 Running Mermaid Chart Unit Tests")
    print("=" * 50)
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2, interactive=False)
    
    failures = test_runner.run_tests(['tests.test_mermaid_chart_generation'])
    
    if failures:
        print("\n❌ Some unit tests failed!")
        return False
    else:
        print("\n✅ All unit tests passed!")
        return True

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = [
        'django',
        'djangorestframework',
        'python-decouple',
        'openai',
        'psutil'  # For performance tests
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\nInstall missing packages with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All required dependencies are installed")
    return True

def show_test_summary():
    """Show summary of available tests"""
    print("📋 Mermaid Chart Generation Test Suite")
    print("=" * 50)
    print()
    print("Available test modules:")
    print("  📝 tests.test_mermaid_chart_generation")
    print("     - Serializer tests")
    print("     - Template generation tests")
    print("     - LLM generation tests")
    print("     - API endpoint tests")
    print("     - Integration tests")
    print()
    print("  🚀 tests.test_mermaid_performance")
    print("     - Response time tests")
    print("     - Memory usage tests")
    print("     - Scalability tests")
    print("     - Stress tests")
    print()
    print("Usage:")
    print("  python run_mermaid_tests.py                    # Run all tests")
    print("  python run_mermaid_tests.py --unit             # Run unit tests only")
    print("  python run_mermaid_tests.py --performance      # Run performance tests only")
    print("  python run_mermaid_tests.py --check-deps       # Check dependencies")
    print("  python run_mermaid_tests.py --summary          # Show this summary")

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg == '--unit':
            success = run_unit_tests_only()
        elif arg == '--performance':
            success = run_performance_tests_only()
        elif arg == '--check-deps':
            success = check_dependencies()
        elif arg == '--summary':
            show_test_summary()
            success = True
        elif arg.startswith('--test='):
            test_name = arg.split('=')[1]
            success = run_specific_test(test_name)
        else:
            print(f"Unknown argument: {arg}")
            print("Use --help for usage information")
            success = False
    else:
        # Check dependencies first
        if not check_dependencies():
            sys.exit(1)
        
        # Run all tests
        success = run_mermaid_tests()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
