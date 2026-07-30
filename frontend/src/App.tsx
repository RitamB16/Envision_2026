import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen';
import IgnitionIntro from './components/IgnitionIntro';
import NavDock from './components/NavDock';
import SceneContainer from './components/SceneContainer';
import { audioEngine } from './utils/AudioEngine';
import { destinations } from './config';

// Lazy Pages
const Register = lazy(() => import('./pages/Register'));
const Events = lazy(() => import('./pages/Events'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Coordinators = lazy(() => import('./pages/Coordinators'));
const Alumni = lazy(() => import('./pages/Alumni'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const PaymentCheckout = lazy(() => import('./components/PaymentCheckout'));

export type CarState = 'PATROLLING' | 'TRAVELING' | 'ARRIVED' | 'RETURNING';
export type CameraMode = 'FOLLOW' | 'CINEMATIC' | 'PAGE' | 'RETURN';

import { processOfflineQueue } from './utils/offlineQueue';

function AppContent() {
  const [loaded, setLoaded] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);

  // Strict States
  const [carState, setCarState] = useState<CarState>('PATROLLING');
  const [cameraMode, setCameraMode] = useState<CameraMode>('FOLLOW');
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);

  const [isWiping, setIsWiping] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(() => {
    return !!localStorage.getItem('access_token') || localStorage.getItem('envision_user_signedup') === 'true';
  });

  useEffect(() => {
    // Process any offline sync queue items immediately on app load
    processOfflineQueue();
  }, []);

  useEffect(() => {
    const handleAuthCheck = () => {
      setIsSignedUp(!!localStorage.getItem('access_token') || localStorage.getItem('envision_user_signedup') === 'true');
    };

    window.addEventListener('storage', handleAuthCheck);
    window.addEventListener('auth-change', handleAuthCheck);
    return () => {
      window.removeEventListener('storage', handleAuthCheck);
      window.removeEventListener('auth-change', handleAuthCheck);
    };
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

  // Mobile hamburger menu drawer active state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Navigation lock ref to block duplicate asynchronous state clicks
  const navLockRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 });

  // Sync 3D scene state with pathname updates (handles native back/forward gestures)
  useEffect(() => {
    if (!introFinished) return;

    if (location.pathname === '/') {
      setActiveTargetId(null);
      setCarState('PATROLLING');
      setCameraMode('FOLLOW');
      navLockRef.current = { id: null, time: 0 };
    } else {
      const pathId = location.pathname.substring(1);
      setActiveTargetId(pathId);
      setCarState('ARRIVED');
      setCameraMode('PAGE');
      navLockRef.current = { id: pathId, time: Date.now() };
    }
  }, [location.pathname, introFinished]);

  const handleStartIntro = () => {
    setLoaded(true);
    audioEngine.init();
  };

  const handleIntroComplete = () => {
    setIntroFinished(true);
  };

  const handleRegisterSuccess = () => {
    setIsSignedUp(true);
    localStorage.setItem('envision_user_signedup', 'true');
  };

  const handleSignUpNavigate = () => {
    if (location.pathname === '/register') return;

    const now = Date.now();
    navLockRef.current = { id: 'register', time: now };

    setActiveTargetId('register');
    setIsWiping(true);
    navigate('/register');
    setCameraMode('PAGE');
    setCarState('ARRIVED');
    setTimeout(() => {
      setIsWiping(false);
    }, 150);
  };

  const handleNavigate = (id: string) => {
    // Close mobile menu drawer on active navigate
    setIsDrawerOpen(false);

    if (id === 'home') {
      if (location.pathname !== '/') {
        handleBackToCity();
      }
      return;
    }

    if (id === 'register') {
      handleSignUpNavigate();
      return;
    }

    const dest = destinations.find(d => d.id === id);
    if (!dest) return;

    // If already on this exact page, do nothing
    if (location.pathname === dest.path) return;

    // Smoothly transition and open destination page instantly with car parked
    setActiveTargetId(id);
    setIsWiping(true);
    setTimeout(() => {
      navigate(dest.path);
      setCameraMode('PAGE');
      setCarState('ARRIVED'); // Car stops when destination page opens
      setTimeout(() => {
        setIsWiping(false);
      }, 100);
    }, 300);
  };

  const handleCarArrived = () => {
    if (carState !== 'TRAVELING') return;

    setCarState('ARRIVED');
    setCameraMode('CINEMATIC');

    // Play cinematic beat for 1.7s, then wipe and route
    setTimeout(() => {
      setIsWiping(true);
      setTimeout(() => {
        const dest = destinations.find(d => d.id === activeTargetId);
        if (dest) navigate(dest.path);

        setCameraMode('PAGE');
        setCarState('ARRIVED'); // Car stays stopped while page is active

        // Reset ref lock once page is rendered
        navLockRef.current = { id: activeTargetId, time: Date.now() };

        setTimeout(() => {
          setIsWiping(false);
        }, 100);
      }, 1000);
    }, 1700);
  };

  const handleBackToCity = () => {
    setIsWiping(true);
    setTimeout(() => {
      // Car resumes patrol loop and camera refocuses on car when returning home
      navigate('/');
      setCarState('PATROLLING');
      setActiveTargetId(null);
      setCameraMode('FOLLOW');

      setTimeout(() => {
        setIsWiping(false);
      }, 100);
    }, 1000);
  };

  const isPageActive = location.pathname !== '/';

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#030114' }}>
      {/* 3D Scene - always mounted to pre-warm assets and compile shaders in the background */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', opacity: loaded ? 1 : 0, transition: 'opacity 0.5s ease', pointerEvents: loaded ? 'auto' : 'none', zIndex: 1 }}>
        <SceneContainer
          activeTargetId={activeTargetId}
          introFinished={introFinished}
          carState={carState}
          cameraMode={cameraMode}
          onCarArrived={handleCarArrived}
          onSetCarState={setCarState}
          isPageActive={isPageActive}
        />
      </div>

      {!loaded && <LoadingScreen onStart={handleStartIntro} />}

      {loaded && (
        <>
          {!introFinished && <IgnitionIntro onComplete={handleIntroComplete} />}

          {introFinished && (
            <NavDock
              onNavigate={handleNavigate}
              activeTargetId={activeTargetId}
              carState={carState}
              isPageActive={isPageActive}
              isSignedUp={isSignedUp}
              isDrawerOpen={isDrawerOpen}
              setIsDrawerOpen={setIsDrawerOpen}
            />
          )}

          {/* Wipe Transition Overlay */}
          <div className={`wipe-overlay ${isWiping ? 'active' : ''}`}>
            <div className="wipe-curtain curtain-top"></div>
            <div className="wipe-curtain curtain-bottom"></div>
            <div className="wipe-grid"></div>
            <div className="wipe-scanner-line"></div>
            <div className="wipe-loader-content">
              <div className="dots-row">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
              <div className="wipe-loader-text">CONNECTING SYSTEM NODE...</div>
            </div>
          </div>

          {/* Router Pages - hidden when mobile side drawer menu is active to avoid visual overlapping */}
          <div
            className={`page-container ${isPageActive && !isWiping ? 'visible' : ''}`}
            style={isDrawerOpen ? { display: 'none' } : undefined}
          >
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={null} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register onBack={handleBackToCity} onRegisterSuccess={handleRegisterSuccess} />} />
                <Route path="/events" element={<Events onBack={handleBackToCity} />} />
                <Route path="/gallery" element={<Gallery onBack={handleBackToCity} />} />
                <Route path="/coordinators" element={<Coordinators onBack={handleBackToCity} />} />
                <Route path="/alumni" element={<Alumni onBack={handleBackToCity} />} />
                <Route path="/sponsors" element={<Sponsors onBack={handleBackToCity} />} />
                <Route path="/checkout" element={<PaymentCheckout />} />
                <Route path="/checkout/:registrationId" element={<PaymentCheckout />} />
                <Route path="/tickets/:registrationId" element={<Profile />} />
              </Routes>
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
}

import { RegistrationProvider } from './context/RegistrationContext';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RegistrationProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppContent />
        </BrowserRouter>
      </RegistrationProvider>
    </QueryClientProvider>
  );
}
