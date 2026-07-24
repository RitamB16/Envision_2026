import React, { Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import City from './City';
import Car from './Car';
import CameraRig from './CameraRig';
import LandmarkLabel from './LandmarkLabel';
import { destinations } from '../config';
import { CarState, CameraMode } from '../App';
import TireEffects from './TireEffects';
// @ts-ignore
import { LandmarkLabelManager } from './landmarkLabelManager.js';

interface Props {
  activeTargetId: string | null;
  introFinished: boolean;
  carState: CarState;
  cameraMode: CameraMode;
  onCarArrived: () => void;
  onSetCarState: (state: CarState) => void;
  isPageActive?: boolean;
}

const Streetlights = ({ introFinished }: { introFinished: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const lightsRef = useRef<THREE.PointLight[]>([]);
  const basePositions = [
    [-300, 10, -75], [-250, 10, -75], [-200, 10, -75], [-150, 10, -75],
    [-100, 10, -75], [-50, 10, -75], [0, 10, -75], [50, 10, -75]
  ];
  const activePositions = isMobile ? basePositions.filter((_, i) => i % 2 === 0) : basePositions;
  const targetIntensity = isMobile ? 0.45 : 0.65;

  useFrame((state) => {
    if (!introFinished) {
      const time = state.clock.getElapsedTime();
      lightsRef.current.forEach((light, i) => {
        if (time > i * 0.2) {
          light.intensity = THREE.MathUtils.lerp(light.intensity, targetIntensity, 0.2);
        } else {
          light.intensity = 0;
        }
      });
    } else {
      // Once intro is finished, assign steady target intensity once
      if (lightsRef.current.length > 0 && lightsRef.current[0].intensity !== targetIntensity) {
        lightsRef.current.forEach(light => light.intensity = targetIntensity);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {activePositions.map((pos, i) => (
        <pointLight 
          key={i}
          ref={(el) => el && (lightsRef.current[i] = el)}
          position={[pos[0], pos[1], pos[2]]} 
          color="#ffc888" 
          distance={55} 
          decay={2}
          intensity={0} 
        />
      ))}
    </group>
  );
};

const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
  window.innerWidth <= 768 ||
  (navigator.maxTouchPoints > 0 && /Macintosh|Intel/i.test(navigator.userAgent))
);

const getSkyFragmentShader = (mobileMode: boolean) => `
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float yFactor = clamp(dir.y, 0.0, 1.0);
    
    // --- Balanced Sunset Twilight Horizon Gradient ---
    vec3 sunburstGold       = ${mobileMode ? 'vec3(0.76, 0.42, 0.22)' : 'vec3(0.96, 0.55, 0.12)'};
    vec3 sunsetFieryOrange  = ${mobileMode ? 'vec3(0.70, 0.18, 0.22)' : 'vec3(0.92, 0.18, 0.06)'};
    vec3 twilightPink       = vec3(0.72, 0.12, 0.50);
    vec3 duskCyanTeal       = vec3(0.02, 0.38, 0.68);
    vec3 deepNightBlue      = vec3(0.01, 0.04, 0.22);

    vec3 finalColor;
    if (yFactor < 0.05) {
      finalColor = mix(sunburstGold, sunsetFieryOrange, yFactor / 0.05);
    } else if (yFactor < 0.18) {
      finalColor = mix(sunsetFieryOrange, twilightPink, (yFactor - 0.05) / 0.13);
    } else if (yFactor < 0.42) {
      finalColor = mix(twilightPink, duskCyanTeal, (yFactor - 0.18) / 0.24);
    } else {
      finalColor = mix(duskCyanTeal, deepNightBlue, clamp((yFactor - 0.42) / 0.48, 0.0, 1.0));
    }

    if (dir.y >= 0.0) {
      // Soft horizontal sunset cloud accent
      float horizonCloud = exp(-yFactor * 12.0) * (sin(dir.x * 24.0) * 0.5 + 0.5);
      finalColor += vec3(0.90, 0.25, 0.35) * horizonCloud * ${mobileMode ? '0.16' : '0.28'};
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const SkyGradientShader = {
  uniforms: {},
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: getSkyFragmentShader(isMobile)
};

const CustomSky: React.FC = () => {
  return (
    <group>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[450, isMobile ? 16 : 32, isMobile ? 10 : 15]} />
        <shaderMaterial
          vertexShader={SkyGradientShader.vertexShader}
          fragmentShader={SkyGradientShader.fragmentShader}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

const LabelsUpdater: React.FC<{ manager: LandmarkLabelManager | null }> = ({ manager }) => {
  useFrame((_state, delta) => {
    if (manager) {
      manager.update(delta);
    }
  });
  return null;
};

interface SceneContainerProps extends Props {}

const SceneContainer: React.FC<SceneContainerProps> = ({ 
  activeTargetId, 
  introFinished, 
  carState, 
  cameraMode, 
  onCarArrived, 
  onSetCarState,
  isPageActive = false
}) => {
  const manager = useRef<LandmarkLabelManager>(new LandmarkLabelManager([])).current;

  const handleRegister = useCallback(() => {
    onSetCarState('TRAVELING');
  }, [onSetCarState]);

  // Update active target inside manager
  useEffect(() => {
    if (activeTargetId) {
      const dest = destinations.find(d => d.id === activeTargetId);
      if (dest) {
        if (manager) {
          manager.setActiveLandmark(dest.displayName);
        }
      } else {
        manager.setActiveLandmark(null);
      }
    }
  }, [activeTargetId, manager]);

  // Handle page entry/exit overlay fade out/restore
  useEffect(() => {
    if (manager) {
      if (isPageActive || cameraMode === 'PAGE') {
        manager.enterPage();
      } else if (carState === 'RETURNING' || carState === 'PATROLLING') {
        manager.exitPage();
      }
    }
  }, [cameraMode, carState, manager, isPageActive]);

  // Dynamic crisp pixel density: 1.25 DPR on mobile, 1.35 on desktop for ultra-sharp visuals without frame drops
  const canvasDpr = isMobile 
    ? Math.min(window.devicePixelRatio, 1.25) 
    : Math.min(window.devicePixelRatio, 1.35);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
      <Canvas 
        frameloop="always"
        shadows={!isMobile} 
        dpr={canvasDpr} 
        camera={{ position: [0, 10, 20], fov: 50 }}
        gl={{ 
          antialias: true, 
          powerPreference: 'high-performance', 
          precision: 'mediump',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isMobile ? 0.85 : 1.0,
          stencil: false,
          depth: true
        }}
      >
        <color attach="background" args={['#030108']} />
        <fog attach="fog" args={['#030108', 35, 210]} />
        <ambientLight intensity={0.08} color="#18244a" />
        <directionalLight 
          castShadow={!isMobile} 
          position={[120, 180, -250]} 
          intensity={0.18} 
          color="#6080b0" 
          shadow-bias={-0.001}
          shadow-mapSize={isMobile ? [256, 256] : [1024, 1024]}
        />
        <Suspense fallback={null}>
          <CustomSky />
          <City />
          <Streetlights introFinished={introFinished} />
          
          <Car 
            activeTargetId={activeTargetId} 
            introFinished={introFinished} 
            carState={carState}
            onCarArrived={onCarArrived}
            onSetCarState={onSetCarState}
          />
          <TireEffects />
          
          {!isPageActive && (
            isMobile ? (
              <EffectComposer enableNormalPass={false} multisampling={0}>
                <Bloom luminanceThreshold={0.65} luminanceSmoothing={0.85} intensity={1.1} mipmapBlur />
              </EffectComposer>
            ) : (
              <EffectComposer enableNormalPass={false} multisampling={0}>
                <Bloom luminanceThreshold={0.65} luminanceSmoothing={0.85} intensity={1.3} mipmapBlur />
                <Noise opacity={0.02} />
              </EffectComposer>
            )
          )}
          
          <CameraRig 
            activeTargetId={activeTargetId} 
            introFinished={introFinished} 
            cameraMode={cameraMode}
          />

          <LabelsUpdater manager={manager} />
          
          {introFinished && destinations.map(dest => {
            if (dest.id === 'home') return null;
            return (
              <LandmarkLabel 
                key={dest.id}
                position={dest.buildingPosition}
                label={dest.displayName}
                isActive={carState === 'ARRIVED' && activeTargetId === dest.id}
                isTargeted={activeTargetId === dest.id}
                glowColor={dest.glowColor}
                fontFamily={dest.fontFamily}
                onRegister={handleRegister}
                isHidden={isPageActive}
              />
            );
          })}
          <Environment preset="night" background={false} blur={0.8} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default SceneContainer;
