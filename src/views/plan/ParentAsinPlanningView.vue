<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Link,
  Clock,
  WarningFilled,
  CircleClose,
  SuccessFilled,
  QuestionFilled,
  Menu,
  Delete,
} from '@element-plus/icons-vue'
import { useParentAsinPlanningStore } from '@/features/plan/useParentAsinPlanningStore.js'
import ParentPlanSearchCombo from '@/features/plan/components/ParentPlanSearchCombo.vue'
import {
  AMAZON_SITE_OPTIONS,
  PARENT_PLAN_STATUS,
  STATUS_LABEL,
  STATUS_TAG_TYPE,
  amazonParentUrl,
  getEffectiveDisplayStatus,
} from '@/features/plan/parentAsinPlanningDefs.js'

const papStore = useParentAsinPlanningStore()

/** 列表筛选区：站点（仅四站） */
const FILTER_SITE_OPTIONS = [
  { value: 'US', label: 'US' },
  { value: 'UK', label: 'UK' },
  { value: 'CA', label: 'CA' },
  { value: 'DE', label: 'DE' },
]

const filters = reactive({
  site: '',
  storeId: '',
  operatorId: '',
  devUserId: '',
  searchField: 'asin',
  searchKeyword: '',
  searchBatchExact: false,
})

/** 空字符串 = 全部状态 */
const statusFilter = ref('')

const MOCK_STORES = [
  { id: 'store-us-a', name: 'US旗舰店A' },
  { id: 'store-uk-b', name: 'UK店B' },
  { id: 'store-de-c', name: 'DE店C' },
]

const MOCK_TEAMS_OPS = [
  { id: 'team-ops-1', name: '运营一组' },
  { id: 'team-ops-2', name: '运营二组' },
]

const MOCK_TEAMS_DEV = [
  { id: 'team-dev-a', name: '开发一部' },
  { id: 'team-dev-b', name: '开发二部' },
]

const MOCK_USERS = [
  { id: 'u-zhang', name: '张三' },
  { id: 'u-li', name: '李四' },
  { id: 'u-wang', name: '王五' },
  { id: 'u-zhao', name: '赵六' },
]

const SIDEBAR_STATUS_ITEMS = [
  { key: '', label: '全部', icon: Menu },
  { key: 'pending_confirm', label: STATUS_LABEL.pending_confirm, icon: QuestionFilled },
  { key: 'in_progress', label: STATUS_LABEL.in_progress, icon: Clock },
  { key: 'overdue', label: STATUS_LABEL.overdue, icon: WarningFilled },
  { key: 'cancelled', label: STATUS_LABEL.cancelled, icon: CircleClose },
  { key: 'done', label: STATUS_LABEL.done, icon: SuccessFilled },
]

const queryForList = computed(() => ({
  site: filters.site,
  storeId: filters.storeId,
  operatorId: filters.operatorId,
  devUserId: filters.devUserId,
  searchField: filters.searchField,
  searchKeyword: filters.searchKeyword,
  searchBatchExact: filters.searchBatchExact,
  statusFilter: statusFilter.value || undefined,
}))

const filtered = computed(() => papStore.filterRows(queryForList.value))

/** 与侧栏计数：同一套筛选，不含状态 */
const baseForStatusCounts = computed(() =>
  papStore.filterRowsExcludingStatus({
    site: filters.site,
    storeId: filters.storeId,
    operatorId: filters.operatorId,
    devUserId: filters.devUserId,
    searchField: filters.searchField,
    searchKeyword: filters.searchKeyword,
    searchBatchExact: filters.searchBatchExact,
  }),
)

const statusCounts = computed(() => {
  const c = {
    '': 0,
    pending_confirm: 0,
    in_progress: 0,
    overdue: 0,
    cancelled: 0,
    done: 0,
  }
  for (const r of baseForStatusCounts.value) {
    c['']++
    const d = getEffectiveDisplayStatus(r)
    c[d]++
  }
  return c
})

function countForKey(key) {
  return statusCounts.value[key === '' ? '' : key] ?? 0
}

function setStatusFilter(key) {
  statusFilter.value = key
}

function resetFilters() {
  filters.site = ''
  filters.storeId = ''
  filters.operatorId = ''
  filters.devUserId = ''
  filters.searchField = 'asin'
  filters.searchKeyword = ''
  filters.searchBatchExact = false
}

const batchVisible = ref(false)
const editVisible = ref(false)
const editingId = ref('')

function emptyTargetRow() {
  const u = papStore.currentUser.value
  return {
    projectName: '',
    storeId: MOCK_STORES[0]?.id || '',
    site: 'US',
    parentAsin: '',
    opsTeamId: MOCK_TEAMS_OPS[0]?.id || '',
    operatorId: u?.id || '',
    demandChildStyleCount: 0,
    demandNotes: '',
    devTeamIds: [],
    devUserIds: [],
    parentSuggestion: '',
    dueDate: '',
  }
}

const targetRows = ref([emptyTargetRow()])

const form = reactive({
  projectName: '',
  storeId: '',
  site: 'US',
  parentAsin: '',
  operatorId: '',
  demandChildStyleCount: 0,
  demandNotes: '',
  opsTeamId: '',
  devTeamIds: [],
  devUserIds: [],
  parentSuggestion: '',
  dueDate: '',
})

const newBatchLog = reactive({
  content: '',
  completedAt: '',
})

function openBatchCreate() {
  targetRows.value = [emptyTargetRow()]
  batchVisible.value = true
}

function addTargetRow() {
  targetRows.value.push(emptyTargetRow())
}

function removeTargetRow(index) {
  if (targetRows.value.length <= 1) {
    ElMessage.warning('至少保留一行')
    return
  }
  targetRows.value.splice(index, 1)
}

function storeNameById(id) {
  return MOCK_STORES.find((s) => s.id === id)?.name || id
}

function teamNamesByIds(ids, list) {
  if (!Array.isArray(ids)) return []
  return ids.map((id) => list.find((t) => t.id === id)?.name || id)
}

function rowToBatchPayload(row) {
  const storeId = row.storeId
  const site = String(row.site || 'US').toUpperCase()
  const parentAsin = String(row.parentAsin || '').trim().toUpperCase()
  const name = (row.projectName || '').trim()
  return {
    projectName: name || parentAsin,
    storeId,
    storeName: storeNameById(storeId),
    site,
    parentAsin,
    operatorId: row.operatorId,
    operatorName: MOCK_USERS.find((u) => u.id === row.operatorId)?.name || '',
    demandChildStyleCount: row.demandChildStyleCount,
    demandNotes: row.demandNotes ?? '',
    opsTeamId: row.opsTeamId,
    opsTeamName: MOCK_TEAMS_OPS.find((t) => t.id === row.opsTeamId)?.name || '',
    devTeamIds: [...(row.devTeamIds || [])],
    devTeamNames: teamNamesByIds(row.devTeamIds || [], MOCK_TEAMS_DEV),
    devUserIds: [...(row.devUserIds || [])],
    devNames: (row.devUserIds || []).map((id) => MOCK_USERS.find((u) => u.id === id)?.name || id),
    parentSuggestion: (row.parentSuggestion || '').trim(),
    dueDate: row.dueDate || '',
  }
}

function submitBatch() {
  const payloads = targetRows.value.map((row) => rowToBatchPayload(row))
  const res = papStore.addBatch(payloads)
  if (res.created === 0) {
    const msg = res.failures.map((f) => `第 ${f.index + 1} 行：${f.message}`).join('；')
    ElMessage.error(msg || '未创建任何记录')
    return
  }
  if (res.failures.length) {
    const msg = res.failures.map((f) => `第 ${f.index + 1} 行：${f.message}`).join('；')
    ElMessage.warning(`已创建 ${res.created} 条；${msg}`)
  } else {
    ElMessage.success(`已创建 ${res.created} 条规划，状态为「待确认」`)
  }
  batchVisible.value = false
}

function openEdit(row) {
  editingId.value = row.id
  form.projectName = row.projectName || ''
  form.storeId = row.storeId || ''
  form.site = row.site || 'US'
  form.parentAsin = row.parentAsin || ''
  form.operatorId = row.operatorId || ''
  form.demandChildStyleCount = row.demandChildStyleCount ?? 0
  form.demandNotes = row.demandNotes || ''
  form.opsTeamId = row.opsTeamId || ''
  form.devTeamIds = [...(row.devTeamIds || [])]
  form.devUserIds = [...(row.devUserIds || [])]
  form.parentSuggestion = row.parentSuggestion || ''
  form.dueDate = row.dueDate ? row.dueDate.slice(0, 10) : ''
  newBatchLog.content = ''
  newBatchLog.completedAt = ''
  editVisible.value = true
}

async function submitEdit() {
  if (!form.projectName?.trim()) {
    ElMessage.warning('请填写项目名称')
    return
  }
  if (!form.storeId) {
    ElMessage.warning('请选择店铺')
    return
  }
  if (!form.parentAsin?.trim()) {
    ElMessage.warning('请填写父 ASIN')
    return
  }

  const payload = {
    projectName: form.projectName.trim(),
    storeId: form.storeId,
    storeName: storeNameById(form.storeId),
    site: form.site,
    parentAsin: form.parentAsin.trim().toUpperCase(),
    operatorId: form.operatorId,
    operatorName: MOCK_USERS.find((u) => u.id === form.operatorId)?.name || '',
    demandChildStyleCount: form.demandChildStyleCount,
    demandNotes: form.demandNotes,
    opsTeamId: form.opsTeamId,
    opsTeamName: MOCK_TEAMS_OPS.find((t) => t.id === form.opsTeamId)?.name || '',
    devTeamIds: [...form.devTeamIds],
    devTeamNames: teamNamesByIds(form.devTeamIds, MOCK_TEAMS_DEV),
    devUserIds: [...form.devUserIds],
    devNames: form.devUserIds.map((id) => MOCK_USERS.find((u) => u.id === id)?.name || id),
    parentSuggestion: form.parentSuggestion?.trim() || '',
    dueDate: form.dueDate || '',
  }

  const res = papStore.update(editingId.value, payload)
  if (!res.ok) {
    ElMessage.error(res.message)
    return
  }
  ElMessage.success('已保存')
  editVisible.value = false
}

const editingRow = computed(() => papStore.rows.value.find((r) => r.id === editingId.value))

async function onConfirm(row) {
  try {
    await ElMessageBox.confirm(
      '确认后进入「进行中」，表示运营与开发已对齐本父体规划；后续可与商品管理关联。',
      '确认规划',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const res = papStore.confirm(row.id)
  if (!res.ok) {
    ElMessage.error(res.message)
    return
  }
  ElMessage.success('已确认，状态为「进行中」')
}

async function onCancel(row) {
  try {
    await ElMessageBox.confirm('标记为「取消不做」后可通过编辑保留记录。是否继续？', '取消不做', {
      type: 'warning',
    })
  } catch {
    return
  }
  const res = papStore.setCancelled(row.id)
  if (!res.ok) {
    ElMessage.error(res.message)
    return
  }
  ElMessage.success('已标记为取消不做')
}

async function onDone(row) {
  try {
    await ElMessageBox.confirm('确认本父体规划已完结？', '已完成', { type: 'success' })
  } catch {
    return
  }
  const res = papStore.setDone(row.id)
  if (!res.ok) {
    ElMessage.error(res.message)
    return
  }
  ElMessage.success('已标记为已完成')
}

function addBatchLog() {
  if (!editingId.value) return
  const res = papStore.appendBatchLog(editingId.value, {
    content: newBatchLog.content,
    completedAt: newBatchLog.completedAt || new Date().toISOString().slice(0, 10),
    operatorName: papStore.currentUser.value.name,
  })
  if (!res.ok) {
    ElMessage.warning(res.message)
    return
  }
  newBatchLog.content = ''
  newBatchLog.completedAt = ''
  ElMessage.success('已追加批次日志')
}

function displayStatus(row) {
  return getEffectiveDisplayStatus(row)
}

function canConfirm(row) {
  return row.status === PARENT_PLAN_STATUS.pending_confirm
}

function canDoneOrCancel(row) {
  const d = displayStatus(row)
  return d === 'in_progress' || d === 'overdue'
}

watch(editVisible, (v) => {
  if (!v) editingId.value = ''
})
</script>

<template>
  <div class="pap-page">
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>计划</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">父体规划</span>
      </div>
    </header>

    <!-- 筛选查询区 -->
    <div class="pap-filter-toolbar">
      <el-select
        v-model="filters.site"
        placeholder="站点"
        clearable
        style="width: 100px"
        size="default"
      >
        <el-option
          v-for="s in FILTER_SITE_OPTIONS"
          :key="s.value"
          :label="s.label"
          :value="s.value"
        />
      </el-select>
      <el-select
        v-model="filters.storeId"
        placeholder="店铺"
        clearable
        style="width: 150px"
        size="default"
      >
        <el-option v-for="s in MOCK_STORES" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <el-select
        v-model="filters.operatorId"
        placeholder="运营"
        clearable
        filterable
        style="width: 120px"
        size="default"
      >
        <el-option v-for="u in MOCK_USERS" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
      <el-select
        v-model="filters.devUserId"
        placeholder="开发"
        clearable
        filterable
        style="width: 120px"
        size="default"
      >
        <el-option v-for="u in MOCK_USERS" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
      <ParentPlanSearchCombo
        v-model:search-field="filters.searchField"
        v-model:search-keyword="filters.searchKeyword"
        v-model:search-batch-exact="filters.searchBatchExact"
      />
      <el-button size="default" @click="resetFilters">重置筛选</el-button>
    </div>

    <div class="pap-body">
      <aside class="pap-aside">
        <div class="pap-aside-title">状态</div>
        <ul class="pap-status-list">
          <li
            v-for="item in SIDEBAR_STATUS_ITEMS"
            :key="item.key || 'all'"
            class="pap-status-item"
            :class="{ active: statusFilter === item.key }"
            @click="setStatusFilter(item.key)"
          >
            <el-icon class="pap-status-ic" :class="`ic-${item.key || 'all'}`">
              <component :is="item.icon" />
            </el-icon>
            <span class="pap-status-label">{{ item.label }}</span>
            <span class="pap-status-num">{{ countForKey(item.key) }}</span>
          </li>
        </ul>
      </aside>

      <div class="pap-main">
        <div class="pap-list-actions">
          <el-button type="primary" :icon="Plus" @click="openBatchCreate">新建规划</el-button>
        </div>
        <div class="pap-table-scroll">
          <el-table :data="filtered" border stripe size="small" class="pap-table" empty-text="暂无数据">
            <el-table-column prop="projectName" label="项目名称" min-width="140" show-overflow-tooltip />
            <el-table-column label="店铺" width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.storeName || row.storeId }}</template>
            </el-table-column>
            <el-table-column prop="site" label="站点" width="72" align="center" />
            <el-table-column label="父 ASIN" width="130">
              <template #default="{ row }">
                <a
                  v-if="amazonParentUrl(row.site, row.parentAsin)"
                  class="pap-asin-link"
                  :href="amazonParentUrl(row.site, row.parentAsin)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <el-icon class="pap-link-ic"><Link /></el-icon>
                  {{ row.parentAsin }}
                </a>
                <span v-else>{{ row.parentAsin || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="需求款数" width="88" align="right" header-align="right">
              <template #default="{ row }">{{ row.demandChildStyleCount ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="需求方向" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.demandNotes || '—' }}</template>
            </el-table-column>
            <el-table-column label="父体建议" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.parentSuggestion || '—' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="STATUS_TAG_TYPE[displayStatus(row)]" size="small">
                  {{ STATUS_LABEL[displayStatus(row)] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operatorName" label="运营" width="88" show-overflow-tooltip />
            <el-table-column prop="opsTeamName" label="运营团队" min-width="100" show-overflow-tooltip />
            <el-table-column label="开发团队" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                {{ (row.devTeamNames || []).join('、') || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="开发" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                {{ (row.devNames || []).join('、') || '—' }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="发起时间" width="150" />
            <el-table-column label="期望完成" width="110" align="center">
              <template #default="{ row }">{{ row.dueDate || '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button
                  v-if="canConfirm(row)"
                  link
                  type="warning"
                  size="small"
                  @click="onConfirm(row)"
                >
                  确认
                </el-button>
                <el-button
                  v-if="canDoneOrCancel(row)"
                  link
                  type="success"
                  size="small"
                  @click="onDone(row)"
                >
                  完成
                </el-button>
                <el-button
                  v-if="canDoneOrCancel(row)"
                  link
                  type="info"
                  size="small"
                  @click="onCancel(row)"
                >
                  取消不做
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 批量新建：每行一条完整规划，可横向滚动 -->
    <el-dialog
      v-model="batchVisible"
      title="新建父体规划"
      width="min(1680px, 98vw)"
      destroy-on-close
      align-center
      class="pap-dialog pap-batch-dialog"
    >
      <p class="pap-batch-hint">
        每行录完一条规划（店铺 + 站点 + 父 ASIN 唯一）；项目名称可空，提交时默认用父 ASIN。可添加多行后批量创建。
      </p>
      <div class="pap-batch-scroll">
        <el-table :data="targetRows" border size="small" class="pap-batch-table">
          <el-table-column label="项目名称" min-width="120" fixed>
            <template #default="{ row }">
              <el-input v-model="row.projectName" placeholder="可选" maxlength="128" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="店铺" min-width="130">
            <template #default="{ row }">
              <el-select v-model="row.storeId" placeholder="店铺" size="small" style="width: 100%">
                <el-option v-for="s in MOCK_STORES" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="站点" width="108">
            <template #default="{ row }">
              <el-select v-model="row.site" size="small" style="width: 100%">
                <el-option
                  v-for="s in AMAZON_SITE_OPTIONS"
                  :key="s.value"
                  :label="s.label"
                  :value="s.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="父 ASIN" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.parentAsin" placeholder="父体 ASIN" maxlength="32" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="运营团队" min-width="120">
            <template #default="{ row }">
              <el-select v-model="row.opsTeamId" size="small" style="width: 100%">
                <el-option v-for="t in MOCK_TEAMS_OPS" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="运营" min-width="100">
            <template #default="{ row }">
              <el-select v-model="row.operatorId" placeholder="负责人" size="small" style="width: 100%">
                <el-option v-for="u in MOCK_USERS" :key="u.id" :label="u.name" :value="u.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="需求款数" width="112" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.demandChildStyleCount"
                :min="0"
                :max="999"
                :step="1"
                size="small"
                controls-position="right"
                style="width: 100%"
              />
            </template>
          </el-table-column>
          <el-table-column label="需求方向备注" min-width="168">
            <template #default="{ row }">
              <el-input
                v-model="row.demandNotes"
                type="textarea"
                :rows="2"
                maxlength="500"
                show-word-limit
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="开发团队" min-width="140">
            <template #default="{ row }">
              <el-select
                v-model="row.devTeamIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                size="small"
                style="width: 100%"
              >
                <el-option v-for="t in MOCK_TEAMS_DEV" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="开发" min-width="140">
            <template #default="{ row }">
              <el-select
                v-model="row.devUserIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                size="small"
                style="width: 100%"
              >
                <el-option v-for="u in MOCK_USERS" :key="u.id" :label="u.name" :value="u.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="父体建议" min-width="168">
            <template #default="{ row }">
              <el-input
                v-model="row.parentSuggestion"
                type="textarea"
                :rows="2"
                maxlength="500"
                show-word-limit
                placeholder="选填"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="期望完成" width="150">
            <template #default="{ row }">
              <el-date-picker
                v-model="row.dueDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="逾期判断"
                size="small"
                style="width: 100%"
              />
            </template>
          </el-table-column>
          <el-table-column label="" width="52" align="center" fixed="right">
            <template #default="{ $index }">
              <el-button :icon="Delete" link type="danger" size="small" @click="removeTargetRow($index)" />
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-button class="pap-add-row" type="primary" link :icon="Plus" @click="addTargetRow">
        添加一行
      </el-button>
      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBatch">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 单条编辑（字段顺序与新建一致） -->
    <el-dialog
      v-model="editVisible"
      title="编辑父体规划"
      width="min(1100px, 96vw)"
      destroy-on-close
      align-center
      class="pap-dialog pap-edit-dialog"
    >
      <el-form label-width="120px" size="default" class="pap-edit-form">
        <el-form-item label="项目名称" required>
          <el-input v-model="form.projectName" maxlength="128" show-word-limit placeholder="对内识别名称" />
        </el-form-item>
        <el-form-item label="店铺" required>
          <el-select v-model="form.storeId" placeholder="选择店铺" style="width: 100%">
            <el-option v-for="s in MOCK_STORES" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="站点" required>
          <el-select v-model="form.site" style="width: 100%">
            <el-option
              v-for="s in AMAZON_SITE_OPTIONS"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="父 ASIN" required>
          <el-input
            v-model="form.parentAsin"
            placeholder="父体 ASIN，不含子体"
            maxlength="32"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="运营团队">
          <el-select v-model="form.opsTeamId" style="width: 100%">
            <el-option v-for="t in MOCK_TEAMS_OPS" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="运营">
          <el-select v-model="form.operatorId" placeholder="负责人" style="width: 100%">
            <el-option v-for="u in MOCK_USERS" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="需求款数">
          <el-input-number
            v-model="form.demandChildStyleCount"
            :min="0"
            :max="999"
            :step="1"
            controls-position="right"
            style="width: 200px"
          />
          <span class="pap-form-hint">计划在该父体下新增子体的款数</span>
        </el-form-item>
        <el-form-item label="需求方向备注">
          <el-input v-model="form.demandNotes" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="开发团队">
          <el-select v-model="form.devTeamIds" multiple collapse-tags collapse-tags-tooltip style="width: 100%">
            <el-option v-for="t in MOCK_TEAMS_DEV" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开发">
          <el-select v-model="form.devUserIds" multiple collapse-tags collapse-tags-tooltip style="width: 100%">
            <el-option v-for="u in MOCK_USERS" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="父体建议">
          <el-input
            v-model="form.parentSuggestion"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            placeholder="选填：建议团队 / 运营 / 父体等"
          />
        </el-form-item>
        <el-form-item label="期望完成">
          <el-date-picker
            v-model="form.dueDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="用于逾期判断"
            style="width: 100%"
          />
        </el-form-item>

        <template v-if="editingRow">
          <el-divider content-position="left">批次跟进完成日志</el-divider>
          <el-table :data="editingRow.batchLogs || []" border size="small" class="pap-log-table" empty-text="暂无">
            <el-table-column prop="content" label="说明" min-width="160" show-overflow-tooltip />
            <el-table-column prop="completedAt" label="完成时间" width="120" />
            <el-table-column prop="operatorName" label="记录人" width="88" />
          </el-table>
          <div class="pap-log-add">
            <el-input v-model="newBatchLog.content" placeholder="追加一条批次说明" style="flex: 1" />
            <el-date-picker
              v-model="newBatchLog.completedAt"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="完成日"
              style="width: 150px"
            />
            <el-button type="primary" plain @click="addBatchLog">追加</el-button>
          </div>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.pap-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #f0f2f5;
}
.erp-header {
  padding: 12px 20px 8px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}
.header-breadcrumb {
  font-size: 14px;
  color: #606266;
}
.bc-sep {
  margin: 0 6px;
  color: #c0c4cc;
}
.bc-cur {
  color: #303133;
  font-weight: 600;
}
.pap-filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}
.pap-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
.pap-aside {
  width: 200px;
  min-width: 200px;
  background: #fff;
  border-right: 1px solid #ebeef5;
  padding: 12px 0 16px;
  flex-shrink: 0;
  overflow-y: auto;
}
.pap-aside-title {
  padding: 0 16px 8px;
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.pap-status-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pap-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin: 0 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: background 0.15s;
}
.pap-status-item:hover {
  background: #f5f7fa;
}
.pap-status-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}
.pap-status-ic {
  font-size: 16px;
  flex-shrink: 0;
  color: #909399;
}
.pap-status-item.active .pap-status-ic {
  color: #409eff;
}
.ic-pending_confirm {
  color: #e6a23c;
}
.ic-in_progress {
  color: #409eff;
}
.ic-overdue {
  color: #f56c6c;
}
.ic-cancelled {
  color: #909399;
}
.ic-done {
  color: #67c23a;
}
.ic-all {
  color: #606266;
}
.pap-status-label {
  flex: 1;
  min-width: 0;
}
.pap-status-num {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: #909399;
}
.pap-status-item.active .pap-status-num {
  color: #409eff;
}
.pap-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #f0f2f5;
}
.pap-list-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 16px 8px;
  flex-shrink: 0;
  background: #f0f2f5;
}
.pap-table-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 16px 20px;
  overflow: auto;
}
.pap-table {
  width: 100%;
  min-width: 0;
  background: #fff;
}
.pap-asin-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
  text-decoration: none;
  font-variant-numeric: tabular-nums;
}
.pap-asin-link:hover {
  text-decoration: underline;
}
.pap-link-ic {
  flex-shrink: 0;
}
.pap-form-hint {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}
.pap-batch-hint {
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
}
.pap-batch-scroll {
  width: 100%;
  overflow-x: auto;
  max-height: min(70vh, 640px);
  overflow-y: auto;
}
.pap-batch-table {
  width: max-content;
  min-width: 100%;
}
.pap-add-row {
  margin-top: 8px;
  padding-left: 0;
}
.pap-edit-form {
  max-width: 920px;
}
.pap-log-table {
  margin-bottom: 10px;
}
.pap-log-add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
</style>
