import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/context/SessionContext';

export default function GitHubCallbackPage() {
  // Early return with basic HTML to test if component is loaded at all
  console.log('🎬 GitHubCallbackPage component loaded');
  
  // Test if the component is being rendered with a basic fallback
  if (typeof window === 'undefined') {
    return <div>Loading...</div>;
  }
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshSession } = useSession();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔄 GitHubCallbackPage mounted');
    console.log('📍 Current URL:', window.location.href);
    console.log('🔍 Search params:', Object.fromEntries(searchParams.entries()));

    const handleCallback = async () => {
      try {
        console.log('🚀 Starting OAuth callback handling...');
        
        // Check for error in URL params
        const urlError = searchParams.get('error');
        if (urlError) {
          console.log('❌ OAuth error found:', urlError);
          setError(`OAuth error: ${urlError}`);
          setStatus('error');
          return;
        }

        // Check for tokens in URL params
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        console.log('🔑 Tokens found:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken 
        });

        if (accessToken && refreshToken) {
          console.log('💾 Storing tokens...');
          // Store tokens and refresh session
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          
          console.log('🔄 Refreshing session...');
          // Refresh session to get user data
          await refreshSession();
          
          console.log('✅ OAuth callback completed successfully - redirecting to dashboard');
          // Redirect immediately to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          console.log('❌ No tokens found in URL params');
          setError('No authentication tokens received');
          setStatus('error');
        }
      } catch (err: any) {
        console.error('💥 OAuth callback error:', err);
        setError(`Failed to complete authentication: ${err.message}`);
        setStatus('error');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshSession]);

  // Add a simple debug render to ensure component is working
  console.log('🎨 Rendering GitHubCallbackPage with status:', status);

  if (status === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>
            Authenticating with GitHub
          </h2>
          <p style={{ color: '#666', margin: '0 0 1rem 0' }}>
            Setting up your account...
          </p>
          <div style={{ margin: '1rem 0' }}>
            <div style={{
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #3498db',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </div>
          <p style={{ fontSize: '14px', color: '#888' }}>
            Verifying credentials...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#dc2626' }}>
          Authentication Error
        </h2>
        <p style={{ color: '#666', margin: '0 0 1.5rem 0' }}>
          {error}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={() => navigate('/settings')}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Go to Settings
          </button>
          <button 
            onClick={() => navigate('/automations')}
            style={{
              background: 'transparent',
              color: '#3b82f6',
              border: '1px solid #3b82f6',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}