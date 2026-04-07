/**
 * 上架时效配置 — 共享 composable
 * 数据持久化到 localStorage，跟踪页与配置页共用同一份数据
 */
import { ref, watch } from 'vue'

/** v2：11 节点时间轴，含「货件入仓」；与 v1 分段语义不同，换新 key */
const LS_KEY_TRANSITIONS = 'listing_node_transitions_v2'
/** 统一头程规则：含「仅物流」行（货件待发→待入仓）与「物流+国家+仓」行（待入仓→货件入仓） */
const LS_KEY_FIRST_LEG_RULES = 'listing_first_leg_rules_v2'

// idx = 目标节点下标（进入该节点的连线时效，与 timeline 下标一致）
const DEFAULT_TRANSITIONS = [
  { idx: 1, label: '运营分配时效',   desc: '【运营分配】时间 - 【开发授权】时间',   standard: 2,  warning: 1 },
  { idx: 2, label: '建PL单时效',    desc: '【建PL单】时间 - 【运营分配】时间',     standard: 3,  warning: 1 },
  { idx: 3, label: 'PL单审核时效',  desc: '【PL审核通过】时间 - 【建PL单】时间',   standard: 2,  warning: 1 },
  { idx: 4, label: '采购下单时效',  desc: '【采购下单】时间 - 【PL审核通过】时间', standard: 2,  warning: 1 },
  { idx: 5, label: '供应商履约时效', desc: '【备货入库】时间 - 【采购下单】时间',   standard: 20, warning: 5 },
  { idx: 6, label: '建货件时效',    desc: '【建货件】时间 - 【备货入库】时间',     standard: 3,  warning: 1 },
  { idx: 7, label: '物流响应时效',  desc: '【待入仓】时间 - 【建货件】时间',       standard: 3,  warning: 1 },
  // idx 7 仍可由头程表中「仅填物流方式」行覆盖（见 getLogisticsConfig）
  { idx: 8, label: 'FBA货件入仓时效', desc: '【货件入仓】完成 - 【待入仓】完成',     standard: 3,  warning: 1 },
  { idx: 9, label: '入仓至可开售',   desc: '【可开售】完成 - 【货件入仓】完成',     standard: 3,  warning: 1 },
  { idx: 10, label: '开售响应时效',  desc: '【已开售】时间 - 【可开售】完成',       standard: 3,  warning: 1 },
]

/**
 * @typedef {{
 *   id: string,
 *   logisticsName: string,
 *   shipCountry: string,
 *   destWarehouse: string,
 *   standard: number,
 *   warning: number,
 *   remark?: string
 * }} FirstLegRule
 * 发货国家、目的仓均留空：用于「货件待发 → 待入仓」；
 * 三者均填：用于「待入仓 → 货件入仓（FBA接收）」。
 */

/** 默认：前 4 条为仅物流；后 2 条为 FBA 入仓细粒度 */
const DEFAULT_FIRST_LEG_RULES = [
  { id: 'fl_l_1', logisticsName: '海运', shipCountry: '', destWarehouse: '', standard: 45, warning: 7, remark: '适用美线、欧线' },
  { id: 'fl_l_2', logisticsName: '空运', shipCountry: '', destWarehouse: '', standard: 10, warning: 3, remark: '时效优先' },
  { id: 'fl_l_3', logisticsName: '快递', shipCountry: '', destWarehouse: '', standard: 7, warning: 2, remark: 'UPS/FedEx' },
  { id: 'fl_l_4', logisticsName: '铁路', shipCountry: '', destWarehouse: '', standard: 25, warning: 5, remark: '中欧班列' },
  { id: 'fl_fba_1', logisticsName: '海运', shipCountry: '中国内地', destWarehouse: '美东 FBA 仓', standard: 30, warning: 5, remark: '' },
  { id: 'fl_fba_2', logisticsName: '空运', shipCountry: '中国内地', destWarehouse: '美西 FBA 仓', standard: 12, warning: 3, remark: '' },
]

function normRuleStr(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function loadRaw(key, defaults) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaults))
  } catch {
    return JSON.parse(JSON.stringify(defaults))
  }
}

/** 合并缺省 idx，避免升级后 localStorage 缺新节点 */
function mergeTransitions(parsed) {
  const byIdx = new Map(parsed.map((t) => [t.idx, t]))
  for (const d of DEFAULT_TRANSITIONS) {
    if (!byIdx.has(d.idx)) byIdx.set(d.idx, { ...d })
  }
  return [...byIdx.values()].sort((a, b) => a.idx - b.idx)
}

const transitions = ref(mergeTransitions(loadRaw(LS_KEY_TRANSITIONS, DEFAULT_TRANSITIONS)))
const firstLegInboundRules = ref(loadRaw(LS_KEY_FIRST_LEG_RULES, DEFAULT_FIRST_LEG_RULES))

watch(transitions, (v) => localStorage.setItem(LS_KEY_TRANSITIONS, JSON.stringify(v)), { deep: true })
watch(
  firstLegInboundRules,
  (v) => localStorage.setItem(LS_KEY_FIRST_LEG_RULES, JSON.stringify(v)),
  { deep: true },
)

export function daysBetween(start, end) {
  if (!start || !end) return null
  const diff = new Date(end) - new Date(start)
  return Math.ceil(diff / 86400000)
}

/**
 * @param {number} transitionIdx 目标节点下标（与 timeline 下标一致）
 */
export function getTransitionConfig(transitionIdx, logisticsName) {
  const cfg = transitions.value.find((t) => t.idx === transitionIdx)
  return cfg ?? null
}

/**
 * 「货件待发 → 待入仓」：匹配头程表中 **发货国家、目的仓均为空** 且物流方式一致的行。
 * @returns {{ standard: number, warning: number, name?: string, remark?: string } | null}
 */
export function getLogisticsConfig(name) {
  const L = normRuleStr(name)
  if (!L) return null
  for (const r of firstLegInboundRules.value) {
    if (normRuleStr(r.logisticsName) !== L) continue
    if (normRuleStr(r.shipCountry)) continue
    if (normRuleStr(r.destWarehouse)) continue
    const std = Number(r.standard)
    const warn = Number(r.warning)
    if (!Number.isFinite(std) || std < 1) continue
    const w = Number.isFinite(warn) && warn >= 0 ? Math.min(warn, std - 1) : Math.min(1, std - 1)
    return { name: r.logisticsName, standard: std, warning: w, remark: r.remark || '' }
  }
  return null
}

/**
 * 「待入仓 → 货件入仓」：按 物流方式 + 发货国家 + 目的仓 精确匹配；无匹配返回 null，回退节点默认 idx:8。
 */
export function lookupFirstLegInboundRule(ctx) {
  const L = normRuleStr(ctx?.logisticsName)
  const C = normRuleStr(ctx?.shipCountry)
  const W = normRuleStr(ctx?.destWarehouse)
  if (!L || !C || !W) return null
  for (const r of firstLegInboundRules.value) {
    if (normRuleStr(r.logisticsName) !== L) continue
    if (normRuleStr(r.shipCountry) !== C) continue
    if (normRuleStr(r.destWarehouse) !== W) continue
    const std = Number(r.standard)
    const warn = Number(r.warning)
    if (!Number.isFinite(std) || std < 1) continue
    const w = Number.isFinite(warn) && warn >= 0 ? Math.min(warn, std - 1) : Math.min(1, std - 1)
    return { standard: std, warning: w }
  }
  return null
}

export function useListingConfig() {
  return {
    transitions,
    firstLegInboundRules,
    DEFAULT_TRANSITIONS,
    DEFAULT_FIRST_LEG_RULES,
  }
}
