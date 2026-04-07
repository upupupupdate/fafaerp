// 上架跟踪 —— 共享常量与辅助函数

import { daysBetween } from '@/features/listing/useListingConfig.js'

/** 时间轴 11 格：…待入仓 → 货件入仓(FBA已接收) → 可开售 → 已开售 */
export const SUB_NODES = [
  { key: 'assigned',           label: '已分配' },
  { key: 'plan_pending',       label: '待建计划' },
  { key: 'plan_review',        label: '计划待审' },
  { key: 'po_pending',         label: '待采购下单' },
  { key: 'po_inbound',         label: '待采购入库' },
  { key: 'shipment_build',     label: '待建货件' },
  { key: 'shipment_send',      label: '货件待发' },
  { key: 'in_transit',         label: '待入仓' },
  { key: 'warehouse_received', label: '货件入仓' },
  { key: 'ready_to_sell',      label: '可开售' },
  { key: 'launched',           label: '已开售' },
]

/** 备货子阶段（不含已分配 / 不含可开售与已开售轴点） */
export const STOCKING_FLOW_NODES = SUB_NODES.slice(1, 9)

/** 统计/筛选面板（货件入仓为时间轴真实节点，不重复） */
export const STOCKING_PANELS = [
  { key: 'pending', label: '待分配' },
  ...STOCKING_FLOW_NODES.map((n) => ({ key: n.key, label: n.label })),
  { key: 'ready_to_sell', label: '可开售' },
  { key: 'listed_sale', label: '已开售' },
]

export const STATUS_FILTER_OPTIONS = STOCKING_PANELS

/** 统计卡片左侧色条（与节点 key 对应） */
export const STOCKING_PANEL_ACCENTS = {
  pending: '#909399',
  plan_pending: '#409EFF',
  plan_review: '#E6A23C',
  po_pending: '#F56C6C',
  po_inbound: '#67C23A',
  shipment_build: '#409EFF',
  shipment_send: '#9254DE',
  in_transit: '#13C2C2',
  warehouse_received: '#FA8C16',
  ready_to_sell: '#52C41A',
  listed_sale: '#303133',
}

/** 更多筛选：各角色人员下拉选项（与上架跟踪 mock 数据池一致） */
export const LISTING_STAFF_OPTIONS = {
  ops: ['李运营', '王运营', '陈运营', '刘运营', '林运营', '吴运营'],
  dev: ['张开发', '李开发', '王开发', '赵开发', '陈开发', '刘开发'],
  design: ['王平面', '李平面', '陈平面', '黄平面', '郑平面', '刘平面'],
  photo: ['周摄影', '吴摄影', '郑摄影', '孙摄影', '钱摄影', '赵摄影'],
  purchase: ['赵采购', '孙采购', '冯采购', '刘采购', '周采购', '陈采购'],
}

export const mainTabs = [
  { key: 'all',      label: '全部' },
  { key: 'pending',  label: '待分配' },
  { key: 'stocking', label: '备货发货' },
  { key: 'ready',    label: '可开售' },
  { key: 'listed',   label: '已开售' },
]

/**
 * 列表「状态&节点」列：仅展示阶段文案（不出现「备货发货」等主状态前缀）
 */
export function resolveListStatusLabel(p) {
  const m = resolveMainStatus(p)
  if (m === 'pending') return '待分配'
  if (m === 'listed') return '已开售'
  if (m === 'ready') return '可开售'
  if (m === 'stocking') {
    const sub = p.subNode ? SUB_NODES.find((n) => n.key === p.subNode) : null
    return sub?.label ?? '—'
  }
  return '—'
}

export function resolveMainStatus(p) {
  if (p.mainStatus === 'listed') return 'listed'
  if (p.timeline?.[10]?.done === true) return 'listed'
  if (p.mainStatus === 'ready') return 'ready'
  if (p.mainStatus === 'stocking') {
    // 已进入可开售阶段：FBA货件入仓已完成、平面设计完成、尚未开售
    if (
      p.timeline?.[8]?.done === true &&
      p.designStatus === '完成平面设计' &&
      p.timeline?.[10]?.done !== true
    ) {
      return 'ready'
    }
  }
  return p.mainStatus
}

/**
 * 列表「总用时」列：仅已开售展示「开售时间 − 运营分配时间」（已分配节点完成时间）；否则 "-/-"
 */
export function formatListedTotalUseDays(p) {
  if (resolveMainStatus(p) !== 'listed') return '-/-'
  const assign = p.timeline?.[0]
  const launched = p.timeline?.[10]
  if (!assign?.done || !launched?.done || !assign?.time || !launched?.time) return '-/-'
  const start = assign.time.slice(0, 10)
  const end = launched.time.slice(0, 10)
  const n = daysBetween(start, end)
  if (n == null || Number.isNaN(n) || n < 0) return '-/-'
  return `${n}天`
}

/**
 * 面板/筛选：单 key 是否命中（用于 OR 组合）
 */
export function matchStatusPanelKey(p, key) {
  const m = resolveMainStatus(p)
  if (key === 'pending') return m === 'pending'
  if (key === 'listed_sale') return m === 'listed'
  if (key === 'ready_to_sell') return m === 'ready'
  if (key === 'warehouse_received') {
    return m === 'stocking' && p.subNode === 'warehouse_received'
  }
  if (STOCKING_FLOW_NODES.some((n) => n.key === key)) {
    return m === 'stocking' && p.subNode === key
  }
  return false
}

export function nodeState(tl, incomingTransition = null) {
  if (tl.done && incomingTransition?.state === 'overdue') return 'done-overdue'
  if (tl.done) return 'done'
  if (!tl.done && incomingTransition?.state === 'overdue') return 'overdue'
  if (tl.overdue) return 'overdue'
  return 'pending'
}

const NO_LABELS = { 1: 'PL单号', 3: 'PO单号', 5: '货件号' }
export function noLabel(idx) { return NO_LABELS[idx] ?? '单号' }

const EST_LABELS = {
  po_inbound:         '预计入库',
  shipment_send:      '预计发出',
  in_transit:         '预计入仓',
  warehouse_received: '预计FBA接收',
  ready_to_sell:      '预计可售',
  launched:           '预计开售',
}
export function estLabel(key) { return EST_LABELS[key] ?? '预计完成' }
