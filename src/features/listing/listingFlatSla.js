/**
 * 平面 / Listing 全链路 SLA（与 ListingConfigView 中「全链路时效指标」cm_graphic_total、cm_listing_upload 对齐）
 * 起点为「运营分配」完成日（timeline[0]），非开发授权日。
 * 不并入主时间轴 transitionInfos；供边栏列表在「平面完成时间」「Listing上传时间」下展示超时标签。
 */
import { daysBetween } from '@/features/listing/useListingConfig.js'

const LS_KEY = 'listing_chain_metrics_v2'

/** 与 ListingConfigView DEFAULT_CHAIN_METRICS id 一致 */
const DEFAULT = {
  cm_graphic_total: { standard: 30, warning: 5 },
  cm_listing_upload: { standard: 30, warning: 5 },
}

function addCalendarDays(dateStr, n) {
  const base = String(dateStr || '').slice(0, 10)
  if (!base) return ''
  const d = new Date(`${base}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + Number(n))
  return d.toISOString().slice(0, 10)
}

function loadMergedStandards() {
  let design = { ...DEFAULT.cm_graphic_total }
  let listing = { ...DEFAULT.cm_listing_upload }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { design, listing }
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : []
    const byId = new Map(list.filter((r) => r?.id).map((r) => [String(r.id), r]))
    const pick = (id, fallback) => {
      const row = byId.get(id)
      if (!row) return fallback
      const std = Number(row.standard)
      const war = Number(row.warning)
      return {
        standard: Number.isFinite(std) && std >= 1 ? Math.floor(std) : fallback.standard,
        warning: Number.isFinite(war) && war >= 0 ? Math.floor(war) : fallback.warning,
      }
    }
    design = pick('cm_graphic_total', design)
    listing = pick('cm_listing_upload', listing)
  } catch {
    /* ignore */
  }
  if (design.warning >= design.standard) design.warning = Math.max(0, design.standard - 1)
  if (listing.warning >= listing.standard) listing.warning = Math.max(0, listing.standard - 1)
  return { design, listing }
}

/** 运营分配完成日（与「已分配」轴点一致）；未分配则无起点 */
function anchorOpsAssignDate(product) {
  const t0 = product?.timeline?.[0]
  if (t0?.done && t0?.time) return String(t0.time).slice(0, 10)
  return ''
}

/**
 * @returns {{ designOverdueDays: number|null, listingOverdueDays: number|null }}
 * - 未完成：当前日超过「运营分配 + 标准天」的截止日期 → 从截止日起算超时天数
 * - 已完成：实际完成日晚于截止日期 → 展示相对截止日的超期天数（历史）
 */
export function computeDesignListingFlatSla(product) {
  const anchor = anchorOpsAssignDate(product)
  const today = new Date().toISOString().slice(0, 10)
  const { design: ds, listing: ls } = loadMergedStandards()

  let designOverdueDays = null
  let listingOverdueDays = null

  if (anchor) {
    const dDeadline = addCalendarDays(anchor, ds.standard)
    const designDone = product?.designStatus === '完成平面设计'
    const dc = String(product?.designCompletedTime ?? '').slice(0, 10)
    if (!designDone || !dc) {
      if (dDeadline && today > dDeadline) {
        const d = daysBetween(dDeadline, today)
        if (d != null && d > 0) designOverdueDays = d
      }
    } else if (dDeadline && dc > dDeadline) {
      const d = daysBetween(dDeadline, dc)
      if (d != null && d > 0) designOverdueDays = d
    }
  }

  if (anchor) {
    const lDeadline = addCalendarDays(anchor, ls.standard)
    const uploaded = product?.listingStatus === '已上传' && product?.listingUploadTime
    const lu = String(product?.listingUploadTime ?? '').slice(0, 10)
    if (!uploaded || !lu) {
      if (lDeadline && today > lDeadline) {
        const d = daysBetween(lDeadline, today)
        if (d != null && d > 0) listingOverdueDays = d
      }
    } else if (lDeadline && lu > lDeadline) {
      const d = daysBetween(lDeadline, lu)
      if (d != null && d > 0) listingOverdueDays = d
    }
  }

  return { designOverdueDays, listingOverdueDays }
}

export function hasFlatSlaOverdue(product) {
  const s = product?.flatSla ?? computeDesignListingFlatSla(product)
  return (s.designOverdueDays != null && s.designOverdueDays > 0) ||
    (s.listingOverdueDays != null && s.listingOverdueDays > 0)
}
