import axios from 'axios'
import {
  mockFetchProductList,
  mockCreateProduct,
  mockFetchProductDetail,
  getMockProductList,
} from '@/mocks/productMock.js'

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

/** 为 true 时使用本地假数据（见 .env.development 中 VITE_USE_MOCK） */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** 后端不可达（如仅部署前端到 Vercel）时控制台提示 */
export const OFFLINE_DEMO_LOG = '检测到未连接后端，已自动切换为演示数据模式'

/**
 * @param {'spu'|'sku'} view
 * @param {Record<string, unknown>} [filters] 含 nested（SPU 树形列表时为 true）
 */
export async function fetchProductList(view, filters = {}) {
  if (USE_MOCK) {
    return mockFetchProductList(view, filters)
  }
  const params = { view, ...filters }
  Object.keys(params).forEach((k) => {
    const v = params[k]
    if (v === '' || v === null || v === undefined) {
      delete params[k]
    }
  })
  try {
    const { data } = await client.get('/products', { params })
    return data
  } catch {
    console.warn(OFFLINE_DEMO_LOG)
    return getMockProductList(view, filters)
  }
}

/** @param {Record<string, unknown>} payload */
export async function createProduct(payload) {
  if (USE_MOCK) {
    return mockCreateProduct(payload)
  }
  const { data } = await client.post('/products/spus', payload)
  return data
}

export async function fetchProductDetail(id) {
  if (USE_MOCK) {
    return mockFetchProductDetail(id)
  }
  const { data } = await client.get(`/products/spus/${id}`)
  return data
}
