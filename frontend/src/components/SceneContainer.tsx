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
          light.intensity = THREE.MathUtils.lerp(light.intensity, 4, 0.2);
        } else {
          light.intensity = 0;
        }
      });
    } else {
      // Once intro is finished, only assign intensity if not already set to full (avoids dynamic updates)
      if (lightsRef.current.length > 0 && lightsRef.current[0].intensity !== 4) {
        lightsRef.current.forEach(light => light.intensity = 4);
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
    vec3 skyColor = mix(bottomColor, topColor, pow(h, exponent));
    
    vec3 finalColor = skyColor;
    if (dir.y > 0.0) {
      // --- Twinkling Star Field ---
      vec2 starUv = dir.xz / (dir.y + 0.001);
      float starVal = hash(floor(starUv * 160.0));
      float starTwinkle = sin(uTime * 2.0 + starVal * 20.0) * 0.5 + 0.5;
      
      float starMask = step(0.995, starVal) * smoothstep(0.15, 0.6, dir.y);
      finalColor += vec3(starMask * starTwinkle * 0.7);

      // --- Rich Multi-Stop Aurora Altitude Gradient ---
      vec3 auroraYellowGreen = vec3(0.42, 0.95, 0.02);
      vec3 auroraGreen = vec3(0.02, 0.95, 0.42);
      vec3 auroraPink = vec3(0.95, 0.02, 0.62);
      vec3 auroraViolet = vec3(0.65, 0.02, 0.95);

      float yFactor = clamp(dir.y, 0.0, 1.0);
      vec3 auroraColor;
      if (yFactor < 0.22) {
        auroraColor = mix(auroraYellowGreen, auroraGreen, yFactor / 0.22);
      } else if (yFactor < 0.50) {
        auroraColor = mix(auroraGreen, auroraPink, (yFactor - 0.22) / 0.28);
      } else {
        auroraColor = mix(auroraPink, auroraViolet, clamp((yFactor - 0.50) / 0.35, 0.0, 1.0));
      }

      // --- Layer 1: Bright Detailed Foreground Curtain ---
      vec2 uv1 = dir.xz / (dir.y + 0.04);
      vec2 uvStreaked1 = vec2(
        uv1.x * 2.4 + sin(uv1.y * 0.38 + uTime * 0.16) * 0.6,
        uv1.y * 0.18 - uTime * 0.035
      );
      
      float nVal1 = fbm(uvStreaked1 * 1.8);
      float curtainIntensity1 = smoothstep(0.36, 0.64, nVal1);
      
      float rayNoise1 = noise(vec2(uv1.x * 38.0 + uTime * 0.28, uv1.y * 2.0));
      curtainIntensity1 *= (0.55 + 0.45 * rayNoise1);
      
      float verticalFade1 = smoothstep(0.005, 0.20, dir.y) * (1.0 - smoothstep(0.65, 0.95, dir.y));
      curtainIntensity1 *= verticalFade1;

      float patchPulse1 = noise(vec2(uv1.x * 0.14 + uTime * 0.045, uv1.y * 0.08));
      curtainIntensity1 *= mix(0.55, 1.45, patchPulse1);

      vec3 fgGlow = auroraColor * (curtainIntensity1 * 0.65 + pow(curtainIntensity1, 3.2) * 0.95);

      // --- Layer 2: Dim Background Curtain ---
      vec3 bgGlow = vec3(0.0);
      ${mobileMode ? '' : `
      vec2 uv2 = dir.xz / (dir.y + 0.046);
      vec2 uvStreaked2 = vec2(
        uv2.x * 1.3 - cos(uv2.y * 0.24 + uTime * 0.08) * 0.5,
        uv2.y * 0.11 - uTime * 0.015
      );
      
      float nVal2 = fbm(uvStreaked2 * 1.1);
      float curtainIntensity2 = smoothstep(0.40, 0.60, nVal2);
      
      float verticalFade2 = smoothstep(0.005, 0.22, dir.y) * (1.0 - smoothstep(0.60, 0.90, dir.y));
      curtainIntensity2 *= verticalFade2;

      float patchPulse2 = noise(vec2(uv2.x * 0.08 - uTime * 0.025, uv2.y * 0.06));
      curtainIntensity2 *= mix(0.6, 1.4, patchPulse2);

      bgGlow = auroraColor * (curtainIntensity2 * 0.26 + pow(curtainIntensity2, 3.0) * 0.35) * 0.42;
      `}

      finalColor += (fgGlow + bgGlow);
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const SkyGradientShader = {
  uniforms: {
    topColor: { value: new THREE.Color('#050118') },
    bottomColor: { value: new THREE.Color('#14022a') },
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
        <color attach="background" args={['#120317']} />
        <fog attach="fog" args={['#120317', 45, 230]} />
        <ambientLight intensity={0.25} color="#223366" />
        <directionalLight 
          castShadow={true} 
          position={[120, 180, -250]} 
          intensity={0.55} 
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
              <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={3.2} mipmapBlur />
            </EffectComposer>
          ) : (
            <EffectComposer enableNormalPass={false} multisampling={0}>
              <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={3.2} mipmapBlur />
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
