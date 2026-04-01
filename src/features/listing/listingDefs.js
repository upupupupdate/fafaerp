// 上架跟踪 —— 共享常量与辅助函数
// 各子组件和主视图从此文件统一导入，避免重复定义

export const SUB_NODES = [
  { key: 'assigned',       label: '已分配' },
  { key: 'plan_pending',   label: '待建计划' },
  { key: 'plan_review',    label: '计划待审' },
  { key: 'po_pending',     label: '待采购下单' },
  { key: 'po_inbound',     label: '待采购入库' },
  { key: 'shipment_build', label: '待建货件' },
  { key: 'shipment_send',  label: '货件待发' },
  { key: 'in_transit',     label: '待入仓' },
  { key: 'launched',       label: '开售' },
]

// 备货发货子节点面板：去掉"已分配"（入口态，来自待分配流入）和"开售"（已流转至可/已开售）
export const STOCKING_SUB_NODES = SUB_NODES.slice(1, 8)

// 备货发货统计面板：在 7 个常规节点基础上追加"货件入仓"派生面板
// 货件入仓 = timeline[7](待入仓)已完成 但平面设计尚未完成（尚未流转至可开售）
export const STOCKING_PANELS = [
  ...STOCKING_SUB_NODES,
  { key: 'warehouse_received', label: '货件入仓' },
]

export const mainTabs = [
  { key: 'all',      label: '全部' },
  { key: 'pending',  label: '待分配' },
  { key: 'stocking', label: '备货发货' },
  { key: 'ready',    label: '可开售' },
  { key: 'listed',   label: '已开售' },
]

/**
 * 动态计算产品的实际主状态：
 * 当 stocking 产品的待入仓节点完成 AND 完成平面设计时，自动流转到可开售
 */
export function resolveMainStatus(p) {
  if (p.mainStatus === 'listed') return 'listed'
  if (p.mainStatus === 'ready')  return 'ready'
  if (p.mainStatus === 'stocking') {
    if (p.timeline[7]?.done === true && p.designStatus === '完成平面设计') return 'ready'
  }
  return p.mainStatus
}

/**
 * @param {object} tl 当前节点
 * @param {null|{ state: string, actual: number|null }} incomingTransition transitionInfos[idx]；actual 仅目标节点已完成时有值
 */
export function nodeState(tl, incomingTransition = null) {
  if (tl.done && incomingTransition?.state === 'overdue') return 'done-overdue'
  if (tl.done) return 'done'
  // 进行中：入边区间已判超时（有实际时效等）→ 红脉冲，不依赖 tl.overdue 字段
  if (!tl.done && incomingTransition?.state === 'overdue') return 'overdue'
  if (tl.overdue) return 'overdue'
  return 'pending'
}

const NO_LABELS = { 1: 'PL单号', 3: 'PO单号', 5: '货件号' }
export function noLabel(idx) { return NO_LABELS[idx] ?? '单号' }

const EST_LABELS = {
  po_inbound:     '预计入库',
  shipment_send:  '预计发出',
  in_transit:     '预计入仓',
  launched:       '预计开售',
}
export function estLabel(key) { return EST_LABELS[key] ?? '预计完成' }
