import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { destinations, patrolCurve, patrolRoutePoints } from '../config';
import { audioEngine } from '../utils/AudioEngine';
import { CarState } from '../App';

interface Props {
  activeTargetId: string | null;
  introFinished: boolean;
  carState: CarState;
  onCarArrived: () => void;
  onSetCarState: (state: CarState) => void;
}

// Pre-allocated static math objects to prevent garbage collection allocations in the useFrame loop
const _tangentNow = new THREE.Vector3();
const _tangentNext = new THREE.Vector3();
const _cornerCrossVec = new THREE.Vector3();
const _pt = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _tempForwardCar = new THREE.Vector3(0, 0, -1);
const _crossCar = new THREE.Vector3();
const _currentForwardCar = new THREE.Vector3();
const _wheelAxisX = new THREE.Vector3(1, 0, 0);
const _wheelAxisY = new THREE.Vector3(0, 1, 0);
const _qRoll = new THREE.Quaternion();
const _qSteer = new THREE.Quaternion();
const _qFinal = new THREE.Quaternion();
const _qDefaultFallback = new THREE.Quaternion();

const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
  window.innerWidth <= 768 ||
  (navigator.maxTouchPoints > 0 && /Macintosh|Intel/i.test(navigator.userAgent))
);

const Car = ({ activeTargetId, introFinished, carState, onCarArrived, onSetCarState }: Props) => {
  const { scene } = useGLTF('/models/car_optimized.glb');
  const carRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Object3D[]>([]);
  const steeringWheelsRef = useRef<THREE.Object3D[]>([]);
  const tailLightsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const headlightsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  
  const pathState = useRef({ t: 0, speed: 0 });
  const currentCurve = patrolCurve;
  const currentCurveLength = useRef(patrolCurve.getLength());
  const rollTarget = useRef(0);
  const headingQuat = useRef(new THREE.Quaternion());
  const slipAngleRef = useRef(0);
  const leftTailLightRef = useRef<THREE.PointLight>(null);
  const rightTailLightRef = useRef<THREE.PointLight>(null);
  const currentYawRef = useRef<number | undefined>(undefined);
  const yawInitializedRef = useRef(false);
  const steerAngleRef = useRef(0);
  const wheelRollRef = useRef(0);
  const defaultWheelQuatsRef = useRef<Map<THREE.Object3D, THREE.Quaternion>>(new Map());
  
  // Guard reference to prevent duplicate frame onCarArrived triggers during batch delays
  const hasArrivedRef = useRef(false);

  // Timer ref to delay starting driving until wide aerial establishing shot completes
  const introFinishedTime = useRef<number | null>(null);

  useEffect(() => {
    wheelsRef.current = [];
    steeringWheelsRef.current = [];
    tailLightsRef.current = [];
    headlightsRef.current = [];
    
    const isProcessed = (scene as any).__processed;
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = !isMobile;
        child.receiveShadow = !isMobile;
        
        const childNameLower = child.name.toLowerCase();
        if (child.name.includes('Wheel.Ft') || child.name.includes('Wheel.Bk') || childNameLower.includes('wheel')) {
          wheelsRef.current.push(child);
          if (!defaultWheelQuatsRef.current.has(child)) {
            defaultWheelQuatsRef.current.set(child, child.quaternion.clone());
          }
          if (child.name.includes('Wheel.Ft') || childNameLower.includes('ft') || childNameLower.includes('front')) {
            steeringWheelsRef.current.push(child);
          }
        }
        
        if (!isProcessed && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const matNameLower = (mat.name || '').toLowerCase();
          
          if (mat.name && (mat.name === 'CarpaintMetallicBlack' || matNameLower === 'carpaint' || matNameLower.includes('carpaint'))) {
            const cloneMat = isMobile 
              ? new THREE.MeshStandardMaterial({
                  color: new THREE.Color('#0555fa'),
                  metalness: 0.8,
                  roughness: 0.15,
                  envMapIntensity: 1.5,
                  normalMap: mat.normalMap,
                  normalScale: mat.normalScale
                })
              : new THREE.MeshPhysicalMaterial({
                  color: new THREE.Color('#0555fa'),
                  metalness: 0.82,
                  roughness: 0.08,
                  clearcoat: 1.0,
                  clearcoatRoughness: 0.02,
                  envMapIntensity: 2.5,
                  normalMap: mat.normalMap,
                  normalScale: mat.normalScale
                });
            child.material = cloneMat;
          }
          if (mat.name && (matNameLower.includes('glass') || matNameLower.includes('window'))) {
            const glassMat = isMobile
              ? new THREE.MeshStandardMaterial({
                  color: new THREE.Color('#050814'),
                  metalness: 0.1,
                  roughness: 0.1,
                  transparent: true,
                  opacity: 0.85
                })
              : new THREE.MeshPhysicalMaterial({
                  color: new THREE.Color('#050814'),
                  metalness: 0.1,
                  roughness: 0.05,
                  transmission: 0.65,
                  transparent: true,
                  opacity: 0.88,
                  ior: 1.5
                });
            child.material = glassMat;
          }
          if (mat.name && (matNameLower.includes('taillight') || matNameLower.includes('redg') || matNameLower.includes('tail_light') || matNameLower.includes('brake'))) {
            const cloneMat = isMobile
              ? new THREE.MeshStandardMaterial({
                  color: new THREE.Color('#ff0022'),
                  emissive: new THREE.Color('#ff0011'),
                  emissiveIntensity: 3.5,
                  roughness: 0.2
                })
              : new THREE.MeshPhysicalMaterial({
                  color: new THREE.Color('#ff0022'),
                  emissive: new THREE.Color('#ff0011'),
                  emissiveIntensity: 4.5,
                  clearcoat: 1.0,
                  roughness: 0.1
                });
            child.material = cloneMat;
          }
          if (mat.name && (matNameLower.includes('headlight') || matNameLower.includes('head_light'))) {
            const cloneMat = mat.clone();
            cloneMat.emissiveIntensity = 0; 
            if (cloneMat.emissive.getHex() === 0) cloneMat.emissive.setHex(0xffffff);
            child.material = cloneMat;
          }
        }
        
        // Track the processed materials in refs
        if (child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.name && (mat.name.toLowerCase().includes('taillight') || mat.name.toLowerCase().includes('redg'))) {
            tailLightsRef.current.push(mat);
          }
          if (mat.name && mat.name.toLowerCase().includes('headlight')) {
            headlightsRef.current.push(mat);
          }
        }
      }
    });
    
    (scene as any).__processed = true;
  }, [scene]);

  useEffect(() => {
    if (introFinished && headlightsRef.current.length > 0) {
      headlightsRef.current.forEach(mat => mat.emissiveIntensity = 5.0);
    }
  }, [introFinished]);

  // Handle route switching based on app state
  useEffect(() => {
    if (!introFinished) return;

    yawInitializedRef.current = false;

    if (carState === 'TRAVELING' && activeTargetId) {
      pathState.current.speed = 50; 
      hasArrivedRef.current = false; // Reset arrival flag for the new travel sequence
    } else if (carState === 'RETURNING') {
      pathState.current.speed = 40;
      onSetCarState('PATROLLING');
    } else if (carState === 'PATROLLING') {
      pathState.current.speed = 40;
    }
  }, [carState, activeTargetId, introFinished, onSetCarState]);

  useFrame((state, delta) => {
    if (!carRef.current) return;
    
    // Clamp delta safely to positive range (max 0.1s / 10fps) to prevent backward jerks/lag spikes and maintain speed
    const dt = Math.min(Math.max(delta, 0), 0.1);

    if (carState === 'ARRIVED') {
      tailLightsRef.current.forEach(mat => mat.emissiveIntensity = 2.0);
      audioEngine.setSpeed(0);
      return; 
    }

    let baseSpeed = 40;
    if (carState === 'TRAVELING') baseSpeed = 50;
    else if (carState === 'RETURNING') baseSpeed = 40;

    let targetT = 0;
    let distanceRemaining = 9999;
    const dest = destinations.find(d => d.id === activeTargetId);
    if (dest && activeTargetId) {
      targetT = dest.routeIndex / patrolRoutePoints.length;
      let diff = targetT - pathState.current.t;
      if (diff < 0) diff += 1.0;
      distanceRemaining = diff * currentCurveLength.current;
    }

    // Continuous Curvature calculation (lookahead of 2% of the loop) using hoisted vectors
    currentCurve.getTangentAt(pathState.current.t, _tangentNow);
    _tangentNow.normalize();
    const lookaheadT = (pathState.current.t + 0.02) % 1.0;
    currentCurve.getTangentAt(lookaheadT, _tangentNext);
    _tangentNext.normalize();
    
    // Angle between tangents
    const cosTheta = THREE.MathUtils.clamp(_tangentNow.dot(_tangentNext), -1, 1);
    const theta = Math.acos(cosTheta);
    
    _cornerCrossVec.copy(_tangentNow).cross(_tangentNext);
    const cornerCross = _cornerCrossVec.y;

    // Continuous target speed reduction: base baseSpeed, scales down to 16 for sharp bends
    const curvatureFactor = Math.min(theta / 0.35, 1.0);
    const easeFactor = Math.sin(curvatureFactor * Math.PI / 2);
    let targetSpeed = THREE.MathUtils.lerp(baseSpeed, 16, easeFactor);

    // Smooth braking near destination
    if (carState === 'TRAVELING' && distanceRemaining < 25) {
      targetSpeed = 8;
    }

    // Activate brake lights if decelerating actively or braking near destination
    const speedBefore = pathState.current.speed;
    const isBraking = (speedBefore - targetSpeed > 4.0) || (carState === 'TRAVELING' && distanceRemaining < 25);

    // Delay driving if loading is not finished or during the 3.0s wide aerial establishing shot
    if (!introFinished) {
      targetSpeed = 0;
    } else {
      if (introFinishedTime.current === null) {
        introFinishedTime.current = state.clock.getElapsedTime();
      }
      const elapsedSinceIntro = state.clock.getElapsedTime() - introFinishedTime.current;
      if (elapsedSinceIntro < 3.0) {
        targetSpeed = 0;
      }
    }

    // Continuous slip angle based on curvature
    let targetSlip = 0;
    if (carState === 'PATROLLING' || carState === 'TRAVELING') {
      targetSlip = -Math.sign(cornerCross) * Math.min(theta * 1.5, 0.45);
      slipAngleRef.current = THREE.MathUtils.damp(slipAngleRef.current, targetSlip, 4.0, dt);
    } else {
      slipAngleRef.current = THREE.MathUtils.damp(slipAngleRef.current, 0, 4.0, dt);
    }
    
    (window as any).__slipAngle = slipAngleRef.current;
    (window as any).__carObj = carRef.current;
    (window as any).__isBraking = isBraking;
    (window as any).__curvatureFactor = curvatureFactor;
    (window as any).__cornerCross = cornerCross;
    (window as any).__theta = theta;

    // Sync physical point lights with taillight material emissive intensity
    const targetTailIntensity = isBraking ? 6.0 : 1.2;
    if (leftTailLightRef.current) {
      leftTailLightRef.current.intensity = THREE.MathUtils.lerp(leftTailLightRef.current.intensity, targetTailIntensity, 0.2);
    }
    if (rightTailLightRef.current) {
      rightTailLightRef.current.intensity = THREE.MathUtils.lerp(rightTailLightRef.current.intensity, targetTailIntensity, 0.2);
    }

    // Smooth speed interpolation (never assigned directly)
    pathState.current.speed = THREE.MathUtils.damp(pathState.current.speed, targetSpeed, 4.0, dt);
    const currentSpeed = pathState.current.speed;

    if (carState === 'PATROLLING') {
      const nextT = pathState.current.t + (currentSpeed * dt) / currentCurveLength.current;
      pathState.current.t = ((nextT % 1.0) + 1.0) % 1.0;
    } else if (carState === 'TRAVELING') {
      const nextT = pathState.current.t + (currentSpeed * dt) / currentCurveLength.current;
      pathState.current.t = ((nextT % 1.0) + 1.0) % 1.0;

      if (dest) {
        let diff = targetT - pathState.current.t;
        if (diff < 0) diff += 1.0;
        const remaining = diff * currentCurveLength.current;

        if (diff < 0.0035 || remaining < 1.2) {
          pathState.current.t = targetT;
          if (carRef.current) {
            carRef.current.position.copy(dest.finalPosition);
            carRef.current.lookAt(dest.finalLookAt);
            headingQuat.current.copy(carRef.current.quaternion);
            rollTarget.current = 0;
          }
          pathState.current.speed = 0;
          
          if (!hasArrivedRef.current) {
            hasArrivedRef.current = true;
            onCarArrived();
          }
          return;
        }
      }
    }

    tailLightsRef.current.forEach(mat => {
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, isBraking ? 8.0 : 2.0, 0.2);
    });

    audioEngine.setSpeed(currentSpeed / 100);

    // Get strictly from path using pre-allocated vectors
    currentCurve.getPointAt(pathState.current.t, _pt);
    currentCurve.getTangentAt(pathState.current.t, _tangent);
    _tangent.normalize();
    
    carRef.current.position.copy(_pt);

    // Decoupled heading calculation using a low-pass integrated yaw with a velocity limit.
    // Negating components ensures local -Z of the car group points forward along the curve tangent direction.
    const targetYaw = Math.atan2(-_tangent.x, -_tangent.z);
    
    if (!yawInitializedRef.current || currentYawRef.current === undefined) {
      currentYawRef.current = targetYaw;
      yawInitializedRef.current = true;
    }
    
    let yawDiff = targetYaw - currentYawRef.current;
    yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff)); // Wrap difference to [-PI, PI]
    
    const maxAngularSpeed = 3.5; // rad/sec (~200 deg/sec)
    const maxStep = maxAngularSpeed * dt;
    const step = THREE.MathUtils.clamp(yawDiff, -maxStep, maxStep);
    currentYawRef.current += step;
    
    headingQuat.current.setFromAxisAngle(_wheelAxisY, currentYawRef.current);
    
    // Banking calculation (car front is -Z) using pre-allocated vectors
    _currentForwardCar.copy(_tempForwardCar).applyQuaternion(headingQuat.current);
    _crossCar.crossVectors(_currentForwardCar, _tangent);
    const targetRoll = _crossCar.y * 2.0;
    const driftMultiplier = 1.0 + Math.min(Math.abs(slipAngleRef.current) * 2.0, 0.5);
    rollTarget.current = THREE.MathUtils.lerp(rollTarget.current, targetRoll * driftMultiplier, 0.1);
    
    // Set base orientation
    carRef.current.quaternion.copy(headingQuat.current);

    // Apply roll amount (rollTarget.current) safely to local Z-axis
    carRef.current.rotateZ(rollTarget.current);

    // Apply slip angle (slipAngleRef.current) safely to local Y-axis
    carRef.current.rotateY(slipAngleRef.current);

    // Visual wheels update: roll all wheels, steer front wheels only using pre-allocated quaternions
    const wheelRotSpeed = currentSpeed * dt * 0.5;
    wheelRollRef.current += wheelRotSpeed;
    
    // Smooth Lookahead Steering based on turn rate
    const targetSteerAngle = -Math.sign(cornerCross) * Math.min(theta * 6.0, 0.48); // max 27.5 deg
    steerAngleRef.current = THREE.MathUtils.damp(steerAngleRef.current, targetSteerAngle, 6.0, dt);

    wheelsRef.current.forEach(wheel => {
      const qDefault = defaultWheelQuatsRef.current.get(wheel) || _qDefaultFallback;
      const isFront = steeringWheelsRef.current.includes(wheel);
      
      _qRoll.setFromAxisAngle(_wheelAxisX, wheelRollRef.current);
      
      if (isFront) {
        _qSteer.setFromAxisAngle(_wheelAxisY, steerAngleRef.current);
        _qFinal
          .copy(qDefault)
          .multiply(_qSteer)
          .multiply(_qRoll);
        wheel.quaternion.copy(_qFinal);
      } else {
        _qFinal
          .copy(qDefault)
          .multiply(_qRoll);
        wheel.quaternion.copy(_qFinal);
      }
    });
  });

  return (
    <group ref={carRef}>
      <group rotation={[0, Math.PI, 0]}>
        <primitive object={scene} />

        {/* Hyper-Realistic Red LED Taillight Angled Road Reflection */}
        <spotLight
          position={[0, 0.45, -2.15]}
          color="#ff001a"
          intensity={2.6}
          distance={4.8}
          angle={Math.PI / 3}
          penumbra={0.7}
          decay={1.8}
        />
        <pointLight
          ref={leftTailLightRef}
          position={[-0.6, 0.3, -2.2]}
          color="#ff0522"
          distance={3.2}
          decay={1.9}
          intensity={1.5}
          castShadow={false}
        />
        <pointLight
          ref={rightTailLightRef}
          position={[0.6, 0.3, -2.2]}
          color="#ff0522"
          distance={3.2}
          decay={1.9}
          intensity={1.5}
          castShadow={false}
        />
      </group>
    </group>
  );
};

useGLTF.preload('/models/car_optimized.glb');

export default Car;
