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
      // Only override if the car is NOT currently traveling or arriving to prevent breaking active transitions
      if (carState !== 'TRAVELING' && carState !== 'ARRIVED') {
        setActiveTargetId(pathId);
        setCameraMode('FOLLOW');
        setCarState('PATROLLING');
      }
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
    if (isWiping || location.pathname === '/register') return;
    
    const now = Date.now();
    navLockRef.current = { id: 'register', time: now };

    setIsWiping(true);
    setTimeout(() => {
      navigate('/register');
      setCameraMode('FOLLOW');
      setCarState('PATROLLING'); // Resumes/keeps GTR patrolling!
      setActiveTargetId('register'); // Mark that we navigated to register
      setTimeout(() => {
        setIsWiping(false);
      }, 100);
    }, 1000);
  };

  const handleNavigate = (id: string) => {
    const now = Date.now();
    
    // Close mobile menu drawer on active navigate
    setIsDrawerOpen(false);
    
    // Block duplicate rapid clicks on the same link within 800ms
    if (navLockRef.current.id === id && now - navLockRef.current.time < 800) {
      return;
    }
    
    if (id === 'home') {
      if (location.pathname !== '/' || carState !== 'PATROLLING') {
        navLockRef.current = { id: 'home', time: now };
        handleBackToCity();
      }
      return;
    }
    if (id === 'register') {
      navLockRef.current = { id: 'register', time: now };
      handleSignUpNavigate();
      return;
    }

    const dest = destinations.find(d => d.id === id);
    if (!dest) return;

    if (location.pathname === dest.path) return;

    navLockRef.current = { id, time: now };

    // Fast direct transition if switching between sub-pages
    if (isPageActive) {
      setIsWiping(true);
      setTimeout(() => {
        navigate(dest.path);
        setActiveTargetId(id);
        setCarState('PATROLLING');
        setCameraMode('FOLLOW');
        setTimeout(() => {
          setIsWiping(false);
        }, 100);
      }, 700);
      return;
    }

    // 3D Car Traveling Transition from Main Landing Patrol
    if (activeTargetId === id || isWiping || carState !== 'PATROLLING') return;
    setActiveTargetId(id);
    setCarState('TRAVELING');
  };

  const handleCarArrived = () => {
    if (carState !== 'TRAVELING') return;
    
    setCarState('ARRIVED');
    setCameraMode('CINEMATIC');
    
    // Play cinematic beat for 1.7s (held for a clear beat of ~1.5-2s), then wipe and route
    setTimeout(() => {
      setIsWiping(true);
      setTimeout(() => {
        const dest = destinations.find(d => d.id === activeTargetId);
        if (dest) navigate(dest.path);
        
        setCameraMode('FOLLOW');
        setCarState('PATROLLING'); // GTR keeps driving in the background!
        
        // Reset ref lock once page is rendered
        navLockRef.current = { id: activeTargetId, time: Date.now() };

        // Brief delay before sliding the wipe-overlay back out so the page renders under it
        setTimeout(() => {
          setIsWiping(false);
        }, 100);
      }, 1000); // 1s wipe hold
    }, 1700); // 1.7s cinematic beat
  };

  const handleBackToCity = () => {
    setIsWiping(true);
    setTimeout(() => {
      // Snaps elements to patrol loop immediately while screen is black
      navigate('/');
      setCarState('RETURNING');
      setActiveTargetId(null);
      setCameraMode('FOLLOW');
      
      // Brief delay before sliding back out to ensure first frame renders in snapped position
      setTimeout(() => {
        setIsWiping(false);
      }, 100);
    }, 1000); // 1s wipe hold
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
