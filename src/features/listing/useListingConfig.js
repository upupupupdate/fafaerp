/**
 * 上架时效配置 — 共享 composable
 * 数据持久化到 localStorage，跟踪页与配置页共用同一份数据
 * idx 5、8（供应商履约、头程运输）在上架连线中按三方「预计入库 / 预计到仓」与实绩对比，不在此表维护标准天（配置页只读说明）。
 */
import { ref, watch } from 'vue'
import { useCategoryStore } from '@/features/product/useCategoryStore.js'

/** v4：10 节点轴（无「待物流提货」）；与 listingDefs SUB_NODES 一致 */
const LS_KEY_TRANSITIONS_V4 = 'listing_node_transitions_v4'

// idx = 目标节点下标（进入该节点的连线时效，与 timeline 下标一致）
// derivedFromSystem：标准天由三方/对比逻辑推算，配置页不维护标准与预警输入
export const DEFAULT_TRANSITIONS = [
  { idx: 1, label: '运营分配时效',   desc: '【已分配】完成 − 【开发授权】时间',       standard: 2,  warning: 1 },
  { idx: 2, label: '建PL单时效',    desc: '【待建计划】完成 − 【已分配】完成',       standard: 3,  warning: 1 },
  { idx: 3, label: 'PL单审核时效',  desc: '【计划待审】完成 − 【待建计划】完成',     standard: 2,  warning: 1 },
  { idx: 4, label: '采购下单时效',  desc: '【待采购下单】完成 − 【计划待审】完成',   standard: 2,  warning: 1 },
  {
    idx: 5,
    label: '供应商履约时效',
    desc: '对比「预计入库」与采购下单完成日：预计入库来自积加/三方，缺省时用采购交期推算。上架按此对比，本表不维护标准天',
    standard: 20,
    warning: 5,
    derivedFromSystem: true,
  },
  { idx: 6, label: '建货件时效',    desc: '【待建货件】完成 − 【待采购入库】完成',   standard: 3,  warning: 1 },
  { idx: 7, label: '货件发出时效',  desc: '【货件待发】完成 − 【待建货件】完成',   standard: 3,  warning: 1 },
  {
    idx: 8,
    label: '头程运输时效',
    desc: '对比「预计到仓」与货件发出完成日：预计到仓来自物流/三方。上架按此对比，本表不维护标准天',
    standard: 3,
    warning: 1,
    derivedFromSystem: true,
  },
  { idx: 9, label: '开售响应时效',  desc: '【已开售】完成 − 【可开售】完成',         standard: 3,  warning: 1 },
]

function mergeTransitions(parsed) {
  const byIdx = new Map((Array.isArray(parsed) ? parsed : []).map((t) => [t.idx, t]))
  return DEFAULT_TRANSITIONS.map((d) => {
    const cur = byIdx.get(d.idx)
    if (!cur) return { ...d }
    return {
      ...cur,
      label: d.label,
      desc: d.desc,
      derivedFromSystem: d.derivedFromSystem === true,
    }
  })
}

/** 是否由三方/系统推算、不在配置表维护标准天（当前 idx 5、8） */
export function isTransitionDerivedFromSystem(transitionIdx) {
  return DEFAULT_TRANSITIONS.some((t) => t.idx === transitionIdx && t.derivedFromSystem === true)
}

function loadTransitionState() {
  try {
    const raw = localStorage.getItem(LS_KEY_TRANSITIONS_V4)
    if (raw) {
      const p = JSON.parse(raw)
      const def = mergeTransitions(Array.isArray(p.default) ? p.default : [])
      const byCat =
        p.byCategory && typeof p.byCategory === 'object' && !Array.isArray(p.byCategory)
          ? p.byCategory
          : {}
      const normalized = {}
      for (const [k, rows] of Object.entries(byCat)) {
        if (!k || !Array.isArray(rows)) continue
        normalized[k] = mergeTransitions(rows)
      }
      return { default: def, byCategory: normalized }
    }
  } catch {
    /* ignore */
  }
  return {
    default: mergeTransitions([...DEFAULT_TRANSITIONS]),
    byCategory: {},
  }
}

const transitionState = loadTransitionState()
const transitions = ref(transitionState.default)
const transitionsByCategory = ref(transitionState.byCategory)

watch(
  [transitions, transitionsByCategory],
  () => {
    try {
      localStorage.setItem(
        LS_KEY_TRANSITIONS_V4,
        JSON.stringify({
          default: transitions.value,
          byCategory: transitionsByCategory.value,
        }),
      )
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

export function daysBetween(start, end) {
  if (!start || !end) return null
  const diff = new Date(end) - new Date(start)
  return Math.ceil(diff / 86400000)
}

function findTransitionRow(rows, transitionIdx) {
  if (!rows || !Array.isArray(rows) || !rows.length) return null
  return rows.find((t) => t.idx === transitionIdx) ?? null
}

/**
 * 解析本条连线的时效配置行：
 * - 末级品类 id（cat-*）：自末级起沿父链向上，命中第一条有配置的节点（末级优先于上级）；
 * - 非 id 字符串：视为旧版品类名称，仅做单次键查找；
 * - 均无则回退全局 default。
 *
 * @param {number} transitionIdx 目标节点下标（与 timeline 下标一致）
 * @param {string} [categoryKey] 产品末级品类 id 或旧版品类名称
 */
export function getTransitionConfig(transitionIdx, categoryKey) {
  const globalRow = transitions.value.find((t) => t.idx === transitionIdx) ?? null
  const key = String(categoryKey ?? '').trim()
  if (!key) return globalRow

  const byCat = transitionsByCategory.value

  if (!key.startsWith('cat-')) {
    return findTransitionRow(byCat[key], transitionIdx) ?? globalRow
  }

  const store = useCategoryStore()
  let node = store.getById(key)
  if (!node) {
    return findTransitionRow(byCat[key], transitionIdx) ?? globalRow
  }

  const seen = new Set()
  while (node && !seen.has(node.id)) {
    seen.add(node.id)
    const hit = findTransitionRow(byCat[node.id], transitionIdx)
    if (hit) return hit
    const pid = node.parentId
    node = pid ? store.getById(pid) : null
  }

  return globalRow
}

export function useListingConfig() {
  return {
    transitions,
    transitionsByCategory,
    DEFAULT_TRANSITIONS,
  }
}
