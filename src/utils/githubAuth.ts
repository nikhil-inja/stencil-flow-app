/**
 * GitHub OAuth utility functions for the Django backend
 */

import { config } from '@/config';
import toast from 'react-hot-toast';

interface GitHubConnectionStatus {
  is_connected: boolean;
  username?: string;
}

/**
 * Check if the current user's GitHub account is connected
 */
export async function checkGitHubConnection(): Promise<GitHubConnectionStatus> {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${config.API_BASE_URL}/functions/check-github-connection/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check GitHub connection');
  }

  return response.json();
}

/**
 * Initiate GitHub OAuth flow by redirecting to Django OAuth endpoint
 */
export function initiateGitHubOAuth(): void {
  const oauthUrl = `${config.GITHUB_OAUTH_URL}/`;
  window.location.href = oauthUrl;
}

/**
 * Connect an existing account to GitHub (for already authenticated users)
 */
export async function connectExistingAccountToGitHub(githubToken: string): Promise<void> {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${config.API_BASE_URL}/auth/github/connect/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      github_token: githubToken
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect GitHub account');
  }

  return response.json();
}

/**
 * Disconnect GitHub account
 */
export async function disconnectGitHub(): Promise<void> {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${config.API_BASE_URL}/functions/disconnect-github/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect GitHub account');
  }

  return response.json();
}

/**
 * Handle GitHub OAuth callback (used in OAuth callback component)
 */
export function handleOAuthCallback(): { accessToken: string | null; refreshToken: string | null; error: string | null } {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    accessToken: urlParams.get('access_token'),
    refreshToken: urlParams.get('refresh_token'),
    error: urlParams.get('error')
  };
}

/**
 * Show GitHub connection button with proper styling and loading states
 */
export function createGitHubConnectionHandler(
  isConnected: boolean,
  onConnectionChange?: (connected: boolean) => void
) {
  const handleConnect = async () => {
    try {
      if (isConnected) {
        // If already connected, this is a "refresh" action
        toast.loading('Refreshing GitHub connection...');
      } else {
        toast.loading('Connecting to GitHub...');
      }
      
      // Initiate OAuth flow
      initiateGitHubOAuth();
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Failed to connect GitHub: ${error.message}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      toast.loading('Disconnecting GitHub...');
      await disconnectGitHub();
      toast.dismiss();
      toast.success('GitHub account disconnected');
      onConnectionChange?.(false);
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Failed to disconnect GitHub: ${error.message}`);
    }
  };

  return { handleConnect, handleDisconnect };
}
