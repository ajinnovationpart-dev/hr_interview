import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 개발 환경에서는 항상 '/', 프로덕션에서만 '/hr_interview/' 사용
  base: process.env.NODE_ENV === 'production' ? '/hr_interview/' : '/',
  server: {
    host: '0.0.0.0', // 모든 네트워크 인터페이스에서 접속 가능
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
