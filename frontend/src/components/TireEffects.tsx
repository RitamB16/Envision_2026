import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
  window.innerWidth <= 768 ||
  (navigator.maxTouchPoints > 0 && /Macintosh|Intel/i.test(navigator.userAgent))
);
const MAX_SKIDS = isMobile ? 80 : 200;

// Pre-allocated static vectors to completely prevent GC pressure inside the useFrame loop
const _leftRearLocal = new THREE.Vector3(-1.0, 0.1, 1.8);
const _rightRearLocal = new THREE.Vector3(1.0, 0.1, 1.8);
const _leftRearWorld = new THREE.Vector3();
const _rightRearWorld = new THREE.Vector3();

export default function TireEffects() {
  const skidMesh = useRef<THREE.InstancedMesh>(null);
  
  const skidData = useMemo(() => Array.from({ length: MAX_SKIDS }, () => ({
    active: false, position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), life: 0
  })), []);

  const skidIdx = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Simple skid mark material
  const skidMat = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: 0x111111, transparent: true, opacity: 0.8, depthWrite: false 
  }), []);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1/30);
    const slip = (window as any).__slipAngle || 0;
    const slipMag = Math.abs(slip);
    const carObj = (window as any).__carObj as THREE.Object3D;

    // Spawn new skid marks if slipping fast
    if (carObj && slipMag > 0.15) {
      const leftRear = _leftRearWorld.copy(_leftRearLocal).applyMatrix4(carObj.matrixWorld);
      const rightRear = _rightRearWorld.copy(_rightRearLocal).applyMatrix4(carObj.matrixWorld);
      
      for(let i=0; i<2; i++) {
         const idx = skidIdx.current;
         const origin = i === 0 ? leftRear : rightRear;
         skidData[idx].active = true;
         skidData[idx].position.copy(origin);
         skidData[idx].position.y = 0.21; // Just above road
         skidData[idx].quaternion.copy(carObj.quaternion);
         skidData[idx].life = 2.0;
         skidIdx.current = (idx + 1) % MAX_SKIDS;
      }
    }

    // Update Skids
    if (skidMesh.current) {
      let needsUpdate = false;
      for (let i = 0; i < MAX_SKIDS; i++) {
        const s = skidData[i];
        if (s.active) {
          s.life -= dt * 0.5;
          if (s.life <= 0) {
            s.active = false;
            dummy.position.set(9999, 9999, 9999);
          } else {
            dummy.position.copy(s.position);
            dummy.quaternion.copy(s.quaternion);
            dummy.scale.set(0.4, 1, 1.5); // flat mark
          }
          dummy.updateMatrix();
          skidMesh.current.setMatrixAt(i, dummy.matrix);
          if (s.life < 0.5) {
             dummy.scale.multiplyScalar(s.life * 2);
             dummy.updateMatrix();
             skidMesh.current.setMatrixAt(i, dummy.matrix);
          }
          needsUpdate = true;
        }
      }
      if (needsUpdate) skidMesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={skidMesh} args={[null as any, skidMat, MAX_SKIDS]} rotation={[-Math.PI/2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}
