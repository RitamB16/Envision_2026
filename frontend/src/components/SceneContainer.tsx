import React, { Suspense, useRef, useState, useCallback, useEffect } from 'react';
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
  const lightPositions = [
    [-300, 10, -75], [-250, 10, -75], [-200, 10, -75], [-150, 10, -75],
    [-100, 10, -75], [-50, 10, -75], [0, 10, -75], [50, 10, -75]
  ];

  useFrame((state) => {
    if (!introFinished) {
      const time = state.clock.getElapsedTime();
      lightsRef.current.forEach((light, i) => {
        if (time > i * 0.2) {
          light.intensity = THREE.MathUtils.lerp(light.intensity, 1.8, 0.2);
        } else {
          light.intensity = 0;
        }
      });
    } else {
      // Once intro is finished, only assign intensity if not already set to full (avoids dynamic updates)
      if (lightsRef.current.length > 0 && lightsRef.current[0].intensity !== 1.8) {
        lightsRef.current.forEach(light => light.intensity = 1.8);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {lightPositions.map((pos, i) => (
        <pointLight 
          key={i}
          ref={(el) => el && (lightsRef.current[i] = el)}
          position={[pos[0], pos[1], pos[2]]} 
          color="#ffddaa" 
          distance={100} 
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
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float exponent;
  uniform float uTime;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(0.87758, 0.47942, -0.47942, 0.87758);
    for (int i = 0; i < ${mobileMode ? 2 : 4}; ++i) {
      v += a * noise(p);
      p = rot * p * 2.1 + shift;
      a *= 0.45;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = max(dir.y, 0.0);
    
    // --- 1. Base Night Sky Gradient ---
    vec3 baseSky = mix(bottomColor, topColor, pow(h, 0.75));
    vec3 finalColor = baseSky;
    
    if (dir.y >= 0.0) {
      float yFactor = clamp(dir.y, 0.0, 1.0);

      // --- 2. Warm Sunset Horizon Glow Band (Peach/Pink to Magenta to Blue) ---
      vec3 horizonPeachPink = vec3(0.98, 0.40, 0.60); // Warm glowing sunset-pink
      vec3 horizonMagenta   = vec3(0.90, 0.15, 0.82); // Vibrant electric magenta
      vec3 skyVioletBlue   = vec3(0.22, 0.48, 0.98); // Bright cosmic cyan-blue
      vec3 deepCosmicNavy  = vec3(0.04, 0.07, 0.28); // Deep night indigo

      vec3 horizonGlowColor;
      if (yFactor < 0.12) {
        horizonGlowColor = mix(horizonPeachPink, horizonMagenta, yFactor / 0.12);
      } else if (yFactor < 0.38) {
        horizonGlowColor = mix(horizonMagenta, skyVioletBlue, (yFactor - 0.12) / 0.26);
      } else {
        horizonGlowColor = mix(skyVioletBlue, deepCosmicNavy, clamp((yFactor - 0.38) / 0.45, 0.0, 1.0));
      }

      // Horizontal horizon glow mask focused right on the lower sky area
      float horizonMask = exp(-yFactor * 4.2);
      finalColor += horizonGlowColor * horizonMask * 0.95;

      // --- 3. Vertical Aurora Light Pillars (Shooting up from Horizon) ---
      vec2 rayUv = vec2(atan(dir.z, dir.x) * 10.0 + uTime * 0.04, dir.y * 2.8);
      float rayPattern = fbm(vec2(rayUv.x * 2.0, rayUv.y * 0.4 - uTime * 0.015));
      
      // Sharp vertical pillar streaks rising from horizontal band
      float verticalStreaks = noise(vec2(rayUv.x * 16.0 + sin(rayUv.y * 1.8) * 0.7, uTime * 0.08));
      verticalStreaks = pow(verticalStreaks, 2.0) * 1.6;

      float pillarIntensity = smoothstep(0.34, 0.66, rayPattern) * verticalStreaks;
      
      // Vertical height fade: Rises from horizon through mid-sky
      float pillarHeightFade = smoothstep(0.01, 0.15, yFactor) * (1.0 - smoothstep(0.55, 0.88, yFactor));
      pillarIntensity *= pillarHeightFade;

      // Color gradient along the vertical pillars (Pink/Magenta base -> Cyan-Blue top)
      vec3 pillarColor = mix(horizonMagenta, skyVioletBlue, clamp((yFactor - 0.08) / 0.42, 0.0, 1.0));
      finalColor += pillarColor * (pillarIntensity * 1.1 + pow(pillarIntensity, 2.5) * 0.85);

      // --- 4. High-Density Twinkling & Blinking Star Field ---
      vec2 starUv = dir.xz / (dir.y + 0.003);
      
      // Layer 1: Thousands of twinkling background stars across the sky
      float starVal1 = hash(floor(starUv * 350.0));
      float starTwinkle1 = sin(uTime * 3.8 + starVal1 * 60.0) * 0.5 + 0.5;
      float starMask1 = step(0.982, starVal1) * smoothstep(0.02, 0.35, dir.y);
      vec3 starColor1 = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.88, 0.98), hash(floor(starUv * 350.0) + 1.0));
      finalColor += starColor1 * starMask1 * starTwinkle1 * 1.1;

      // Layer 2: Bright prominent blinking focal stars
      float starVal2 = hash(floor(starUv * 160.0) + vec2(45.0, 92.0));
      float starTwinkle2 = cos(uTime * 5.2 + starVal2 * 40.0) * 0.5 + 0.5;
      float starMask2 = step(0.988, starVal2) * smoothstep(0.04, 0.45, dir.y);
      finalColor += vec3(1.0, 1.0, 1.0) * starMask2 * (starTwinkle2 * 1.4) * 1.25;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const SkyGradientShader = {
  uniforms: {
    topColor: { value: new THREE.Color('#02010a') },
    bottomColor: { value: new THREE.Color('#090314') },
    exponent: { value: 0.85 },
    uTime: { value: 0 }
  },
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
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[450, 32, 15]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={SkyGradientShader.vertexShader}
          fragmentShader={SkyGradientShader.fragmentShader}
          uniforms={SkyGradientShader.uniforms}
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

const SceneContainer: React.FC<Props> = ({ 
  activeTargetId, 
  introFinished, 
  carState, 
  cameraMode, 
  onCarArrived, 
  onSetCarState,
  isPageActive = false
}) => {
  const labelsRef = useRef<Array<{ name: string, object: THREE.Group }>>([]);
  const [manager, setManager] = useState<LandmarkLabelManager | null>(null);



  // LandmarkLabel registers its group container with LandmarkLabelManager on mount
  const handleRegister = useCallback((name: string, object: THREE.Group) => {
    if (!labelsRef.current.some(l => l.name === name)) {
      labelsRef.current.push({ name, object });
      if (labelsRef.current.length === 5) {
        const newManager = new LandmarkLabelManager(labelsRef.current);
        setManager(newManager);
        (window as any).__landmarkLabelManager = newManager;
      }
    }
  }, []);

  // Update active target inside manager
  useEffect(() => {
    if (manager) {
      if (activeTargetId) {
        const dest = destinations.find(d => d.id === activeTargetId);
        if (dest) {
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

  // Dynamic canvas pixel density settings: optimized high-quality DPR for mobile to ensure 60FPS
  const canvasDpr = isMobile 
    ? Math.min(window.devicePixelRatio, 1.35) 
    : 1.5;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
      <Canvas 
        shadows={true} 
        dpr={canvasDpr} 
        camera={{ position: [0, 10, 20], fov: 50 }}
        gl={{ 
          antialias: true, 
          powerPreference: 'high-performance', 
          precision: 'mediump'
        }}
      >
        <color attach="background" args={['#080210']} />
        <fog attach="fog" args={['#080210', 50, 240]} />
        <ambientLight intensity={0.18} color="#223366" />
        <directionalLight 
          castShadow={true} 
          position={[120, 180, -250]} 
          intensity={0.4} 
          color="#d6e6ff" 
          shadow-bias={-0.001}
          shadow-mapSize={isMobile ? [512, 512] : [1024, 1024]}
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
          
          {isMobile ? (
            <EffectComposer enableNormalPass={false} multisampling={0}>
              <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={1.3} mipmapBlur />
            </EffectComposer>
          ) : (
            <EffectComposer enableNormalPass={false} multisampling={0}>
              <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={1.3} mipmapBlur />
              <Noise opacity={0.02} />
            </EffectComposer>
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
