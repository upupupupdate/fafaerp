import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    /** 优先使用 5174；若已被占用则自动尝试 5175、5176… */
    port: 5174,
    strictPort: false,
    host: true,
    allowedHosts: true,
    // 让所有响应携带此头，localtunnel 检测到后自动跳过拦截页
    headers: {
      'bypass-tunnel-reminder': 'true',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  // npm run preview 时同样转发 API，避免仅 dev 代理导致 404
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
