# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth authentication for your Django API.

## Overview

The implementation provides three main OAuth endpoints:

1. **`/api/auth/github/`** - Initiates OAuth flow (redirects to GitHub)
2. **`/api/auth/github/callback/`** - Handles OAuth callback and token exchange
3. **`/api/auth/github/connect/`** - Connects existing accounts to GitHub

## Prerequisites

1. **GitHub OAuth App**: You've already created this and have:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_CALLBACK_URL`

2. **Environment Variables**: Ensure these are set in your `.env` file:
   ```bash
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   SITE_URL=http://localhost:3000  # Your frontend URL
   SECRET_KEY=your_django_secret_key
   JWT_SECRET_KEY=your_jwt_secret_key
   ```

## How It Works

### 1. OAuth Flow Initiation
- User clicks "Sign in with GitHub" button
- Frontend redirects to `/api/auth/github/`
- Django generates secure state parameter and redirects to GitHub
- GitHub shows authorization page to user

### 2. OAuth Callback
- GitHub redirects back to `/api/auth/github/callback/` with authorization code
- Django exchanges code for access token
- Django creates/updates user account and profile
- Django generates JWT tokens and redirects to frontend

### 3. User Creation/Update
- **New users**: Creates Django User, Profile, and Workspace
- **Existing users**: Updates profile with GitHub information
- **Token storage**: Securely stores encrypted GitHub access token

## Security Features

- **State parameter**: Prevents CSRF attacks
- **Session-based state**: Stores OAuth state in Django session
- **Token encryption**: GitHub tokens are encrypted before storage
- **Scope limitation**: Only requests `repo,user` scopes

## Database Changes

The implementation uses your existing models:
- `User` (Django's built-in User model)
- `Profile` (with GitHub fields: `github_username`, `github_user_id`, `avatar_url`)
- `GitHubToken` (for storing encrypted access tokens)
- `Workspace` (created automatically for new users)

## Frontend Integration

### 1. Add OAuth Button
```tsx
import GitHubOAuth from './components/GitHubOAuth';

// In your login page
<GitHubOAuth 
  onSuccess={() => console.log('Login successful')}
  onError={(error) => console.error('Login failed:', error)}
/>
```

### 2. Handle OAuth Callback
The `GitHubOAuth` component automatically:
- Detects OAuth callback parameters
- Stores JWT tokens in localStorage
- Refreshes user session
- Redirects to dashboard

### 3. Environment Variables
Add to your frontend `.env`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Testing

### 1. Test Configuration
```bash
cd django_api
python test_github_oauth.py
```

### 2. Test OAuth Flow
1. Start your Django server: `python manage.py runserver`
2. Start your frontend: `npm run dev`
3. Visit your login page and click "Sign in with GitHub"
4. Complete GitHub authorization
5. Verify you're redirected back with tokens

### 3. Check Database
```bash
python manage.py shell
```
```python
from api.models import User, Profile, GitHubToken
from api.models import Workspace

# Check created users
User.objects.all()
Profile.objects.all()
Workspace.objects.all()
```

## Troubleshooting

### Common Issues

1. **"Invalid state parameter"**
   - Check if Django sessions are working
   - Verify `SECRET_KEY` is set correctly

2. **"Failed to exchange code for token"**
   - Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
   - Check if callback URL matches GitHub OAuth app settings

3. **"OAuth callback failed"**
   - Check Django logs for detailed error messages
   - Verify database migrations are applied

4. **Frontend not receiving tokens**
   - Check `SITE_URL` setting matches your frontend URL
   - Verify CORS settings allow your frontend domain

### Debug Mode

Enable debug logging in Django settings:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'api': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

## Production Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Domain verification**: Update `SITE_URL` and GitHub OAuth app settings
3. **Token rotation**: Implement token refresh logic
4. **Rate limiting**: Add rate limiting to OAuth endpoints
5. **Monitoring**: Add logging and monitoring for OAuth flows

## API Endpoints Reference

### GET `/api/auth/github/`
- **Purpose**: Initiate OAuth flow
- **Response**: Redirects to GitHub authorization page
- **Permissions**: Public access

### GET `/api/auth/github/callback/`
- **Purpose**: Handle OAuth callback
- **Response**: Redirects to frontend with JWT tokens
- **Permissions**: Public access
- **Query Parameters**: `code`, `state`

### POST `/api/auth/github/connect/`
- **Purpose**: Connect existing account to GitHub
- **Request Body**: `{"github_token": "token"}`
- **Response**: `{"message": "success", "github_username": "username"}`
- **Permissions**: Authenticated users only

## Next Steps

1. **Test the implementation** with the provided test script
2. **Integrate the frontend component** into your login flow
3. **Customize the user creation logic** if needed
4. **Add additional GitHub scopes** if required
5. **Implement token refresh** for long-lived sessions

## Support

If you encounter issues:
1. Check Django logs for error messages
2. Verify all environment variables are set correctly
3. Test with the provided test script
4. Check GitHub OAuth app settings match your configuration
