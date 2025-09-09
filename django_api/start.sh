#!/bin/bash

# Debug database connection
echo "Database configuration:"
echo "DB_HOST: $DB_HOST"
echo "DB_NAME: $DB_NAME"
echo "DB_USER: $DB_USER"
echo "DB_PORT: $DB_PORT"

# Test database connection
echo "Testing database connection..."
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stencil_flow_api.settings')
django.setup()
from django.db import connection
try:
    with connection.cursor() as cursor:
        cursor.execute('SELECT current_database(), current_user, inet_server_addr();')
        result = cursor.fetchone()
        print(f'Connected to database: {result[0]}')
        print(f'Connected as user: {result[1]}')
        print(f'Server address: {result[2]}')
except Exception as e:
    print(f'Database connection failed: {e}')
"

# Create and run migrations
echo "Creating new migrations..."
python manage.py makemigrations --noinput

echo "Running database migrations..."
python manage.py migrate --noinput

# Start the application
echo "Starting Django application..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --timeout 120 stencil_flow_api.wsgi:application
