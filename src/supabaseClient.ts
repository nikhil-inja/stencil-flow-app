// src/supabaseClient.ts
// DEPRECATED: This file is being replaced by apiClient.ts
// Import apiClient instead of supabase for new implementations

import { apiClient } from './lib/apiClient';

// For backward compatibility during migration
// TODO: Remove this file once migration is complete
export const supabase = apiClient;