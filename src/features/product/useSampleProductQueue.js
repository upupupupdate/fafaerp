/**
 * 样板定版后「出版」推送至产品管理的待导入队列（本地演示，对接 API 后替换）
 */
import { ref, watch } from 'vue'

const LS_KEY = 'product_sample_to_pm_queue_v1'

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

const queue = ref(load())

watch(
  queue,
  (v) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

let _singleton = null

/** @typedef {{ skuCode: string, skuName: string, spuCode: string, spuNameCn: string, categoryName: string, brandName: string, variantJson: string, sourceDesignNo: string }} QueuedSku */

export function useSampleProductQueue() {
  if (_singleton) return _singleton

  /** @param {QueuedSku[]} skus */
  function enqueueMany(skus) {
    if (!skus?.length) return
    queue.value = [...queue.value, ...skus]
  }

  function drain() {
    const out = [...queue.value]
    queue.value = []
    return out
  }

  function peekCount() {
    return queue.value.length
  }

  _singleton = { queue, enqueueMany, drain, peekCount }
  return _singleton
}
