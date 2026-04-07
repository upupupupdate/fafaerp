/**
 * 样板管理 — 与新品开发「提交开款」联动，本地持久化
 * 变体行 = 色卡颜色维度；SKU 数 = 颜色 × 尺码（笛卡尔积，定版/出版）
 */
import { ref, watch } from 'vue'
import { useFabricColorCardStore, computeMeterPriceByFormula } from '@/features/product/useFabricColorCardStore.js'
import { useSizeLibraryStore } from '@/features/product/useSizeLibraryStore.js'
import { cartesianColorSize } from '@/features/product/apparelSkuHelpers.js'
import { filterColorsBySelection, filterSizesBySelection } from '@/features/product/npdPatternHelpers.js'
import { useSampleProductQueue } from '@/features/product/useSampleProductQueue.js'
import { fitLabel } from '@/features/product/npdApparelDefs.js'
import { getSeedNpdRowsForSampleBoard } from '@/features/product/sampleBoardSeedData.js'

const LS_KEY = 'sample_management_styles_v2'

/** @typedef {'received'|'sampling'|'revision'|'finalized'|'published'} SampleStatus */

function defaultSampleFields() {
  return {
    imageUrl: '',
    shelfYear: '',
    fitType: '',
    fitTypeLabel: '',
    mainFabricExtra: '',
    accessories: '',
    materialCost: '',
    productionCost: '',
    leadTime: '',
    materialLeadTime: '',
    outsourceFactory: '',
    workshopNotes: '',
    craftNotes: '',
    revisionDate: '',
    packagingType: '',
    packagingMaterials: '',
  }
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      const legacy = localStorage.getItem('sample_management_styles_v1')
      if (legacy) {
        const p = JSON.parse(legacy)
        if (Array.isArray(p) && p.length) return p.map((s) => ({ ...defaultSampleFields(), ...s }))
      }
      return []
    }
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p.map((s) => ({ ...defaultSampleFields(), ...s })) : []
  } catch {
    return []
  }
}

const styles = ref(load())

watch(
  styles,
  (v) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

function estCostForColor(card, col) {
  if (!card || !col) return null
  const pm = col.pricePerMeter !== '' && col.pricePerMeter != null ? Number(col.pricePerMeter) : null
  if (pm != null && Number.isFinite(pm)) return Math.round(pm * 100) / 100
  const k = computeMeterPriceByFormula(card.widthCm, card.weightGsm, col.pricePerKg)
  return k != null ? Math.round(k * 100) / 100 : null
}

function avgEstCost(variants) {
  const nums = (variants || []).map((v) => v.estCost).filter((x) => x != null && Number.isFinite(Number(x)))
  if (!nums.length) return null
  const sum = nums.reduce((a, b) => a + Number(b), 0)
  return Math.round((sum / nums.length) * 100) / 100
}

/**
 * @param {object} npdRow 新品开发行
 */
export function buildSamplePayloadFromNpd(npdRow) {
  const fabricStore = useFabricColorCardStore()
  const sizeStore = useSizeLibraryStore()
  const card = npdRow.fabricCardId ? fabricStore.getById(npdRow.fabricCardId) : null
  const chart = npdRow.sizeChartId ? sizeStore.getById(npdRow.sizeChartId) : null

  const allColorObjs = card?.colors?.length ? card.colors : []
  const allSizes = chart?.sizes?.length ? chart.sizes : []

  let colorObjs = filterColorsBySelection(card, npdRow.selectedFabricColorZh)
  if (!colorObjs.length && allColorObjs.length) colorObjs = [...allColorObjs]

  let sizes = filterSizesBySelection(chart, npdRow.selectedSizes)
  if (!sizes.length && allSizes.length) sizes = [...allSizes]

  const variants = colorObjs.map((col, idx) => {
    const fabricLine = [card?.supplier, card?.model, card?.composition].filter(Boolean).join(' ')
    return {
      id: `${npdRow.id}_c${idx}`,
      colorZh: col.zh,
      colorEn: col.en || '',
      colorCode: col.code || '',
      fabricLine: fabricLine || '—',
      sizes: [...sizes],
      estCost: estCostForColor(card, col),
      devName: npdRow.staff?.dev ?? '—',
    }
  })

  const cart = cartesianColorSize(
    colorObjs.map((c) => c.zh),
    sizes,
  )

  const shelfYear = npdRow.shelfYear || (npdRow.season || '').match(/\d{4}/)?.[0] || ''
  const fitType = npdRow.fitType || ''
  const fitTypeLabel = fitLabel(fitType)

  return {
    ...defaultSampleFields(),
    id: `sm_${npdRow.id}`,
    npdId: npdRow.id,
    designNo: npdRow.designNo || '',
    styleName: npdRow.nameCn,
    spu: npdRow.spu,
    brand: npdRow.brand,
    season: npdRow.season,
    category: npdRow.category,
    market: npdRow.market,
    gender: npdRow.gender,
    scene: npdRow.scene ?? '',
    targetPrice: npdRow.targetPrice ?? '',
    sampleSize: npdRow.sampleSize || 'M',
    sampleWeightGsm: npdRow.sampleWeightGsm ?? '',
    patternName: npdRow.patternName ?? '',
    fabricCardId: npdRow.fabricCardId || '',
    sizeChartId: npdRow.sizeChartId || '',
    openDate: npdRow.openDate || new Date().toISOString().slice(0, 10),
    revisionNo: 0,
    sampleStatus: /** @type {SampleStatus} */ ('sampling'),
    variants,
    skuPreviewCount: cart.length,
    avgEstCost: avgEstCost(variants),
    finalizedAt: null,
    publishedAt: null,
    imageUrl: npdRow.imageUrl || '',
    shelfYear,
    fitType,
    fitTypeLabel,
    mainFabricExtra: npdRow.mainFabricExtra ?? '',
    accessories: npdRow.accessories ?? '',
    materialCost: npdRow.materialCost ?? '',
    productionCost: npdRow.productionCost ?? '',
    leadTime: npdRow.leadTime ?? '',
    materialLeadTime: npdRow.materialLeadTime ?? '',
    outsourceFactory: npdRow.outsourceFactory ?? '',
    workshopNotes: npdRow.workshopNotes ?? '',
    craftNotes: npdRow.craftNotes ?? '',
    revisionDate: npdRow.revisionDate ?? '',
    packagingType: npdRow.packagingType ?? '',
    packagingMaterials: npdRow.packagingMaterials ?? '',
  }
}

let _singleton = null

export function useSampleManagementStore() {
  if (_singleton) return _singleton

  function upsertFromNpd(npdRow) {
    const payload = buildSamplePayloadFromNpd(npdRow)
    if (!payload?.variants?.length || !payload.skuPreviewCount) {
      return false
    }
    const i = styles.value.findIndex((s) => s.npdId === npdRow.id)
    if (i === -1) {
      styles.value = [payload, ...styles.value]
    } else {
      const next = [...styles.value]
      next[i] = { ...defaultSampleFields(), ...next[i], ...payload, revisionNo: next[i].revisionNo }
      styles.value = next
    }
    return true
  }

  function getByNpdId(npdId) {
    return styles.value.find((s) => s.npdId === npdId) ?? null
  }

  function patchStyle(id, partial) {
    const i = styles.value.findIndex((s) => s.id === id)
    if (i === -1) return
    const next = [...styles.value]
    next[i] = { ...next[i], ...partial }
    styles.value = next
  }

  /** 定版：按色卡×尺码生成 SKU，推出版依赖 finalizedSkuRows */
  function finalizeStyle(styleId) {
    const s = styles.value.find((x) => x.id === styleId)
    if (!s) return { ok: false, msg: '记录不存在' }
    if (s.sampleStatus === 'finalized' || s.sampleStatus === 'published') {
      return { ok: false, msg: '已定版或已推送' }
    }
    const rows = []
    for (const v of s.variants || []) {
      for (const size of v.sizes || []) {
        const skuCode = `${s.designNo}-${v.colorCode || v.colorZh}-${size}`.replace(/\s+/g, '')
        const nameParts = [s.styleName]
        if (s.patternName) nameParts.push(s.patternName)
        nameParts.push(v.colorZh, size)
        rows.push({
          skuCode,
          skuName: nameParts.join(' '),
          spuCode: s.spu,
          spuNameCn: s.styleName,
          categoryName: s.category,
          brandName: s.brand,
          variantJson: JSON.stringify({
            颜色: v.colorZh,
            尺码: size,
            设计号: s.designNo,
            图案: s.patternName || '',
            面料色卡: s.fabricCardId,
            尺码库: s.sizeChartId,
          }),
          sourceDesignNo: s.designNo,
        })
      }
    }
    patchStyle(styleId, {
      sampleStatus: 'finalized',
      finalizedAt: new Date().toISOString(),
      finalizedSkuRows: rows,
      avgEstCost: avgEstCost(s.variants),
    })
    return { ok: true, count: rows.length }
  }

  function publishStyle(styleId) {
    const s = styles.value.find((x) => x.id === styleId)
    if (!s) return { ok: false, msg: '记录不存在' }
    if (s.sampleStatus !== 'finalized') return { ok: false, msg: '请先定版' }
    const skuRows = s.finalizedSkuRows
    if (!skuRows?.length) return { ok: false, msg: '无 SKU 数据' }
    const q = useSampleProductQueue()
    q.enqueueMany(skuRows)
    patchStyle(styleId, {
      sampleStatus: 'published',
      publishedAt: new Date().toISOString(),
    })
    return { ok: true, count: skuRows.length }
  }

  function requestRevision(styleId) {
    const s = styles.value.find((x) => x.id === styleId)
    if (!s) return false
    patchStyle(styleId, {
      sampleStatus: 'revision',
      revisionNo: (s.revisionNo || 0) + 1,
    })
    return true
  }

  function filterByTab(tab) {
    if (tab === 'all') return styles.value
    const map = {
      sampling: ['sampling', 'received'],
      revision: ['revision'],
      finalized: ['finalized'],
      published: ['published'],
    }
    const allow = map[tab]
    if (!allow) return styles.value
    return styles.value.filter((s) => allow.includes(s.sampleStatus))
  }

  /** 本地无样板数据时写入与新品开发种子行对应的演示样板（色卡 fc_demo_1 × 尺码 sz_demo_1） */
  function seedStylesIfEmpty() {
    if (styles.value.length) return
    const seeded = []
    for (const row of getSeedNpdRowsForSampleBoard()) {
      const p = buildSamplePayloadFromNpd(row)
      if (p?.variants?.length) seeded.push(p)
    }
    if (seeded.length) styles.value = seeded
  }
  seedStylesIfEmpty()

  _singleton = {
    styles,
    upsertFromNpd,
    getByNpdId,
    patchStyle,
    finalizeStyle,
    publishStyle,
    requestRevision,
    filterByTab,
  }
  return _singleton
}
