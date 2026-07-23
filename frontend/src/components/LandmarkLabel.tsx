import React, { useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

interface Props {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  isTargeted?: boolean;
  glowColor: string;
  fontFamily: string;
  onRegister?: (name: string, object: THREE.Group) => void;
  isHidden?: boolean;
}

const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
  window.innerWidth <= 768 ||
  (navigator.maxTouchPoints > 0 && /Macintosh|Intel/i.test(navigator.userAgent))
);

// Pre-allocated vectors to prevent GC pressure inside useFrame loop
const _tempLandmarkPos = new THREE.Vector3();
const _tempCarPos = new THREE.Vector3();

const LandmarkLabel: React.FC<Props> = ({ position, label, isActive, isTargeted, glowColor, fontFamily, onRegister, isHidden }) => {
  const arrowRef = useRef<THREE.Mesh>(null);
  const flareRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  
  const isOccludedRef = useRef(false);
  const currentOpacity = useRef(0);
  const currentScale = useRef(1.0);

  // Register with LandmarkLabelManager on mount/ready
  useEffect(() => {
    if (groupRef.current && labelRef.current) {
      (groupRef.current as any).element = labelRef.current;
      if (onRegister) {
        onRegister(label, groupRef.current);
      }
    }
  }, [label, onRegister, labelRef]);

  // Bobbing animation for the arrow
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (arrowRef.current) {
        gsap.to(arrowRef.current.position, {
          y: '+=2',
          duration: 1.5,
          yoyo: true,
          repeat: -1,
          ease: 'power1.inOut'
        });
      }
    });
    return () => ctx.revert();
  }, []);

  // Arrival flare
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (isActive && flareRef.current) {
        // 4 seconds for car to drive, then trigger flare
        gsap.to(flareRef.current.scale, {
          x: 20, y: 20, z: 20,
          duration: 0.5,
          delay: 4.0,
          ease: 'power2.out'
        });
        gsap.to((flareRef.current.material as THREE.MeshBasicMaterial), {
          opacity: 0,
          duration: 1.0,
          delay: 4.5,
          ease: 'power2.in'
        });
      } else if (flareRef.current) {
        flareRef.current.scale.set(0.1, 0.1, 0.1);
        (flareRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    });
    return () => ctx.revert();
  }, [isActive]);

  // Occlusion and Proximity calculation in the animation frame loop
  useFrame((state, delta) => {
    if (!groupRef.current || !groupRef.current.visible) {
      if (labelRef.current && labelRef.current.style.opacity !== '0') {
        labelRef.current.style.opacity = '0';
      }
      return;
    }
    const dt = Math.min(delta, 1/30);
    
    let proximity = 0;
    const carObj = (window as any).__carObj as THREE.Object3D | undefined;
    
    const landmarkWorldPos = _tempLandmarkPos.setFromMatrixPosition(groupRef.current.matrixWorld);
    const cameraWorldPos = state.camera.position;
    const distanceToCamera = landmarkWorldPos.distanceTo(cameraWorldPos);

    if (carObj) {
      const carWorldPos = _tempCarPos.setFromMatrixPosition(carObj.matrixWorld);
      const distance = landmarkWorldPos.distanceTo(carWorldPos);
      
      // Proximity fade factor (1.0 when close, 0.0 when far)
      // Fades in between 25m (0.0) and 15m (1.0)
      proximity = 1.0 - THREE.MathUtils.clamp((distance - 15) / 10, 0, 1);
    }
    
    // Base continuous distance-based scaling and opacity (natural perspective/depth)
    // Closer labels are more visible (max 0.75 opacity), very distant ones are dimmer (min 0.25 opacity)
    const baseOpacity = THREE.MathUtils.clamp(1.0 - (distanceToCamera - 20) / 180, 0.25, 0.75);
    const baseScale = THREE.MathUtils.clamp(1.2 - (distanceToCamera - 20) / 180, 0.5, 1.0);

    // Boost the currently-targeted landmark to full size/opacity
    let targetOpacityVal = baseOpacity;
    let targetScaleVal = baseScale;

    if (isTargeted) {
      targetOpacityVal = 1.0;
      targetScaleVal = 1.25; // Boosted targeted prominence
    }

    // Combine occlusion/proximity calculation with manager state if active
    const managerState = (window as any).__landmarkLabelManager?._current?.get(label);
    const managerOpacity = managerState !== undefined ? managerState.opacity : 1.0;
    const managerScale = managerState !== undefined ? managerState.scale : 1.0;
    
    // If occluded, visibility is dictated by proximity. Otherwise, fully visible.
    const targetOpacity = (isOccludedRef.current ? proximity : 1.0) * targetOpacityVal * managerOpacity;
    currentOpacity.current = THREE.MathUtils.damp(currentOpacity.current, targetOpacity, 6.0, dt);
    
    const targetScale = targetScaleVal * managerScale;
    currentScale.current = THREE.MathUtils.damp(currentScale.current, targetScale, 6.0, dt);
    
    if (labelRef.current) {
      labelRef.current.style.opacity = currentOpacity.current.toFixed(3);
      labelRef.current.style.transform = `scale(${currentScale.current.toFixed(3)})`;
    }
  });

  return (
    <group ref={groupRef} position={position} visible={!isHidden}>
      {/* HTML Label Billboard with Occlusion enabled */}
      <Html 
        position={isMobile ? [0, 9.5, 0] : [0, 15, 0]} 
        center 
        zIndexRange={[100, 0]} 
        distanceFactor={150}
        occlude
        onOcclude={(occluded) => {
          isOccludedRef.current = occluded;
        }}
      >
        <div 
          ref={labelRef}
          style={{
            opacity: 0,
            transformOrigin: 'center center',
            color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
            textShadow: isActive 
              ? `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 45px ${glowColor}` 
              : `0 0 5px ${glowColor}, 0 0 12px ${glowColor}`,
            fontFamily: fontFamily || 'Outfit, sans-serif',
            fontSize: isMobile ? '13px' : '24px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: isMobile ? '1px' : '2px',
            transition: 'color 0.3s ease, text-shadow 0.3s ease',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </div>
      </Html>
      
      {/* 3D Arrow pointing down */}
      <mesh ref={arrowRef} position={isMobile ? [0, 3.8, 0] : [0, 5, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[isMobile ? 0.6 : 1.0, isMobile ? 2.0 : 3.0, 4]} />
        <meshBasicMaterial color={glowColor} wireframe />
      </mesh>

      {/* Arrival Flare Particle */}
      <mesh ref={flareRef} position={[0, 2, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial 
          color={glowColor} 
          transparent 
          opacity={0} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export default LandmarkLabel;
