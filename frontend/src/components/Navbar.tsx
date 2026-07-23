import { useState, useEffect } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { setAuthSession, API_BASE_URL } from '../utils/api';
import ProfileDropdown from './ProfileDropdown';

export default function Navbar() {
  const navigate = useNavigate();
  
  // 1. Reactive State for Authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('access_token');
  });

  // State synchronization event listener
  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('access_token'));
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      const credential = credentialResponse.credential;
      if (!credential) return;

      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: credential }),
      });

      if (!response.ok) {
        console.error('Backend authentication failed');
        return;
      }

      const data = await response.json();

      // Store auth session
      setAuthSession(data.access_token, data.user);
      setIsAuthenticated(true);
      window.dispatchEvent(new Event('auth-change'));

      // Redirect user to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Google Auth Error:', err);
    }
  };

  const handleGoogleError = () => {
    console.warn('Google Sign-In was cancelled or failed.');
  };

  return (
    // 2. Fixed Top Container with High Z-Index Layout Overlay
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4 bg-[#0a0518]/85 backdrop-blur-md border-b border-white/10">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => navigate('/')}
      >
        <span className="font-black text-lg tracking-widest text-white uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
          ENVISION '26
        </span>
      </div>

      {/* 3. Conditional Rendering based on Auth State */}
      <div className="flex items-center gap-4 relative z-50">
        {isAuthenticated ? (
          <ProfileDropdown />
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            shape="pill"
            size="medium"
          />
        )}
      </div>
    </nav>
  );
}
