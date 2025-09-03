# Environment Setup Guide

## Frontend Environment Variables

### 1. Create Environment File
Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

### 2. Configure Server URL
Edit `.env` file and set your `SERVER_URL`:

```bash
# Local Development
SERVER_URL=http://localhost:8000

# Development/Staging
# SERVER_URL=https://your-dev-server.com

# Production
# SERVER_URL=https://your-production-server.com
```

### 3. Available Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SERVER_URL` | Base URL for Django API server | `http://localhost:8000` | `https://api.stencilflow.com` |

## Backend Environment Variables

### 1. Django Environment
Create a `.env` file in the `django_api/` directory:

```bash
cd django_api
cp env_template.txt .env
```

### 2. Required Variables
```bash
# Database
DB_NAME=stencil_flow
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# GitHub OAuth (when implementing OAuth)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT
JWT_SECRET_KEY=your_jwt_secret
SECRET_KEY=your_django_secret

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Switching Environments

### Local Development
```bash
# Frontend
SERVER_URL=http://localhost:8000

# Backend
DB_HOST=localhost
DB_PORT=5432
```

### Development/Staging
```bash
# Frontend
SERVER_URL=https://dev-api.stencilflow.com

# Backend
DB_HOST=your-dev-db-host
DB_PORT=5432
```

### Production
```bash
# Frontend
SERVER_URL=https://api.stencilflow.com

# Backend
DB_HOST=your-prod-db-host
DB_PORT=5432
```

## How It Works

1. **Frontend**: Uses `SERVER_URL` from `.env` file
2. **Config**: Centralized in `src/config/index.ts`
3. **API Calls**: All use `config.API_BASE_URL`
4. **OAuth**: Uses `config.GITHUB_OAUTH_URL`

## Benefits

- ✅ **Easy switching** between environments
- ✅ **Centralized configuration** in one place
- ✅ **No hardcoded URLs** in the codebase
- ✅ **Environment-specific settings** for different deployments
- ✅ **Type-safe configuration** with TypeScript

## Troubleshooting

### Environment Variable Not Working?
1. Check if `.env` file exists in root directory
2. Verify variable name is `SERVER_URL` (not `VITE_SERVER_URL`)
3. Restart your development server after changing `.env`
4. Check browser console for any errors

### API Calls Failing?
1. Verify `SERVER_URL` is correct
2. Check if Django server is running on that URL
3. Ensure CORS is configured for your frontend URL
4. Check network tab in browser dev tools
