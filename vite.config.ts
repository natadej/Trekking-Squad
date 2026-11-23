import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'], maximumFileSizeToCacheInBytes: 8 * 1024 * 1024 },
      manifest: {
        name: 'Trekking Squad: RIV2026 at Vegas',
        short_name: 'Trekking Squad',
        description: 'A pixel adventure that plans your real AWS re:Invent 2026 trip in Las Vegas.',
        theme_color: '#4a7fd8',
        background_color: '#a9d6ff',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
        share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      } as never,
    }),
  ],
})
