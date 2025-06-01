import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'classic'
  })],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  build: {
    lib: {
      entry: 'src/App.tsx',
      name: 'FolderizeVisualizer',
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        },
        footer: 'if (typeof window !== "undefined" && window.__LOAD_APP__) { window.__LOAD_APP__(FolderizeVisualizer.default || FolderizeVisualizer); }'
      }
    }
  }
});