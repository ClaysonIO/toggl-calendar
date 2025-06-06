import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v9': {
        target: 'https://api.track.toggl.com',
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent': 'TogglCalendar/1.0'
        }
      },
      '/reports/api': {
        target: 'https://track.toggl.com',
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent': 'TogglCalendar/1.0'
        }
      }
    }
  }
})
