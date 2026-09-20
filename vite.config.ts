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
        runtimeCaching: [],
      },
      manifest: {
        id: base,
        name: 'EU',
        short_name: 'EU',
        description: 'Arquivo vivo pessoal.',
        lang: 'pt-BR',
        theme_color: '#FBF7EF',
        background_color: '#FBF7EF',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base + '?v=eu-v18-2-signature',
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
          },
          {
            name: 'EU Lab',
            short_name: 'EU Lab',
            description: 'Abrir radar, cápsulas, decisões e Life Graph',
            url: base + '#/vida/lab'
          },
          {
            name: 'Humor',
            short_name: 'Humor',
            description: 'Abrir heatmap e histórico de humor',
            url: base + '#/memorias/humor'
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
