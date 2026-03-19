import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/transactions': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
      },
      '/risk-score': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/simulate-attack': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/user-profile': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})