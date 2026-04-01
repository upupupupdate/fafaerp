import { daysBetween } from '@/features/listing/useListingConfig.js'
import { NPD_APPAREL_NODES } from '@/features/product/npdApparelDefs.js'

function _addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function _dt(date, h, m, s) {
  return `${date} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * @param {string} baseDate YYYY-MM-DD
 * @param {number} upToIdx 当前进行中的节点下标（0..7）；已完成节点为 < upToIdx
 */
export function buildNpdApparelTimeline(baseDate, upToIdx, id = 0) {
  const devs = ['张开发', '李开发', '王开发', '赵开发']
  const crafts = ['钱工艺', '孙工艺', '周工艺']
  const patterns = ['吴版师', '郑版师', '冯版师']
  const persons = [devs, devs, patterns, devs, patterns, crafts, devs, devs]

  return NPD_APPAREL_NODES.map(({ key }, idx) => {
    if (idx < upToIdx) {
      const d = _addDays(baseDate, idx * 2 + 1 + (id % 4))
      const h = 9 + (idx * 2 + id) % 8
      const m = (idx * 11 + id * 5) % 60
      const s = (idx * 3 + id) % 60
      const time = idx === NPD_APPAREL_NODES.length - 1 ? d : _dt(d, h, m, s)
      const arr = persons[idx]
      const person = arr[id % arr.length]
      return { key, done: true, time, person }
    }
    if (idx === upToIdx) {
      const overdue = id % 9 === 0 && idx > 0 && idx < 7
      return {
        key,
        done: false,
        overdue,
        ...(idx === NPD_APPAREL_NODES.length - 1 ? { estimatedTime: _addDays(baseDate, 60) } : {}),
      }
    }
    return { key, done: false }
  })
}

/** 与上架跟踪类似的环节时效展示（固定标准天数，无物流差异） */
export function calcNpdTransitionInfo(prevTl, currTl, transIdx) {
  if (!prevTl?.done) return null
  const standard = [3, 5, 7, 10, 7, 5, 5][transIdx - 1] ?? 5
  const warning = 2

  const startTime = prevTl.time?.slice(0, 10)
  const endTime = currTl.done ? currTl.time?.slice(0, 10) : null
  const now = new Date().toISOString().split('T')[0]

  const elapsedDays = daysBetween(startTime, currTl.done ? endTime : now)
  if (elapsedDays === null) return null

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

export function attachNpdTransitionInfos(timeline) {
  return timeline.map((tl, idx) =>
    idx === 0 ? null : calcNpdTransitionInfo(timeline[idx - 1], tl, idx),
  )
}
