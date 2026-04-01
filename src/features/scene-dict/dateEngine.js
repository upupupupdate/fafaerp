import { WEEKDAY_NAMES } from './constants.js'

export function pad(n) {
  return String(n).padStart(2, '0')
}

export function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatDate(d) {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(dt.getTime())) return '—'
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

export function formatDateISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getLevelById(levels, id) {
  return levels.find((l) => l.id === id) || null
}

export function calcHolidayDate(rule, year) {
  if (!rule) return null
  if (rule.mode === 'fixed') return `${year}-${pad(rule.month)}-${pad(rule.day)}`
  if (rule.mode === 'relative') {
    const d =
      rule.nth === -1
        ? calcLastWeekdayOfMonth(year, rule.month, rule.weekday)
        : calcNthWeekdayOfMonth(year, rule.month, rule.weekday, rule.nth)
    return d ? formatDateISO(d) : null
  }
  if (rule.mode === 'manual') return rule.dates?.[year] || null
  return null
}

export function calcNthWeekdayOfMonth(year, month, weekday, nth) {
  const d = new Date(year, month - 1, 1)
  let count = 0
  while (d.getMonth() === month - 1) {
    if (d.getDay() === weekday) {
      count++
      if (count === nth) return new Date(d)
    }
    d.setDate(d.getDate() + 1)
  }
  return null
}

export function calcLastWeekdayOfMonth(year, month, weekday) {
  const d = new Date(year, month, 0)
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1)
  return d
}

/** override: { devMonths, purMonths, wrmDays } — null field uses level template */
export function calcTimeline(dateStr, levelId, levels, override) {
  if (!dateStr) return null
  const lv = getLevelById(levels, levelId)
  if (!lv) return null
  const hDate = new Date(dateStr)
  if (Number.isNaN(hDate.getTime())) return null
  const devMonths = override?.devMonths ?? lv.devMonths
  const purMonths = override?.purMonths ?? lv.purMonths
  const wrmDays = override?.wrmDays ?? lv.wrmDays
  const warmup = new Date(hDate)
  warmup.setDate(warmup.getDate() - wrmDays)
  const purchase = new Date(warmup)
  purchase.setMonth(purchase.getMonth() - purMonths)
  const devStart = new Date(purchase)
  devStart.setMonth(devStart.getMonth() - devMonths)
  return {
    devStart: formatDateISO(devStart),
    purchaseDeadline: formatDateISO(purchase),
    warmupDate: formatDateISO(warmup),
    holidayDate: dateStr,
  }
}

export function calcCurrentStatus(tl) {
  if (!tl) return 'pending'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dev = new Date(tl.devStart)
  const pur = new Date(tl.purchaseDeadline)
  const wrm = new Date(tl.warmupDate)
  const hol = new Date(tl.holidayDate)
  if (now < dev) return 'pending'
  if (now < pur) return 'dev'
  if (now < wrm) return 'purchase'
  if (now < hol) return 'warmup'
  return 'over'
}

export function calcUrgency(devStart) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(devStart)
  const diff = (d - today) / 86400000
  if (diff < 0) return { cls: 'devstart-overdue', label: '已逾期' }
  if (diff <= 14) return { cls: 'devstart-urgent', label: `${Math.round(diff)}天后` }
  if (diff <= 60) return { cls: 'devstart-soon', label: `${Math.round(diff)}天后` }
  return { cls: 'devstart-normal', label: '' }
}

export function describeRule(rule) {
  if (!rule) return '—'
  if (rule.mode === 'fixed') return `每年 ${rule.month}月${rule.day}日`
  if (rule.mode === 'relative') {
    const nth = rule.nth === -1 ? '最后一个' : `第${rule.nth}个`
    return `${rule.month}月${nth}${WEEKDAY_NAMES[rule.weekday]}`
  }
  if (rule.mode === 'manual') return '手动指定各年日期'
  return '—'
}

export function tagColor(tag, TAG_COLORS) {
  const idx = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_COLORS.length
  return TAG_COLORS[idx]
}
