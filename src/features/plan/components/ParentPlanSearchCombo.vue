<script setup>
/**
 * 与上架跟踪 ListingFilterBar 中「ASIN/品名」搜索区同款交互：
 * 左侧字段切换、关键词模糊；右侧「…」批量精确（多行 OR）。
 */
import { Search } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const BATCH_MAX_LINES = 500

const searchField = defineModel('searchField', { default: 'asin' })
const searchKeyword = defineModel('searchKeyword', { default: '' })
const searchBatchExact = defineModel('searchBatchExact', { default: false })

const batchPopoverVisible = ref(false)
const draftBatchText = ref('')

function keywordToDraftLines(kw) {
  if (!kw || !String(kw).trim()) return ''
  return String(kw)
    .split(/[\n,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')
}

watch(batchPopoverVisible, (vis) => {
  if (vis) draftBatchText.value = keywordToDraftLines(searchKeyword.value)
})

const batchLineCount = computed(() => {
  const lines = draftBatchText.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  const n = new Set(lines).size
  return Math.min(n, BATCH_MAX_LINES)
})

function parseBatchApply(text) {
  const raw = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  const uniq = [...new Set(raw)]
  if (uniq.length > BATCH_MAX_LINES) {
    ElMessage.warning(`最多 ${BATCH_MAX_LINES} 条，已截取前 ${BATCH_MAX_LINES} 条`)
    return uniq.slice(0, BATCH_MAX_LINES)
  }
  return uniq
}

function onBatchClear() {
  draftBatchText.value = ''
}

function onBatchCancel() {
  batchPopoverVisible.value = false
}

function onBatchApply() {
  const lines = parseBatchApply(draftBatchText.value)
  if (!lines.length) {
    searchKeyword.value = ''
    searchBatchExact.value = false
    batchPopoverVisible.value = false
    return
  }
  searchKeyword.value = lines.join('\n')
  searchBatchExact.value = true
  batchPopoverVisible.value = false
}

function onSearchInputClear() {
  searchBatchExact.value = false
}
</script>

<template>
  <div
    class="ppc-search ppc-search-combo"
    :class="{ 'is-batch-exact': searchBatchExact }"
  >
    <el-select v-model="searchField" style="width: 96px" size="small" class="ppc-search-field">
      <el-option label="ASIN" value="asin" />
      <el-option label="项目名称" value="projectName" />
    </el-select>
    <el-input
      v-model="searchKeyword"
      :placeholder="searchBatchExact ? '批量精准已启用，点击右侧 … 编辑多值' : '请输入关键词'"
      clearable
      size="small"
      class="ppc-search-input"
      @clear="onSearchInputClear"
    >
      <template #suffix>
        <span class="ppc-suffix-inner">
          <el-icon class="ppc-suffix-icon" :size="15"><Search /></el-icon>
          <span class="ppc-suffix-divider" />
          <el-popover
            v-model:visible="batchPopoverVisible"
            placement="bottom"
            :width="440"
            trigger="manual"
            :teleported="true"
            popper-class="ppc-batch-popper"
          >
            <template #reference>
              <button
                type="button"
                class="ppc-batch-btn"
                :class="{ active: searchBatchExact }"
                title="批量精确搜索"
                aria-label="批量精确搜索"
                @click.stop="batchPopoverVisible = !batchPopoverVisible"
              >
                …
              </button>
            </template>
            <div class="ppc-batch-panel">
              <el-input
                v-model="draftBatchText"
                type="textarea"
                :rows="10"
                resize="none"
                class="ppc-batch-textarea"
                placeholder="一行一项，按回车键换行，最多500行，重复数据判断为一行"
              />
              <div class="ppc-batch-counter">{{ batchLineCount }} / {{ BATCH_MAX_LINES }} 行</div>
              <div class="ppc-batch-actions">
                <el-button size="small" @click="onBatchClear">清空</el-button>
                <span class="ppc-batch-actions-right">
                  <el-button size="small" @click="onBatchCancel">取消</el-button>
                  <el-button type="primary" size="small" @click="onBatchApply">搜索</el-button>
                </span>
              </div>
            </div>
          </el-popover>
        </span>
      </template>
    </el-input>
  </div>
</template>

<style scoped>
.ppc-search-combo {
  display: flex;
  align-items: stretch;
  width: min(400px, 100%);
  flex: 1;
  min-width: 240px;
  max-width: 420px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: visible;
  background: #fff;
}
.ppc-search-combo:focus-within,
.ppc-search-combo.is-batch-exact {
  border-color: #409eff;
}
.ppc-search-field :deep(.el-select__wrapper) {
  box-shadow: none;
  border-radius: 0;
  border-right: 1px solid #e8ecf0;
}
.ppc-search-input {
  flex: 1;
  min-width: 0;
}
.ppc-search-input :deep(.el-input__wrapper) {
  box-shadow: none;
  padding-right: 4px;
}
.ppc-suffix-inner {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-right: 4px;
}
.ppc-suffix-icon {
  color: #909399;
}
.ppc-suffix-divider {
  width: 1px;
  height: 14px;
  background: #e4e7ed;
  margin: 0 2px;
}
.ppc-batch-btn {
  min-width: 26px;
  height: 22px;
  padding: 0 6px;
  margin: 0;
  border: none;
  border-radius: 4px;
  background: #f5f7fa;
  color: #606266;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  flex-shrink: 0;
}
.ppc-batch-btn:hover {
  background: #e6e8eb;
  color: #409eff;
}
.ppc-batch-btn.active {
  background: #ecf5ff;
  color: #409eff;
}
.ppc-batch-panel {
  padding: 2px 0 0;
}
.ppc-batch-textarea :deep(.el-textarea__inner) {
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  background: #f5f7fa;
}
.ppc-batch-counter {
  text-align: right;
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
.ppc-batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.ppc-batch-actions-right {
  display: inline-flex;
  gap: 8px;
}
</style>

<style>
.ppc-batch-popper.el-popper {
  z-index: 5000 !important;
  padding: 12px 14px;
}
</style>
