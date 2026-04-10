<script setup>
import { Filter, Search } from '@element-plus/icons-vue'
import { computed, ref, useSlots, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { LISTING_STAFF_OPTIONS, STATUS_FILTER_OPTIONS } from '@/features/listing/listingDefs.js'

const props = defineProps({
  /** 状态多选选项；不传则与上架跟踪全量一致 */
  statusFilterOptions: { type: Array, default: null },
})

const statusOptionsResolved = computed(() =>
  props.statusFilterOptions?.length ? props.statusFilterOptions : STATUS_FILTER_OPTIONS,
)

const SHOPS = ['US站', 'UK站', 'DE站', 'JP站', 'CA站', 'AU站']
const CATS = ['个护', '美妆', '户外', '家居', '母婴', '运动', '数码', '服饰', '文具', '食品', '宠物', '厨具']
const SCENES = ['防晒', '日妆', '运动', '收纳', '护肤', '健身', '露营', '通勤', '居家', '学习']
const SEASONS = ['夏季', '春季', '全季', '冬季', '秋季']
const BRANDS = ['自研', '代工', 'OEM', '联名', '私标']

const BATCH_MAX_LINES = 500

const searchField = defineModel('searchField', { default: 'name' })
const searchKeyword = defineModel('searchKeyword', { default: '' })
const searchBatchExact = defineModel('searchBatchExact', { default: false })
const filterListing = defineModel('filterListing', { default: '' })
const filterDesign = defineModel('filterDesign', { default: '' })
const filterShop = defineModel('filterShop', { default: () => [] })
const filterBrand = defineModel('filterBrand', { default: () => [] })
const filterPType = defineModel('filterPType', { default: () => [] })
const filterCategory = defineModel('filterCategory', { default: () => [] })
const filterScene = defineModel('filterScene', { default: () => [] })
const filterSeason = defineModel('filterSeason', { default: () => [] })
const filterTimeField = defineModel('filterTimeField', { default: '' })
const filterDateRange = defineModel('filterDateRange', { default: () => [] })
const filterStatusKeys = defineModel('filterStatusKeys', { default: () => [] })
const listSort = defineModel('listSort', { default: '' })
const filterAuthMode = defineModel('filterAuthMode', { default: '' })
const filterStaffOps = defineModel('filterStaffOps', { default: () => [] })
const filterStaffDev = defineModel('filterStaffDev', { default: () => [] })
const filterStaffDesign = defineModel('filterStaffDesign', { default: () => [] })
const filterStaffPhoto = defineModel('filterStaffPhoto', { default: () => [] })
const filterStaffPurchase = defineModel('filterStaffPurchase', { default: () => [] })
const filterNeedShoot = defineModel('filterNeedShoot', { default: null })
const filterNeedSample = defineModel('filterNeedSample', { default: null })
const filterHasParentPlan = defineModel('filterHasParentPlan', { default: null })
/** null=不限 true=仅超时 false=仅非超时 */
const filterTimeout = defineModel('filterTimeout', { default: null })

const emit = defineEmits(['reset'])
const slots = useSlots()

const morePopoverVisible = ref(false)
const batchPopoverVisible = ref(false)
const draftBatchText = ref('')

function keywordToDraftLines(kw) {
  if (!kw || !String(kw).trim()) return ''
  return String(kw)
    .split(/[\n,，;；]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .join('\n')
}

watch(batchPopoverVisible, vis => {
  if (vis) draftBatchText.value = keywordToDraftLines(searchKeyword.value)
})

const batchLineCount = computed(() => {
  const lines = draftBatchText.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  const n = new Set(lines).size
  return Math.min(n, BATCH_MAX_LINES)
})

function parseBatchApply(text) {
  const raw = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
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

const moreFiltersActive = computed(() => {
  if (
    filterStaffOps.value?.length ||
    filterStaffDev.value?.length ||
    filterStaffDesign.value?.length ||
    filterStaffPhoto.value?.length ||
    filterStaffPurchase.value?.length
  ) {
    return true
  }
  if (filterNeedShoot.value === true || filterNeedShoot.value === false) return true
  if (filterNeedSample.value === true || filterNeedSample.value === false) return true
  if (filterHasParentPlan.value === true || filterHasParentPlan.value === false) return true
  return false
})

function clearMoreFilters() {
  filterStaffOps.value = []
  filterStaffDev.value = []
  filterStaffDesign.value = []
  filterStaffPhoto.value = []
  filterStaffPurchase.value = []
  filterNeedShoot.value = null
  filterNeedSample.value = null
  filterHasParentPlan.value = null
  filterTimeout.value = null
}

function closeMorePopover() {
  morePopoverVisible.value = false
}
</script>

<template>
  <div class="lfb-wrap">
    <!-- 第 1 行：主筛选 -->
    <div class="lfb-row lfb-row1">
      <el-select
        v-model="filterStatusKeys"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="全部状态（多选）"
        clearable
        size="small"
        class="lfb-status-multi"
      >
        <el-option
          v-for="o in statusOptionsResolved"
          :key="o.key"
          :label="o.label"
          :value="o.key"
        />
      </el-select>

      <el-select v-model="filterListing" placeholder="Listing状态" clearable size="small" class="lfb-sel">
        <el-option label="已上传" value="已上传" />
        <el-option label="未上传" value="未上传" />
      </el-select>

      <el-select v-model="filterDesign" placeholder="平面状态" clearable size="small" class="lfb-sel">
        <el-option label="待平面设计" value="待平面设计" />
        <el-option label="完成平面设计" value="完成平面设计" />
      </el-select>

      <el-select
        v-model="filterTimeout"
        placeholder="超时"
        clearable
        size="small"
        class="lfb-sel"
        style="width: 88px"
      >
        <el-option label="是" :value="true" />
        <el-option label="否" :value="false" />
      </el-select>

      <el-select
        v-model="filterShop"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="站点/店铺"
        clearable
        size="small"
        class="lfb-sel lfb-sel-multi"
      >
        <el-option v-for="s in SHOPS" :key="s" :label="s" :value="s" />
      </el-select>

      <el-select
        v-model="filterBrand"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="品牌"
        clearable
        size="small"
        class="lfb-sel lfb-sel-multi"
      >
        <el-option v-for="b in BRANDS" :key="b" :label="b" :value="b" />
      </el-select>

      <el-select
        v-model="filterPType"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="产品类型"
        clearable
        size="small"
        class="lfb-sel lfb-sel-multi"
      >
        <el-option label="单品" value="单品" />
        <el-option label="组合品" value="组合品" />
      </el-select>

      <el-select
        v-model="filterCategory"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="品类"
        clearable
        size="small"
        class="lfb-sel lfb-sel-multi"
      >
        <el-option v-for="c in CATS" :key="c" :label="c" :value="c" />
      </el-select>

      <el-select
        v-model="filterScene"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="场景"
        clearable
        size="small"
        class="lfb-sel lfb-sel-multi"
      >
        <el-option v-for="s in SCENES" :key="s" :label="s" :value="s" />
      </el-select>

      <el-select
        v-model="filterSeason"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="季节"
        clearable
        size="small"
        class="lfb-sel lfb-sel-multi"
      >
        <el-option v-for="s in SEASONS" :key="s" :label="s" :value="s" />
      </el-select>

      <div class="lfb-time-combo">
        <el-select v-model="filterTimeField" placeholder="时间类型" clearable size="small" class="lfb-time-type">
          <el-option label="运营分配时间" value="authTime" />
          <el-option label="建PL单时间" value="planTime" />
          <el-option label="采购下单时间" value="poTime" />
          <el-option label="备货入库时间" value="inboundTime" />
          <el-option label="货件发出时间" value="sendTime" />
          <el-option label="FBA到仓时间" value="inTransitTime" />
          <el-option label="开售时间" value="launchTime" />
          <el-option label="Listing上传" value="listingUploadTime" />
        </el-select>
        <el-date-picker
          v-model="filterDateRange"
          type="daterange"
          size="small"
          range-separator="~"
          start-placeholder="开始"
          end-placeholder="结束"
          class="lfb-date-range"
        />
      </div>

      <el-select v-model="listSort" placeholder="排序" clearable size="small" class="lfb-sel lfb-sort">
        <el-option label="默认" value="" />
        <el-option label="开发授权时间升序" value="auth_asc" />
        <el-option label="开发授权时间降序" value="auth_desc" />
      </el-select>
    </div>

    <!-- 第 2 行：搜索 + 操作 -->
    <div class="lfb-row lfb-row2">
      <div
        class="lfb-search lfb-search-combo"
        :class="{ 'is-batch-exact': searchBatchExact }"
      >
        <el-select v-model="searchField" style="width: 72px" size="small" class="lfb-search-field">
          <el-option label="品名" value="name" />
          <el-option label="SKU" value="sku" />
          <el-option label="MSKU" value="msku" />
          <el-option label="ASIN" value="asin" />
        </el-select>
        <el-input
          v-model="searchKeyword"
          :placeholder="searchBatchExact ? '批量精准已启用，点击右侧 … 编辑多值' : '请输入关键词'"
          clearable
          size="small"
          class="lfb-search-input"
          @clear="onSearchInputClear"
        >
          <template #suffix>
            <span class="lfb-suffix-inner">
              <el-icon class="lfb-suffix-icon" :size="15"><Search /></el-icon>
              <span class="lfb-suffix-divider" />
              <!-- 不用 el-tooltip 包住 reference：会与 el-popover 的点击触发冲突，导致弹层打不开 -->
              <el-popover
                v-model:visible="batchPopoverVisible"
                placement="bottom"
                :width="440"
                trigger="manual"
                :teleported="true"
                popper-class="lfb-batch-popper"
              >
                <template #reference>
                  <button
                    type="button"
                    class="lfb-batch-btn"
                    :class="{ active: searchBatchExact }"
                    title="批量精确搜索"
                    aria-label="批量精确搜索"
                    @click.stop="batchPopoverVisible = !batchPopoverVisible"
                  >
                    …
                  </button>
                </template>
                <div class="lfb-batch-panel">
                  <el-input
                    v-model="draftBatchText"
                    type="textarea"
                    :rows="10"
                    resize="none"
                    class="lfb-batch-textarea"
                    :placeholder="'一行一项，按回车键换行，最多500行，重复数据判断为一行'"
                  />
                  <div class="lfb-batch-counter">{{ batchLineCount }} / {{ BATCH_MAX_LINES }} 行</div>
                  <div class="lfb-batch-actions">
                    <el-button size="small" @click="onBatchClear">清空</el-button>
                    <span class="lfb-batch-actions-right">
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

      <el-select v-model="filterAuthMode" placeholder="授权方式" clearable size="small" class="lfb-sel lfb-auth">
        <el-option label="全部" value="" />
        <el-option label="人工" value="manual" />
        <el-option label="系统" value="system" />
      </el-select>

      <el-popover
        v-model:visible="morePopoverVisible"
        placement="bottom-start"
        :width="400"
        trigger="click"
        popper-class="lfb-more-popper"
      >
        <template #reference>
          <el-button
            size="small"
            class="lfb-more-btn"
            :class="{ 'is-active': moreFiltersActive }"
          >
            <el-icon class="lfb-more-icon"><Filter /></el-icon>
            更多筛选
          </el-button>
        </template>
        <div class="lfb-more-popover-inner">
          <div class="lfb-more-scroll">
            <div class="lfb-more-title">更多筛选</div>
            <div class="lfb-more-form">
              <div class="lfb-more-row lfb-more-row--staff-multi">
                <span class="lfb-more-label">运营</span>
                <el-select
                  v-model="filterStaffOps"
                  multiple
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field lfb-more-field-multi"
                >
                  <el-option v-for="n in LISTING_STAFF_OPTIONS.ops" :key="n" :label="n" :value="n" />
                </el-select>
              </div>
              <div class="lfb-more-row lfb-more-row--staff-multi">
                <span class="lfb-more-label">开发</span>
                <el-select
                  v-model="filterStaffDev"
                  multiple
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field lfb-more-field-multi"
                >
                  <el-option v-for="n in LISTING_STAFF_OPTIONS.dev" :key="n" :label="n" :value="n" />
                </el-select>
              </div>
              <div class="lfb-more-row lfb-more-row--staff-multi">
                <span class="lfb-more-label">平面</span>
                <el-select
                  v-model="filterStaffDesign"
                  multiple
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field lfb-more-field-multi"
                >
                  <el-option v-for="n in LISTING_STAFF_OPTIONS.design" :key="n" :label="n" :value="n" />
                </el-select>
              </div>
              <div class="lfb-more-row lfb-more-row--staff-multi">
                <span class="lfb-more-label">摄影</span>
                <el-select
                  v-model="filterStaffPhoto"
                  multiple
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field lfb-more-field-multi"
                >
                  <el-option v-for="n in LISTING_STAFF_OPTIONS.photo" :key="n" :label="n" :value="n" />
                </el-select>
              </div>
              <div class="lfb-more-row lfb-more-row--staff-multi">
                <span class="lfb-more-label">采购</span>
                <el-select
                  v-model="filterStaffPurchase"
                  multiple
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field lfb-more-field-multi"
                >
                  <el-option v-for="n in LISTING_STAFF_OPTIONS.purchase" :key="n" :label="n" :value="n" />
                </el-select>
              </div>
              <div class="lfb-more-row">
                <span class="lfb-more-label">需要拍摄</span>
                <el-select
                  v-model="filterNeedShoot"
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field"
                >
                  <el-option label="是" :value="true" />
                  <el-option label="否" :value="false" />
                </el-select>
              </div>
              <div class="lfb-more-row">
                <span class="lfb-more-label">需要样品</span>
                <el-select
                  v-model="filterNeedSample"
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field"
                >
                  <el-option label="是" :value="true" />
                  <el-option label="否" :value="false" />
                </el-select>
              </div>
              <div class="lfb-more-row">
                <span class="lfb-more-label">存在父体规划</span>
                <el-select
                  v-model="filterHasParentPlan"
                  clearable
                  placeholder="全部"
                  size="small"
                  class="lfb-more-field"
                >
                  <el-option label="是" :value="true" />
                  <el-option label="否" :value="false" />
                </el-select>
              </div>
            </div>
          </div>
          <div class="lfb-more-popover-footer">
            <el-button size="small" @click="clearMoreFilters">清空条件</el-button>
            <el-button type="primary" size="small" @click="closeMorePopover">确定</el-button>
          </div>
        </div>
      </el-popover>

      <el-button type="primary" size="small" class="lfb-query-btn">查询</el-button>
      <el-button size="small" @click="emit('reset')">重置</el-button>
    </div>

    <!-- 第 3 行：系统视图 + 已选标签（由父级 slot 提供） -->
    <div v-if="slots.footer" class="lfb-row lfb-row3">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.lfb-wrap {
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  padding: 10px 16px 8px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lfb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
}
.lfb-row1 {
  align-items: center;
}
.lfb-row2 {
  align-items: center;
}
.lfb-row3 {
  align-items: center;
  padding-top: 4px;
  border-top: 1px solid #f0f2f5;
  margin-top: 2px;
}
.lfb-search-combo {
  display: flex;
  align-items: stretch;
  width: 400px;
  flex-shrink: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: visible;
  background: #fff;
}
.lfb-search-combo:focus-within,
.lfb-search-combo.is-batch-exact {
  border-color: #409eff;
}
.lfb-search-field :deep(.el-select__wrapper) {
  box-shadow: none;
  border-radius: 0;
  border-right: 1px solid #e8ecf0;
}
.lfb-search-input {
  flex: 1;
  min-width: 0;
}
.lfb-search-input :deep(.el-input__wrapper) {
  box-shadow: none;
  padding-right: 4px;
}
.lfb-suffix-inner {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-right: 4px;
}
.lfb-suffix-icon {
  color: #909399;
}
.lfb-suffix-divider {
  width: 1px;
  height: 14px;
  background: #e4e7ed;
  margin: 0 2px;
}
.lfb-batch-btn {
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
.lfb-batch-btn:hover {
  background: #e6e8eb;
  color: #409eff;
}
.lfb-batch-btn.active {
  background: #ecf5ff;
  color: #409eff;
}
.lfb-batch-panel {
  padding: 2px 0 0;
}
.lfb-batch-textarea :deep(.el-textarea__inner) {
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  background: #f5f7fa;
}
.lfb-batch-counter {
  text-align: right;
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
.lfb-batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.lfb-batch-actions-right {
  display: inline-flex;
  gap: 8px;
}
.lfb-status-multi {
  width: 220px;
  flex-shrink: 0;
}
.lfb-sel {
  width: 110px;
  flex-shrink: 0;
}
.lfb-sel-multi {
  width: 148px;
}
.lfb-sort {
  width: 130px;
}
.lfb-auth {
  width: 100px;
}
.lfb-more-btn {
  border: 1px solid #409eff;
  color: #409eff;
  background: #fff;
}
.lfb-more-btn.is-active {
  background: #ecf5ff;
  border-color: #409eff;
  font-weight: 600;
}
.lfb-more-icon {
  margin-right: 4px;
  vertical-align: middle;
}
.lfb-more-popover-inner {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 400px;
}
.lfb-more-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.lfb-more-scroll {
  max-height: min(42vh, 320px);
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 2px;
}
.lfb-more-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 4px;
}
.lfb-more-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lfb-more-row--staff-multi {
  align-items: flex-start;
}
.lfb-more-row--staff-multi .lfb-more-label {
  padding-top: 4px;
}
.lfb-more-field-multi {
  width: 100%;
}
.lfb-more-field-multi :deep(.el-select__wrapper) {
  min-height: 28px;
}
.lfb-more-label {
  flex: 0 0 92px;
  font-size: 12px;
  color: #606266;
  text-align: right;
}
.lfb-more-field {
  flex: 1;
  min-width: 0;
}
.lfb-more-popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}
.lfb-query-btn {
  min-width: 76px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.35);
}
.lfb-query-btn:hover {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.45);
}
.lfb-time-combo {
  display: inline-flex;
  align-items: center;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}
.lfb-time-combo:focus-within {
  border-color: #409eff;
}
.lfb-time-type {
  width: 118px;
  flex-shrink: 0;
}
.lfb-time-type :deep(.el-select__wrapper) {
  box-shadow: none;
  border-radius: 0;
  border-right: 1px solid #e8ecf0;
}
.lfb-date-range {
  width: 200px;
  flex-shrink: 0;
}
.lfb-date-range :deep(.el-input__wrapper) {
  box-shadow: none;
}
</style>

<style>
/* popper 挂载在 body，需非 scoped */
.lfb-batch-popper.el-popper {
  z-index: 5000 !important;
  padding: 12px 14px;
}
.lfb-more-popper.el-popper {
  padding: 12px 14px 14px;
  max-width: min(96vw, 420px);
}
.lfb-more-popper.el-popper .lfb-more-scroll {
  /* 与 scoped 内一致，确保 teleported 内容高度受限 */
  max-height: min(42vh, 320px);
}
</style>
