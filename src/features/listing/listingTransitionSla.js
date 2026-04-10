/**
 * 主时间轴连线时效：与 useListingConfig 节点间配置一致。
 * idx 5（供应商履约）、idx 8（头程运输）由三方预计日期 + 实际完成日对比，不在配置表维护标准天。
 */
import { daysBetween, getTransitionConfig } from '@/features/listing/useListingConfig.js'

const DERIVED_WARNING_DAYS = 3

function sliceDate(v) {
  if (v == null || v === '') return null
  const s = String(v).trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

function addCalendarDays(dateStr, n) {
  const base = sliceDate(dateStr)
  if (!base) return null
  const d = new Date(`${base}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + Number(n))
  return d.toISOString().slice(0, 10)
}

/**
 * 预计入库：优先积加/三方字段；否则 采购下单完成日 + 采购交期（天）。
 */
function resolveExpectedPurchaseInboundDate(product, poDoneDate) {
  const fromJiujia = sliceDate(product?.jiujiaEstPurchaseInboundAt)
  if (fromJiujia) return fromJiujia
  const lead = Number(product?.purchaseLeadTimeDays)
  const n = Number.isFinite(lead) && lead >= 0 ? Math.floor(lead) : 20
  return addCalendarDays(poDoneDate, n)
}

function resolveExpectedWarehouseArrivalDate(product) {
  return sliceDate(product?.jiujiaEstWarehouseArrivalAt)
}

/**
 * 基于「截止日 = 三方预计」的连线：超期 = 实际晚于预计，或在途时今日已超过预计。
 * @returns {{ standard: number, state: string, actual: number|null, overdueDays: number }|null}
 */
function calcDeadlineDrivenTransition(prevTl, currTl, expectedEndDate) {
  if (!prevTl?.done) return null
  const startTime = sliceDate(prevTl.time)
  const expected = sliceDate(expectedEndDate)
  if (!startTime || !expected) return null

  const standard = daysBetween(startTime, expected)
  if (standard == null || standard < 1) return null

  const now = new Date().toISOString().split('T')[0]
  const endTime = currTl.done ? sliceDate(currTl.time) : null

  /** @type {number|null} */
  let actual = null
  if (currTl.done && endTime) {
    const d = daysBetween(startTime, endTime)
    if (d !== null) actual = d
  }

  let state = 'pending'
  let overdueDays = 0

  if (currTl.done && endTime) {
    if (actual === null) return null
    if (endTime > expected) {
      state = 'overdue'
      const late = daysBetween(expected, endTime)
      overdueDays = late != null && late > 0 ? late : 0
    } else {
      state = 'done'
    }
  } else {
    const pastExpected = daysBetween(expected, now)
    if (pastExpected != null && pastExpected > 0) {
      state = 'overdue'
      overdueDays = pastExpected
    } else {
      const remaining = daysBetween(now, expected)
      if (remaining != null && remaining <= DERIVED_WARNING_DAYS) {
        state = 'warning'
      } else {
        state = 'active'
      }
    }
  }

  return {
    standard,
    state,
    actual,
    overdueDays: state === 'overdue' ? overdueDays : 0,
  }
}

/**
 * @param {object} prevTl
 * @param {object} currTl
 * @param {number} transIdx timeline 目标下标
 * @param {string} [_logisticsName]
 * @param {object} [_ctx]
 * @param {string} [category]
 * @param {object} [product] 含 timeline、jiujiaEst*、purchaseLeadTimeDays
 */
export function calcTransitionInfo(prevTl, currTl, transIdx, _logisticsName, _ctx, category, product) {
  if (transIdx === 5) {
    if (!product) return null
    const expected = resolveExpectedPurchaseInboundDate(product, sliceDate(prevTl.time))
    return calcDeadlineDrivenTransition(prevTl, currTl, expected)
  }
  if (transIdx === 8) {
    if (!product) return null
    const expected = resolveExpectedWarehouseArrivalDate(product)
    return calcDeadlineDrivenTransition(prevTl, currTl, expected)
  }

  if (!prevTl?.done) return null
  const cfg = getTransitionConfig(transIdx, category)
  if (!cfg) return null

  const { standard, warning } = cfg
  const startTime = prevTl.time?.slice(0, 10)
  const endTime = currTl.done ? currTl.time?.slice(0, 10) : null
  const now = new Date().toISOString().split('T')[0]

  const elapsedDays = daysBetween(startTime, currTl.done ? endTime : now)
  if (elapsedDays === null) return null

  /** @type {number|null} */
  let actual = null
  if (currTl.done && endTime) {
    const d = daysBetween(startTime, endTime)
    if (d !== null) actual = d
  }

  let state = 'pending'
  let overdueDays = 0

  if (currTl.done) {
    if (actual === null) return null
    state = actual > standard ? 'overdue' : 'done'
    if (state === 'overdue') overdueDays = actual - standard
  } else {
    const remaining = standard - elapsedDays
    if (remaining < 0) {
      state = 'overdue'
      overdueDays = elapsedDays - standard
    } else if (remaining <= warning) {
      state = 'warning'
    } else {
      state = 'active'
    }
  }

  return { standard, state, actual, overdueDays: state === 'overdue' ? overdueDays : 0 }
}
