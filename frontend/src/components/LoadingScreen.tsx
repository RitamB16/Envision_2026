import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

interface Props {
  onStart: () => void;
}

const LoadingScreen: React.FC<Props> = ({ onStart }) => {
  const { progress } = useProgress();
  const [minTimerDone, setMinTimerDone] = useState(false);

  // Guarantee minimum 2.0-second establishing delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimerDone(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (progress === 100 && minTimerDone) {
      onStart();
    }
  }, [progress, minTimerDone, onStart]);

  return (
    <div className="loader-container">
      <style>{`
        .loader-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100dvh;
          z-index: 999999;
          background: radial-gradient(circle at center, #0d061f 0%, #030108 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 1.8rem;
          padding: 1.5rem;
          box-sizing: border-box;
          text-align: center;
        }
        .blinking-logo-title {
          font-family: 'Orbitron', 'Outfit', sans-serif;
          font-size: clamp(1.6rem, 7.5vw, 3rem);
          font-weight: 900;
          letter-spacing: clamp(0.1em, 2vw, 0.25em);
          text-align: center;
          width: 100%;
          max-width: 95vw;
          background: linear-gradient(135deg, #ffffff 0%, #00f3ff 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 22px rgba(0, 243, 255, 0.75));
          animation: cyberBlink 1.4s infinite ease-in-out alternate;
          margin: 0 auto;
          line-height: 1.2;
          word-break: keep-all;
        }
        .dots-row {
          display: flex;
          gap: 1.2rem;
          justify-content: center;
          align-items: center;
        }
        .loading-dot {
          border-radius: 50%;
          animation: dotBlink 1.4s infinite ease-in-out;
        }
        .loading-dot:nth-child(1) { width: 22px; height: 22px; background-color: #fec035; animation-delay: 0s; color: #fec035; }
        .loading-dot:nth-child(2) { width: 12px; height: 12px; background-color: #f53672; animation-delay: 0.2s; color: #f53672; }
        .loading-dot:nth-child(3) { width: 16px; height: 16px; background-color: #35dbfd; animation-delay: 0.4s; color: #35dbfd; }
        .loading-dot:nth-child(4) { width: 19px; height: 19px; background-color: #d32ed8; animation-delay: 0.6s; color: #d32ed8; }

        .progress-text {
          font-family: monospace;
          font-size: clamp(0.75rem, 3vw, 0.9rem);
          color: #a855f7;
          letter-spacing: 0.2em;
          text-align: center;
          animation: pulseGlow 1.5s infinite ease-in-out;
        }

        @keyframes cyberBlink {
          0% { opacity: 0.5; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1.02); filter: drop-shadow(0 0 35px rgba(0, 243, 255, 0.95)); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes dotBlink {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.35;
            filter: drop-shadow(0 0 0px transparent);
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
            filter: drop-shadow(0 0 12px currentColor);
          }
        }
      `}</style>
      <div className="blinking-logo-title">ENVISION '26</div>
      <div className="dots-row">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
      <div className="progress-text">
        INITIALIZING SYSTEM // {Math.round(progress)}%
      </div>
    </div>
  );
};

export default LoadingScreen;
