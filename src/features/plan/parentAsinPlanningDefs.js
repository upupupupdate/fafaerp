/**
 * 父体规划 — 状态与站点定义
 * 唯一键：店铺 + 站点 + 父 ASIN（不含子体）
 */

/** @typedef {'pending_confirm'|'in_progress'|'cancelled'|'done'} ParentPlanStoredStatus */

export const PARENT_PLAN_STATUS = {
  pending_confirm: 'pending_confirm',
  in_progress: 'in_progress',
  cancelled: 'cancelled',
  done: 'done',
}

/** 展示用（含逾期由日期推导） */
export const PARENT_PLAN_DISPLAY_STATUS = {
  pending_confirm: 'pending_confirm',
  in_progress: 'in_progress',
  overdue: 'overdue',
  cancelled: 'cancelled',
  done: 'done',
}

export const STATUS_LABEL = {
  pending_confirm: '待确认',
  in_progress: '进行中',
  overdue: '已逾期',
  cancelled: '取消不做',
  done: '已完成',
}

export const STATUS_TAG_TYPE = {
  pending_confirm: 'warning',
  in_progress: 'primary',
  overdue: 'danger',
  cancelled: 'info',
  done: 'success',
}

/** 亚马逊站点（与上架常用站点对齐，可扩展） */
export const AMAZON_SITE_OPTIONS = [
  { value: 'US', label: '美国 US' },
  { value: 'CA', label: '加拿大 CA' },
  { value: 'UK', label: '英国 UK' },
  { value: 'DE', label: '德国 DE' },
  { value: 'JP', label: '日本 JP' },
]

const SITE_TLD = {
  US: 'com',
  CA: 'ca',
  UK: 'co.uk',
  DE: 'de',
  JP: 'co.jp',
}

export function amazonParentUrl(site, parentAsin) {
  const s = String(site || 'US').toUpperCase()
  const tld = SITE_TLD[s] || 'com'
  const asin = String(parentAsin || '').trim().toUpperCase()
  if (!asin) return ''
  return `https://www.amazon.${tld}/dp/${asin}`
}

export function isPastDueDate(dueDateStr) {
  if (!dueDateStr || typeof dueDateStr !== 'string') return false
  const d = new Date(dueDateStr.slice(0, 10) + 'T23:59:59')
  return Number.isFinite(d.getTime()) && d.getTime() < Date.now()
}

/**
 * @param {{ status: string, dueDate?: string }} row
 * @returns {keyof typeof PARENT_PLAN_DISPLAY_STATUS}
 */
export function getEffectiveDisplayStatus(row) {
  if (!row) return 'pending_confirm'
  const s = row.status
  if (s === PARENT_PLAN_STATUS.cancelled) return 'cancelled'
  if (s === PARENT_PLAN_STATUS.done) return 'done'
  if (s === PARENT_PLAN_STATUS.pending_confirm) return 'pending_confirm'
  if (s === PARENT_PLAN_STATUS.in_progress) {
    if (row.dueDate && isPastDueDate(row.dueDate)) return 'overdue'
    return 'in_progress'
  }
  return 'in_progress'
}
