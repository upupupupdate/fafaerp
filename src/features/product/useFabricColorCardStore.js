/**
 * 面料色卡库 — 本地持久化，配置页与新品开发共用
 * 字段：面料商、型号、成分、类型、幅宽(cm)、克重、出米数/kg；颜色行含中英、编码、米价/码价/公斤价、报价记录快照
 */
import { ref, watch, computed } from 'vue'

const LS_KEY = 'product_fabric_color_cards_v2'

const DEFAULT_CARDS = [
  {
    id: 'fc_demo_1',
    supplier: '华东纺织',
    model: '100D/144F/2',
    composition: '92%涤纶 8%氨纶',
    fabricType: '针织纬编',
    widthCm: 150,
    weightGsm: 180,
    yieldMetersPerKg: 2.5,
    colors: [
      {
        zh: '白色',
        en: 'White',
        code: '1A',
        pricePerKg: 28,
        pricePerMeter: 7.56,
        pricePerYard: '',
        priceHistory: [],
      },
      { zh: '灰色', en: 'Grey', code: '2F', pricePerKg: 28, pricePerMeter: '', pricePerYard: '', priceHistory: [] },
      { zh: '藏青', en: 'Navy', code: '3N', pricePerKg: 30, pricePerMeter: '', pricePerYard: '', priceHistory: [] },
    ],
  },
]

/**
 * 米价参考：门幅(米) × 克重(g/m²) × 公斤价 ÷ 1000
 * 门幅(米) = 幅宽(cm) / 100（业务表「门幅×克重×公斤价/1000」）
 */
export function computeMeterPriceByFormula(widthCm, weightGsm, pricePerKg) {
  const cm = Number(widthCm)
  const g = Number(weightGsm)
  const k = Number(pricePerKg)
  if (![cm, g, k].every((x) => Number.isFinite(x) && x >= 0)) return null
  const widthM = cm / 100
  const v = (widthM * g * k) / 1000
  return Math.round(v * 10000) / 10000
}

function normalizeColor(col, i) {
  if (!col || typeof col !== 'object') return { zh: '', en: '', code: '', pricePerKg: '', pricePerMeter: '', pricePerYard: '', priceHistory: [] }
  return {
    zh: String(col.zh ?? '').trim(),
    en: String(col.en ?? '').trim(),
    code: String(col.code ?? '').trim(),
    pricePerKg: col.pricePerKg === '' || col.pricePerKg == null ? '' : Number(col.pricePerKg),
    pricePerMeter: col.pricePerMeter === '' || col.pricePerMeter == null ? '' : Number(col.pricePerMeter),
    pricePerYard: col.pricePerYard === '' || col.pricePerYard == null ? '' : Number(col.pricePerYard),
    priceHistory: Array.isArray(col.priceHistory) ? col.priceHistory : [],
  }
}

/** 旧版 fabricName → supplier；width 字符串 → widthCm；meters → yieldMetersPerKg */
function normalizeCard(c, idx = 0) {
  if (!c || typeof c !== 'object') return null
  const next = { ...c }

  if (!next.supplier?.trim() && next.fabricName) {
    next.supplier = String(next.fabricName).trim()
  }
  delete next.fabricName

  if (next.yarnCount != null && next.yieldMetersPerKg == null) {
    next.yieldMetersPerKg = next.yarnCount
  }
  if (next.meters != null && next.yieldMetersPerKg == null) {
    next.yieldMetersPerKg = next.meters
  }
  delete next.yarnCount
  delete next.meters

  if (next.widthCm == null && next.width != null) {
    const raw = String(next.width).replace(/cm/gi, '').trim()
    const n = parseFloat(raw)
    next.widthCm = Number.isFinite(n) ? n : ''
  }
  delete next.width

  if (next.fabricType == null) next.fabricType = ''

  if (next.weightGsm !== '' && next.weightGsm != null && typeof next.weightGsm !== 'number') {
    const n = parseFloat(String(next.weightGsm))
    next.weightGsm = Number.isFinite(n) ? n : ''
  }

  if (next.yieldMetersPerKg !== '' && next.yieldMetersPerKg != null && typeof next.yieldMetersPerKg !== 'number') {
    const n = parseFloat(String(next.yieldMetersPerKg))
    next.yieldMetersPerKg = Number.isFinite(n) ? n : ''
  }

  if (!Array.isArray(next.colors)) next.colors = []
  next.colors = next.colors.map((col, i) => normalizeColor(col, i))

  if (next.id == null || String(next.id).trim() === '') {
    next.id = `fc_${Date.now()}_${idx}`
  }
  return next
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      try {
        const legacy = localStorage.getItem('product_fabric_color_cards')
        if (legacy) {
          const parsed = JSON.parse(legacy)
          if (Array.isArray(parsed) && parsed.length) {
            const list = parsed.map((c, i) => normalizeCard(c, i)).filter(Boolean)
            if (list.length) return list
          }
        }
      } catch {
        /* ignore */
      }
      return JSON.parse(JSON.stringify(DEFAULT_CARDS))
    }
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
  const supplier = card.supplier || card.fabricName || ''
  const head = [supplier, card.model].filter(Boolean).join(' · ')
  const spec = [
    card.fabricType && `${card.fabricType}`,
    card.widthCm !== '' && card.widthCm != null && `幅宽${card.widthCm}cm`,
    card.weightGsm !== '' && card.weightGsm != null && `克重${card.weightGsm}g/m²`,
  ]
    .filter(Boolean)
    .join(' ')
  const y = card.yieldMetersPerKg
  const tail = y !== '' && y != null ? ` 出米${y}m/kg` : ''
  return `${head}${spec ? ` | ${spec}` : ''}${tail}`.trim()
}

const cards = ref(load())

watch(
  cards,
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

/** 价格变化时写入快照（旧值），用于报价记录 */
export function mergeColorPriceHistory(prevColor, nextColor) {
  if (!prevColor) {
    return { ...nextColor, priceHistory: Array.isArray(nextColor.priceHistory) ? nextColor.priceHistory : [] }
  }
  const history = [...(prevColor.priceHistory || [])]
  const keys = ['pricePerMeter', 'pricePerYard', 'pricePerKg']
  const changed = keys.some((k) => String(prevColor[k] ?? '') !== String(nextColor[k] ?? ''))
  if (changed) {
    history.unshift({
      at: new Date().toISOString(),
      pricePerMeter: prevColor.pricePerMeter,
      pricePerYard: prevColor.pricePerYard,
      pricePerKg: prevColor.pricePerKg,
    })
    if (history.length > 30) history.length = 30
  }
  return { ...nextColor, priceHistory: history }
}

export function useFabricColorCardStore() {
  if (_singleton) return _singleton
  const list = computed(() => cards.value)

  function add(card) {
    const id = `fc_${Date.now()}`
    cards.value = [...cards.value, { ...card, id }]
    return id
  }

  function update(id, patch) {
    const i = cards.value.findIndex((c) => c.id === id)
    if (i === -1) return
    const next = [...cards.value]
    next[i] = { ...next[i], ...patch }
    cards.value = next
  }

  function remove(id) {
    cards.value = cards.value.filter((c) => c.id !== id)
  }

  function getById(id) {
    return cards.value.find((c) => c.id === id) ?? null
  }

  _singleton = { cards, list, add, update, remove, getById, fabricCardDisplayName, computeMeterPriceByFormula, mergeColorPriceHistory }
  return _singleton
}
