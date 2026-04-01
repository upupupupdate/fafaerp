/**
 * 新品开发（服装类）— 时间轴节点与版型枚举
 * 时间轴样式复用 ListingTimeline，与上架跟踪列表视觉一致
 */

export const NPD_APPAREL_NODES = [
  { key: 'draft', label: '草稿期' },
  { key: 'review', label: '审核' },
  { key: 'sampling', label: '调样' },
  { key: 'dev', label: '开发' },
  { key: 'revision', label: '复版' },
  { key: 'finalize', label: '定版' },
  { key: 'enrich', label: '完善信息' },
  { key: 'done', label: '已完成' },
]

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
  review: '预计过审',
  sampling: '预计调样完成',
  dev: '预计开发完成',
  revision: '预计复版完成',
  finalize: '预计定版',
  enrich: '预计完善',
  done: '预计结案',
}

export function npdEstLabel(key) {
  return NPD_EST_LABELS[key] ?? '预计完成'
}

/** 服装新品开发时间轴无 PL/PO 等单号列，与上架跟踪区分 */
export function npdNoLabel() {
  return '单号'
}
