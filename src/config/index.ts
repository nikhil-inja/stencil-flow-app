// src/config/index.ts
// Centralized configuration for environment variables

export const config = {
  // Server URL for API calls
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:8000',
  
  // API base URL
  API_BASE_URL: `${process.env.SERVER_URL || 'http://localhost:8000'}/api`,
  
  // GitHub OAuth redirect URL
  GITHUB_OAUTH_URL: `${process.env.SERVER_URL || 'http://localhost:8000'}/auth/github`,
  
  // GitHub OAuth callback URL
  GITHUB_OAUTH_CALLBACK_URL: `${window.location.origin}/auth/callback`,
} as const;

// Type-safe config access
export type Config = typeof config;
