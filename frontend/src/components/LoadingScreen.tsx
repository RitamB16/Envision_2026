import React, { useEffect } from 'react';
import { useProgress } from '@react-three/drei';

interface Props {
  onStart: () => void;
}

const LoadingScreen: React.FC<Props> = ({ onStart }) => {
  const { progress } = useProgress();

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        onStart();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [progress, onStart]);

  return (
    <div className="loader-container">
      <style>{`
        .loader-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100dvh;
          z-index: 999;
          background: #030114;
          display: flex;
          justify-content: center;
          align-items: center;
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
      <div className="dots-row">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
    </div>
  );
};

export default LoadingScreen;
