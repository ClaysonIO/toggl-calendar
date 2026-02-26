import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    cors: false,
    proxy: {
      '/toggl-api': {
        target: 'https://api.track.toggl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/toggl-api/, ''),
      },
      '/toggl-reports': {
        target: 'https://track.toggl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/toggl-reports/, ''),
      },
    },
  }
})
