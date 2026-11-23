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
        name: 'Vegas Quest: re:Invent 2026',
        short_name: 'Vegas Quest',
        description: 'A cartoon quest that plans your real AWS re:Invent trip in Las Vegas.',
        theme_color: '#7c3aed',
        background_color: '#fff7e6',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
        share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      } as never,
    }),
  ],
})
