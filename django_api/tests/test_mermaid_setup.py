"""
Setup and configuration for Mermaid chart generation tests
This file helps set up the test environment and provides utilities
"""

import os
import sys
import django
from django.conf import settings

def setup_test_environment():
    """Set up Django test environment"""
    # Add Django project to path
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, project_root)
    
    # Configure Django settings
    if not settings.configured:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')
        django.setup()
    
    return True

def check_test_dependencies():
    """Check if all test dependencies are available"""
    required_modules = [
        'django',
        'rest_framework',
        'django.contrib.auth',
        'unittest.mock',
        'psutil'  # For performance tests
    ]
    
    missing_modules = []
    
    for module in required_modules:
        try:
            __import__(module)
        except ImportError:
            missing_modules.append(module)
    
    if missing_modules:
        print("❌ Missing test dependencies:")
        for module in missing_modules:
            print(f"   - {module}")
        print("\nInstall with:")
        print(f"pip install {' '.join(missing_modules)}")
        return False
    
    print("✅ All test dependencies are available")
    return True

def get_test_database_config():
    """Get test database configuration"""
    return {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 20,
        },
    }

def get_test_settings():
    """Get test-specific settings"""
    return {
        'DEBUG': True,
        'SECRET_KEY': 'test-secret-key-for-mermaid-tests',
        'DATABASES': {
            'default': get_test_database_config()
        },
        'INSTALLED_APPS': [
            'django.contrib.auth',
            'django.contrib.contenttypes',
            'rest_framework',
            'api',
        ],
        'MIDDLEWARE': [
            'django.middleware.security.SecurityMiddleware',
            'django.contrib.sessions.middleware.SessionMiddleware',
            'django.middleware.common.CommonMiddleware',
            'django.middleware.csrf.CsrfViewMiddleware',
            'django.contrib.auth.middleware.AuthenticationMiddleware',
        ],
        'ROOT_URLCONF': 'api.urls',
        'REST_FRAMEWORK': {
            'DEFAULT_AUTHENTICATION_CLASSES': [
                'api.authentication.JWTAuthentication',
            ],
            'DEFAULT_PERMISSION_CLASSES': [
                'rest_framework.permissions.IsAuthenticated',
            ],
        },
        'LOGGING': {
            'version': 1,
            'disable_existing_loggers': False,
            'handlers': {
                'console': {
                    'level': 'WARNING',
                    'class': 'logging.StreamHandler',
                },
            },
            'loggers': {
                'django': {
                    'handlers': ['console'],
                    'level': 'WARNING',
                    'propagate': True,
                },
            },
        },
    }

if __name__ == '__main__':
    # Check dependencies
    if check_test_dependencies():
        print("✅ Test environment is ready")
        setup_test_environment()
        print("✅ Django test environment configured")
    else:
        print("❌ Test environment setup failed")
        sys.exit(1)
