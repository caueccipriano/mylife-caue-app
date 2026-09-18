import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/mylife-caue-app/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['eu-mark.svg'],
      manifest: {
        id: base,
        name: 'EU',
        short_name: 'EU',
        description: 'Arquivo vivo pessoal.',
        lang: 'pt-BR',
        theme_color: '#F5F1E8',
        background_color: '#F5F1E8',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base,
        scope: base,
        categories: ['lifestyle', 'utilities'],
        icons: [
          {
            src: 'eu-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'eu-google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'eu-google-fonts-webfonts',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 31536000
              }
            }
          }
        ]
      }
    })
  ]
})
