# Stencil Flow Django API

A Django REST API backend to replace Supabase functionality for the Stencil Flow application.

## Features

- **Complete Supabase Replacement**: All edge functions converted to Django REST endpoints
- **JWT Authentication**: Custom JWT authentication replacing Supabase Auth
- **PostgreSQL Database**: Full database schema migration from Supabase
- **GitHub Integration**: Secure token storage and GitHub API interactions
- **N8N Workflow Management**: Complete automation deployment pipeline
- **AWS Ready**: Prepared for AWS deployment (RDS, EC2, S3)

## Quick Setup

### 1. Environment Setup

Create a `.env` file in the `django_api` directory:

```env
# Database Configuration
DB_NAME=stencil_flow
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django Settings
SECRET_KEY=your-super-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Site Configuration
SITE_URL=http://localhost:3000

# AWS Configuration (Optional)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=your_bucket
AWS_REGION=us-east-1
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb stencil_flow

# Install dependencies
cd django_api
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### 3. Data Migration from Supabase

Use the provided migration scripts to transfer your data:

```bash
# Export data from Supabase
python manage.py export_supabase_data

# Import data to Django
python manage.py import_supabase_data
```

## API Endpoints

### Authentication
- `POST /api/auth/signin/` - Sign in with email/password
- `GET /api/auth/session/` - Get current session

### Functions (Supabase Edge Function Equivalents)
- `POST /api/functions/create-automation/` - Create new automation
- `POST /api/functions/deploy-automation/` - Deploy automation to client
- `POST /api/functions/invite-user/` - Invite user to workspace
- `POST /api/functions/accept-invite/` - Accept workspace invitation
- `POST /api/functions/store-github-token/` - Store GitHub token securely
- `GET /api/functions/check-github-connection/` - Check GitHub connection

### CRUD Endpoints
- `GET/POST /api/automations/` - List/Create automations
- `GET/PUT/DELETE /api/automations/{id}/` - Automation details
- `GET/POST /api/clients/` - List/Create clients
- `GET/PUT/DELETE /api/clients/{id}/` - Client details
- `GET/POST /api/n8n-instances/` - List/Create N8N instances
- `GET /api/deployments/` - List deployments

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Django API     │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│  - API Client   │────│  - REST Views   │────│  - Models       │
│  - Components   │    │  - JWT Auth     │    │  - Relationships│
│  - State Mgmt   │    │  - Serializers  │    │  - Constraints  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                       ┌─────────────────┐
                       │  External APIs  │
                       │                 │
                       │  - GitHub API   │
                       │  - N8N API      │
                       └─────────────────┘
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Token Encryption**: GitHub tokens encrypted at rest
- **CORS Protection**: Configurable CORS policies
- **SQL Injection Protection**: Django ORM prevents SQL injection
- **XSS Protection**: Built-in Django security features

## Deployment

### AWS Deployment

1. **RDS Setup**:
   ```bash
   # Create RDS PostgreSQL instance
   aws rds create-db-instance \
     --db-instance-identifier stencil-flow-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username postgres \
     --master-user-password yourpassword \
     --allocated-storage 20
   ```

2. **EC2 Setup**:
   ```bash
   # Deploy to EC2 with provided scripts
   ./deploy/deploy_to_aws.sh
   ```

3. **Environment Variables**:
   ```bash
   # Set production environment variables
   export DEBUG=False
   export ALLOWED_HOSTS=your-domain.com
   export DB_HOST=your-rds-endpoint
   ```

## Development

### Running Tests
```bash
python manage.py test
```

### Code Quality
```bash
# Linting
flake8 .

# Type checking
mypy .

# Security check
bandit -r .
```

### Database Commands
```bash
# Reset database
python manage.py flush

# Create migrations
python manage.py makemigrations

# Show SQL for migrations
python manage.py sqlmigrate api 0001
```

## Migration from Supabase

The migration process involves:

1. **Database Schema**: All Supabase tables recreated as Django models
2. **Authentication**: Supabase Auth replaced with JWT authentication
3. **Edge Functions**: All functions converted to Django REST views
4. **File Storage**: Supabase Storage can be replaced with AWS S3
5. **Real-time**: Supabase Realtime can be replaced with Django Channels

### Migration Checklist

- [ ] Database schema migrated
- [ ] User authentication working
- [ ] All edge functions converted
- [ ] Frontend API client integrated
- [ ] GitHub OAuth configured
- [ ] Data migrated from Supabase
- [ ] Testing completed
- [ ] Production deployment ready

## Support

For issues and questions:
1. Check the Django logs: `tail -f django.log`
2. Verify database connections
3. Check API endpoint responses
4. Review authentication token flow

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
