import React from 'react';
import { destinations } from '../config';
import { CarState } from '../App';
import ProfileDropdown from './ProfileDropdown';

interface Props {
  onNavigate: (id: string) => void;
  activeTargetId: string | null;
  carState: CarState;
  isPageActive?: boolean;
  isSignedUp?: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

// Custom line icons (outline style matching reference design)
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const EventsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="9" y1="4" x2="9" y2="10" />
    <line x1="15" y1="4" x2="15" y2="10" />
  </svg>
);

const GalleryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const AboutUsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AlumniIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </svg>
);

const PartnersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4-4a1 1 0 0 0 0-1.4l-2-2" />
    <path d="m13 14 5-5a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0l-5 5" />
    <path d="m8.5 14.5-1.5-1.5a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4l2 2a1 1 0 0 0 1.4 0l4-4" />
    <path d="m16 16-3.5 3.5a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4L13 9" />
  </svg>
);

const getIcon = (id: string) => {
  switch (id) {
    case 'events': return <EventsIcon />;
    case 'gallery': return <GalleryIcon />;
    case 'coordinators': return <AboutUsIcon />;
    case 'alumni': return <AlumniIcon />;
    case 'sponsors': return <PartnersIcon />;
    default: return <HomeIcon />;
  }
};

// Social Media SVGs
const SocialInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const SocialLinkedin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

const SocialX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z M4 20l6.768 -6.768 M20 4l-6.768 6.768"/></svg>
);

const SocialWhatsapp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const NavDock: React.FC<Props> = ({ onNavigate, activeTargetId, carState, isPageActive = false, isSignedUp = false, isDrawerOpen, setIsDrawerOpen }) => {
  const isNavDisabled = carState === 'TRAVELING' || carState === 'RETURNING';
  const [activeSegments, setActiveSegments] = React.useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const getPageTitle = () => {
    const path = window.location.pathname;
    if (path.includes('/events')) return "EVENTS";
    if (path.includes('/gallery')) return "GALLERY";
    if (path.includes('/coordinators')) return "ABOUT US";
    if (path.includes('/alumni')) return "ALUMNI";
    if (path.includes('/sponsors')) return "PARTNERS";
    if (path.includes('/register')) return "REGISTER";
    return "";
  };

  // 7 slanted parallelograms points mapped to 1024x682 SVG coordinate space
  const segments = [
    { points: "548,410 580,410 564,428 532,428" },
    { points: "592,410 624,410 608,428 576,428" },
    { points: "636,410 668,410 652,428 620,428" },
    { points: "680,410 712,410 696,428 664,428" },
    { points: "724,410 756,410 740,428 708,428" },
    { points: "768,410 800,410 784,428 752,428" },
    { points: "812,410 844,410 828,428 796,428" }
  ];

  // Futuristic loading bar energy effect state loop
  React.useEffect(() => {
    let timeoutId: number;
    let active = true;

    const playSequence = async (steps: { opacities: number[], duration: number }[]) => {
      for (const step of steps) {
        if (!active) return;
        setActiveSegments(step.opacities);
        await new Promise(resolve => timeoutId = window.setTimeout(resolve, step.duration));
      }
    };

    const loop = async () => {
      while (active) {
        const rand = Math.random();

        if (rand < 0.15) {
          // 1. Fast charging sweep (left to right)
          const steps = [];
          for (let i = 0; i < 7; i++) {
            const opacities = Array(7).fill(0);
            for (let j = 0; j <= i; j++) opacities[j] = 1;
            steps.push({ opacities, duration: 60 });
          }
          steps.push({ opacities: Array(7).fill(1), duration: 600 });
          await playSequence(steps);
        }
        else if (rand < 0.28) {
          // 2. Reverse discharge sweep (right to left)
          const steps = [];
          for (let i = 6; i >= -1; i--) {
            const opacities = Array(7).fill(0);
            for (let j = 0; j <= i; j++) opacities[j] = 1;
            steps.push({ opacities, duration: 70 });
          }
          await playSequence(steps);
        }
        else if (rand < 0.45) {
          // 3. Breathing / pulsing sequence
          await playSequence([
            { opacities: Array(7).fill(1), duration: 400 },
            { opacities: Array(7).fill(0.2), duration: 300 },
            { opacities: Array(7).fill(1), duration: 450 }
          ]);
        }
        else if (rand < 0.65) {
          // 4. Random capacity glows (fill half, 2/3, or full)
          const level = Math.floor(Math.random() * 6) + 1; // 1 to 6
          const opacities = Array(7).fill(0).map((_, idx) => idx < level ? 1 : 0);
          await playSequence([
            { opacities, duration: Math.random() * 400 + 400 }
          ]);
        }
        else if (rand < 0.82) {
          // 5. Fade out last 2-3 segments (soft decay)
          const opacities = [1, 1, 1, 1, 0.6, 0.2, 0];
          await playSequence([
            { opacities, duration: 650 }
          ]);
        }
        else {
          // 6. Dynamic high-tech jitter/flutter
          const steps = [];
          for (let k = 0; k < 4; k++) {
            const opacities = Array(7).fill(0).map(() => Math.random() > 0.4 ? 1 : 0.05);
            steps.push({ opacities, duration: 80 });
          }
          await playSequence(steps);
        }

        // Random pause between animation cycles
        if (!active) return;
        setActiveSegments(Array(7).fill(0));
        await new Promise(resolve => timeoutId = window.setTimeout(resolve, Math.random() * 500 + 350));
      }
    };

    loop();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleHomeClick = () => {
    const backEvent = new CustomEvent('envision-back', { cancelable: true });
    const defaultPrevented = !window.dispatchEvent(backEvent);
    if (!defaultPrevented) {
      onNavigate('home');
    }
  };

  return (
    <div className="hud-overlay">
      <style>{`
        .hud-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          font-family: 'Outfit', sans-serif;
        }

        .hud-interactive {
          pointer-events: auto;
        }

        /* Premium Logo Image Wrapper & Animations */
        .brand-header-container {
          position: absolute;
          top: 8%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-image-wrapper {
          position: relative;
          display: inline-block;
          cursor: pointer;
          opacity: 0;
          transform: translateY(10px) translate3d(0, 0, 0);
          animation: logoFadeIn 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          will-change: transform, opacity;
        }

        .logo-image-wrapper:hover {
          transform: scale(1.02) translate3d(0, 0, 0);
        }

        .brand-logo-img {
          display: block;
          max-width: 520px;
          height: auto;
          object-fit: contain;
          image-rendering: -webkit-optimize-contrast; /* Keeps logo crisp */
        }



        /* SVG overlay position coordinates & transition defaults */
        .logo-energy-svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        .logo-energy-segment {
          transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1), filter 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          mix-blend-mode: screen;
          will-change: opacity, filter;
        }

        @keyframes logoFadeIn {
          to {
            opacity: 1;
            transform: translateY(0) translate3d(0, 0, 0);
          }
        }


        /* Left Sidebar Layout Styles */
        .sidebar-left {
          position: absolute;
          left: 2rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 2.2rem;
          padding: 2.5rem 0.8rem;
          width: 110px;
          border-radius: 20px;
          background: rgba(10, 10, 15, 0.35) !important;
          backdrop-filter: blur(30px) !important;
          -webkit-backdrop-filter: blur(30px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.03);
          align-items: center;
          z-index: 99999;
          pointer-events: auto;
        }

        .sidebar-btn {
          width: 100%;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: rgba(255, 255, 255, 0.55);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 0.6rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          outline: none;
          padding: 0;
        }

        .sidebar-btn-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: 'Outfit', sans-serif;
          transition: color 0.25s ease, text-shadow 0.25s ease;
        }

        .sidebar-btn:hover {
          color: #fff;
        }

        .sidebar-btn:hover svg {
          transform: scale(1.05);
          filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.4));
        }

        .sidebar-btn.active {
          color: #fff;
        }

        .sidebar-btn.active svg {
          transform: scale(1.08);
          filter: drop-shadow(0 0 8px rgba(0, 243, 255, 0.8)) drop-shadow(0 0 15px rgba(0, 243, 255, 0.4));
        }

        .sidebar-btn.active .sidebar-btn-label {
          color: #fff;
          text-shadow: 0 0 8px rgba(0, 243, 255, 0.5);
        }

        .sidebar-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* Top-Right Sign Up Pill Button (Custom compact redesign) */
        .signup-pill-btn {
          background: rgba(16, 12, 28, 0.82) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          color: #fff !important;
          border: 1px solid rgba(0, 243, 255, 0.45) !important;
          border-left: none !important; /* Matches slanted edge nicely */
          padding: 0.48rem 1.10rem 0.48rem 1.45rem !important;
          font-weight: 900 !important;
          font-size: 0.72rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.14em !important;
          font-family: 'Orbitron', sans-serif !important;
          clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%) !important;
          border-top-right-radius: 8px !important;
          border-bottom-right-radius: 8px !important;
          box-shadow: 0 0 12px rgba(0, 243, 255, 0.22) !important;
          cursor: pointer !important;
          transition: all 0.25s ease !important;
          will-change: transform, box-shadow, background-color;
        }

        .signup-pill-btn:hover {
          background: rgba(0, 243, 255, 0.15) !important;
          border-color: rgba(0, 243, 255, 0.85) !important;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.55), 0 0 8px rgba(168, 85, 247, 0.3) !important;
          transform: scale(1.03) translate3d(0, -1px, 0) !important;
        }

        /* Right Social Dock Layout */
        .social-dock-right {
          position: absolute;
          right: 2rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 2.2rem;
          padding: 2.5rem 1rem;
          width: 80px;
          border-top-left-radius: 20px;
          border-bottom-left-radius: 20px;
          background: rgba(10, 10, 15, 0.35) !important;
          backdrop-filter: blur(30px) !important;
          -webkit-backdrop-filter: blur(30px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-right: none !important;
          box-shadow: -5px 10px 40px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.02);
          clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);
          align-items: center;
          z-index: 99999;
          pointer-events: auto;
        }

        .social-circle-btn {
          width: 100%;
          height: auto;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          padding: 0;
          outline: none;
          text-decoration: none;
        }

        .social-circle-btn svg {
          width: 24px;
          height: 24px;
          transition: transform 0.25s ease, filter 0.25s ease;
        }

        .social-circle-btn:hover svg {
          transform: scale(1.12);
          color: #fff;
          filter: drop-shadow(0 0 8px rgba(74, 21, 157, 0.8)) drop-shadow(0 0 15px rgba(0, 243, 255, 0.4));
        }

        /* Top Navigation Header Controls */
        .page-header-controls {
          position: absolute;
          top: 2rem;
          left: 2rem;
          right: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 9999;
          pointer-events: auto !important;
        }

        .hud-active-page-title {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
          z-index: 10;
        }

        .icon-nav-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(3, 1, 20, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .icon-nav-btn:hover:not(:disabled) {
          color: #00f3ff;
          border-color: rgba(0, 243, 255, 0.45);
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.25);
          transform: scale(1.05);
        }

        .profile-modal-card {
          position: absolute;
          top: 5.5rem;
          right: 2rem;
          background: rgba(3, 1, 20, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border-radius: 12px;
          padding: 1.5rem;
          width: 260px;
          z-index: 120;
          animation: slideInDown 0.3s ease-out;
        }
        
        @keyframes slideInDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .mobile-only {
          display: none !important;
        }
        .desktop-only {
          display: flex !important;
        }
        .sidebar-left.desktop-only {
          display: flex !important;
        }
        .social-dock-right.desktop-only {
          display: flex !important;
        }

        /* Mobile & Tablet Responsiveness */
        @media (max-width: 768px) {
          .mobile-only {
            display: flex !important;
          }
          .desktop-only {
            display: none !important;
          }
          .sidebar-left.desktop-only {
            display: none !important;
          }
          .social-dock-right.desktop-only {
            display: none !important;
          }

          .brand-header-container {
            top: 12% !important;
          }
          .brand-logo-img {
            max-width: 320px !important;
          }
          .logo-image-wrapper {
            padding: 6px 12px !important;
          }

          .page-header-controls {
            top: 1rem;
            left: 0.8rem;
            right: 0.8rem;
          }
          .hud-active-page-title {
            display: none !important;
          }
          .icon-nav-btn {
            background: rgba(3, 1, 20, 0.82) !important;
            backdrop-filter: blur(5px) !important;
            -webkit-backdrop-filter: blur(5px) !important;
          }
          .profile-modal-card {
            top: 4.5rem;
            right: 0.8rem;
            width: calc(100% - 1.6rem);
            max-width: 280px;
            background: rgba(3, 1, 20, 0.85) !important;
            backdrop-filter: blur(5px) !important;
            -webkit-backdrop-filter: blur(5px) !important;
          }

          /* Bottom Nav Bar - Full Width fixed glassmorphism */
          .mobile-bottom-nav {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
            background: rgba(10, 10, 15, 0.25) !important;
            backdrop-filter: blur(25px) !important;
            -webkit-backdrop-filter: blur(25px) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
            border-top-left-radius: 24px !important;
            border-top-right-radius: 24px !important;
            box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 243, 255, 0.1) !important;
            display: flex !important;
            justify-content: space-around;
            align-items: center;
            z-index: 9999 !important;
            pointer-events: auto !important;
          }

          .mobile-bottom-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            font-size: 11px;
            font-family: 'Outfit', sans-serif;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
            cursor: pointer;
            width: 25%;
            height: 100%;
            transition: all 0.25s ease;
            outline: none;
            -webkit-tap-highlight-color: transparent;
          }

          .mobile-bottom-btn:hover {
            color: rgba(255, 255, 255, 0.95);
          }

          .mobile-bottom-btn.active {
            color: #00f3ff;
            text-shadow: 0 0 8px rgba(0, 243, 255, 0.5);
          }

          .mobile-bottom-btn svg {
            transition: transform 0.2s ease, filter 0.2s ease;
          }

          .mobile-bottom-btn.active svg {
            transform: translateY(-2px) scale(1.1);
            filter: drop-shadow(0 0 5px rgba(0, 243, 255, 0.5));
          }

          .mobile-bottom-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          /* Side Drawer Backdrop */
          .drawer-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(3, 1, 20, 0.5);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            z-index: 150;
          }

          .drawer-backdrop.open {
            opacity: 1;
            pointer-events: auto;
          }

          /* Side Drawer */
          .side-drawer {
            position: fixed;
            top: 0;
            left: 0;
            width: 280px;
            height: 100vh;
            max-height: 100vh;
            background: rgba(12, 6, 20, 0.78);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-right: 1px solid rgba(0, 243, 255, 0.15);
            box-shadow: 10px 0 50px rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            padding: 1.5rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom)) 1.2rem;
            transform: translateX(-100%);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 160;
            pointer-events: auto;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            box-sizing: border-box;
          }

          .side-drawer.open {
            transform: translateX(0);
          }

          .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .drawer-brand {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }

          .drawer-title {
            font-size: 1.8rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #fff;
            font-family: Impact, 'Arial Black', sans-serif;
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.3);
            margin: 0;
            line-height: 1.1;
          }

          .drawer-subtitle {
            font-size: 0.55rem;
            letter-spacing: 0.2em;
            color: #00f3ff;
            text-transform: uppercase;
            font-weight: 700;
            margin-top: 4px;
          }

          .drawer-close-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.2s ease;
          }

          .drawer-close-btn:hover {
            color: #ff0055;
            border-color: #ff0055;
          }

          .drawer-menu-list {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            margin-bottom: 1rem;
          }



          .drawer-item-title {
            font-size: 0.65rem;
            font-weight: 800;
            letter-spacing: 0.15em;
            color: #00f3ff;
            text-transform: uppercase;
            border-bottom: 1px solid rgba(0, 243, 255, 0.15);
            padding-bottom: 4px;
            margin-top: 0.6rem;
            margin-bottom: 0.3rem;
            text-shadow: 0 0 8px rgba(0, 243, 255, 0.4);
            text-align: left;
          }

          .drawer-link {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.85);
            font-size: 1rem;
            font-weight: 600;
            text-align: left;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 10px;
            border-radius: 8px;
            border-left: 2px solid transparent;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .drawer-link:hover, .drawer-link.active {
            color: #fff;
            background: rgba(0, 243, 255, 0.08);
            border-left: 2px solid #00f3ff;
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.4);
            padding-left: 14px;
          }

          .drawer-link:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .drawer-socials-inline {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-left: 10px;
            margin-top: 0.4rem;
            margin-bottom: 0.5rem;
          }

          .drawer-social-inline-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.04);
            color: rgba(255, 255, 255, 0.75);
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
          }

          .drawer-social-inline-btn:hover, .drawer-social-inline-btn:active {
            border-color: #00f3ff;
            color: #00f3ff;
            background: rgba(0, 243, 255, 0.1);
            box-shadow: 0 0 12px rgba(0, 243, 255, 0.4);
            transform: scale(1.08);
          }

          .drawer-social-inline-btn svg {
            display: block;
            width: 18px;
            height: 18px;
            stroke: currentColor;
            fill: none;
            transition: transform 0.2s ease;
          }

          .drawer-social-inline-btn:hover svg, .drawer-social-inline-btn:active svg {
            transform: scale(1.05);
          }
        }

        @media (max-width: 480px) {
          .brand-logo-img {
            max-width: 240px !important;
          }
          .logo-image-wrapper {
            padding: 4px 8px !important;
          }
        }
      `}</style>

      {/* 1. Dynamic Top Control Bar (Always Mounted to handle Top-Right & Top-Left/Middle actions) */}
      <div className="page-header-controls">
        {/* Top Left: Back arrow icon (if page active) OR Hamburger Menu (if mobile & page not active) */}
        <div className="flex items-center gap-2">
          {isPageActive ? (
            <>
              {/* Back button (both desktop and mobile on active subpages) */}
              <button 
                onClick={handleHomeClick}
                className="icon-nav-btn hud-interactive"
                title="Back to City"
              >
                <BackIcon />
              </button>
            </>
          ) : (
            <>
              {/* Desktop placeholder (empty space) */}
              <div className="desktop-only" style={{ width: 44 }} />
              
              {/* Mobile Hamburger menu icon */}
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="icon-nav-btn mobile-only hud-interactive"
                title="Open Menu"
              >
                <HamburgerIcon />
              </button>
            </>
          )}
        </div>

        {/* Top Middle: Centered Page Title Label (desktop only to prevent mobile navbar collision) */}
        <div className="flex items-center justify-center">
          {isPageActive ? (
            <div className="hud-active-page-title text-center hidden sm:block">
              <span className="font-black text-sm md:text-base tracking-[0.25em] mr-[-0.25em] text-white uppercase cyber-hud-title">
                {getPageTitle()}
              </span>
            </div>
          ) : null}
        </div>

        {/* Top Right: Glassmorphic ProfileDropdown (if signed up) or prominent "SIGN IN" button (if not signed up) */}
        <div className="flex items-center justify-end gap-3 hud-interactive relative" style={{ pointerEvents: 'auto', zIndex: 9999 }}>
          {isSignedUp ? (
            <ProfileDropdown />
          ) : (
            <button 
              onClick={() => onNavigate('register')}
              className="signup-pill-btn hud-interactive"
              disabled={isNavDisabled}
            >
              SIGN IN
            </button>
          )}
        </div>
      </div>



      {/* Home/Patrol HUD - Rendered only when isPageActive is false */}
      {!isPageActive && (
        <>
          {/* 1. Hero Brand Header - visible on cruise landing */}
          {activeTargetId === null && (
            <div className="brand-header-container">
              <div className="logo-image-wrapper">
                <img 
                  src="/images/logo.png" 
                  alt="Envision Logo" 
                  className="brand-logo-img" 
                />

                
                {/* Dynamic SVG Energy-Loading Indicator */}
                <svg 
                  viewBox="0 0 1024 682" 
                  className="logo-energy-svg-overlay"
                >
                  <defs>
                    <linearGradient id="logo-energy-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00d2ff" />
                      <stop offset="25%" stopColor="#0055ff" />
                      <stop offset="55%" stopColor="#9d00ff" />
                      <stop offset="80%" stopColor="#ff007f" />
                      <stop offset="100%" stopColor="#ff0055" />
                    </linearGradient>
                  </defs>
                  
                  {/* Render 7 animated energy segments */}
                  {segments.map((seg, idx) => (
                    <polygon
                      key={idx}
                      points={seg.points}
                      fill="url(#logo-energy-grad)"
                      className="logo-energy-segment"
                      style={{
                        opacity: activeSegments[idx],
                        filter: `drop-shadow(0 0 8px ${
                          idx < 2 ? '#00d2ff' : idx < 4 ? '#0055ff' : idx < 6 ? '#9d00ff' : '#ff0055'
                        })`
                      }}
                    />
                  ))}
                </svg>
              </div>
            </div>
          )}
          {/* 2. Left Translucent Sidebar Dock */}
          <div className="sidebar-left glass-panel hud-interactive desktop-only">
            {/* Home Button */}
            <button
              className={`sidebar-btn ${activeTargetId === null ? 'active' : ''}`}
              onClick={() => onNavigate('home')}
            >
              <HomeIcon />
              <span className="sidebar-btn-label">Home</span>
            </button>

            {/* Dynamic Destination Buttons */}
            {destinations.map((dest) => (
              <button
                key={dest.id}
                className={`sidebar-btn ${activeTargetId === dest.id ? 'active' : ''}`}
                onClick={() => onNavigate(dest.id)}
              >
                {getIcon(dest.id)}
                <span className="sidebar-btn-label">{dest.displayName}</span>
              </button>
            ))}
          </div>

          {/* 3. Right Social Icons Dock */}
          <div className="social-dock-right hud-interactive desktop-only">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="Instagram">
              <SocialInstagram />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="LinkedIn">
              <SocialLinkedin />
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="Twitter X">
              <SocialX />
            </a>
            <a href="https://wa.me/9123456789" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="WhatsApp">
              <SocialWhatsapp />
            </a>
          </div>

          {/* 4. Bottom Fixed Tab Bar (MOBILE ONLY) */}
          <div className="mobile-bottom-nav mobile-only hud-interactive">
            <button 
              className={`mobile-bottom-btn ${activeTargetId === null ? 'active' : ''}`}
              onClick={() => onNavigate('home')}
            >
              <HomeIcon />
              <span>Home</span>
            </button>
            <button 
              className={`mobile-bottom-btn ${activeTargetId === 'events' ? 'active' : ''}`}
              onClick={() => onNavigate('events')}
            >
              <EventsIcon />
              <span>Events</span>
            </button>
            <button 
              className={`mobile-bottom-btn ${activeTargetId === 'gallery' ? 'active' : ''}`}
              onClick={() => onNavigate('gallery')}
            >
              <GalleryIcon />
              <span>Gallery</span>
            </button>
            <button 
              className={`mobile-bottom-btn ${activeTargetId === 'coordinators' ? 'active' : ''}`}
              onClick={() => onNavigate('coordinators')}
            >
              <AboutUsIcon />
              <span>About Us</span>
            </button>
          </div>

          {/* 5. Mobile Side Drawer Navigation Menu & Backdrop (MOBILE ONLY) */}
          <div className={`drawer-backdrop mobile-only ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />
          <div className={`side-drawer mobile-only ${isDrawerOpen ? 'open' : ''}`}>
            <div className="drawer-header">
              <div className="drawer-brand">
                <h2 className="drawer-title">Envision</h2>
                <span className="drawer-subtitle">CS Department, RKMRC</span>
              </div>
              <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>

            <div className="drawer-menu-list">
              <div className="drawer-item-title">Main Navigation</div>
              <button 
                className={`drawer-link ${activeTargetId === null ? 'active' : ''}`}
                onClick={() => { onNavigate('home'); setIsDrawerOpen(false); }}
              >
                <HomeIcon />
                <span>Home</span>
              </button>
              <button 
                className={`drawer-link ${activeTargetId === 'events' ? 'active' : ''}`}
                onClick={() => { onNavigate('events'); setIsDrawerOpen(false); }}
              >
                <EventsIcon />
                <span>Events</span>
              </button>
              <button 
                className={`drawer-link ${activeTargetId === 'gallery' ? 'active' : ''}`}
                onClick={() => { onNavigate('gallery'); setIsDrawerOpen(false); }}
              >
                <GalleryIcon />
                <span>Gallery</span>
              </button>
              <button 
                className={`drawer-link ${activeTargetId === 'coordinators' ? 'active' : ''}`}
                onClick={() => { onNavigate('coordinators'); setIsDrawerOpen(false); }}
              >
                <AboutUsIcon />
                <span>About Us</span>
              </button>

              <div className="drawer-item-title">Community</div>
              <button 
                className={`drawer-link ${activeTargetId === 'alumni' ? 'active' : ''}`}
                onClick={() => { onNavigate('alumni'); setIsDrawerOpen(false); }}
              >
                <AlumniIcon />
                <span>Alumni</span>
              </button>
              <button 
                className={`drawer-link ${activeTargetId === 'sponsors' ? 'active' : ''}`}
                onClick={() => { onNavigate('sponsors'); setIsDrawerOpen(false); }}
              >
                <PartnersIcon />
                <span>Partners</span>
              </button>

              <div className="drawer-item-title">Connect With Us</div>
              <a className="drawer-link" href="mailto:envision.cs@rkmrc.org" target="_blank" rel="noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>Contact Us</span>
              </a>

              {/* Social Icons inline below Contact Us */}
              <div className="drawer-socials-inline">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="drawer-social-inline-btn" aria-label="Instagram">
                  <SocialInstagram />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="drawer-social-inline-btn" aria-label="LinkedIn">
                  <SocialLinkedin />
                </a>
                <a href="https://x.com" target="_blank" rel="noreferrer" className="drawer-social-inline-btn" aria-label="Twitter X">
                  <SocialX />
                </a>
                <a href="https://wa.me/9123456789" target="_blank" rel="noreferrer" className="drawer-social-inline-btn" aria-label="WhatsApp">
                  <SocialWhatsapp />
                </a>
              </div>
            </div>


          </div>
        </>
      )}
    </div>
  );
};

export default NavDock;
