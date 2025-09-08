// src/config/index.ts
// Centralized configuration for environment variables

// Prefer a runtime origin when available (e.g., CloudFront),
// otherwise fall back to VITE_SERVER_URL (dev/prod override),
// and finally to localhost for local development.
const RUNTIME_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';
const BASE_SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) || RUNTIME_ORIGIN || 'http://localhost:8000';

export const config = {
  // Server URL used by the app (for display / redirects)
  SERVER_URL: BASE_SERVER_URL,

  // API base URL. If CloudFront routes /api/* to the ALB, using same-origin works.
  API_BASE_URL: `${BASE_SERVER_URL}/api`,

  // GitHub OAuth redirect entrypoint on the backend
  GITHUB_OAUTH_URL: `${BASE_SERVER_URL}/api/auth/github`,

  // Frontend callback (handled client-side)
  GITHUB_OAUTH_CALLBACK_URL: `${RUNTIME_ORIGIN || BASE_SERVER_URL}/auth/callback`,
} as const;

// Type-safe config access
export type Config = typeof config;
