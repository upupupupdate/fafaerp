/**
 * 尺码库 — 本地持久化，配置页与新品开发共用
 */
import { ref, watch, computed } from 'vue'

const LS_KEY = 'product_size_charts'

const DEFAULT_CHARTS = [
  {
    id: 'sz_demo_1',
    name: '夏季男士常规T恤',
    standard: 'US',
    audience: '男士',
    fit: '常规',
    category: '短袖上衣',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    defaultPrintSize: 'L',
    specs: [
      { name: '衣长', method: '领后中', tolerance: '±1', values: { S: 63, M: 65, L: 67, XL: 69, XXL: 71, XXXL: 73 } },
      { name: '胸围', method: '平铺', tolerance: '±2', values: { S: 100, M: 104, L: 108, XL: 112, XXL: 116, XXXL: 120 } },
    ],
  },
]

function normalizeChart(c, idx = 0) {
  if (!c || typeof c !== 'object') return null
  const next = { ...c }
  if (next.id == null || String(next.id).trim() === '') {
    next.id = `sz_${Date.now()}_${idx}`
  }
  if (!Array.isArray(next.sizes)) next.sizes = []
  return next
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CHARTS))
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) return JSON.parse(JSON.stringify(DEFAULT_CHARTS))
    const list = parsed.map((c, i) => normalizeChart(c, i)).filter(Boolean)
    return list.length ? list : JSON.parse(JSON.stringify(DEFAULT_CHARTS))
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CHARTS))
  }
}

const charts = ref(load())

watch(
  charts,
  v => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v))
    } catch { /* ignore */ }
  },
  { deep: true },
)

let _singleton = null

export function useSizeLibraryStore() {
  if (_singleton) return _singleton

  const list = computed(() => charts.value)

  function add(chart) {
    const id = `sz_${Date.now()}`
    charts.value = [...charts.value, { ...chart, id }]
    return id
  }

  function update(id, patch) {
    const i = charts.value.findIndex(c => c.id === id)
    if (i === -1) return
    const next = [...charts.value]
    next[i] = { ...next[i], ...patch }
    charts.value = next
  }

  function remove(id) {
    charts.value = charts.value.filter(c => c.id !== id)
  }

  function getById(id) {
    return charts.value.find(c => c.id === id) ?? null
  }

  _singleton = { charts, list, add, update, remove, getById }
  return _singleton
}
