import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Relative base is REQUIRED: the web build is published to GitHub Pages
    // under https://matin-mohebi.github.io/ninja-arashi-2-apk/ (project
    // subpath). With the default base '/' the built index.html references
    // /assets/* which 404s there and renders a blank white page.
    // './' also keeps Capacitor (https://localhost/) and Neutralino
    // (app://internal/) desktop builds working unchanged.
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
