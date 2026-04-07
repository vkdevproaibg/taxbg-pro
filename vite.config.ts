import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fullReload from 'vite-plugin-full-reload'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    fullReload(['**/*']),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/zustand/')) return 'vendor-zustand'
          if (id.includes('node_modules/pdf-lib/')) return 'vendor-pdf'
          if (id.includes('node_modules/date-fns/')) return 'vendor-dates'
          if (id.includes('node_modules/@supabase/supabase-js/')) return 'vendor-supabase'
        },
      },
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
})
