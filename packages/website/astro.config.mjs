// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // Ensure static output for deployment
  output: 'static',

  // Configure for deployment to viberunner.me root
  site: 'https://viberunner.me',

  // Build configuration
  build: {
    // Ensure assets are handled correctly
    assets: '_astro'
  }
});
