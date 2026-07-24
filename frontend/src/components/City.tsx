import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
  window.innerWidth <= 768 ||
  (navigator.maxTouchPoints > 0 && /Macintosh|Intel/i.test(navigator.userAgent))
);

const City: React.FC = () => {
  const { scene } = useGLTF('/models/city_optimized.glb');

  const processedScene = useMemo(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        const isRoadOrGround = !!((mat && mat.name && mat.name.toLowerCase().includes('road')) || 
                             (child.name && (child.name.toLowerCase().includes('ground') || child.name.toLowerCase().includes('floor'))));

        // Disable dynamic shadows on mobile for maximum GPU performance
        child.castShadow = false;
        child.receiveShadow = !isMobile && isRoadOrGround;

        if (mat) {
          if (mat.name && (mat.name.toUpperCase().includes('GLOW') || mat.name.toLowerCase().includes('neon') || mat.name.toLowerCase().includes('light'))) {
            const cloneMat = mat.clone();
            cloneMat.emissiveIntensity = isMobile ? 0.95 : 1.35;
            if (cloneMat.emissive.getHex() === 0x000000 && cloneMat.color) {
              cloneMat.emissive.copy(cloneMat.color);
            }
            child.material = cloneMat;
          }
          
          if (mat.name && mat.name.toLowerCase().includes('road')) {
            mat.roughness = 0.3;
            mat.metalness = 0.2;
          }
        }
      }
    });
    return scene;
  }, [scene]);

  return <primitive object={processedScene} scale={0.01} />;
};

useGLTF.preload('/models/city_optimized.glb');

export default City;
