import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/dragonboat-sittinglayout/',
  server: {
    proxy: {
      '/api': {
        target: 'https://dbcrews.motion.rs',
        changeOrigin: true,
      },
    },
  },
})
