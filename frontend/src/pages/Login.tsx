import { useState, useEffect } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAuthSession, API_BASE_URL } from '../utils/api';

interface AuthBackendResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
    fest_id: string;
    role: string;
    is_approved: boolean;
  };
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const magicToken = searchParams.get('magic_token');
    if (magicToken) {
      verifyMagicToken(magicToken);
    }
  }, [searchParams]);

  const verifyMagicToken = async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Magic link verification failed.');
      }
      const data: AuthBackendResponse = await response.json();
      setAuthSession(data.access_token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Magic link verification error:', err);
      setErrorMsg(err.message || 'Invalid or expired magic link token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const credential = credentialResponse.credential;
      if (!credential) {
        throw new Error('Google authentication credential missing.');
      }

      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Set HttpOnly access_token cookie
        body: JSON.stringify({ id_token: credential }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Authentication failed with status ${response.status}`
        );
      }

      const data: AuthBackendResponse = await response.json();

      // Save session metadata and dispatch auth event
      setAuthSession(data.access_token, data.user);

      // Redirect user to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMsg('Google Sign-In was cancelled or failed to complete.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060212] px-4 py-12 relative overflow-hidden font-sans">
      {/* Ambient neon backdrop glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00f3ff]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d0722]/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-widest text-white uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-white">
            TECH FEST // ACCESS
          </h1>
          <p className="text-xs text-cyan-400/80 tracking-wider uppercase mt-2">
            Sign in to manage your registration & schedule
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="w-full mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="w-full mb-6 flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono animate-pulse">
            <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            VERIFYING CREDENTIALS...
          </div>
        )}

        {/* Google Sign-In Component */}
        <div className="w-full flex justify-center py-2">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="filled_black"
            shape="pill"
            size="large"
          />
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-[11px] text-gray-500">
          Protected by Envision Identity Guard &bull; Google OAuth 2.0
        </div>
      </div>
    </div>
  );
}
