import { daysBetween } from '@/features/listing/useListingConfig.js'
import { NPD_APPAREL_NODES, NPD_TIMELINE_NODE_COUNT } from '@/features/product/npdApparelDefs.js'

function _addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function _dt(date, h, m, s) {
  return `${date} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * workflowPhase → 时间轴当前节点下标 upToIdx（已完成节点为 idx < upToIdx）
 * completed：upToIdx=5 使 5 个节点全部 done；rejected 卡在待审核；void 卡在草稿箱
 */
export function workflowPhaseToTimelineUpIdx(phase) {
  switch (phase) {
    case 'draft':
      return 0
    case 'pending_review':
      return 1
    case 'pending_style':
      return 2
    case 'sampling':
      return 3
    case 'completed':
      return NPD_TIMELINE_NODE_COUNT + 1
    case 'rejected':
      return 1
    case 'void':
      return 0
    default:
      return 0
  }
}

/**
 * @param {string} baseDate YYYY-MM-DD
 * @param {string} workflowPhase 新品开发状态
 * @param {number} id 行序号（演示用人名/随机）
 */
export function buildNpdApparelTimeline(baseDate, workflowPhase, id = 0) {
  const upToIdx = workflowPhaseToTimelineUpIdx(workflowPhase)
  const devs = ['张开发', '李开发', '王开发', '赵开发']
  const crafts = ['钱工艺', '孙工艺', '周工艺']
  const patterns = ['吴版师', '郑版师', '冯版师']
  const persons = [devs, devs, devs, crafts, patterns]

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
      const overdue = id % 9 === 0 && idx > 0 && idx < NPD_TIMELINE_NODE_COUNT - 1
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

/** 与上架跟踪类似的环节时效（5 节点 → 4 段过渡） */
export function calcNpdTransitionInfo(prevTl, currTl, transIdx) {
  if (!prevTl?.done) return null
  const standard = [3, 5, 7, 10][transIdx - 1] ?? 5
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

/**
 * 按 workflowPhase 重建时间轴（用于持久化行升级、patch 状态后）
 */
export function rebuildNpdRowTimeline(row) {
  const idNum = Number(String(row.id ?? '').replace(/\D/g, '')) || 0
  let baseDate = new Date().toISOString().slice(0, 10)
  const firstDone = row.timeline?.find((t) => t.done && t.time)
  if (firstDone?.time) baseDate = firstDone.time.slice(0, 10)
  else if (row.dueDate) baseDate = String(row.dueDate).slice(0, 10)

  const phase = row.workflowPhase || 'draft'
  const timeline = buildNpdApparelTimeline(baseDate, phase, idNum)
  const transitionInfos = attachNpdTransitionInfos(timeline)
  return { ...row, timeline, transitionInfos }
}
