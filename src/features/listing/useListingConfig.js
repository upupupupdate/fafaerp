/**
 * 上架时效配置 — 共享 composable
 * 数据持久化到 localStorage，跟踪页与配置页共用同一份数据
 */
import { ref, watch } from 'vue'

const LS_KEY_TRANSITIONS = 'listing_node_transitions'
const LS_KEY_LOGISTICS    = 'listing_logistics_methods'

// ── 节点间时效默认配置 ─────────────────────────────────────────────────
// fromKey/toKey 对应 timeline 数组的索引（0-based）
// idx: 连线索引，即「从第 idx-1 个节点 → 第 idx 个节点」的时效
const DEFAULT_TRANSITIONS = [
  { idx: 1, label: '运营分配时效',   desc: '【运营分配】时间 - 【开发授权】时间',   standard: 2,  warning: 1 },
  { idx: 2, label: '建PL单时效',    desc: '【建PL单】时间 - 【运营分配】时间',     standard: 3,  warning: 1 },
  { idx: 3, label: 'PL单审核时效',  desc: '【PL审核通过】时间 - 【建PL单】时间',   standard: 2,  warning: 1 },
  { idx: 4, label: '采购下单时效',  desc: '【采购下单】时间 - 【PL审核通过】时间', standard: 2,  warning: 1 },
  { idx: 5, label: '供应商履约时效', desc: '【备货入库】时间 - 【采购下单】时间',   standard: 20, warning: 5 },
  { idx: 6, label: '建货件时效',    desc: '【建货件】时间 - 【备货入库】时间',     standard: 3,  warning: 1 },
  { idx: 7, label: '物流响应时效',  desc: '【货代提货】时间 - 【建货件】时间',     standard: 3,  warning: 1 },
  // idx 8（待入仓→开售）由物流方式动态决定，不在此配置
  { idx: 8, label: '开售响应时效',  desc: '【开售】时间 - 【可开售时间(取货件到仓与平面完成较晚者)】', standard: 3, warning: 1 },
]

// ── 物流方式默认配置 ────────────────────────────────────────────────────
const DEFAULT_LOGISTICS = [
  { id: 1, name: '海运',   standard: 45, warning: 7,  remark: '适用美线、欧线' },
  { id: 2, name: '空运',   standard: 10, warning: 3,  remark: '时效优先' },
  { id: 3, name: '快递',   standard: 7,  warning: 2,  remark: 'UPS/FedEx' },
  { id: 4, name: '铁路',   standard: 25, warning: 5,  remark: '中欧班列' },
]

function load(key, defaults) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaults))
  } catch {
    return JSON.parse(JSON.stringify(defaults))
  }
}

// 单例模式：模块级 ref，所有调用方共享同一个响应式对象
const transitions = ref(load(LS_KEY_TRANSITIONS, DEFAULT_TRANSITIONS))
const logistics   = ref(load(LS_KEY_LOGISTICS,    DEFAULT_LOGISTICS))

watch(transitions, v => localStorage.setItem(LS_KEY_TRANSITIONS, JSON.stringify(v)), { deep: true })
watch(logistics,   v => localStorage.setItem(LS_KEY_LOGISTICS,    JSON.stringify(v)), { deep: true })

/**
 * 计算两个时间戳之间的天数差（向上取整）
 */
export function daysBetween(start, end) {
  if (!start || !end) return null
  const diff = new Date(end) - new Date(start)
  return Math.ceil(diff / 86400000)
}

/**
 * 获取某条连线的时效配置
 * @param {number} transitionIdx  连线索引（等于目标节点在 timeline 数组中的下标）
 * @param {string} logisticsName  物流方式名称（仅 idx=8 即货件待发→待入仓 时使用）
 */
export function getTransitionConfig(transitionIdx, logisticsName) {
  // idx=8 的「待入仓→开售」之前的「货件待发→待入仓」是 idx=7（物流响应）和 idx=8（头程），
  // 这里统一用 idx 查普通配置，物流时效（货件发出→FBA签收）单独处理
  const cfg = transitions.value.find(t => t.idx === transitionIdx)
  return cfg ?? null
}

export function getLogisticsConfig(name) {
  return logistics.value.find(l => l.name === name) ?? null
}

export function useListingConfig() {
  return {
    transitions,
    logistics,
    DEFAULT_TRANSITIONS,
    DEFAULT_LOGISTICS,
  }
}
