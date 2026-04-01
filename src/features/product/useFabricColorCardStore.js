/**
 * 面料色卡库 — 本地持久化，配置页与新品开发共用
 */
import { ref, watch, computed } from 'vue'

const LS_KEY = 'product_fabric_color_cards'

const DEFAULT_CARDS = [
  {
    id: 'fc_demo_1',
    fabricName: '高弹丝',
    model: '100D/144F/2',
    composition: '92%涤纶 8%氨纶',
    width: '150cm',
    weightGsm: '180',
    meters: '100',
    colors: [
      { zh: '白色', en: 'White', code: '1A' },
      { zh: '灰色', en: 'Grey', code: '2F' },
      { zh: '藏青', en: 'Navy', code: '3N' },
    ],
  },
]

/** 旧版字段 yarnCount → meters；保证 colors 为数组；非法项返回 null，避免 el-option 访问 c.id 崩溃 */
function normalizeCard(c, idx = 0) {
  if (!c || typeof c !== 'object') return null
  const next = { ...c }
  if (next.yarnCount != null && next.meters == null) {
    next.meters = next.yarnCount
    delete next.yarnCount
  }
  if (!Array.isArray(next.colors)) next.colors = []
  if (next.id == null || String(next.id).trim() === '') {
    next.id = `fc_${Date.now()}_${idx}`
  }
  return next
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CARDS))
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) return JSON.parse(JSON.stringify(DEFAULT_CARDS))
    const list = parsed.map((c, i) => normalizeCard(c, i)).filter(Boolean)
    return list.length ? list : JSON.parse(JSON.stringify(DEFAULT_CARDS))
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CARDS))
  }
}

export function fabricCardDisplayName(card) {
  if (!card) return ''
  const m = card.meters ?? card.yarnCount
  return `${card.fabricName} ${card.model}/${card.composition} 幅宽${card.width || '—'} 克重${card.weightGsm || '—'} 米数${m || '—'}`.trim()
}

const cards = ref(load())

watch(
  cards,
  v => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v))
    } catch { /* ignore */ }
  },
  { deep: true },
)

let _singleton = null

export function useFabricColorCardStore() {
  if (_singleton) return _singleton
  const list = computed(() => cards.value)

  function add(card) {
    const id = `fc_${Date.now()}`
    cards.value = [...cards.value, { ...card, id }]
    return id
  }

  function update(id, patch) {
    const i = cards.value.findIndex(c => c.id === id)
    if (i === -1) return
    const next = [...cards.value]
    next[i] = { ...next[i], ...patch }
    cards.value = next
  }

  function remove(id) {
    cards.value = cards.value.filter(c => c.id !== id)
  }

  function getById(id) {
    return cards.value.find(c => c.id === id) ?? null
  }

  _singleton = { cards, list, add, update, remove, getById, fabricCardDisplayName }
  return _singleton
}
