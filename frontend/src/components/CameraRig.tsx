import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { destinations } from '../config';
import { CameraMode } from '../App';

const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
  window.innerWidth <= 768 ||
  (navigator.maxTouchPoints > 0 && /Macintosh|Intel/i.test(navigator.userAgent))
);
const BASE_FOV = isMobile ? 65 : 50;

interface Props {
  activeTargetId: string | null;
  introFinished: boolean;
  cameraMode: CameraMode;
}

// Pre-allocated static scratch objects to completely eliminate GC allocations/stutters in R3F frame loop
const _carForward = new THREE.Vector3();
const _flatTarget = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _lookAtMatrix = new THREE.Matrix4();
const _yawQuat = new THREE.Quaternion();
const _localOffset = new THREE.Vector3();
const _worldOffset = new THREE.Vector3();
const _chaseCamPos = new THREE.Vector3();
const _localLookAtOffset = new THREE.Vector3();
const _worldLookAtOffset = new THREE.Vector3();
const _chaseLookAt = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAtVal = new THREE.Vector3();
const _carToCam = new THREE.Vector3();
const _carFrontLook = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _tempForward = new THREE.Vector3(0, 0, -1);
const _tempVec08 = new THREE.Vector3(0, 0.8, 0);
const _tempVec12 = new THREE.Vector3(0, 1.2, 0);

const CameraRig = ({ activeTargetId, introFinished, cameraMode }: Props) => {
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3(100, 2, -75));
  
  // Cinematic transition state refs
  const isIntroActive = useRef(true);
  const hasPassedCamera = useRef(false);
  const initIntroPosNeeded = useRef(true);
  const introCamPos = useRef(new THREE.Vector3());
  const introLookAt = useRef(new THREE.Vector3());
  const transitionStartTime = useRef(0);

  // Timing refs for wide-angle aerial establishing shot
  const introFinishedTimeRef = useRef<number | null>(null);
  const isFirstSpawn = useRef(true);

  // Smoothed vectors to prevent single-frame snap/jump cuts
  const smoothedCamPos = useRef<THREE.Vector3 | null>(null);
  const smoothedLookAt = useRef<THREE.Vector3 | null>(null);
  
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).fov !== BASE_FOV) {
      (camera as THREE.PerspectiveCamera).fov = BASE_FOV;
      camera.updateProjectionMatrix();
    }
    
    if (!introFinished) {
      camera.position.set(100, 1, -85);
      targetLookAt.current.set(100, 2, -75);
      return;
    }

    // Kill existing camera tweens to prevent overlaps/memory leaks
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(targetLookAt.current);

    if (cameraMode === 'FOLLOW') {
      isIntroActive.current = true;
      hasPassedCamera.current = false;
      initIntroPosNeeded.current = true;
    }

    if (cameraMode === 'CINEMATIC' && activeTargetId !== null) {
      const dest = destinations.find(d => d.id === activeTargetId);
      if (dest) {
        const mx = dest.cameraOffset[0];
        const my = isMobile ? (dest.cameraOffset[1] + 4.5) : dest.cameraOffset[1];
        const mz = isMobile ? (dest.cameraOffset[2] - 15.0) : dest.cameraOffset[2];

        gsap.to(camera.position, {
          x: mx,
          y: my,
          z: mz,
          duration: 1.5,
          ease: 'power3.inOut'
        });
        
        gsap.to(targetLookAt.current, {
          x: dest.lookAt[0],
          y: isMobile ? (dest.lookAt[1] + 1.0) : dest.lookAt[1],
          z: dest.lookAt[2],
          duration: 1.5,
          ease: 'power3.inOut'
        });
      }
    } 
    else if (cameraMode === 'RETURN') {
      // Tween back to roughly the patrol offset before handing control back to FOLLOW
      // (The useFrame FOLLOW logic will pick up the slack)
      gsap.to(camera.position, {
        y: 10,
        duration: 1.5,
        ease: 'power2.inOut'
      });
    }
  }, [cameraMode, activeTargetId, introFinished, camera]);

  useFrame((state, delta) => {
    if (!introFinished) {
      camera.lookAt(targetLookAt.current);
      return;
    }

    if (cameraMode === 'FOLLOW') {
      const carObj = (window as any).__carObj as THREE.Object3D | undefined;

      if (carObj) {
        const carPos = carObj.position;

        // 0. Wide-angle aerial establishing shot before patrol driving begins (holds for 3s after ignition completes)
        if (introFinishedTimeRef.current === null) {
          introFinishedTimeRef.current = state.clock.getElapsedTime();
        }
        const elapsedSinceIntro = state.clock.getElapsedTime() - introFinishedTimeRef.current;
        if (elapsedSinceIntro < 3.0) {
          const alpha = elapsedSinceIntro / 3.0; // 0 to 1

          // Slowly pan and descend showing the neon skyline and scale of the city
          _targetCamPos.set(
            THREE.MathUtils.lerp(-150, -250, alpha),
            THREE.MathUtils.lerp(110, 55, alpha),
            THREE.MathUtils.lerp(-50, -95, alpha)
          );
          _targetLookAtVal.set(
            THREE.MathUtils.lerp(-180, -287.15, alpha),
            THREE.MathUtils.lerp(5, 0.2, alpha),
            THREE.MathUtils.lerp(-110, -143.65, alpha)
          );

          if (!smoothedCamPos.current || !smoothedLookAt.current) {
            smoothedCamPos.current = _targetCamPos.clone();
            smoothedLookAt.current = _targetLookAtVal.clone();
          } else {
            smoothedCamPos.current.x = THREE.MathUtils.damp(smoothedCamPos.current.x, _targetCamPos.x, 3.2, delta);
            smoothedCamPos.current.y = THREE.MathUtils.damp(smoothedCamPos.current.y, _targetCamPos.y, 3.2, delta);
            smoothedCamPos.current.z = THREE.MathUtils.damp(smoothedCamPos.current.z, _targetCamPos.z, 3.2, delta);

            smoothedLookAt.current.x = THREE.MathUtils.damp(smoothedLookAt.current.x, _targetLookAtVal.x, 4.0, delta);
            smoothedLookAt.current.y = THREE.MathUtils.damp(smoothedLookAt.current.y, _targetLookAtVal.y, 4.0, delta);
            smoothedLookAt.current.z = THREE.MathUtils.damp(smoothedLookAt.current.z, _targetLookAtVal.z, 4.0, delta);
          }

          camera.position.copy(smoothedCamPos.current);
          targetLookAt.current.copy(smoothedLookAt.current);
          camera.lookAt(targetLookAt.current);
          return; // Skip normal follow camera logic during establishing shot
        }
        
        // 1. Calculate car heading yaw direction (avoiding Euler lock)
        _carForward.copy(_tempForward).applyQuaternion(carObj.quaternion);
        _carForward.y = 0;
        _carForward.normalize();
        _flatTarget.copy(carPos).add(_carForward);
        _lookAtMatrix.lookAt(carPos, _flatTarget, _upVec);
        _yawQuat.setFromRotationMatrix(_lookAtMatrix);
        
        const slip = (window as any).__slipAngle || 0;
        const slipMag = Math.abs(slip);
        const curvature = (window as any).__curvatureFactor || 0;
        const cornerCross = (window as any).__cornerCross || 0;
        const sideSign = cornerCross > 0 ? 1.0 : -1.0;

        // 2. Dynamic local chase/corner-wide offset based on upcoming curvature (looks ahead of corners)
        // Scaled on mobile to create a wider, more cinematic framing of the environment and vehicle
        const zOffsetBase = isMobile ? 10.5 : 8.5;
        const yOffsetBase = isMobile ? 4.2 : 3.4;
        _localOffset.set(
          THREE.MathUtils.lerp(0.0, sideSign * (isMobile ? 11.5 : 9.5), curvature),
          THREE.MathUtils.lerp(yOffsetBase, isMobile ? 8.8 : 7.5, curvature),
          THREE.MathUtils.lerp(zOffsetBase, isMobile ? 16.5 : 14.0, curvature)
        );

        _worldOffset.copy(_localOffset).applyQuaternion(_yawQuat);
        _chaseCamPos.copy(carPos).add(_worldOffset);
        
        // Add subtle shake during active slip
        if (slipMag > 0.05) {
          _chaseCamPos.y += (Math.random() - 0.5) * slipMag * 1.5;
          _chaseCamPos.x += (Math.random() - 0.5) * slipMag * 1.5;
        }

        // 3. Ahead of car is -Z relative to the outer group when aligned forward
        _localLookAtOffset.set(
          THREE.MathUtils.lerp(0.0, -sideSign * 2.0, curvature),
          THREE.MathUtils.lerp(1.2, 1.8, curvature),
          THREE.MathUtils.lerp(-3.0, -1.0, curvature)
        );
        _worldLookAtOffset.copy(_localLookAtOffset).applyQuaternion(_yawQuat);
        _chaseLookAt.copy(carPos).add(_worldLookAtOffset);

        // 4. Initialize static front shot position if needed
        if (initIntroPosNeeded.current) {
          _offset.copy(_carForward).multiplyScalar(14.0);
          introCamPos.current.copy(carPos).add(_offset).add(_tempVec12);
          introLookAt.current.copy(carPos).add(_tempVec08);
          initIntroPosNeeded.current = false;
          
          // Only set smoothed values to null (hard snap) if it's NOT the first spawn.
          // This keeps the transition from the aerial establishing shot down to follow intro shot completely smooth.
          if (isFirstSpawn.current) {
            isFirstSpawn.current = false;
          } else {
            smoothedCamPos.current = null;
            smoothedLookAt.current = null;
          }
        }

        // 5. Determine active target positions for shot blending
        if (isIntroActive.current) {
          // Check if car's forward progress passes the camera's position
          _carToCam.subVectors(introCamPos.current, carPos);
          const proj = _carToCam.dot(_carForward);

          if (proj < 0.0 && !hasPassedCamera.current) {
            hasPassedCamera.current = true;
            transitionStartTime.current = state.clock.getElapsedTime();
          }

          if (hasPassedCamera.current) {
            // Blend from static front position to standard follow position (pass-by swing)
            const elapsed = state.clock.getElapsedTime() - transitionStartTime.current;
            const blendFactor = Math.min(1.0, elapsed / 1.5); // 1.5s swing transition duration
            
            // Continuous Ease-in-out blend
            const easeFactor = blendFactor * blendFactor * (3.0 - 2.0 * blendFactor);

            _targetCamPos.lerpVectors(introCamPos.current, _chaseCamPos, easeFactor);
            
            // Look-at transitions from car front to standard chase look-at
            _carFrontLook.copy(carPos).add(_tempVec08);
            _targetLookAtVal.lerpVectors(_carFrontLook, _chaseLookAt, easeFactor);

            if (blendFactor >= 1.0) {
              isIntroActive.current = false;
              hasPassedCamera.current = false;
            }
          } else {
            // Camera stays static in front, look-at follows the car front/hood
            _targetCamPos.copy(introCamPos.current);
            _targetLookAtVal.copy(carPos).add(_tempVec08);
          }
        } else {
          _targetCamPos.copy(_chaseCamPos);
          _targetLookAtVal.copy(_chaseLookAt);
        }

        // 6. Apply smooth damping for all camera position and look-at changes to avoid jump cuts
        if (!smoothedCamPos.current || !smoothedLookAt.current) {
          smoothedCamPos.current = _targetCamPos.clone();
          smoothedLookAt.current = _targetLookAtVal.clone();
        } else {
          smoothedCamPos.current.x = THREE.MathUtils.damp(smoothedCamPos.current.x, _targetCamPos.x, 3.2, delta);
          smoothedCamPos.current.y = THREE.MathUtils.damp(smoothedCamPos.current.y, _targetCamPos.y, 3.2, delta);
          smoothedCamPos.current.z = THREE.MathUtils.damp(smoothedCamPos.current.z, _targetCamPos.z, 3.2, delta);

          smoothedLookAt.current.x = THREE.MathUtils.damp(smoothedLookAt.current.x, _targetLookAtVal.x, 4.0, delta);
          smoothedLookAt.current.y = THREE.MathUtils.damp(smoothedLookAt.current.y, _targetLookAtVal.y, 4.0, delta);
          smoothedLookAt.current.z = THREE.MathUtils.damp(smoothedLookAt.current.z, _targetLookAtVal.z, 4.0, delta);
        }

        camera.position.copy(smoothedCamPos.current);
        targetLookAt.current.copy(smoothedLookAt.current);
      }
      
      const slip = (window as any).__slipAngle || 0;
      const slipMag = Math.abs(slip);
      // Disable dynamic FOV transitions on mobile to avoid updateProjectionMatrix overhead
      const targetFov = isMobile ? BASE_FOV : (BASE_FOV + slipMag * 15);
      if (Math.abs((camera as THREE.PerspectiveCamera).fov - targetFov) > 0.5) {
        (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, targetFov, 0.1);
        camera.updateProjectionMatrix();
      }

      camera.lookAt(targetLookAt.current);
    } 
    else if (cameraMode === 'CINEMATIC' || cameraMode === 'RETURN') {
      // GSAP owns the camera.position via useEffect.
      // We ONLY update the actual lookAt function here based on the GSAP-tweened targetLookAt ref.
      // This prevents the "fighting" because FOLLOW logic is completely gated out.
      camera.lookAt(targetLookAt.current);
    }
    else if (cameraMode === 'PAGE') {
      // PAGE mode: fully parked/frozen. 
      // Do nothing! Let the camera sit exactly where CINEMATIC left it.
    }
  });

  return null;
};

export default CameraRig;
