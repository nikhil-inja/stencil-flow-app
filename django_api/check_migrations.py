#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/app')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def check_migrations():
    print("Checking database migration status...")
    
    # Check if migrations are needed
    execute_from_command_line(['manage.py', 'showmigrations'])
    
    # Check if specific tables exist
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'api_%'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        print(f"\nFound {len(tables)} API tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check specifically for api_profile
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'api_profile'
            );
        """)
        profile_exists = cursor.fetchone()[0]
        print(f"\napi_profile table exists: {profile_exists}")

if __name__ == '__main__':
    check_migrations()
