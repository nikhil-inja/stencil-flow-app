// src/pages/GitHubCallbackPage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/supabaseClient';
import toast from 'react-hot-toast';

export default function GitHubCallbackPage() {
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const storeToken = async () => {
          const toastId = toast.loading("Finalizing GitHub connection...");
          try {
            const { error } = await apiClient.functions.invoke('store-github-token');
            if (error) throw error;
            toast.success("GitHub account connected successfully!", { id: toastId });
          } catch (e: any) {
            toast.error(`Failed to connect GitHub account: ${e.message}`, { id: toastId });
          } finally {
            subscription.unsubscribe();
            navigate('/settings/team');
          }
        };
        storeToken();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>Connecting to GitHub, please wait...</p>
    </div>
  );
}