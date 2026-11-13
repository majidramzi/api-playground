import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The app is published to GitHub Pages at https://majidramzi.github.io/api-playground/,
// so the base path must be '/api-playground/'.
export default defineConfig({
  base: '/api-playground/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
