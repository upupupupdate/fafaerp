<script setup>
/**
 * 添加产品（采购计划）：搜索 SKU/品名/MSKU + 品类/类型/负责人筛选 + 分页 + 跨页勾选
 * 数据来自父级传入的上架产品池，不请求接口。
 */
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { isListingEligibleForPurchasePlan } from '@/features/listing/purchasePlanDraft.js'

const visible = defineModel({ type: Boolean, default: false })

const props = defineProps({
  /** 上架跟踪等产品列表（全量） */
  sourceProducts: { type: Array, default: () => [] },
  /** 已在采购明细中的 listingId，不可再选 */
  excludeListingIds: { type: Array, default: () => [] },
  /** 本次最多可再添加条数 */
  maxAdd: { type: Number, default: 100 },
})

const emit = defineEmits(['confirm'])

const SEARCH_FIELDS = [
  { value: 'sku', label: 'SKU' },
  { value: 'nameCn', label: '产品名称' },
  { value: 'msku', label: 'MSKU' },
]

const searchField = ref('sku')
const keywordInput = ref('')
/** 解析后的多关键词（支持逗号/换行/分号） */
const searchTokens = computed(() => {
  const raw = keywordInput.value.trim()
  if (!raw) return []
  return [...new Set(raw.split(/[\n,，;；]+/).map((s) => s.trim()).filter(Boolean))]
})

const filterCategory = ref('')
const filterProductType = ref('')
const filterOwner = ref('')

const currentPage = ref(1)
const pageSize = ref(20)

const batchPopoverVisible = ref(false)
const batchDraft = ref('')

const excludeSet = computed(() => new Set(props.excludeListingIds.map((x) => String(x))))

/** 可加入采购计划的池子 */
const basePool = computed(() =>
  (props.sourceProducts || []).filter(
    (p) => isListingEligibleForPurchasePlan(p) && !excludeSet.value.has(String(p.id)),
  ),
)

const categoryOptions = computed(() =>
  [...new Set(basePool.value.map((p) => p.category).filter(Boolean))].sort(),
)
const productTypeOptions = computed(() =>
  [...new Set(basePool.value.map((p) => p.productType).filter(Boolean))].sort(),
)
const ownerOptions = computed(() =>
  [...new Set(basePool.value.map((p) => p.staff?.dev).filter(Boolean))].sort(),
)

function matchSearch(p) {
  const tokens = searchTokens.value
  if (!tokens.length) return true
  const field = searchField.value
  const getVal = () => {
    if (field === 'sku') return String(p.sku ?? '')
    if (field === 'nameCn') return String(p.nameCn ?? '')
    return String(p.msku ?? '')
  }
  const hay = getVal().toLowerCase()
  return tokens.some((t) => hay.includes(t.toLowerCase()))
}

function matchFilters(p) {
  if (filterCategory.value && p.category !== filterCategory.value) return false
  if (filterProductType.value && p.productType !== filterProductType.value) return false
  if (filterOwner.value && (p.staff?.dev || '') !== filterOwner.value) return false
  return true
}

const filteredList = computed(() =>
  basePool.value.filter((p) => matchSearch(p) && matchFilters(p)),
)

const totalFiltered = computed(() => filteredList.value.length)

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

watch([filteredList, pageSize], () => {
  const maxPage = Math.max(1, Math.ceil(filteredList.value.length / pageSize.value) || 1)
  if (currentPage.value > maxPage) currentPage.value = maxPage
})

watch(visible, (v) => {
  if (v) {
    keywordInput.value = ''
    filterCategory.value = ''
    filterProductType.value = ''
    filterOwner.value = ''
    currentPage.value = 1
    selectedIds.value = new Set()
    batchPopoverVisible.value = false
    batchDraft.value = ''
  }
})

/** 跨页已选 id */
const selectedIds = ref(new Set())

function rowKey(p) {
  return p.id
}

function isSelected(id) {
  return selectedIds.value.has(id)
}

function toggleRow(p, checked) {
  const next = new Set(selectedIds.value)
  if (checked) {
    if (next.size >= props.maxAdd) {
      ElMessage.warning(`最多再选 ${props.maxAdd} 个`)
      return
    }
    next.add(p.id)
  } else {
    next.delete(p.id)
  }
  selectedIds.value = next
}

const pageIds = computed(() => pagedRows.value.map((p) => p.id))

const allPageSelected = computed(() => {
  if (!pageIds.value.length) return false
  return pageIds.value.every((id) => selectedIds.value.has(id))
})

const somePageSelected = computed(() =>
  pageIds.value.some((id) => selectedIds.value.has(id)),
)

function onTogglePageAll(checked) {
  const next = new Set(selectedIds.value)
  if (checked) {
    for (const id of pageIds.value) {
      if (next.size >= props.maxAdd) {
        ElMessage.warning(`最多再选 ${props.maxAdd} 个`)
        break
      }
      next.add(id)
    }
  } else {
    for (const id of pageIds.value) next.delete(id)
  }
  selectedIds.value = next
}

function onResetFilters() {
  keywordInput.value = ''
  filterCategory.value = ''
  filterProductType.value = ''
  filterOwner.value = ''
  currentPage.value = 1
}

function onRefresh() {
  currentPage.value = 1
  ElMessage.success('已刷新列表（本地数据）')
}

function applyBatchKeywords() {
  const t = batchDraft.value.trim()
  if (!t) {
    batchPopoverVisible.value = false
    return
  }
  keywordInput.value = t
  batchPopoverVisible.value = false
  currentPage.value = 1
}

function onConfirm() {
  if (!selectedIds.value.size) {
    ElMessage.warning('请选择产品')
    return
  }
  const byId = new Map(basePool.value.map((p) => [p.id, p]))
  const list = []
  for (const id of selectedIds.value) {
    const p = byId.get(id)
    if (p) list.push(p)
  }
  emit('confirm', list)
  visible.value = false
}

const selectedCount = computed(() => selectedIds.value.size)
</script>

<template>
  <el-dialog
    v-model="visible"
    title="添加产品"
    width="min(1120px, 94vw)"
    top="4vh"
    destroy-on-close
    class="pp-add-dialog"
    append-to-body
  >
    <!-- 搜索 + 筛选 -->
    <div class="pp-add-toolbar">
      <div class="pp-add-search">
        <el-select v-model="searchField" style="width: 130px" size="default">
          <el-option
            v-for="o in SEARCH_FIELDS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
        <el-input
          v-model="keywordInput"
          clearable
          placeholder="请输入"
          size="default"
          class="pp-add-search-input"
          @keyup.enter="currentPage = 1"
        >
          <template #suffix>
            <el-icon class="pp-add-search-icon"><Search /></el-icon>
          </template>
        </el-input>
        <el-popover
          v-model:visible="batchPopoverVisible"
          placement="bottom"
          :width="400"
          trigger="manual"
        >
          <template #reference>
            <el-button class="pp-add-batch-btn" @click="batchPopoverVisible = !batchPopoverVisible">…</el-button>
          </template>
          <div class="pp-add-batch-panel">
            <p class="pp-add-batch-tip">一行一项或逗号分隔，多值 OR 匹配当前维度</p>
            <el-input v-model="batchDraft" type="textarea" :rows="6" placeholder="批量关键词" />
            <div class="pp-add-batch-actions">
              <el-button size="small" @click="batchPopoverVisible = false">取消</el-button>
              <el-button type="primary" size="small" @click="applyBatchKeywords">应用</el-button>
            </div>
          </div>
        </el-popover>
      </div>

      <el-select
        v-model="filterCategory"
        clearable
        placeholder="全部品类"
        style="width: 140px"
        size="default"
        @change="currentPage = 1"
      >
        <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select
        v-model="filterProductType"
        clearable
        placeholder="产品类型"
        style="width: 120px"
        size="default"
        @change="currentPage = 1"
      >
        <el-option v-for="t in productTypeOptions" :key="t" :label="t" :value="t" />
      </el-select>
      <el-select
        v-model="filterOwner"
        clearable
        filterable
        placeholder="产品负责人"
        style="width: 140px"
        size="default"
        @change="currentPage = 1"
      >
        <el-option v-for="o in ownerOptions" :key="o" :label="o" :value="o" />
      </el-select>

      <el-button size="default" @click="onResetFilters">重置</el-button>
      <el-button :icon="Refresh" circle size="default" title="刷新" @click="onRefresh" />
    </div>

    <!-- 表格 -->
    <el-table
      :data="pagedRows"
      :row-key="rowKey"
      border
      size="default"
      class="pp-add-table"
      max-height="420"
    >
      <el-table-column width="52" fixed>
        <template #header>
          <el-checkbox
            :model-value="allPageSelected"
            :indeterminate="somePageSelected && !allPageSelected"
            @change="onTogglePageAll"
          />
        </template>
        <template #default="{ row }">
          <el-checkbox
            :model-value="isSelected(row.id)"
            @change="(val) => toggleRow(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="图片" width="72" align="center">
        <template #default="{ row }">
          <div class="pp-add-thumb">
            <img v-if="row.imageUrl" :src="row.imageUrl" alt="" />
            <span v-else class="pp-add-thumb-ph">—</span>
            <span v-if="row.productType === '组合品'" class="pp-add-tag">组</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="产品名称 / SKU" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="pp-add-name-sku">
            <div class="pp-add-name">{{ row.nameCn || '—' }}</div>
            <div class="pp-add-sku">{{ row.sku || '—' }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="msku" label="MSKU" width="160" show-overflow-tooltip />
      <el-table-column label="品类" width="100" show-overflow-tooltip>
        <template #default="{ row }">{{ row.category || '—' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="88">
        <template #default="{ row }">{{ row.productType || '—' }}</template>
      </el-table-column>
      <el-table-column label="负责人" width="100" show-overflow-tooltip>
        <template #default="{ row }">{{ row.staff?.dev || '—' }}</template>
      </el-table-column>
    </el-table>

    <div class="pp-add-pagination">
      <span class="pp-add-total">共 {{ totalFiltered }} 条</span>
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="totalFiltered"
        :page-sizes="[10, 20, 50, 100]"
        layout="prev, pager, next, jumper, sizes"
        background
        small
      />
    </div>

    <template #footer>
      <div class="pp-add-footer">
        <el-button type="primary" plain disabled class="pp-add-count-btn">
          已选 {{ selectedCount }} 个产品
        </el-button>
        <div class="pp-add-footer-right">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" :disabled="!selectedCount" @click="onConfirm">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.pp-add-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.pp-add-search {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}
.pp-add-search :deep(.el-select .el-select__wrapper) {
  border-radius: 0;
  box-shadow: none;
}
.pp-add-search-input {
  width: 240px;
}
.pp-add-search-input :deep(.el-input__wrapper) {
  box-shadow: none;
  border-radius: 0;
  border-left: 1px solid #ebeef5;
}
.pp-add-search-icon {
  color: #909399;
  cursor: default;
}
.pp-add-batch-btn {
  min-width: 36px;
  padding: 0 10px;
  border: none;
  border-left: 1px solid #ebeef5;
  border-radius: 0;
  background: #f5f7fa;
  font-weight: 700;
  font-size: 16px;
}
.pp-add-batch-panel {
  padding: 4px 0;
}
.pp-add-batch-tip {
  font-size: 12px;
  color: #909399;
  margin: 0 0 8px;
}
.pp-add-batch-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.pp-add-table {
  width: 100%;
}
.pp-add-thumb {
  position: relative;
  width: 48px;
  height: 48px;
  margin: 0 auto;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
}
.pp-add-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pp-add-thumb-ph {
  font-size: 12px;
  color: #c0c4cc;
  line-height: 48px;
}
.pp-add-tag {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 10px;
  padding: 0 3px;
  background: #9254de;
  color: #fff;
  border-radius: 2px 0 0 0;
}
.pp-add-name-sku {
  line-height: 1.35;
}
.pp-add-name {
  font-size: 13px;
  color: #303133;
}
.pp-add-sku {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
.pp-add-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}
.pp-add-total {
  font-size: 13px;
  color: #606266;
}
.pp-add-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex-wrap: wrap;
  gap: 10px;
}
.pp-add-footer-right {
  display: flex;
  gap: 10px;
  margin-left: auto;
}
.pp-add-count-btn {
  cursor: default;
}
</style>
