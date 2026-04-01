import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  timeout: 20000,
})

/**
 * GET /api/scenes/{year}
 * 开发环境可通过 Vite 代理访问 localhost:8080；生产可设置 VITE_API_BASE。
 */
export function fetchScenes(year) {
  return client.get(`/api/scenes/${year}`)
}
