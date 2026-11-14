import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api/* to the FastAPI backend, so the browser only ever
// talks to one origin. This also works inside GitHub Codespaces.
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ['react-plotly.js/factory', 'plotly.js-basic-dist-min'],
  },
})
