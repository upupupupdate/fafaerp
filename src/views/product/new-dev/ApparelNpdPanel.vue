<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ApparelNpdRow from './ApparelNpdRow.vue'
import ApparelNpdMiniCard from './ApparelNpdMiniCard.vue'
import ApparelNpdEditDrawer from './ApparelNpdEditDrawer.vue'
import '@/features/product/npdApparelTableColumns.css'
import { useNpdApparelStore } from '@/features/product/useNpdApparelStore.js'
import { useFabricColorCardStore, fabricCardDisplayName } from '@/features/product/useFabricColorCardStore.js'
import { useSizeLibraryStore } from '@/features/product/useSizeLibraryStore.js'
import { cartesianColorSize } from '@/features/product/apparelSkuHelpers.js'
import ListingNodeStatusBar from '@/features/listing/components/ListingNodeStatusBar.vue'
import { NPD_STATUS_PANELS, NPD_PANEL_ACCENTS } from '@/features/product/npdApparelDefs.js'

const props = defineProps({
  /** 与新品开发页 Tab 联动：all | draft | pending_review | … */
  workflowTab: { type: String, default: 'all' },
})

const emit = defineEmits(['update:workflowTab'])

const fabricStore = useFabricColorCardStore()
const sizeStore = useSizeLibraryStore()

/** 过滤非法项，避免 el-option 访问 undefined.id 导致整页崩溃 */
const safeFabricCards = computed(() => {
  const raw = fabricStore.list?.value ?? fabricStore.list
  const arr = Array.isArray(raw) ? raw : []
  return arr.filter(c => c && c.id != null && String(c.id).length)
})
const safeSizeCharts = computed(() => {
  const raw = sizeStore.list?.value ?? sizeStore.list
  const arr = Array.isArray(raw) ? raw : []
  return arr.filter(ch => ch && ch.id != null && String(ch.id).length)
})

const selectedFabricId = ref('')
const selectedColorZh = ref([])
const selectedChartId = ref('')
const selectedSizes = ref([])

const currentFabric = computed(() => fabricStore.getById(selectedFabricId.value))
const currentChart = computed(() => sizeStore.getById(selectedChartId.value))

const colorOptions = computed(() => {
  const f = currentFabric.value
  if (!f?.colors?.length) return []
  return f.colors.map(c => ({ label: `${c.zh}${c.code ? ` (${c.code})` : ''}`, value: c.zh }))
})

watch(selectedFabricId, () => {
  selectedColorZh.value = []
})

watch(selectedChartId, id => {
  const ch = sizeStore.getById(id)
  selectedSizes.value = ch?.sizes ? [...ch.sizes] : []
})

watch(safeFabricCards, () => {
  if (selectedFabricId.value && !safeFabricCards.value.some(c => c.id === selectedFabricId.value)) {
    selectedFabricId.value = ''
  }
})
watch(safeSizeCharts, () => {
  if (selectedChartId.value && !safeSizeCharts.value.some(ch => ch.id === selectedChartId.value)) {
    selectedChartId.value = ''
  }
})

const previewRows = computed(() => cartesianColorSize(selectedColorZh.value, selectedSizes.value))

const npdStore = useNpdApparelStore()
const selectedIds = ref(new Set())

function activeTimelineIdx(row) {
  const t = row.timeline || []
  for (let i = 0; i < t.length; i++) {
    if (!t[i]?.done) return i
  }
  return Math.max(0, t.length - 1)
}

function rowPhaseWarning(row) {
  const idx = activeTimelineIdx(row)
  return row.transitionInfos?.[idx]?.state === 'warning'
}

function rowPhaseOverdue(row) {
  const idx = activeTimelineIdx(row)
  const tr = row.transitionInfos?.[idx]
  return tr?.state === 'overdue' || row.timeline?.[idx]?.overdue === true
}

/** 各 workflowPhase 条数 + 当前环节预警/超时（与上架跟踪统计条一致） */
const dynamicNpdStats = computed(() => {
  const rows = npdStore.rows.value.filter((r) => r && r.id != null)
  const stats = {}
  for (const pan of NPD_STATUS_PANELS) {
    const key = pan.key
    const inPhase = rows.filter((r) => r.workflowPhase === key)
    stats[key] = {
      total: inPhase.length,
      warning: inPhase.filter(rowPhaseWarning).length,
      overdue: inPhase.filter(rowPhaseOverdue).length,
    }
  }
  return stats
})

const statusBarActive = computed({
  get() {
    return props.workflowTab === 'all' ? null : props.workflowTab
  },
  set(v) {
    emit('update:workflowTab', v == null ? 'all' : v)
  },
})

const filterBrand = ref('')
const filterSeason = ref('')
const filterCategory = ref('')
const filterAudience = ref('')
const keyword = ref('')

const brandOptions = computed(() => [...new Set(npdStore.rows.value.map(r => r.brand).filter(Boolean))].sort())
const seasonOptions = computed(() => [...new Set(npdStore.rows.value.map(r => r.season).filter(Boolean))].sort())
const categoryOptions = computed(() => [...new Set(npdStore.rows.value.map(r => r.category).filter(Boolean))].sort())
const audienceOptions = computed(() =>
  [...new Set(npdStore.rows.value.map(r => r.audience || r.gender).filter(Boolean))].sort(),
)

const filteredRows = computed(() => {
  let list = npdStore.rows.value
  if (props.workflowTab !== 'all') {
    list = list.filter(r => r.workflowPhase === props.workflowTab)
  }
  if (filterBrand.value) list = list.filter(r => r.brand === filterBrand.value)
  if (filterSeason.value) list = list.filter(r => r.season === filterSeason.value)
  if (filterCategory.value) list = list.filter(r => r.category === filterCategory.value)
  if (filterAudience.value) {
    list = list.filter(r => (r.audience || r.gender) === filterAudience.value)
  }
  const k = keyword.value.trim().toLowerCase()
  if (k) {
    list = list.filter(r =>
      (r.nameCn || '').toLowerCase().includes(k)
      || (r.spu || '').toLowerCase().includes(k)
      || (r.devIdea || '').toLowerCase().includes(k)
      || (r.productKeyInfo || '').toLowerCase().includes(k)
      || (r.remark || '').toLowerCase().includes(k)
      || (r.audience || r.gender || '').toLowerCase().includes(k),
    )
  }
  return list.filter(r => r && r.id != null)
})

function rowSelected(id) {
  return selectedIds.value.has(id)
}

function setRowSelected(id, val) {
  const next = new Set(selectedIds.value)
  if (val) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

const drawerVisible = ref(false)
const editRowId = ref(null)

function onToolbarAdd() {
  const id = npdStore.addDraftRow()
  editRowId.value = id
  drawerVisible.value = true
  ElMessage.success('已新增草稿，请在抽屉中填写后保存')
}

function onEditRow(id) {
  editRowId.value = id
  drawerVisible.value = true
}

function onToolbarImport() {
  ElMessage.info('导入：对接后端后支持')
}

function onToolbarExport() {
  ElMessage.info('导出：对接后端后支持')
}

const codePreview = ref('26 · SS · 01 · L · 2503 · 01')

/** v3：默认「列表」一行一条；仍可在工具栏切换「卡片」 */
const VIEW_MODE_LS = 'npd_apparel_view_mode_v3'
function loadViewMode() {
  try {
    const v = localStorage.getItem(VIEW_MODE_LS)
    if (v === 'list' || v === 'cards') return v
  } catch {
    /* ignore */
  }
  return 'list'
}
const viewMode = ref(loadViewMode())
watch(viewMode, (v) => {
  try {
    localStorage.setItem(VIEW_MODE_LS, v)
  } catch {
    /* ignore */
  }
})
</script>

<template>
  <div class="apparel-npd">
    <div class="anp-toolbar">
      <div class="anp-filters">
        <el-select v-model="filterBrand" placeholder="品牌" clearable filterable style="width: 120px">
          <el-option v-for="b in brandOptions" :key="b" :label="b" :value="b" />
        </el-select>
        <el-select v-model="filterSeason" placeholder="季节" clearable filterable style="width: 120px">
          <el-option v-for="s in seasonOptions" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filterCategory" placeholder="品类" clearable filterable style="width: 120px">
          <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterAudience" placeholder="人群" clearable filterable style="width: 120px">
          <el-option v-for="g in audienceOptions" :key="g" :label="g" :value="g" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索品名 / SPU / 思路 / 关键信息 / 备注" clearable style="width: 280px" />
      </div>
      <div class="anp-actions">
        <el-radio-group v-model="viewMode" size="small" class="anp-view-switch">
          <el-radio-button value="cards">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="onToolbarAdd">新增</el-button>
        <el-button @click="onToolbarImport">导入</el-button>
        <el-button @click="onToolbarExport">导出</el-button>
        <el-button>筛选</el-button>
      </div>
    </div>

    <div class="anp-status-bar">
      <ListingNodeStatusBar
        v-model:active="statusBarActive"
        :nodes="NPD_STATUS_PANELS"
        :stats="dynamicNpdStats"
        :accents="NPD_PANEL_ACCENTS"
      />
    </div>

    <div class="anp-list-wrap">
      <template v-if="viewMode === 'list'">
        <div class="anp-table-scroll">
          <div class="anp-head-row">
            <div class="npd-col-chk anp-cell-head" />
            <div class="npd-col-img anp-cell-head">款式图</div>
            <div class="npd-col-info anp-cell-head">产品信息</div>
            <div class="npd-col-cat anp-cell-head">品类</div>
            <div class="npd-col-brand anp-cell-head">品牌</div>
            <div class="npd-col-shelf anp-cell-head">上架年/季</div>
            <div class="npd-col-scene anp-cell-head">场景</div>
            <div class="npd-col-audience anp-cell-head">人群</div>
            <div class="npd-col-market anp-cell-head">市场</div>
            <div class="npd-col-target anp-cell-head">目标成本</div>
            <div class="npd-col-dict anp-cell-head">面料/工艺/设计点</div>
            <div class="npd-col-staff anp-cell-head">参与人</div>
            <div class="npd-col-compimg anp-cell-head">竞品图</div>
            <div class="npd-col-complink anp-cell-head">竞品链接</div>
            <div class="npd-col-idea anp-cell-head">开发思路</div>
            <div class="npd-col-kw anp-cell-head">关键词</div>
            <div class="npd-col-specs anp-cell-head">关键规格</div>
            <div class="npd-col-attrs anp-cell-head">产品属性</div>
            <div class="npd-col-due anp-cell-head">要求完成</div>
            <div class="npd-col-status anp-cell-head">状态</div>
            <div class="npd-col-action anp-cell-head">操作</div>
          </div>

          <ApparelNpdRow
            v-for="row in filteredRows"
            :key="row.id"
            :row="row"
            :selected="rowSelected(row.id)"
            @update:selected="v => setRowSelected(row.id, v)"
            @edit="onEditRow"
          />

          <el-empty v-if="!filteredRows.length" description="当前 Tab 或筛选条件下暂无数据" />
        </div>
      </template>

      <template v-else>
        <div class="anp-cards-scroll">
          <div v-if="filteredRows.length" class="anp-cards-grid">
            <ApparelNpdMiniCard
              v-for="row in filteredRows"
              :key="row.id"
              :row="row"
              :selected="rowSelected(row.id)"
              @update:selected="v => setRowSelected(row.id, v)"
              @edit="onEditRow"
            />
          </div>
          <el-empty v-else description="当前 Tab 或筛选条件下暂无数据" />
        </div>
      </template>

      <ApparelNpdEditDrawer v-model:visible="drawerVisible" :row-id="editRowId" />
    </div>

    <el-collapse class="anp-collapse">
      <el-collapse-item title="样板信息（引用色卡库 / 尺码库）— SKU 组合预览不落库" name="sample">
        <p class="anp-intro-mini">
          设计号由规则生成；列表行需维护面料色卡与尺码表 ID 后方可<strong>提交开款</strong>。引用：
          <router-link class="link" to="/product/config/fabric-color-cards">面料色卡库</router-link>
          、
          <router-link class="link" to="/product/config/size-library">尺码库</router-link>
          。色 × 尺码笛卡尔积在样板管理定版时落 SKU。
        </p>
        <div class="code-strip">
          <span class="lbl">款号占位</span>
          <code class="mono">{{ codePreview }}</code>
        </div>
        <el-form label-width="110px" size="default">
          <el-form-item label="面料色卡">
            <el-select
              v-model="selectedFabricId"
              placeholder="请选择已维护的面料色卡"
              filterable
              clearable
              style="width: min(100%, 520px)"
            >
              <el-option
                v-for="c in safeFabricCards"
                :key="c.id"
                :label="fabricCardDisplayName(c)"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="colorOptions.length" label="颜色">
            <el-checkbox-group v-model="selectedColorZh">
              <el-checkbox v-for="opt in colorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item v-else-if="selectedFabricId" label="颜色">
            <span class="hint">该色卡无颜色行，请至色卡库维护</span>
          </el-form-item>
          <el-form-item label="尺码表">
            <el-select
              v-model="selectedChartId"
              placeholder="请选择尺码表"
              filterable
              clearable
              style="width: min(100%, 400px)"
            >
              <el-option
                v-for="ch in safeSizeCharts"
                :key="ch.id"
                :label="ch.name"
                :value="ch.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="currentChart?.sizes?.length" label="启用尺码">
            <el-checkbox-group v-model="selectedSizes">
              <el-checkbox v-for="s in currentChart.sizes" :key="s" :value="s">{{ s }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
        <div class="preview-title">SKU 组合预览（不落库）</div>
        <el-table v-if="previewRows.length" :data="previewRows" border size="small" max-height="280">
          <el-table-column type="index" label="#" width="48" />
          <el-table-column prop="color" label="颜色" width="120" />
          <el-table-column prop="size" label="尺码" width="80" />
          <el-table-column label="SKU 编码">
            <template #default>—（后端生成）</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="请选择色卡与颜色、尺码表与尺码后显示组合" :image-size="72" />
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.apparel-npd {
  padding: 0 0 20px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.anp-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.anp-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.anp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.anp-view-switch {
  margin-right: 4px;
}
.anp-status-bar {
  flex-shrink: 0;
  overflow-x: auto;
  padding: 0 8px 4px;
}
.anp-status-bar :deep(.lnsb-wrap) {
  min-width: min-content;
}
/* 与上架跟踪 .lt-list-wrap 一致：列表区左右留白，占满剩余高度 */
.anp-list-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 16px 8px;
  overflow: hidden;
}
/* 列表区域占满面板剩余高度并内部滚动，列头 sticky；宽表横向一并滚动 */
.anp-table-scroll {
  flex: 1;
  min-height: 260px;
  overflow: auto;
  margin-top: 5px;
  background: transparent;
}
/* 与上架跟踪 .lt-col-header 对齐 */
.anp-head-row {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  min-width: min-content;
  padding: 5px 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px 8px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.anp-cell-head {
  display: flex;
  align-items: center;
  padding: 0 6px;
  border-right: 1px solid #f0f2f5;
}
.anp-cell-head:last-child {
  border-right: none;
}
/* 卡片视图：响应式网格，与各状态 Tab 筛选结果联动 */
.anp-cards-scroll {
  flex: 1;
  min-height: 260px;
  overflow: auto;
  margin-top: 5px;
}
.anp-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: 12px;
  align-items: stretch;
  padding: 2px 2px 12px;
}
.anp-collapse {
  margin-top: 16px;
  border: 1px solid #f0f2f5;
  border-radius: 8px;
  --el-collapse-border-color: transparent;
}
.anp-intro-mini {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 10px;
}
.anp-intro-mini .link {
  color: #1890ff;
}
.code-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  margin-bottom: 12px;
}
.code-strip .lbl {
  font-size: 12px;
  color: #9ca3af;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: #374151;
}
.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin: 12px 0 8px;
}
.hint {
  font-size: 12px;
  color: #9ca3af;
}
</style>
