#!/usr/bin/env python
"""
Quick setup script to create test data for the superuser
Run this after creating the superuser to set up workspace and profile
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Workspace, Profile

def setup_test_data():
    print("Setting up test data...")
    
    # Get the superuser (assuming email: ripewatermelon351@gmail.com)
    try:
        user = User.objects.get(email='ripewatermelon351@gmail.com')
        print(f"Found user: {user.email}")
    except User.DoesNotExist:
        print("❌ User not found. Make sure you created the superuser first.")
        return
    
    # Create or get workspace
    workspace, created = Workspace.objects.get_or_create(
        name="Test Workspace",
        defaults={
            'description': 'Default workspace for testing'
        }
    )
    
    if created:
        print(f"✅ Created workspace: {workspace.name}")
    else:
        print(f"✅ Using existing workspace: {workspace.name}")
    
    # Create or get profile
    profile, created = Profile.objects.get_or_create(
        user=user,
        defaults={
            'workspace': workspace,
            'full_name': user.first_name + ' ' + user.last_name if user.first_name else user.username,
        }
    )
    
    if created:
        print(f"✅ Created profile for: {user.email}")
    else:
        print(f"✅ Using existing profile for: {user.email}")
    
    print("\n🎉 Test data setup complete!")
    print(f"User: {user.email}")
    print(f"Workspace: {workspace.name} (ID: {workspace.id})")
    print(f"Profile ID: {profile.id}")
    print("\nYou can now test the login!")

if __name__ == "__main__":
    setup_test_data()
