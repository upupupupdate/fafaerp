/**
 * 服装新品开发 — 列表本地持久化，与样板管理联动
 */
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  genNpdApparelMockList,
  NPD_WORKFLOW_LABELS,
  createDraftNpdRow,
  nextNpdSeqFromRows,
} from '@/features/product/npdApparelMock.js'
import { rebuildNpdRowTimeline } from '@/features/product/npdApparelTimeline.js'
import { NPD_TIMELINE_NODE_COUNT } from '@/features/product/npdApparelDefs.js'
import { mergeNpdApparelRow } from '@/features/product/npdApparelRowFields.js'
import { useSampleManagementStore } from '@/features/product/useSampleManagementStore.js'
import { getSeedNpdRowsForSampleBoard } from '@/features/product/sampleBoardSeedData.js'

const LS_KEY = 'npd_apparel_rows_v1'

function needsTimelineRebuild(r) {
  if (!r?.timeline?.length) return true
  if (r.timeline.length !== NPD_TIMELINE_NODE_COUNT) return true
  if (r.timeline[0]?.key !== 'draft') return true
  return false
}

function normalizeLoadedRows(raw) {
  if (!Array.isArray(raw) || !raw.length) return null
  return raw.map((r) => {
    const merged = mergeNpdApparelRow(r)
    if (!merged.workflowPhase || needsTimelineRebuild(merged)) {
      return rebuildNpdRowTimeline(merged)
    }
    return merged
  })
}

function mergeSeedNpdRowsIfMissing(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows
  const ids = new Set(rows.map((r) => r.id))
  const seeds = getSeedNpdRowsForSampleBoard()
  const missing = seeds.filter((s) => !ids.has(s.id))
  if (!missing.length) return rows
  return [...missing, ...rows]
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      const n = normalizeLoadedRows(p)
      if (n?.length) return mergeSeedNpdRowsIfMissing(n)
    }
  } catch {
    /* ignore */
  }
  return mergeSeedNpdRowsIfMissing(genNpdApparelMockList(14))
}

const rows = ref(loadInitial())

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

let _singleton = null

export function useNpdApparelStore() {
  if (_singleton) return _singleton

  function addDraftRow() {
    const seq = nextNpdSeqFromRows(rows.value)
    const row = createDraftNpdRow(seq)
    rows.value = [row, ...rows.value]
    return row.id
  }

  function patchRow(id, partial) {
    const i = rows.value.findIndex((r) => r.id === id)
    if (i === -1) return false
    let merged = mergeNpdApparelRow({ ...rows.value[i], ...partial })
    if (partial.workflowPhase != null) {
      merged.workflowLabel = NPD_WORKFLOW_LABELS[partial.workflowPhase] ?? merged.workflowLabel
      merged = rebuildNpdRowTimeline(merged)
    }
    const next = [...rows.value]
    next[i] = merged
    rows.value = next
    return true
  }

  function submitStyleOpening(id) {
    const row = rows.value.find((r) => r.id === id)
    if (!row) {
      ElMessage.warning('记录不存在')
      return false
    }
    if (row.workflowPhase !== 'pending_style') {
      ElMessage.warning('仅「待开款」状态可提交开款')
      return false
    }
    if (!row.fabricCardId || !row.sizeChartId) {
      ElMessage.warning('请为该行维护面料色卡与尺码表后再提交开款（可在编辑抽屉中维护）')
      return false
    }
    const openDate = new Date().toISOString().slice(0, 10)
    const sampleStore = useSampleManagementStore()
    const ok = sampleStore.upsertFromNpd({ ...row, openDate })
    if (!ok) {
      ElMessage.warning('请确认色卡已维护颜色、尺码表已维护尺码，且引用正确')
      return false
    }
    patchRow(id, {
      workflowPhase: 'sampling',
      openDate,
    })
    ElMessage.success('已提交开款，样板管理已同步')
    return true
  }

  function backToPendingStyleForRevision(npdId) {
    patchRow(npdId, { workflowPhase: 'pending_style' })
  }

  _singleton = {
    rows,
    addDraftRow,
    patchRow,
    submitStyleOpening,
    backToPendingStyleForRevision,
    NPD_WORKFLOW_LABELS,
  }
  return _singleton
}
