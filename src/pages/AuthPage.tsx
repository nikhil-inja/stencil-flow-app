// src/pages/AuthPage.tsx

import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false); // To toggle between login and signup

  // This function handles the form submission for both login and signup.
  const handleAuthAction = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isSigningUp) {
        // --- SIGN UP ---
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the login link!');
      } else {
        // --- LOG IN ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // The user will be redirected automatically by our router upon successful login.
      }
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '96px auto' }}>
      <h1>No-Code DevOps</h1>
      <p>{isSigningUp ? 'Create a new account' : 'Sign in to your account'}</p>
      <form onSubmit={handleAuthAction}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Your email"
            value={email}
            required={true}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Your password"
            value={password}
            required={true}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <button type="submit" disabled={loading}>
            {loading ? <span>Loading...</span> : <span>{isSigningUp ? 'Sign Up' : 'Log In'}</span>}
          </button>
        </div>
      </form>
      <button onClick={() => setIsSigningUp(!isSigningUp)} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
        {isSigningUp ? 'Already have an account? Log In' : 'Don\'t have an account? Sign Up'}
      </button>
    </div>
  );
}