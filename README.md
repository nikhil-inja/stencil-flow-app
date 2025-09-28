# Stencil Flow - N8N Automation Management Platform

Stencil Flow is a comprehensive automation management platform that enables teams to create, deploy, and monitor N8N workflows across multiple client spaces with advanced analytics and GitHub integration.

## 🚀 Overview

Stencil Flow bridges the gap between automation development and deployment by providing a centralized platform for managing N8N workflows. It allows automation agencies to develop workflows once and deploy them to multiple client environments while maintaining full visibility through analytics and monitoring.

### Key Features

- **🔧 Automation Management**: Create, edit, and version control N8N workflows
- **🚀 Multi-Client Deployment**: Deploy automations to different client spaces with individual N8N instances
- **📊 Advanced Analytics**: Real-time execution analytics, success/failure rates, and performance monitoring
- **💰 AI Token Tracking**: Monitor and optimize AI service usage and costs
- **🔄 GitHub Integration**: Version control and automated deployment through GitHub repositories
- **👥 Team Collaboration**: Multi-user workspaces with role-based access control
- **📈 Visual Flow Charts**: Generate and visualize workflow diagrams using Mermaid.js

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **Modern UI**: Built with React 19, TypeScript, and Tailwind CSS
- **Component Library**: Radix UI components for accessible, polished interface
- **State Management**: Context-based session management with JWT authentication
- **Routing**: React Router for SPA navigation

### Backend Options
The application supports two backend configurations:

#### Option 1: Supabase (Legacy)
- **Database**: PostgreSQL with real-time subscriptions
- **Authentication**: Supabase Auth with GitHub OAuth
- **Edge Functions**: Deno-based serverless functions
- **Storage**: Supabase Storage for file management

#### Option 2: Django API (Current Migration Target)
- **Database**: PostgreSQL with Django ORM
- **Authentication**: JWT-based authentication
- **API**: Django REST Framework
- **Deployment**: AWS-ready (RDS, EC2, ECS)

## 📋 Core Functionality

### Automation Lifecycle
1. **Create**: Develop N8N workflows using the visual editor or import existing workflows
2. **Version**: Store workflow versions in Git repositories with change tracking
3. **Deploy**: Deploy to client-specific N8N instances with environment-specific configurations
4. **Monitor**: Track execution analytics, performance metrics, and error rates
5. **Optimize**: Use analytics to improve workflow efficiency and reduce costs

### Space Management
- **Client Spaces**: Organize deployments by client or project
- **N8N Instance Management**: Configure and manage multiple N8N instances per space
- **Deployment Tracking**: Monitor active deployments and their status

### Analytics Dashboard
- **Execution Analytics**: Success/failure rates, execution times, error tracking
- **AI Token Usage**: Cost tracking for AI services (OpenAI, Claude, etc.)
- **Performance Metrics**: Response times, throughput, and resource utilization
- **Visual Reports**: Interactive charts and graphs for data visualization

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Router** - Client-side routing
- **React Hot Toast** - Notification system

### Backend (Django)
- **Django 5.x** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure token-based auth
- **CORS** - Cross-origin resource sharing
- **AWS Integration** - Production deployment ready

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Local development environment
- **AWS** - Production deployment (RDS, EC2, ECS)
- **GitHub Actions** - CI/CD pipeline
- **Nginx** - Reverse proxy and static file serving

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 13+
- Docker (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stencil-flow-app
   ```

2. **Frontend Setup**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Backend Setup (Django)**
   ```bash
   cd django_api
   pip install -r requirements.txt
   cp env_template.txt .env
   # Edit .env with your database configuration
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

4. **Database Setup**
   ```bash
   createdb stencil_flow
   # Configure your .env file with database credentials
   ```

## 📚 Documentation

- [`django_api/README.md`](django_api/README.md) - Django API setup and deployment
- [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) - Supabase to Django migration guide
- [`ENVIRONMENT_SETUP.md`](ENVIRONMENT_SETUP.md) - Environment configuration
- [`ANALYTICS_DASHBOARD_DESIGN.md`](ANALYTICS_DASHBOARD_DESIGN.md) - Analytics implementation guide

## 🧪 Testing

The project includes comprehensive test suites:

- **Frontend**: Component testing with React Testing Library
- **Backend**: Django unit and integration tests
- **API**: Full API endpoint testing
- **Analytics**: Execution analytics test suite

```bash
# Backend tests
cd django_api
python manage.py test

# Frontend tests
npm test
```

## 🚢 Deployment

### Development
```bash
docker-compose up
```

### Production (AWS)
```bash
# Build and deploy to AWS
docker-compose -f docker-compose.prod.yml up
```

See [`django_api/README.md`](django_api/README.md) for detailed AWS deployment instructions.

## 🔄 Migration Status

The project is currently migrating from Supabase to Django:

- ✅ **Backend API**: Complete Django REST API
- ✅ **Database Models**: Full schema migration
- ✅ **Authentication**: JWT-based auth system
- 🔄 **Frontend Integration**: API client migration in progress
- ⏳ **Data Migration**: Supabase to Django data transfer
- ⏳ **Production Deployment**: AWS infrastructure setup
