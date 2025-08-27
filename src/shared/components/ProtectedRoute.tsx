// src/components/ProtectedRoute.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
       try {
        const { data } = await apiClient.auth.getSession();
        setIsAuthenticated(data?.session ? true : false);
      } catch (error) {
        console.error('Error checking session:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkSession();

    // For JWT-based auth, we'll check authentication status periodically
    // or when the user navigates (no real-time state changes like Supabase)
    const interval = setInterval(checkSession, 60000); // Check every minute

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the child route (e.g., Dashboard). Otherwise, redirect to login.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
}