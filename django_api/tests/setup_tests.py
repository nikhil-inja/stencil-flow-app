#!/usr/bin/env python3
"""
Setup script for Execution Analytics API tests
This script helps install dependencies and run tests
"""

import subprocess
import sys
import os
from pathlib import Path

def install_dependencies():
    """Install required dependencies for testing"""
    print("📦 Installing test dependencies...")
    
    # Fix decouple issue by uninstalling and reinstalling
    print("🔧 Fixing python-decouple issue...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "uninstall", "python-decouple", "-y"], 
                            capture_output=True)
    except:
        pass  # Ignore if not installed
    
    dependencies = [
        "python-decouple==3.8",  # Use specific version that works
        "django",
        "djangorestframework", 
        "django-cors-headers",
        "pytest",
        "pytest-django",
        "coverage"
    ]
    
    try:
        for dep in dependencies:
            print(f"Installing {dep}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
        print("✅ All dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    missing_deps = []
    
    try:
        import django
        print("✅ Django installed")
    except ImportError:
        missing_deps.append("django")
    
    try:
        import rest_framework
        print("✅ Django REST Framework installed")
    except ImportError:
        missing_deps.append("djangorestframework")
    
    try:
        from decouple import config
        print("✅ python-decouple installed and working")
    except ImportError as e:
        print(f"❌ python-decouple issue: {e}")
        missing_deps.append("python-decouple")
    
    try:
        import corsheaders
        print("✅ django-cors-headers installed")
    except ImportError:
        missing_deps.append("django-cors-headers")
    
    if missing_deps:
        print(f"\n❌ Missing or broken dependencies: {', '.join(missing_deps)}")
        return False
    
    print("\n✅ All required dependencies are installed!")
    return True

def run_tests():
    """Run the test suite"""
    print("\n🧪 Running Execution Analytics API Tests")
    print("=" * 50)
    
    # Change to Django project directory
    django_dir = Path(__file__).parent.parent
    os.chdir(django_dir)
    
    try:
        # Run tests using Django's test runner
        result = subprocess.run([
            sys.executable, "manage.py", "test", "tests", "--verbosity=2"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ All tests passed!")
            print("\nTest Results:")
            print(result.stdout)
        else:
            print("❌ Some tests failed!")
            print("\nError Output:")
            print(result.stderr)
            print("\nStandard Output:")
            print(result.stdout)
            
    except FileNotFoundError:
        print("❌ Django manage.py not found. Make sure you're in the correct directory.")
    except Exception as e:
        print(f"❌ Error running tests: {e}")

def main():
    """Main setup and test function"""
    print("🚀 Execution Analytics API Test Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("manage.py").exists():
        print("❌ manage.py not found. Please run this script from the django_api directory.")
        return
    
    # Check dependencies
    if not check_dependencies():
        print("\n📦 Installing missing dependencies...")
        if not install_dependencies():
            print("❌ Failed to install dependencies. Please install manually:")
            print("pip install python-decouple django djangorestframework django-cors-headers")
            return
    
    # Ask user if they want to run tests
    print("\n" + "=" * 50)
    response = input("Would you like to run the tests now? (y/n): ").lower().strip()
    
    if response in ['y', 'yes']:
        run_tests()
    else:
        print("\n📚 To run tests manually later, use:")
        print("   python manage.py test tests")
        print("   python manage.py test tests.test_execution_analytics")
        print("   python manage.py test tests.test_integration")

if __name__ == "__main__":
    main()
