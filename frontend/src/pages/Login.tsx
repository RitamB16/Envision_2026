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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [instantEmail, setInstantEmail] = useState('');
  const [magicUrl, setMagicUrl] = useState<string | null>(null);

  useEffect(() => {
    const magicToken = searchParams.get('magic_token');
    if (magicToken) {
      verifyMagicToken(magicToken);
    }
  }, [searchParams]);

  const verifyMagicToken = async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
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
    setSuccessMsg(null);
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
        credentials: 'include',
        body: JSON.stringify({ id_token: credential }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Authentication failed with status ${response.status}`
        );
      }

      const data: AuthBackendResponse = await response.json();
      setAuthSession(data.access_token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setMagicUrl(null);

    const emailClean = instantEmail.trim().toLowerCase();
    if (!emailClean) {
      setErrorMsg('Please enter a valid Gmail address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: emailClean,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Magic link dispatch failed (Status ${response.status})`);
      }

      const data = await response.json();
      setSuccessMsg(data.message || `Verification Magic Link dispatched to ${emailClean}! Please check your Gmail inbox.`);
      if (data.magic_url) {
        setMagicUrl(data.magic_url);
      }
    } catch (err: any) {
      console.error('Magic Link Request Error:', err);
      setErrorMsg(err.message || 'Failed to send verification link. Please sign in directly via Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060212] px-4 py-8 relative overflow-hidden font-sans">
      {/* Ambient neon backdrop glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00f3ff]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d0722]/85 backdrop-blur-2xl border border-cyan-500/30 p-6 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.15)] relative z-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-black tracking-widest text-white uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-purple-400">
            ENVISION // VERIFIED SIGN IN
          </h1>
          <p className="text-xs text-cyan-300/80 tracking-wider font-mono mt-1">
            Official Gmail Verification & Google Identity Sign In
          </p>
        </div>

        {/* Success Alert Box */}
        {successMsg && (
          <div className="w-full mb-5 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs text-center font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            {successMsg}
            {magicUrl && (
              <div className="mt-3">
                <a
                  href={magicUrl}
                  className="inline-block px-4 py-2 bg-emerald-500 text-black font-extrabold text-[11px] rounded-lg uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                >
                  👉 CLICK HERE TO VERIFY GMAIL & SIGN IN
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="w-full mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-300 text-xs text-center font-mono font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            {errorMsg}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="w-full mb-5 flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            AUTHENTICATING SESSION...
          </div>
        )}

        {/* Google Sign-In Component */}
        <div className="w-full flex justify-center py-1">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMsg('Google Sign-In was cancelled or failed.')}
            useOneTap
            theme="filled_black"
            shape="pill"
            size="large"
          />
        </div>

        <div className="flex items-center gap-3 my-5 w-full">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">
            OR VERIFY VIA GMAIL MAGIC LINK
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Gmail Magic Link Form */}
        <form onSubmit={handleSendMagicLink} className="w-full text-left">
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-cyan-300 tracking-wider uppercase font-mono mb-1.5">
              GMAIL ADDRESS *
            </label>
            <input
              type="email"
              placeholder="your.email@gmail.com"
              value={instantEmail}
              onChange={(e) => setInstantEmail(e.target.value)}
              className="w-full bg-[#080414]/90 border border-white/15 border-l-4 border-l-[#00f3ff] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,243,255,0.35)] transition-all font-sans"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 via-purple-600 to-pink-500 text-white font-black text-xs uppercase tracking-widest font-mono rounded-xl shadow-[0_0_25px_rgba(0,243,255,0.4)] hover:shadow-[0_0_35px_rgba(0,243,255,0.6)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            ✉️ SEND VERIFICATION LINK TO GMAIL
          </button>
        </form>

        {/* Footer note */}
        <div className="mt-6 text-center text-[10px] font-mono text-gray-500">
          Envision TechFest &bull; Verified Identity Protocol
        </div>
      </div>
    </div>
  );
}
