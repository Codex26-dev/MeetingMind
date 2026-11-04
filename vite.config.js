import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, mkdirSync } from 'node:fs';

function keepLegacyAppAssets() {
  return {
    name: 'meetingmind-legacy-app-assets',
    apply: 'build',
    closeBundle() {
      mkdirSync('dist', { recursive: true });
      for (const file of ['app.js', 'app.css', 'auth.css', 'extras.js', 'auth.js', 'sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png']) {
        copyFileSync(file, `dist/${file}`);
      }
    },
  };
}

export default defineConfig(() => ({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss(), keepLegacyAppAssets()],
  server: { proxy: { '/api': { target: 'http://127.0.0.1:4173', changeOrigin: true } } },
}));
