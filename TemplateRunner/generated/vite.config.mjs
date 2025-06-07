import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': {},
    'global': 'window'
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/App.tsx'),
      name: 'TemplateRunner',
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        format: 'iife',
        name: 'TemplateRunner',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'bundle.css';
          return assetInfo.name;
        }
      }
    },
    cssCodeSplit: false,
    minify: false
  }
});