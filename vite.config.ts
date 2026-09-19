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
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'eu-font-styles' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'eu-font-files',
              expiration: { maxEntries: 12, maxAgeSeconds: 31536000 },
            },
          },
        ],
      },
      manifest: {
        id: base,
        name: 'EU',
        short_name: 'EU',
        description: 'Arquivo vivo pessoal.',
        lang: 'pt-BR',
        theme_color: '#F6F2E9',
        background_color: '#F6F2E9',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base + '?v=eu-v2-life',
        scope: base,
        categories: ['lifestyle', 'utilities'],
        share_target: {
          action: base + '?share=1',
          method: 'GET',
          enctype: 'application/x-www-form-urlencoded',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        shortcuts: [
          {
            name: 'Registrar no EU',
            short_name: 'Registrar',
            description: 'Guardar algo rapidamente no EU',
            url: base + '#/capturar'
          }
        ],
        icons: [
          {
            src: 'eu-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
