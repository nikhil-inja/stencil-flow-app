// src/context/SessionContext.tsx

import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';
import type { User, Profile } from '../lib/apiClient';

// Define the shape of the context value
interface SessionContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

// Create the context with a default value of undefined
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Create the Provider component
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchSession = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        console.log('🔍 Fetching session...');
        const { data, error } = await apiClient.auth.getSession();
        console.log('📊 Session response:', { data, error });
        
        if (!isMounted) return; // Component unmounted during fetch
        
        if (error || !data?.session) {
          console.log('❌ No session found');
          setUser(null);
          setProfile(null);
          
          // Retry logic for transient network issues
          if (retryCount < maxRetries && error) {
            retryCount++;
            console.log(`🔁 Retrying session fetch (${retryCount}/${maxRetries})`);
            setTimeout(() => fetchSession(), 1000 * retryCount);
            return;
          }
        } else {
          console.log('✅ Session found:', data.session);
          setUser(data.session.user);
          
          // Use profile data from session response if available
          if (data.session.profile) {
            console.log('✅ Profile found in session:', data.session.profile);
            setProfile(data.session.profile);
          } else {
            console.log('⚠️ No profile in session, creating fallback');
            // Fallback profile if backend doesn't provide it
            setProfile({
              id: data.session.user.id,
              full_name: data.session.user.full_name,
              avatar_url: data.session.user.avatar_url,
              workspace: {
                id: 'default',
                name: 'Default Workspace'
              },
              workspace_id: 'default', // For backward compatibility
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
          retryCount = 0; // Reset retry count on success
        }
      } catch (error) {
        console.error('💥 Error fetching session:', error);
        if (!isMounted) return;
        
        setUser(null);
        setProfile(null);
        
        // Retry logic for network errors
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔁 Retrying after error (${retryCount}/${maxRetries})`);
          setTimeout(() => fetchSession(), 1000 * retryCount);
          return;
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSession();

    // Simplified auth state change listener (removed to prevent loops)
    // The JWT-based approach doesn't need real-time state changes like Supabase
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Function to manually refresh session (useful for retry scenarios)
  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.auth.getSession();
      
      if (error || !data?.session) {
        setUser(null);
        setProfile(null);
      } else {
        setUser(data.session.user);
        setProfile(data.session.profile || {
          id: data.session.user.id,
          full_name: data.session.user.full_name,
          avatar_url: data.session.user.avatar_url,
          workspace: { id: 'default', name: 'Default Workspace' },
          workspace_id: 'default',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    refreshSession,
  };

  // The provider makes the 'value' available to all child components
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Create a custom hook for easy access to the context
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}