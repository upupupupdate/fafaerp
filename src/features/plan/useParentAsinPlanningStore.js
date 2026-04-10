/**
 * 父体规划 — 本地 Mock + 持久化
 * 唯一：店铺 + 站点 + 父 ASIN
 * 后续可与商品管理 ASIN 主数据关联
 */
import { computed, ref, watch } from 'vue'
import {
  PARENT_PLAN_STATUS,
  getEffectiveDisplayStatus,
} from '@/features/plan/parentAsinPlanningDefs.js'

const LS_KEY = 'plan_parent_asin_planning_v1'

/** 当前登录用户（Mock，后续接鉴权） */
export const mockCurrentUser = ref({
  id: 'u-zhang',
  name: '张三',
  /** 用于「团队」视角：运营团队 / 开发团队 id 与此交集即视为本团队 */
  teamIds: ['team-ops-1', 'team-dev-a'],
  primaryTeamName: '运营一组',
})

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return seedRows()
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : seedRows()
  } catch {
    return seedRows()
  }
}

function seedRows() {
  const u = mockCurrentUser.value
  return [
    {
      id: 'pap-1',
      projectName: '夏季防晒线扩展',
      storeId: 'store-us-a',
      storeName: 'US旗舰店A',
      site: 'US',
      parentAsin: 'B08N5WRWNW',
      operatorId: u.id,
      operatorName: u.name,
      demandChildStyleCount: 5,
      demandNotes: '补充色与尺码矩阵，统一主图风格',
      followLogEnabled: true,
      createdAt: '2026-03-20 10:00:00',
      opsTeamId: 'team-ops-1',
      opsTeamName: '运营一组',
      devTeamIds: ['team-dev-a'],
      devTeamNames: ['开发一部'],
      devUserIds: ['u-li', 'u-wang'],
      devNames: ['李四', '王五'],
      planningDocUrl: 'https://example.com/doc/1',
      batchLogs: [
        {
          id: 'bl-1',
          content: '第一批 3 款已立项',
          completedAt: '2026-03-25',
          operatorName: '李四',
        },
      ],
      parentSuggestion: '建议优先团队-运营一组-本父体加款',
      status: PARENT_PLAN_STATUS.in_progress,
      dueDate: '2026-03-01',
      confirmedAt: '2026-03-21 09:00:00',
      creatorId: u.id,
      creatorName: u.name,
    },
    {
      id: 'pap-2',
      projectName: '节日礼盒父体延续',
      storeId: 'store-uk-b',
      storeName: 'UK店B',
      site: 'UK',
      parentAsin: 'B07FZ8S74R',
      operatorId: 'u-zhao',
      operatorName: '赵六',
      demandChildStyleCount: 8,
      demandNotes: '长尾承接，避免断货后权重流失',
      followLogEnabled: false,
      createdAt: '2026-03-28 14:30:00',
      opsTeamId: 'team-ops-2',
      opsTeamName: '运营二组',
      devTeamIds: ['team-dev-b'],
      devTeamNames: ['开发二部'],
      devUserIds: [],
      devNames: [],
      planningDocUrl: '',
      batchLogs: [],
      parentSuggestion: '',
      status: PARENT_PLAN_STATUS.pending_confirm,
      dueDate: '2026-05-01',
      confirmedAt: '',
      creatorId: 'u-zhao',
      creatorName: '赵六',
    },
    {
      id: 'pap-3',
      projectName: '清仓收尾 — 不再扩展',
      storeId: 'store-us-a',
      storeName: 'US旗舰店A',
      site: 'US',
      parentAsin: 'B09QXYZ123',
      operatorId: u.id,
      operatorName: u.name,
      demandChildStyleCount: 0,
      demandNotes: '业务取消',
      followLogEnabled: true,
      createdAt: '2026-02-01 11:00:00',
      opsTeamId: 'team-ops-1',
      opsTeamName: '运营一组',
      devTeamIds: ['team-dev-a'],
      devTeamNames: ['开发一部'],
      devUserIds: [u.id],
      devNames: [u.name],
      planningDocUrl: '',
      batchLogs: [],
      parentSuggestion: '',
      status: PARENT_PLAN_STATUS.cancelled,
      dueDate: '',
      confirmedAt: '',
      creatorId: u.id,
      creatorName: u.name,
    },
  ]
}

const rows = ref(load())

watch(
  rows,
  (v) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

function uniqKey(storeId, site, parentAsin) {
  return `${storeId}|${String(site).toUpperCase()}|${String(parentAsin).trim().toUpperCase()}`
}

/**
 * 与上架跟踪一致：批量精确 = 多行 OR；单关键词 = 当前字段模糊。
 * @param {{ searchField?: 'asin'|'projectName', searchKeyword?: string, searchBatchExact?: boolean }} q
 */
function matchesSearchCombo(row, q) {
  const raw = String(q.searchKeyword || '').trim()
  if (!raw) return true
  const field = q.searchField === 'projectName' ? 'projectName' : 'asin'
  if (q.searchBatchExact) {
    const tokens = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    if (tokens.length === 0) return true
    if (field === 'asin') {
      return tokens.some((tok) => (row.parentAsin || '').toUpperCase() === tok.toUpperCase())
    }
    return tokens.some((tok) => {
      const p = row.projectName || ''
      return p === tok || p.toLowerCase() === tok.toLowerCase()
    })
  }
  const kw = raw.toLowerCase()
  if (field === 'asin') {
    return (row.parentAsin || '').toLowerCase().includes(kw)
  }
  return (row.projectName || '').toLowerCase().includes(kw)
}

/**
 * @param {object[]} list
 * @param {{ site?: string, storeId?: string, operatorId?: string, devUserId?: string, searchField?: string, searchKeyword?: string, searchBatchExact?: boolean }} q
 */
function applyNonStatusFilters(list, q) {
  let out = list
  if (q.site) {
    const su = String(q.site).toUpperCase()
    out = out.filter((r) => String(r.site || '').toUpperCase() === su)
  }
  if (q.storeId) {
    out = out.filter((r) => r.storeId === q.storeId)
  }
  if (q.operatorId) {
    out = out.filter((r) => r.operatorId === q.operatorId)
  }
  if (q.devUserId) {
    out = out.filter(
      (r) => Array.isArray(r.devUserIds) && r.devUserIds.includes(q.devUserId),
    )
  }
  if (q.searchKeyword && String(q.searchKeyword).trim()) {
    out = out.filter((r) => matchesSearchCombo(r, q))
  }
  return out
}

export function useParentAsinPlanningStore() {
  const currentUser = mockCurrentUser

  const storeOptions = computed(() => {
    const m = new Map()
    for (const r of rows.value) {
      if (r.storeId && r.storeName) m.set(r.storeId, r.storeName)
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }))
  })

  function isMine(row) {
    const u = currentUser.value
    if (!row || !u) return false
    if (row.creatorId === u.id) return true
    if (row.operatorId === u.id) return true
    if (Array.isArray(row.devUserIds) && row.devUserIds.includes(u.id)) return true
    return false
  }

  function isMyTeam(row) {
    const u = currentUser.value
    if (!row || !u?.teamIds?.length) return false
    const teams = new Set(u.teamIds)
    if (teams.has(row.opsTeamId)) return true
    if (Array.isArray(row.devTeamIds) && row.devTeamIds.some((t) => teams.has(t))) return true
    return false
  }

  /**
   * @param {{ site?: string, storeId?: string, operatorId?: string, devUserId?: string, searchField?: string, searchKeyword?: string, searchBatchExact?: boolean, statusFilter?: string }} q
   */
  function filterRows(q) {
    const query = q || {}
    let list = applyNonStatusFilters(rows.value.slice(), query)

    if (query.statusFilter) {
      list = list.filter((r) => getEffectiveDisplayStatus(r) === query.statusFilter)
    }

    return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }

  function findDuplicate(storeId, site, parentAsin, excludeId) {
    const key = uniqKey(storeId, site, parentAsin)
    return rows.value.find(
      (r) => r.id !== excludeId && uniqKey(r.storeId, r.site, r.parentAsin) === key,
    )
  }

  /**
   * 批量新建：每行一条完整规划（与 add 字段一致）
   * @param {object[]} batchRows 已展开 storeName / opsTeamName / devTeamNames / devNames 等
   * @returns {{ ok: boolean, created: number, failures: Array<{ index: number, message: string }> }}
   */
  function addBatch(batchRows) {
    if (!Array.isArray(batchRows) || batchRows.length === 0) {
      return { ok: false, created: 0, failures: [{ index: -1, message: '请至少添加一行规划父体' }] }
    }
    const u = currentUser.value
    const failures = []
    const seen = new Set()
    const valid = []
    for (let i = 0; i < batchRows.length; i++) {
      const t = batchRows[i]
      const storeId = t.storeId
      const site = String(t.site || 'US').toUpperCase()
      const parentAsin = String(t.parentAsin || '').trim().toUpperCase()
      if (!storeId || !parentAsin) {
        failures.push({ index: i, message: '店铺、父 ASIN 不能为空' })
        continue
      }
      const key = uniqKey(storeId, site, parentAsin)
      if (seen.has(key)) {
        failures.push({ index: i, message: '批量内存在重复（店铺+站点+父 ASIN）' })
        continue
      }
      seen.add(key)
      if (findDuplicate(storeId, site, parentAsin, '')) {
        failures.push({ index: i, message: '同一店铺、站点、父 ASIN 已存在规划记录' })
        continue
      }
      valid.push(t)
    }

    let n = 0
    const ts = Date.now()
    for (let j = 0; j < valid.length; j++) {
      const t = valid[j]
      const id = `pap-${ts}-${j}-${Math.random().toString(36).slice(2, 7)}`
      rows.value.unshift({
        id,
        projectName: t.projectName || '',
        storeId: t.storeId,
        storeName: t.storeName || '',
        site: String(t.site || 'US').toUpperCase(),
        parentAsin: String(t.parentAsin || '').trim().toUpperCase(),
        operatorId: t.operatorId || u.id,
        operatorName: t.operatorName || u.name,
        demandChildStyleCount: Number(t.demandChildStyleCount) || 0,
        demandNotes: t.demandNotes ?? '',
        followLogEnabled: false,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        opsTeamId: t.opsTeamId || '',
        opsTeamName: t.opsTeamName || '',
        devTeamIds: Array.isArray(t.devTeamIds) ? [...t.devTeamIds] : [],
        devTeamNames: Array.isArray(t.devTeamNames) ? [...t.devTeamNames] : [],
        devUserIds: Array.isArray(t.devUserIds) ? [...t.devUserIds] : [],
        devNames: Array.isArray(t.devNames) ? [...t.devNames] : [],
        planningDocUrl: '',
        batchLogs: [],
        parentSuggestion: t.parentSuggestion ?? '',
        status: PARENT_PLAN_STATUS.pending_confirm,
        dueDate: t.dueDate || '',
        confirmedAt: '',
        creatorId: u.id,
        creatorName: u.name,
      })
      n++
    }

    return { ok: n > 0, created: n, failures }
  }

  function add(payload) {
    const dup = findDuplicate(payload.storeId, payload.site, payload.parentAsin, '')
    if (dup) {
      return { ok: false, message: '同一店铺、站点、父 ASIN 已存在规划记录' }
    }
    const u = currentUser.value
    const id = `pap-${Date.now()}`
    rows.value.unshift({
      id,
      projectName: payload.projectName || '',
      storeId: payload.storeId,
      storeName: payload.storeName || '',
      site: String(payload.site || 'US').toUpperCase(),
      parentAsin: String(payload.parentAsin || '').trim().toUpperCase(),
      operatorId: payload.operatorId || u.id,
      operatorName: payload.operatorName || u.name,
      demandChildStyleCount: Number(payload.demandChildStyleCount) || 0,
      demandNotes: payload.demandNotes ?? '',
      followLogEnabled: false,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      opsTeamId: payload.opsTeamId || '',
      opsTeamName: payload.opsTeamName || '',
      devTeamIds: Array.isArray(payload.devTeamIds) ? [...payload.devTeamIds] : [],
      devTeamNames: Array.isArray(payload.devTeamNames) ? [...payload.devTeamNames] : [],
      devUserIds: Array.isArray(payload.devUserIds) ? [...payload.devUserIds] : [],
      devNames: Array.isArray(payload.devNames) ? [...payload.devNames] : [],
      planningDocUrl: payload.planningDocUrl || '',
      batchLogs: Array.isArray(payload.batchLogs) ? [...payload.batchLogs] : [],
      parentSuggestion: payload.parentSuggestion ?? '',
      status: PARENT_PLAN_STATUS.pending_confirm,
      dueDate: payload.dueDate || '',
      confirmedAt: '',
      creatorId: u.id,
      creatorName: u.name,
    })
    return { ok: true }
  }

  function update(id, patch) {
    const idx = rows.value.findIndex((r) => r.id === id)
    if (idx < 0) return { ok: false, message: '记录不存在' }
    const next = { ...rows.value[idx], ...patch }
    if (patch.storeId != null || patch.site != null || patch.parentAsin != null) {
      const dup = findDuplicate(next.storeId, next.site, next.parentAsin, id)
      if (dup) return { ok: false, message: '同一店铺、站点、父 ASIN 已存在规划记录' }
    }
    rows.value[idx] = next
    return { ok: true }
  }

  /** 待确认 → 进行中（需业务确认） */
  function confirm(id) {
    const idx = rows.value.findIndex((r) => r.id === id)
    if (idx < 0) return { ok: false, message: '记录不存在' }
    const r = rows.value[idx]
    if (r.status !== PARENT_PLAN_STATUS.pending_confirm) {
      return { ok: false, message: '仅「待确认」可操作确认' }
    }
    rows.value[idx] = {
      ...r,
      status: PARENT_PLAN_STATUS.in_progress,
      confirmedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    return { ok: true }
  }

  function setCancelled(id) {
    return update(id, { status: PARENT_PLAN_STATUS.cancelled })
  }

  function setDone(id) {
    return update(id, { status: PARENT_PLAN_STATUS.done })
  }

  function appendBatchLog(id, { content, completedAt, operatorName }) {
    const idx = rows.value.findIndex((r) => r.id === id)
    if (idx < 0) return { ok: false, message: '记录不存在' }
    const r = rows.value[idx]
    const log = {
      id: `bl-${Date.now()}`,
      content: String(content || '').trim(),
      completedAt: completedAt || '',
      operatorName: operatorName || currentUser.value.name,
    }
    if (!log.content) return { ok: false, message: '请填写批次说明' }
    rows.value[idx] = {
      ...r,
      batchLogs: [...(r.batchLogs || []), log],
    }
    return { ok: true }
  }

  return {
    rows,
    currentUser,
    storeOptions,
    filterRows,
    /** 当前筛选（不含左侧状态），用于侧栏各状态数量 */
    filterRowsExcludingStatus(q) {
      return applyNonStatusFilters(rows.value.slice(), q || {})
    },
    findDuplicate,
    add,
    addBatch,
    update,
    confirm,
    setCancelled,
    setDone,
    appendBatchLog,
    isMine,
    isMyTeam,
    uniqKey,
  }
}
