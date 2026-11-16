import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // request /api diteruskan ke Express agar bebas masalah CORS saat dev
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
