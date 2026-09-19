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
      selfDestroying: true,
      includeAssets: ['eu-mark.svg'],
      manifest: {
        id: base,
        name: 'EU',
        short_name: 'EU',
        description: 'Arquivo vivo pessoal.',
        lang: 'pt-BR',
        theme_color: '#F6F2EA',
        background_color: '#F6F2EA',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base + '?v=career-plan-2026-2030',
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
      }
    })
  ]
})
