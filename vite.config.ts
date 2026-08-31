import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Forward local API requests to the Worker.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
