# Environment Setup Guide

This guide provides comprehensive instructions for setting up environment variables for the Stencil Flow application.

## 📋 Quick Setup

### 1. Root Directory Setup (Frontend + Backend)
```bash
# Copy the example environment file
cp example_env.txt .env

# Edit the file with your actual values
nano .env
```

### 2. Django API Setup (Backend Only)
```bash
# Navigate to Django API directory
cd django_api

# Copy the template
cp env_template.txt .env

# Edit with your values
nano .env
```

## 🔧 Environment Files Overview

The project uses multiple environment files for different purposes:

| File | Purpose | Location |
|------|---------|----------|
| `.env` | Main environment file (frontend + backend) | Root directory |
| `django_api/.env` | Backend-specific configuration | django_api/ |
| `example_env.txt` | Development template | Root directory |
| `example_env.production.txt` | Production template | Root directory |

## 📝 Required Environment Variables

### 🎯 **Critical (Required for basic functionality)**

```bash
# Database
DB_NAME=stencil_flow
DB_USER=postgres  
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# Security
SECRET_KEY=your-django-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# GitHub OAuth (required for user authentication)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 🔄 **Important (Required for full functionality)**

```bash
# Frontend-Backend Communication
VITE_SERVER_URL=http://localhost:8000
SERVER_URL=http://localhost:8000
SITE_URL=http://localhost:3000

# N8N Integration
DEFAULT_N8N_INSTANCE_URL=https://your-n8n-instance.com
DEFAULT_N8N_API_KEY=your-n8n-api-key
```

### ⭐ **Optional (Enhanced features)**

```bash
# AI Features
OPENAI_API_KEY=sk-your-openai-api-key

# AWS Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
```

## 🚀 Setup Instructions

### Step 1: Database Setup
```bash
# Install PostgreSQL (if not already installed)
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Create database
createdb stencil_flow
```

### Step 2: GitHub OAuth Setup
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create a new OAuth App with:
   - Application name: `Stencil Flow Local`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:8000/api/auth/github/callback/`
3. Copy the Client ID and Client Secret to your .env file

### Step 3: Environment File Setup
```bash
# Root directory
cp example_env.txt .env

# Django API directory  
cd django_api
cp env_template.txt .env
cd ..

# Edit both files with your actual values
```

### Step 4: Install Dependencies
```bash
# Frontend
npm install

# Backend
cd django_api
pip install -r requirements.txt
cd ..
```

### Step 5: Django Setup
```bash
cd django_api

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Step 6: Frontend Setup
```bash
# Start development server (in root directory)
npm run dev
```

## 🏭 Production Configuration

### Environment Differences

| Variable | Development | Production |
|----------|-------------|------------|
| `DEBUG` | `True` | `False` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | `your-domain.com` |
| `CORS_ALLOW_ALL_ORIGINS` | `True` | `False` |
| `VITE_SERVER_URL` | `http://localhost:8000` | `https://your-domain.com` |
| `DB_HOST` | `localhost` | `your-rds-endpoint.amazonaws.com` |

### Production Setup
```bash
# Use production template
cp example_env.production.txt .env.production

# Update Django settings to use production env
export DJANGO_SETTINGS_MODULE=stencil_flow_api.settings.production
```

## 🔐 Security Best Practices

### Secret Generation
```bash
# Generate Django SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Generate JWT secret (different from Django secret)
openssl rand -base64 64
```

### Production Security Checklist
- [ ] Set `DEBUG=False`
- [ ] Use strong, unique passwords (min 32 characters)
- [ ] Restrict `ALLOWED_HOSTS` to specific domains
- [ ] Set `CORS_ALLOW_ALL_ORIGINS=False`
- [ ] Use HTTPS for all URLs
- [ ] Store secrets in AWS Secrets Manager
- [ ] Enable database encryption
- [ ] Use IAM roles instead of access keys when possible

## 🔍 Troubleshooting

### Common Issues

**1. Database Connection Error**
```bash
# Check PostgreSQL is running
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Verify database exists
psql -l | grep stencil_flow
```

**2. CORS Errors**
```bash
# Verify CORS_ALLOWED_ORIGINS includes your frontend URL
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**3. GitHub OAuth Issues**
- Verify callback URL matches exactly
- Check client ID and secret are correct
- Ensure OAuth app is not suspended

**4. Frontend Can't Connect to Backend**
```bash
# Verify VITE_SERVER_URL is correct
echo $VITE_SERVER_URL

# Check Django server is running
curl http://localhost:8000/api/health/
```

### Environment Variable Debugging
```bash
# Check if variables are loaded (Django)
python manage.py shell
>>> from django.conf import settings
>>> print(settings.SECRET_KEY[:10] + "...")

# Check frontend variables
console.log(import.meta.env.VITE_SERVER_URL)
```

## 📚 Additional Resources

- [Django Settings Documentation](https://docs.djangoproject.com/en/4.2/topics/settings/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [PostgreSQL Installation](https://www.postgresql.org/download/)

## 🆘 Need Help?

If you encounter issues:
1. Check this guide first
2. Verify all required variables are set
3. Check the console/logs for specific error messages
4. Ensure all services are running (PostgreSQL, Django, Vite)
5. Create an issue with detailed error information

