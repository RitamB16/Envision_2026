import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three/src') || id.includes('three/build') || id.includes('three/examples')) {
              return 'vendor-three-core';
            }
            if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
              return 'vendor-three-fiber';
            }
            if (id.includes('postprocessing') || id.includes('@react-three/postprocessing')) {
              return 'vendor-three-postprocessing';
            }
            if (id.includes('gsap')) {
              return 'vendor-animation';
            }
            if (id.includes('@tanstack/react-query') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
          }
        }
      }
    }
  }
})


