import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'src/main/index.ts',
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            external: ['electron', 'electron-devtools-installer'],
            output: {
              format: 'cjs',
              entryFileNames: '[name].js',
            }
          }
        }
      }
    }),
    electron({
      entry: 'src/preload/index.ts',
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            external: ['electron'],
            output: {
              format: 'cjs',
              entryFileNames: 'preload.js',
            }
          }
        }
      }
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});