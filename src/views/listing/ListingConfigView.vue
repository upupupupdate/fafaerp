<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useListingConfig } from '@/features/listing/useListingConfig.js'
import { useCategoryStore } from '@/features/product/useCategoryStore.js'

const {
  transitions,
  transitionsByCategory,
  DEFAULT_TRANSITIONS,
} = useListingConfig()

const categoryStore = useCategoryStore()

const LS_KEY_CHAIN_METRICS = 'listing_chain_metrics_v2'

function genMetricId() {
  return `cm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** 与节点间标准时效表一致；指标行 id 固定，仅标准/预警天数可配置 */
const DEFAULT_CHAIN_METRICS = [
  { id: 'cm_graphic_total', name: '平面设计总用时', formula: '【平面设计完成】−【运营分配】时间', standard: 30, warning: 5 },
  { id: 'cm_listing_upload', name: 'Listing上传总用时', formula: '【上传Listing】−【运营分配】时间', standard: 30, warning: 5 },
  { id: 'cm_listing_po', name: 'Listing&采购下单', formula: '【上传Listing】−【采购下单】时间', standard: 30, warning: 5 },
  { id: 'cm_listing_stock', name: 'Listing&备货入库', formula: '【上传Listing】−【备货入库】时间', standard: 45, warning: 7 },
  { id: 'cm_graphic_stock', name: '完成平面设计&备货入库', formula: '【完成平面设计】−【备货入库】时间', standard: 30, warning: 5 },
  { id: 'cm_graphic_shipment', name: '完成平面设计&建货件', formula: '【完成平面设计】−【建货件】时间', standard: 30, warning: 5 },
  { id: 'cm_launch_response', name: '开售响应', formula: '【开售】−【可开售时间（货件到 FBA 与平面设计完成取较晚者）】', standard: 7, warning: 2 },
  { id: 'cm_full_chain', name: '全链路时效', formula: '【开售】−【开发授权】时间', standard: 90, warning: 14 },
]

function parsePositiveInt(v, fallback) {
  const n = Number(v)
  if (Number.isFinite(n) && n >= 1) return Math.floor(n)
  return fallback
}

function parseNonNegInt(v, fallback) {
  if (v === '' || v === undefined || v === null) return fallback
  const n = Number(v)
  if (Number.isFinite(n) && n >= 0) return Math.floor(n)
  return fallback
}

function normalizeChainMetricRow(row) {
  const id = row.id || genMetricId()
  const name = String(row.name ?? '')
  const formula = String(row.formula ?? '')

  let standard = parsePositiveInt(row.standard, 0)
  let warning

  if (!standard) {
    standard = parsePositiveInt(row.standardNote, 30)
    warning = parseNonNegInt(row.warningNote, NaN)
    if (!Number.isFinite(warning)) warning = Math.min(5, standard - 1)
  } else {
    warning = parseNonNegInt(row.warning, NaN)
    if (!Number.isFinite(warning)) warning = Math.min(5, standard - 1)
  }

  if (warning >= standard) warning = Math.max(0, standard - 1)
  return { id, name, formula, standard, warning }
}

/** 从 localStorage 恢复：仅合并标准/预警到内置固定行（按 id，旧数据按行序回退） */
function loadChainMetrics() {
  const canonical = JSON.parse(JSON.stringify(DEFAULT_CHAIN_METRICS))
  const tryKey = (key) => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const p = JSON.parse(raw)
      return Array.isArray(p) && p.length ? p : null
    } catch {
      return null
    }
  }

  const fromV2 = tryKey(LS_KEY_CHAIN_METRICS)
  const legacyV1 = tryKey('listing_chain_metrics_v1')
  const source = fromV2 ?? legacyV1
  if (!source?.length) return canonical

  const savedById = new Map(source.filter((r) => r && r.id).map((r) => [String(r.id), r]))

  return canonical.map((def, index) => {
    let saved = savedById.get(def.id) ?? source[index]
    if (!saved) return def
    const n = normalizeChainMetricRow({
      ...saved,
      id: def.id,
      name: def.name,
      formula: def.formula,
    })
    return { ...def, standard: n.standard, warning: n.warning }
  })
}

const chainMetricsRows = ref(loadChainMetrics())

watch(
  chainMetricsRows,
  () => {
    try {
      localStorage.setItem(LS_KEY_CHAIN_METRICS, JSON.stringify(chainMetricsRows.value))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

function resetChainMetrics() {
  ElMessageBox.confirm('恢复默认全链路指标说明？当前编辑将丢失。', '提示', { type: 'warning' })
    .then(() => {
      chainMetricsRows.value = JSON.parse(JSON.stringify(DEFAULT_CHAIN_METRICS))
      ElMessage.success('已恢复默认')
    })
    .catch(() => {})
}

/** null = 全局默认；非 null = 任意品类节点 id（末级或中间级，与 transitionsByCategory 键一致） */
const transitionCategoryId = ref(null)

const transitionTableRows = computed(() => {
  if (!transitionCategoryId.value) return transitions.value
  const id = transitionCategoryId.value
  if (!transitionsByCategory.value[id]) {
    transitionsByCategory.value[id] = JSON.parse(JSON.stringify(DEFAULT_TRANSITIONS))
  }
  return transitionsByCategory.value[id]
})

const scopeLabel = computed(() => {
  if (!transitionCategoryId.value) return '全局默认'
  const row = categoryStore.getById(transitionCategoryId.value)
  return row ? `${row.name}（${row.code}）` : transitionCategoryId.value
})

/** 当前选中节点是否为末级（用于文案提示） */
const scopeIsLeaf = computed(() => {
  const id = transitionCategoryId.value
  if (!id) return false
  return !!categoryStore.getById(id)?.isLeaf
})

const treeRef = ref(null)
const treeFilterText = ref('')

watch(treeFilterText, (val) => {
  treeRef.value?.filter(val)
})

function filterTreeNode(value, data) {
  if (!value) return true
  const v = value.toLowerCase()
  return (
    String(data.name ?? '')
      .toLowerCase()
      .includes(v)
    || String(data.code ?? '')
      .toLowerCase()
      .includes(v)
  )
}

function selectGlobalDefault() {
  transitionCategoryId.value = null
  nextTick(() => treeRef.value?.setCurrentKey(null))
}

function onTreeAllLeaves() {
  selectGlobalDefault()
  ElMessage.info('已切换到全局默认；可在树中选择任意品类节点配置（末级可单独覆盖上级）')
}

function onTreeNodeClick(data) {
  transitionCategoryId.value = data.id
  nextTick(() => treeRef.value?.setCurrentKey(data.id))
}

/** 将当前表格（全局或当前节点）深拷贝同步到树中已勾选的所有品类键 */
function applyCurrentTableToCheckedCategories() {
  const keys = treeRef.value?.getCheckedKeys(false) ?? []
  if (!keys.length) {
    ElMessage.warning('请先在左侧树中勾选要同步的品类节点')
    return
  }
  const snapshot = JSON.parse(JSON.stringify(transitionTableRows.value))
  for (const id of keys) {
    transitionsByCategory.value[id] = JSON.parse(JSON.stringify(snapshot))
  }
  ElMessage.success(`已将当前节点间时效同步至 ${keys.length} 个品类节点`)
}

function resetTransitions() {
  ElMessageBox.confirm('恢复默认节点时效配置？当前修改将丢失。', '提示', { type: 'warning' })
    .then(() => {
      if (!transitionCategoryId.value) {
        transitions.value = JSON.parse(JSON.stringify(DEFAULT_TRANSITIONS))
      } else {
        transitionsByCategory.value[transitionCategoryId.value] = JSON.parse(
          JSON.stringify(DEFAULT_TRANSITIONS),
        )
      }
      ElMessage.success('已恢复默认配置')
    })
    .catch(() => {})
}

function copyTransitionsFromGlobal() {
  const id = transitionCategoryId.value
  if (!id) {
    ElMessage.warning('请先在左侧树中选择品类节点')
    return
  }
  transitionsByCategory.value[id] = JSON.parse(JSON.stringify(transitions.value))
  ElMessage.success('已从全局默认复制到当前节点')
}

/** 节点间时效与全链路指标共用：预警提前须小于标准时效 */
function warnTip(row) {
  if (row.derivedFromSystem) return ''
  if (row.warning >= row.standard) return '⚠ 预警天数应小于标准天数'
  return ''
}
</script>

<template>
  <div class="lc-page">

    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>上架</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">时效配置</span>
      </div>
      <div class="header-right">
        <span class="lc-tip">所有配置实时生效，自动保存到本地</span>
      </div>
    </header>

    <div class="lc-body">
      <div class="lc-main-split">
        <aside class="lc-aside">
          <div class="lc-aside-head">
            <span class="lc-aside-title">所有品类</span>
            <el-button type="primary" link size="small" @click="onTreeAllLeaves">
              全部末级
            </el-button>
          </div>
          <el-button class="lc-global-btn" size="small" @click="selectGlobalDefault">
            全局默认
          </el-button>
          <el-input
            v-model="treeFilterText"
            placeholder="筛选树节点"
            clearable
            size="small"
            class="lc-tree-filter"
          />
          <p class="lc-tree-hint">
            勾选多个节点后，可在右侧「节点间标准时效」使用「同步到已选品类」批量套用当前表格。
          </p>
          <el-tree
            ref="treeRef"
            class="lc-tree"
            :data="categoryStore.treeData"
            :props="{ label: 'name', children: 'children' }"
            node-key="id"
            show-checkbox
            :check-on-click-node="false"
            highlight-current
            default-expand-all
            :filter-node-method="filterTreeNode"
            @node-click="onTreeNodeClick"
          >
            <template #default="{ data }">
              <span class="lc-tree-row">
                <span class="lc-tree-name" :title="data.code">{{ data.name }}</span>
                <span v-if="data.isLeaf" class="lc-tree-leaf">末级</span>
              </span>
            </template>
          </el-tree>
        </aside>

        <div class="lc-main">
          <div class="lc-section">
            <div class="lc-section-header">
              <div class="lc-section-title">
                <span class="lc-section-icon">⏱</span>
                节点间标准时效配置
              </div>
              <div class="lc-section-actions">
                <el-button
                  type="primary"
                  size="small"
                  @click="applyCurrentTableToCheckedCategories"
                >
                  同步到已选品类
                </el-button>
                <el-button
                  size="small"
                  :disabled="!transitionCategoryId"
                  @click="copyTransitionsFromGlobal"
                >
                  从全局复制到当前节点
                </el-button>
                <el-button size="small" @click="resetTransitions">恢复默认</el-button>
              </div>
            </div>
            <div class="lc-section-desc">
              当前编辑：<b>{{ scopeLabel }}</b>。
              <template v-if="!transitionCategoryId">
                未在左侧选择节点时为<strong>全局默认</strong>，对所有 SKU 生效。
              </template>
              <template v-else-if="scopeIsLeaf">
                本节点为<strong>末级品类</strong>：仅对挂载该末级的产品生效；若某末级单独配置了时效，则<strong>优先于</strong>其上级的子树默认。
              </template>
              <template v-else>
                本节点为<strong>中间品类</strong>：对此节点下<strong>全部末级子品类</strong>生效，作为子树默认；若某个末级单独配置了时效，则该末级<strong>覆盖</strong>本条。
              </template>
              上架跟踪按产品<strong>末级品类 ID</strong>解析：自末级沿父链向上命中第一条有配置的节点，再无则回退全局。
              <strong>供应商履约、头程运输</strong>两行标准天由积加/物流等<strong>三方预计日期</strong>与实际上下文对比得出，本表仅说明公式，不可编辑。
            </div>

            <el-table
              :data="transitionTableRows"
              border
              size="small"
              class="lc-table"
            >
              <el-table-column label="#" width="44" align="center">
                <template #default="{ $index }">
                  <span class="lc-idx">{{ $index + 1 }}</span>
                </template>
              </el-table-column>

              <el-table-column label="时效名称" width="148">
                <template #default="{ row }">
                  <span class="lc-metric-name">{{ row.label }}</span>
                </template>
              </el-table-column>

              <el-table-column label="计算公式" min-width="280">
                <template #default="{ row }">
                  <span class="lc-formula">{{ row.desc }}</span>
                </template>
              </el-table-column>

              <el-table-column label="标准时效（天）" width="150" align="center">
                <template #default="{ row }">
                  <span v-if="row.derivedFromSystem" class="lc-derived-na">—</span>
                  <el-input-number
                    v-else
                    v-model="row.standard"
                    :min="1"
                    :max="365"
                    size="small"
                    controls-position="right"
                    style="width: 110px"
                  />
                </template>
              </el-table-column>

              <el-table-column label="预警提前（天）" width="150" align="center">
                <template #default="{ row }">
                  <span v-if="row.derivedFromSystem" class="lc-derived-na">—</span>
                  <el-input-number
                    v-else
                    v-model="row.warning"
                    :min="0"
                    :max="row.standard - 1"
                    size="small"
                    controls-position="right"
                    style="width: 110px"
                  />
                </template>
              </el-table-column>

              <el-table-column label="预警说明" min-width="200">
                <template #default="{ row }">
                  <span v-if="row.derivedFromSystem" class="lc-derived-tip">
                    由三方预计日期与实际上下文对比；临近预计节点前 3 天预警，晚于预计日为超时（与上架连线一致）
                  </span>
                  <template v-else>
                    <span v-if="warnTip(row)" class="lc-warn-tip">{{ warnTip(row) }}</span>
                    <span v-else class="lc-ok-tip">
                      剩余 ≤ {{ row.warning }} 天时显示橙色预警；超过 {{ row.standard }} 天显示红色超时
                    </span>
                  </template>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="lc-section">
            <div class="lc-section-header">
              <div class="lc-section-title">
                <span class="lc-section-icon">📊</span>
                全链路时效指标说明
              </div>
              <div class="lc-section-actions">
                <el-button size="small" @click="resetChainMetrics">恢复默认</el-button>
              </div>
            </div>
            <div class="lc-section-desc">
              以下为系统内置固定指标；仅可调整「标准时效」「预警提前」，名称与公式不可改。列「预警说明」与上方「节点间标准时效配置」一致（自动文案）。保存于本地浏览器。
              <strong>上架跟踪（边栏）</strong>：「平面设计总用时」「Listing上传总用时」与列表「平面完成」「Listing上传」下<strong>超时标签</strong>联动——以<strong>运营分配完成日</strong>（时间轴「已分配」）为起点加标准天得截止日；未完成且已过截止日显示「超时N天」，已完成但实际日晚于截止日亦显示超期（与主时间轴节点超时分开计算）。
            </div>

            <el-table
              :data="chainMetricsRows"
              border
              size="small"
              class="lc-table"
              row-key="id"
            >
              <el-table-column label="指标名称" width="200">
                <template #default="{ row }">
                  <span class="lc-metric-name">{{ row.name }}</span>
                </template>
              </el-table-column>
              <el-table-column label="计算公式" min-width="260">
                <template #default="{ row }">
                  <span class="lc-formula">{{ row.formula }}</span>
                </template>
              </el-table-column>
              <el-table-column label="标准时效（天）" width="150" align="center">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.standard"
                    :min="1"
                    :max="365"
                    size="small"
                    controls-position="right"
                    style="width: 110px"
                  />
                </template>
              </el-table-column>
              <el-table-column label="预警提前（天）" width="150" align="center">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.warning"
                    :min="0"
                    :max="row.standard - 1"
                    size="small"
                    controls-position="right"
                    style="width: 110px"
                  />
                </template>
              </el-table-column>
              <el-table-column label="预警说明" min-width="200">
                <template #default="{ row }">
                  <span v-if="warnTip(row)" class="lc-warn-tip">{{ warnTip(row) }}</span>
                  <span v-else class="lc-ok-tip">
                    剩余 ≤ {{ row.warning }} 天时显示橙色预警；超过 {{ row.standard }} 天显示红色超时
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.lc-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #f0f2f5;
}

.lc-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
}

.lc-main-split {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.lc-aside {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 12px;
  min-height: 0;
}

.lc-aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.lc-aside-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.lc-global-btn {
  width: 100%;
  margin-bottom: 8px;
}

.lc-tree-filter {
  margin-bottom: 8px;
}

.lc-tree-hint {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.45;
  margin: 0 0 8px;
}

.lc-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-size: 13px;
}

.lc-tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding-right: 2px;
  box-sizing: border-box;
}

.lc-tree-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #303133;
}

.lc-tree-leaf {
  flex-shrink: 0;
  font-size: 10px;
  color: #909399;
  background: #f4f4f5;
  padding: 0 4px;
  border-radius: 2px;
}

.lc-tree :deep(.el-tree-node__content) {
  height: auto;
  min-height: 28px;
  padding-top: 2px;
  padding-bottom: 2px;
}

.lc-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lc-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.lc-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.lc-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.lc-section-icon { font-size: 16px; }
.lc-section-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.lc-section-desc {
  font-size: 12px;
  color: #9ca3af;
  padding: 6px 18px 10px;
  line-height: 1.6;
}

.lc-table { margin: 0; }

.lc-idx { font-size: 12px; color: #9ca3af; }
.lc-metric-name { font-weight: 600; font-size: 13px; color: #111827; }
.lc-formula { font-size: 12px; color: #6b7280; line-height: 1.6; }
.lc-warn-tip { font-size: 12px; color: #ef4444; }
.lc-ok-tip { font-size: 12px; color: #9ca3af; line-height: 1.5; }
.lc-derived-na {
  font-size: 14px;
  color: #c0c4cc;
  user-select: none;
}
.lc-derived-tip {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.lc-tip {
  font-size: 12px;
  color: #9ca3af;
}
</style>
