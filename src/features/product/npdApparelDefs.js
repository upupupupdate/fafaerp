/**
 * 新品开发（服装类）— 时间轴节点与版型枚举
 * 时间轴节点与状态机一致（与 NewProductDevView Tab / workflowPhase 对齐，不含「全部」）
 * rejected / void 不单独占点，进度位置见 npdApparelTimeline.workflowPhaseToTimelineUpIdx
 */

export const NPD_TIMELINE_NODE_COUNT = 5

export const NPD_APPAREL_NODES = [
  { key: 'draft', label: '草稿箱' },
  { key: 'pending_review', label: '待审核' },
  { key: 'pending_style', label: '待开款' },
  { key: 'sampling', label: '样板中' },
  { key: 'completed', label: '已完成' },
]

/** 状态统计条（与 NewProductDevView Tab 一致，不含「全部」）— 结构与上架跟踪 ListingNodeStatusBar 一致 */
export const NPD_STATUS_PANELS = [
  { key: 'draft', label: '草稿箱' },
  { key: 'pending_review', label: '待审核' },
  { key: 'pending_style', label: '待开款' },
  { key: 'sampling', label: '样板中' },
  { key: 'completed', label: '已完成' },
  { key: 'rejected', label: '审核驳回' },
  { key: 'void', label: '作废' },
]

/** 统计卡片左侧色条（与 workflowPhase 对应） */
export const NPD_PANEL_ACCENTS = {
  draft: '#909399',
  pending_review: '#E6A23C',
  pending_style: '#409EFF',
  sampling: '#FA8C16',
  completed: '#67C23A',
  rejected: '#F56C6C',
  void: '#C0C4CC',
}

/** 版型三选一 */
export const FIT_OPTIONS = [
  { value: 'slim', label: '紧身' },
  { value: 'regular', label: '合身' },
  { value: 'loose', label: '宽松' },
]

export function fitLabel(value) {
  return FIT_OPTIONS.find(f => f.value === value)?.label ?? '—'
}

const NPD_EST_LABELS = {
  draft: '预计提交',
  pending_review: '预计过审',
  pending_style: '预计开款',
  sampling: '预计样板完成',
  completed: '预计结案',
}

export function npdEstLabel(key) {
  return NPD_EST_LABELS[key] ?? '预计完成'
}

/** 服装新品开发时间轴无 PL/PO 等单号列，与上架跟踪区分 */
export function npdNoLabel() {
  return '单号'
}
