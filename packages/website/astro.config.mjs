// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // Ensure static output for GitHub Pages
  output: 'static',

  // Configure for GitHub Pages deployment
  // The site URL will be automatically set by GitHub Actions
  site: process.env.CI ? `https://${process.env.GITHUB_REPOSITORY_OWNER}.github.io` : 'http://localhost:4321',

  // Base path will be automatically injected by GitHub Actions
  // but we can set it manually if needed
  base: process.env.CI ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] || ''}` : undefined,

  // Build configuration
  build: {
    // Ensure assets are handled correctly
    assets: '_astro'
  }
});
