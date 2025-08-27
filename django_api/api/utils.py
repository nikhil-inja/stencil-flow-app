"""
Utility functions for API operations
"""

import requests
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import hashlib


def get_encryption_key():
    """Generate encryption key from secret key"""
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_token(token):
    """Encrypt a token for secure storage"""
    f = Fernet(get_encryption_key())
    encrypted_token = f.encrypt(token.encode())
    return encrypted_token.decode()


def decrypt_token(encrypted_token):
    """Decrypt a stored token"""
    f = Fernet(get_encryption_key())
    decrypted_token = f.decrypt(encrypted_token.encode())
    return decrypted_token.decode()


def get_github_user_info(github_token):
    """Get GitHub user information using access token"""
    try:
        response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'token {github_token}'}
        )
        if response.ok:
            return response.json()
        return None
    except Exception:
        return None


def get_github_token_for_user(user):
    """Get decrypted GitHub token for user"""
    try:
        from .models import GitHubToken
        github_token_obj = GitHubToken.objects.get(user=user)
        return decrypt_token(github_token_obj.encrypted_token)
    except GitHubToken.DoesNotExist:
        return None
