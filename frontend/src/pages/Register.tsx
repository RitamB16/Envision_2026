import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import PageLayout from './PageLayout';
import { api, setAuthSession, API_BASE_URL } from '../utils/api';

interface Props {
  onBack: () => void;
  onRegisterSuccess: () => void;
}

export default function Register({ onBack, onRegisterSuccess }: Props) {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite_token');

  const [instantEmail, setInstantEmail] = useState('');
  const [instantName, setInstantName] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const processTeamInviteIfPresent = async () => {
    if (inviteToken) {
      try {
        await api.post(`/events/teams/join-via-invite?invite_token=${inviteToken}`);
      } catch (inviteErr: any) {
        console.error("Team invite auto-join error:", inviteErr);
      }
    }
  };

  const authenticateWithToken = async (token: string) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Authentication failed with status ${response.status}`
        );
      }

      const data = await response.json();
      setAuthSession(data.access_token, data.user);
      await processTeamInviteIfPresent();

      setIsSuccess(true);
      onRegisterSuccess();

      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse.access_token) {
        authenticateWithToken(tokenResponse.access_token);
      }
    },
    onError: () => {
      setErrorMsg('Google Sign-In was cancelled or failed.');
    },
  });

  const handleInstantSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!instantEmail.trim()) {
      setErrorMsg('Please enter a valid Email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/instant-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: instantEmail.trim(),
          name: instantName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Instant sign-in failed (Status ${response.status})`);
      }

      const data = await response.json();
      setAuthSession(data.access_token, data.user);
      await processTeamInviteIfPresent();

      setIsSuccess(true);
      onRegisterSuccess();

      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (err: any) {
      console.error('Instant Sign-In Error:', err);
      setErrorMsg(err.message || 'Failed to sign in instantly.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="REGISTER / INSTANT SIGN IN" isWide={true}>
      <style>{`
        .register-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .register-layout-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2.2rem;
            align-items: stretch;
          }
        }

        .register-info-panel {
          background: rgba(12, 6, 28, 0.85);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1.5px solid rgba(0, 243, 255, 0.4);
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          text-align: left;
          box-sizing: border-box;
          box-shadow: 0 0 35px rgba(0, 243, 255, 0.15), inset 0 0 20px rgba(0, 243, 255, 0.05);
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .register-info-panel {
            padding: 2rem;
            gap: 1.6rem;
          }
        }

        .info-panel-title {
          font-size: 1.2rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: 'Orbitron', 'Outfit', sans-serif;
          border-bottom: 1.5px solid rgba(0, 243, 255, 0.3);
          padding-bottom: 0.75rem;
          margin: 0;
          text-shadow: 0 0 12px rgba(0, 243, 255, 0.5);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .feature-item {
          display: flex;
          gap: 0.85rem;
          align-items: flex-start;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: rgba(0, 243, 255, 0.06);
          border-color: rgba(0, 243, 255, 0.3);
          transform: translateX(4px);
        }

        .feature-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(168, 85, 247, 0.2));
          border: 1px solid rgba(0, 243, 255, 0.4);
          color: #00f3ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .feature-title {
          font-size: 0.82rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.08em;
          font-family: 'Orbitron', sans-serif;
        }

        .feature-desc {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.35;
        }

        .auth-card-panel {
          background: rgba(10, 5, 25, 0.85);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1.5px solid rgba(168, 85, 247, 0.4);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 0 35px rgba(168, 85, 247, 0.15);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        @media (min-width: 768px) {
          .auth-card-panel {
            padding: 2rem;
          }
        }

        .divider-container {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin: 1.25rem 0;
          width: 100%;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        }

        .divider-text {
          font-size: 0.68rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-family: 'Orbitron', sans-serif;
          white-space: nowrap;
        }

        .form-group {
          margin-bottom: 1rem;
          text-align: left;
        }

        .form-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 800;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #00f3ff;
          font-family: 'Orbitron', sans-serif;
        }

        .form-input {
          width: 100%;
          background: rgba(8, 4, 20, 0.85);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-left: 4px solid #00f3ff;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          color: #ffffff;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.25s ease;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .form-input:focus {
          border-color: #00f3ff;
          border-left-color: #00f3ff;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
          background: rgba(12, 6, 28, 0.95);
        }

        /* Ultra Cyberpunk Google Button */
        .cyber-google-btn {
          width: 100%;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.2) 0%, rgba(168, 85, 247, 0.35) 100%);
          border: 2px solid #00f3ff;
          color: #ffffff;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.85rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 0 25px rgba(0, 243, 255, 0.3), inset 0 0 15px rgba(0, 243, 255, 0.15);
          position: relative;
          overflow: hidden;
        }

        .cyber-google-btn:hover {
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.35) 0%, rgba(168, 85, 247, 0.5) 100%);
          box-shadow: 0 0 35px rgba(0, 243, 255, 0.6), inset 0 0 20px rgba(0, 243, 255, 0.3);
          transform: translateY(-2px);
        }

        .google-icon-capsule {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
          flex-shrink: 0;
        }

        /* Ultra Cyberpunk Instant Access Button */
        .cyber-instant-btn {
          width: 100%;
          padding: 1.05rem 1.25rem;
          background: linear-gradient(90deg, #00f3ff 0%, #a855f7 50%, #ec4899 100%);
          border: none;
          color: #ffffff;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.88rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 0 30px rgba(0, 243, 255, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.2);
        }

        .cyber-instant-btn:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 0 45px rgba(0, 243, 255, 0.7), inset 0 0 20px rgba(255, 255, 255, 0.3);
          background: linear-gradient(90deg, #00f3ff 10%, #a855f7 60%, #ec4899 100%);
        }

        .cyber-instant-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .success-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          background: rgba(12, 6, 28, 0.9);
          border: 2px solid #00f3ff;
          border-radius: 24px;
          box-shadow: 0 0 50px rgba(0, 243, 255, 0.4);
          text-align: center;
        }

        .success-checkmark {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 3px solid #00f3ff;
          color: #00f3ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 0 35px rgba(0, 243, 255, 0.6);
          animation: pulse 1s infinite alternate;
        }
      `}</style>

      {isSuccess ? (
        <div className="success-overlay">
          <div className="success-checkmark">✓</div>
          <h2 className="text-xl font-black text-white tracking-wider font-mono">SUCCESSFULLY SIGNED IN!</h2>
          <p className="text-xs text-cyan-300 mt-1 font-mono">Unlocking Envision Explorer profile & Dashboard...</p>
        </div>
      ) : (
        <div className="register-layout-grid">
          {/* Left Column: Explorer System Benefits */}
          <div className="register-info-panel">
            <h2 className="info-panel-title">
              <span>🚀</span> EXPLORER BENEFITS
            </h2>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="feature-details">
                  <span className="feature-title">ACCESS TECHNICAL TRACKS</span>
                  <span className="feature-desc">Unlocks active registration slots for all technical showcases and quiz events.</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <div className="feature-details">
                  <span className="feature-title">EXPLORER PROFILE ID</span>
                  <span className="feature-desc">Receive a localized explorer identity credential, logging track benchmarks and results.</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div className="feature-details">
                  <span className="feature-title">PRIZES & SWAG REWARDS</span>
                  <span className="feature-desc">Eligible for physical merchandise, coupons, and certifications worth up to ₹1199.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Custom Cyberpunk Auth Panel */}
          <div className="auth-card-panel">
            {inviteToken && (
              <div className="mb-4 p-3 rounded-xl bg-purple-950/80 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>✉️ TEAM MAGIC INVITATION DETECTED! SIGN IN TO JOIN TEAM.</span>
              </div>
            )}

            <div className="w-full text-center mb-5">
              <h3 className="text-base font-black text-white tracking-widest uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-purple-400">
                FAST PASS INSTANT SIGN IN
              </h3>
              <p className="text-xs text-gray-300 mt-1 font-mono">
                No passwords required. Choose your instant sign-in option:
              </p>
            </div>

            {isLoading && (
              <div className="mb-4 flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                AUTHENTICATING BACKEND NODE...
              </div>
            )}

            {/* Option 1: Custom Cyberpunk Google Sign In / Sign Up Button */}
            <button
              onClick={() => loginWithGoogle()}
              className="cyber-google-btn mb-2"
              disabled={isLoading}
            >
              <div className="google-icon-capsule">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <span>GOOGLE ONE-CLICK SIGN IN</span>
            </button>

            <div className="divider-container">
              <div className="divider-line"></div>
              <span className="divider-text">OR DIRECT FAST PASS SIGN IN</span>
              <div className="divider-line"></div>
            </div>

            {/* Option 2: Direct Fast Pass Instant Sign In Form */}
            <form onSubmit={handleInstantSignIn} className="w-full">
              <div className="form-group">
                <label className="form-label">Full Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Alex Hunter"
                  value={instantName}
                  onChange={(e) => setInstantName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="your.email@gmail.com"
                  value={instantEmail}
                  onChange={(e) => setInstantEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="cyber-instant-btn mt-2" disabled={isLoading}>
                ⚡ INSTANT ACCESS TO TECHFEST
              </button>
            </form>

            {/* Error Notification Banner */}
            {errorMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-300 text-xs text-center font-mono font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
