/**
 * API Client to replace Supabase client
 * This provides a similar interface to Supabase for seamless migration
 */

interface ApiResponse<T = any> {
  data: T | null;
  error: { message: string } | null;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  github_username: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  workspace: {
    id: string;
    name: string;
    description?: string | null;
  };
  workspace_id?: string; // For backward compatibility
  created_at: string;
  updated_at: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  user: User;
  profile?: Profile;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:8000/api') {
    this.baseUrl = baseUrl;
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  private saveTokenToStorage(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      this.accessToken = token;
    }
  }

  private removeTokenFromStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.accessToken = null;
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: { message: data.error || data.detail || 'An error occurred' }
        };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Network error' }
      };
    }
  }

  // Authentication methods (replacing supabase.auth)
  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }): Promise<ApiResponse<{ user: User; session: Session }>> => {
      const response = await this.request<Session>('/auth/signin/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.data) {
        this.saveTokenToStorage(response.data.access_token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        
        return {
          data: {
            user: response.data.user,
            session: response.data
          },
          error: null
        };
      }

      return response as any;
    },

    signOut: async (): Promise<ApiResponse<{}>> => {
      this.removeTokenFromStorage();
      return { data: {}, error: null };
    },

    getSession: async (): Promise<ApiResponse<{ session: Session | null }>> => {
      if (!this.accessToken) {
        return { data: { session: null }, error: null };
      }

      const response = await this.request<{ user: User; profile: Profile }>('/auth/session/');
      
      if (response.data) {
        const session: Session = {
          access_token: this.accessToken,
          refresh_token: localStorage.getItem('refresh_token') || '',
          user: response.data.user,
          profile: response.data.profile
        };

        return { data: { session }, error: null };
      }

      // If session is invalid, clear tokens
      if (response.error) {
        this.removeTokenFromStorage();
      }

      return { data: { session: null }, error: response.error };
    },

    getUser: async (): Promise<ApiResponse<{ user: User | null }>> => {
      const sessionResponse = await this.auth.getSession();
      if (sessionResponse.data?.session) {
        return { data: { user: sessionResponse.data.session.user }, error: null };
      }
      return { data: { user: null }, error: sessionResponse.error };
    },

    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      // Simple implementation - in a real app, you might want to use WebSockets or polling
      const checkAuth = async () => {
        const { data } = await this.auth.getSession();
        callback('SIGNED_IN', data?.session || null);
      };

      checkAuth();

      // Return subscription-like object
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              // Cleanup if needed
            }
          }
        }
      };
    },

    signInWithOAuth: async ({ provider, options }: { provider: string; options?: any }) => {
      // For GitHub OAuth, redirect to Django OAuth endpoint
      if (provider === 'github') {
        const redirectUrl = options?.redirectTo || `${window.location.origin}/auth/callback/github`;
        window.location.href = `${this.baseUrl}/auth/github/?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      }
      return { data: null, error: null };
    }
  };

  // Database methods (replacing supabase.from())
  from = (table: string) => {
    return {
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: async (): Promise<ApiResponse<any>> => {
            const response = await this.request(`/${table}/?${column}=${value}`);
            if (response.data && Array.isArray(response.data)) {
              return { data: response.data[0] || null, error: response.error };
            }
            return response;
          },
          order: (column: string, options?: { ascending?: boolean }) => ({
            then: async (resolve: (value: ApiResponse<any[]>) => void) => {
              const order = options?.ascending === false ? '-' : '';
                          const response = await this.request<any[]>(`/${table}/?${column}=${value}&ordering=${order}${column}`);
            resolve(response);
            }
          }),
          then: async (resolve: (value: ApiResponse<any[]>) => void) => {
            const response = await this.request<any[]>(`/${table}/?${column}=${value}`);
            resolve(response);
          }
        }),
        order: (column: string, options?: { ascending?: boolean }) => ({
          then: async (resolve: (value: ApiResponse<any[]>) => void) => {
            const order = options?.ascending === false ? '-' : '';
            const response = await this.request<any[]>(`/${table}/?ordering=${order}${column}`);
            resolve(response);
          }
        }),
        then: async (resolve: (value: ApiResponse<any[]>) => void) => {
          const response = await this.request<any[]>(`/${table}/`);
          resolve(response);
        }
      }),

      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: async (): Promise<ApiResponse<any>> => {
            return await this.request(`/${table}/`, {
              method: 'POST',
              body: JSON.stringify(data),
            });
          }
        }),
        then: async (resolve: (value: ApiResponse<any>) => void) => {
          const response = await this.request(`/${table}/`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          resolve(response);
        }
      }),

      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: (value: ApiResponse<any>) => void) => {
            const response = await this.request(`/${table}/${value}/`, {
              method: 'PATCH',
              body: JSON.stringify(data),
            });
            resolve(response);
          }
        })
      }),

      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: (value: ApiResponse<any>) => void) => {
            const response = await this.request(`/${table}/${value}/`, {
              method: 'DELETE',
            });
            resolve(response);
          }
        })
      }),

      upsert: (data: any, options?: { onConflict?: string }) => ({
        select: (columns?: string) => ({
          single: async (): Promise<ApiResponse<any>> => {
            // For upsert, we'll try to update first, then create if not found
            const id = data.id || data[options?.onConflict || 'id'];
            if (id) {
              const updateResponse = await this.request(`/${table}/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify(data),
              });
              if (updateResponse.data) {
                return updateResponse;
              }
            }
            
            // If update failed or no ID, create new
            return await this.request(`/${table}/`, {
              method: 'POST',
              body: JSON.stringify(data),
            });
          }
        })
      })
    };
  };

  // Function invocation (replacing supabase.functions.invoke())
  functions = {
    invoke: async (functionName: string, options?: { headers?: any; body?: any }): Promise<ApiResponse<any>> => {
      const endpoint = `/functions/${functionName}/`;
      const headers = options?.headers || {};
      
      return await this.request(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(options?.body || {}),
      });
    }
  };

  // RPC functions (replacing supabase.rpc())
  rpc = async (functionName: string, params?: any): Promise<ApiResponse<any>> => {
    const endpoint = `/functions/${functionName}/`;
    
    return await this.request(endpoint, {
      method: 'GET',
      ...(params && { body: JSON.stringify(params) })
    });
  };
}

// Create and export the client instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { User, Profile, Session, ApiResponse };
