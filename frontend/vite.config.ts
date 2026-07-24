import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three') || id.includes('postprocessing')) {
              return 'vendor-three';
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


