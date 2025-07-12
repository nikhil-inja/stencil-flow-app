// src/context/SessionContext.tsx

import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// Define the shape of our profile data
interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string;
}

// Define the shape of the context value
interface SessionContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

// Create the context with a default value of undefined
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Create the Provider component
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      // 1. Get the current session, which includes the user object
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // 2. If there's a user, fetch their profile from our 'profiles' table
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, organization_id')
          .eq('id', session.user.id)
          .single(); // .single() expects one row and returns an object instead of an array

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile(data);
        }
      }
      setLoading(false);
    };

    fetchSession();

    // 3. Listen for changes in authentication state (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null); // Clear profile on logout
      } else {
        fetchSession(); // Refetch session and profile on login
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
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