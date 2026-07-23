import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Props {
  onComplete: () => void;
}

const IgnitionIntro: React.FC<Props> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 1,
          onComplete
        });
      }
    });

    // Hold black screen for 3.3s while streetlights ignite in 3D
    tl.to({}, { duration: 3.3 });

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="ignition-overlay">
      {/* Pink dashboard line removed to prevent progress indicator confusion */}
    </div>
  );
};

export default IgnitionIntro;
