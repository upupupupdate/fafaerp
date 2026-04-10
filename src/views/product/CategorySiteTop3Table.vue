<script setup>
import { computeShareRatioPct } from '@/features/product/categoryMock.js'

/**
 * 站点维度 TOP3 类目表格：列表 Popover（只读）与映射抽屉（可编辑）共用。
 * 占比由「上架 SKU 数 / 品类产品总数」自动计算，两位小数 + %；总数为 0 时显示 —。
 */
const props = defineProps({
  mapped: { type: Boolean, default: false },
  /** SiteTop3Item[] */
  rows: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false },
  /** 禁用时整表灰显 */
  disabled: { type: Boolean, default: false },
})

function intDisplay(t, key) {
  if (!props.mapped || t == null) return '—'
  const v = t[key]
  if (v == null || !Number.isFinite(Number(v))) return '—'
  return String(Math.round(Number(v)))
}

function shareDisplay(t) {
  if (!props.mapped || t == null) return '—'
  const p = computeShareRatioPct(t.listedSkuCount, t.listedProductTotal)
  if (p == null || !Number.isFinite(p)) return '—'
  return `${Number(p).toFixed(2)}%`
}

function syncShareToRow(row) {
  const p = computeShareRatioPct(row.listedSkuCount, row.listedProductTotal)
  row.shareRatioPct = p == null ? 0 : p
}
</script>

<template>
  <div class="cst3-wrap" :class="{ 'is-disabled': disabled || !mapped }">
    <el-table
      :data="rows"
      border
      size="small"
      class="cst3-table"
      empty-text="未配置"
      :show-header="true"
      table-layout="fixed"
    >
      <el-table-column label="Amazon类目top3" min-width="320" show-overflow-tooltip>
        <template #default="{ row }">
          <template v-if="editable">
            <el-input
              v-model="row.path"
              size="small"
              class="cst3-path-input"
              placeholder="类目路径"
              :disabled="disabled || !mapped"
            />
          </template>
          <template v-else>
            <a
              v-if="mapped && row.url"
              class="cst3-link"
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ row.path || '—' }}</a>
            <span v-else class="cst3-text">{{ mapped ? (row.path || '—') : '—' }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="NodeId" min-width="128" align="center">
        <template #default="{ row }">
          <el-input
            v-if="editable"
            v-model="row.browseNodeId"
            size="small"
            :disabled="disabled || !mapped"
          />
          <span v-else class="cst3-num">{{ mapped ? (row.browseNodeId || '—') : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="上架SKU数"
        min-width="124"
        align="right"
        header-align="right"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <el-input-number
            v-if="editable"
            v-model="row.listedSkuCount"
            :min="0"
            :precision="0"
            :step="1"
            :disabled="disabled || !mapped"
            controls-position="right"
            class="cst3-inum"
          />
          <span v-else class="cst3-num">{{ intDisplay(row, 'listedSkuCount') }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="品类产品总数"
        min-width="132"
        align="right"
        header-align="right"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <el-input-number
            v-if="editable"
            v-model="row.listedProductTotal"
            :min="0"
            :precision="0"
            :step="1"
            :disabled="disabled || !mapped"
            controls-position="right"
            class="cst3-inum"
            @change="syncShareToRow(row)"
          />
          <span v-else class="cst3-num">{{ intDisplay(row, 'listedProductTotal') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="占比" min-width="118" align="right" header-align="right">
        <template #default="{ row }">
          <span class="cst3-num">{{ shareDisplay(row) }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.cst3-wrap {
  min-width: 0;
}
.cst3-wrap.is-disabled {
  opacity: 0.72;
}
.cst3-table {
  width: 100%;
  min-width: 0;
}
.cst3-path-input {
  width: 100%;
}
.cst3-path-input :deep(.el-input__wrapper) {
  width: 100%;
}
.cst3-table :deep(.el-table__header th) {
  font-size: 12px;
  padding: 6px 0;
}
.cst3-table :deep(.el-table__body td) {
  padding: 4px 6px;
  font-size: 12px;
}
.cst3-link {
  color: #409eff;
  text-decoration: none;
  word-break: break-word;
}
.cst3-link:hover {
  text-decoration: underline;
}
.cst3-text {
  color: #303133;
  word-break: break-word;
}
.cst3-num {
  font-variant-numeric: tabular-nums;
  color: #606266;
}
.cst3-inum {
  width: 100% !important;
  max-width: 100%;
}
.cst3-inum :deep(.el-input__wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}
</style>
