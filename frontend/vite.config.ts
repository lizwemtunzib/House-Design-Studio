import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const backendTarget = process.env.VITE_API_PROXY_TARGET ?? `http://localhost:${process.env.PORT ?? '8080'}`;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'app-icon.svg', 'mask-icon.svg'],
      manifest: {
        name: 'House Design Studio',
        short_name: 'HDS',
        description: 'AI-powered house design, BOQ & cost estimation',
        theme_color: '#1a365d',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'app-icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'New Design', short_name: 'New', description: 'Start a new house design', url: '/wizard', icons: [{ src: 'app-icon.svg', sizes: 'any', type: 'image/svg+xml' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\/api\/(building-systems|design-styles)/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-static-cache', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backendTarget, changeOrigin: true },
      '/uploads': { target: backendTarget, changeOrigin: true },
      '/exports': { target: backendTarget, changeOrigin: true },
    },
  },
});
