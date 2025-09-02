#!/usr/bin/env python3
"""
Test script to verify GitHub OAuth configuration
Run this after setting up your environment variables
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')

# Setup Django
django.setup()

from django.conf import settings

def test_github_oauth_config():
    """Test GitHub OAuth configuration"""
    print("🔍 Testing GitHub OAuth Configuration...")
    print("=" * 50)
    
    # Check required settings
    required_settings = [
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'SITE_URL',
        'SERVER_URL',
        'SECRET_KEY',
        'JWT_SECRET_KEY'
    ]
    
    missing_settings = []
    for setting in required_settings:
        value = getattr(settings, setting, None)
        if not value:
            missing_settings.append(setting)
        else:
            # Mask sensitive values
            if 'SECRET' in setting or 'KEY' in setting:
                display_value = f"{value[:8]}..." if len(value) > 8 else "***"
            else:
                display_value = value
            print(f"✅ {setting}: {display_value}")
    
    if missing_settings:
        print(f"\n❌ Missing required settings: {', '.join(missing_settings)}")
        print("\nPlease check your .env file and ensure all required variables are set.")
        return False
    
    # Test OAuth URL construction
    from urllib.parse import urlencode
    
    oauth_params = {
        'client_id': settings.GITHUB_CLIENT_ID,
        'redirect_uri': f"{settings.SERVER_URL}/api/auth/github/callback/",
        'scope': 'repo,user',
        'state': 'test_state',
        'response_type': 'code'
    }
    
    oauth_url = f"https://github.com/login/oauth/authorize?{urlencode(oauth_params)}"
    
    print(f"\n🔗 GitHub OAuth URL:")
    print(f"   {oauth_url}")
    
    print(f"\n📋 Django Callback URL (GitHub → Django):")
    print(f"   {settings.SERVER_URL}/api/auth/github/callback/")
    
    print(f"\n🎯 Frontend Callback URL (Django → Frontend):")
    print(f"   {settings.SITE_URL}/auth/callback")
    
    print(f"\n✅ Configuration looks good!")
    print(f"\nNext steps:")
    print(f"1. Ensure your GitHub OAuth app has the correct callback URL")
    print(f"2. Test the OAuth flow by visiting: {oauth_url}")
    print(f"3. Check your Django logs for any errors")
    
    return True

if __name__ == '__main__':
    try:
        test_github_oauth_config()
    except Exception as e:
        print(f"\n❌ Error testing configuration: {e}")
        sys.exit(1)
