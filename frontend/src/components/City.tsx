import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const City: React.FC = () => {
  const { scene } = useGLTF('/models/city_optimized.glb');

  useEffect(() => {
    const isProcessed = (scene as any).__processed;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        const isRoadOrGround = !!((mat && mat.name && mat.name.toLowerCase().includes('road')) || 
                             (child.name && (child.name.toLowerCase().includes('ground') || child.name.toLowerCase().includes('floor'))));

        // Performance optimization: Static city meshes never need dynamic real-time shadow casting
        // Only ground and road meshes receive shadows so the car shadow grounds properly
        child.castShadow = false;
        child.receiveShadow = isRoadOrGround;

        if (!isProcessed && mat) {
          // Identify materials with GLOW in the name and boost their emissive intensity
          if (mat.name && (mat.name.toUpperCase().includes('GLOW') || mat.name.toLowerCase().includes('neon') || mat.name.toLowerCase().includes('light'))) {
            const cloneMat = mat.clone();
            cloneMat.emissiveIntensity = 5.0;
            // Also ensure it actually emits color
            if (cloneMat.emissive.getHex() === 0x000000 && cloneMat.color) {
              cloneMat.emissive.copy(cloneMat.color);
            }
            child.material = cloneMat;
          }
          
          // Make road surfaces slightly reflective for that wet-neon look
          if (mat.name && mat.name.toLowerCase().includes('road')) {
            mat.roughness = 0.3;
            mat.metalness = 0.2;
          }
        }
      }
    });
    (scene as any).__processed = true;
  }, [scene]);

  return <primitive object={scene} scale={0.01} />;
};

useGLTF.preload('/models/city_optimized.glb');

export default City;
