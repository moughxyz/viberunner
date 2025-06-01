import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        format: 'iife',
        entryFileNames: 'bundle.iife.js',
        chunkFileNames: 'bundle.iife.js',
        assetFileNames: 'bundle.css',
        inlineDynamicImports: true,
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  define: {
    global: 'globalThis'
  }
})