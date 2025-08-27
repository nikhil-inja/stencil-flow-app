"""
JWT Authentication to replace Supabase Auth
"""

import jwt
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import authentication, exceptions
from datetime import datetime, timedelta


class JWTAuthentication(authentication.BaseAuthentication):
    """Custom JWT authentication class"""
    
    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()
        
        if not auth_header or auth_header[0].lower() != b'bearer':
            return None
            
        if len(auth_header) == 1:
            msg = 'Invalid token header. No credentials provided.'
            raise exceptions.AuthenticationFailed(msg)
        elif len(auth_header) > 2:
            msg = 'Invalid token header. Token string should not contain spaces.'
            raise exceptions.AuthenticationFailed(msg)
            
        try:
            token = auth_header[1].decode('utf-8')
        except UnicodeError:
            msg = 'Invalid token header. Token string should not contain invalid characters.'
            raise exceptions.AuthenticationFailed(msg)
            
        return self.authenticate_credentials(token)
    
    def authenticate_credentials(self, token):
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token.')
            
        try:
            user = User.objects.get(id=payload['user_id'])
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid token.')
            
        if not user.is_active:
            raise exceptions.AuthenticationFailed('User account is disabled.')
            
        return (user, token)


def generate_jwt_token(user):
    """Generate JWT token for user"""
    payload = {
        'user_id': str(user.id),
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(seconds=settings.JWT_ACCESS_TOKEN_LIFETIME),
        'iat': datetime.utcnow(),
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token


def generate_refresh_token(user):
    """Generate refresh token for user"""
    payload = {
        'user_id': str(user.id),
        'token_type': 'refresh',
        'exp': datetime.utcnow() + timedelta(seconds=settings.JWT_REFRESH_TOKEN_LIFETIME),
        'iat': datetime.utcnow(),
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token
