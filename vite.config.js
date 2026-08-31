import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.png'],
      manifest: {
        name: 'صندوق قرض‌الحسنه',
        short_name: 'قرض‌الحسنه',
        description: 'بستر مدیریت صندوق‌های قرض‌الحسنه',
        theme_color: '#5B21B6',
        background_color: '#FDE047',
        display: 'standalone',
        start_url: '/',
        dir: 'rtl',
        lang: 'fa',
        icons: [
          { src: 'logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
