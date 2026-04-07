<script setup>
// 上架跟踪 — Listing 详情抽屉（原型：浅灰底、白卡片、品牌蓝装饰、左目录锚点、紧凑步骤条）
import { computed, ref, watch } from 'vue'
import { buildListingDetailViewModel, disp } from '@/features/listing/listingDetailViewModel.js'
import { resolveMainStatus } from '@/features/listing/listingDefs.js'
import { getPurchasePlanDraft } from '@/features/listing/purchasePlanDraft.js'
import ListingTimeline from './ListingTimeline.vue'
import PurchasePlanEditorDialog from './PurchasePlanEditorDialog.vue'

const open = defineModel({ type: Boolean, default: false })

const props = defineProps({
  product: { type: Object, default: null },
  /** 上架跟踪当前筛选结果，供采购计划「从列表添加」；不传则仅当前行 */
  pickerProducts: { type: Array, default: () => [] },
})

const vm = computed(() => buildListingDetailViewModel(props.product))

/** 本地草稿变更后递增，触发 purchaseDraft 重新读取 localStorage */
const draftTick = ref(0)
const purchaseDraft = computed(() => {
  void draftTick.value
  const id = props.product?.id
  if (id == null) return null
  return getPurchasePlanDraft(id)
})

/** 待建计划 + 备货中：可编辑采购草稿；否则仅可查看已存草稿 */
const canEditPurchaseDraft = computed(() => {
  const p = props.product
  if (!p) return false
  return resolveMainStatus(p) === 'stocking' && p.subNode === 'plan_pending'
})

const showPurchasePlanEntry = computed(
  () => canEditPurchaseDraft.value || !!purchaseDraft.value,
)

const purchasePlanDialogOpen = ref(false)

/** 新建草稿时预填当前行；已有草稿则不预填（由 initialDraftId 加载） */
const detailPrefillIds = computed(() => {
  if (purchaseDraft.value) return []
  if (!props.product?.id) return []
  return [props.product.id]
})

const editorPickerSource = computed(() => {
  if (props.pickerProducts?.length) return props.pickerProducts
  return props.product ? [props.product] : []
})

function bumpPurchaseDraft() {
  draftTick.value++
}

watch(open, (v) => {
  if (v) bumpPurchaseDraft()
})

function scrollToSection(id) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const navItems = [
  { id: 'ld-section-product', label: '产品信息' },
  { id: 'ld-section-ref', label: '参考信息' },
  { id: 'ld-section-purchase', label: '采购信息' },
  { id: 'ld-section-files', label: '文件信息' },
  { id: 'ld-section-log', label: '操作日志' },
]

const productGridFields = [
  { label: 'SKU', key: 'sku' },
  { label: 'MSKU', key: 'msku' },
  { label: 'ASIN', key: 'asin' },
  { label: '品牌', key: 'brand' },
  { label: '运营', key: 'ops' },
  { label: '店铺', key: 'shop' },
  { label: '市场', key: 'market' },
  { label: '人群', key: 'crowd' },
  { label: '材质', key: 'material' },
  { label: '工艺', key: 'craft' },
  { label: '开发', key: 'dev' },
  { label: '授权时间', key: 'authTime' },
]

const purchaseCells = computed(() => [
  { lab: '是否采购', val: vm.value?.isPurchased },
  { lab: '负责人', val: vm.value?.purchaseOwner },
  { lab: '首批起订量', val: vm.value?.firstMoq },
  { lab: '参考成本', val: vm.value?.refCost },
  { lab: '计划交期', val: vm.value?.planDelivery },
  { lab: '采购周期', val: vm.value?.purchaseLeadTime },
  { lab: '单品毛重', val: vm.value?.unitWeightG },
  { lab: '包装尺寸', val: vm.value?.packageSizeCm },
])
</script>

<template>
  <el-drawer
    v-model="open"
    size="90%"
    direction="rtl"
    destroy-on-close
    class="ld-drawer"
  >
    <template #header>
      <div class="ld-drawer-header-inner">
        <div class="ld-drawer-title">
          <span class="ld-drawer-title-text">Listing 详情</span>
          <el-tag v-if="vm?.statusHeadline" type="primary" effect="light" size="small">
            {{ vm.statusHeadline }}
          </el-tag>
          <span v-if="vm?.statusSub" class="ld-status-sub">{{ vm.statusSub }}</span>
        </div>
        <div class="ld-toolbar">
          <el-button
            v-if="showPurchasePlanEntry"
            type="primary"
            plain
            size="small"
            @click="purchasePlanDialogOpen = true"
          >
            {{ purchaseDraft ? '采购计划草稿' : '创建采购计划草稿' }}
          </el-button>
          <el-button size="small" disabled>修改</el-button>
          <el-button size="small" disabled>保存</el-button>
          <el-button size="small" disabled>同步</el-button>
          <el-button size="small" disabled>复制 SKU</el-button>
          <el-button size="small" type="danger" plain disabled>下架</el-button>
        </div>
      </div>
    </template>

    <div v-if="vm && product" class="ld-drawer-body">
      <div class="ld-shell">
        <aside class="ld-nav">
          <div class="ld-nav-title">目录</div>
          <button
            v-for="item in navItems"
            :key="item.id"
            type="button"
            class="ld-nav-item"
            @click="scrollToSection(item.id)"
          >
            {{ item.label }}
          </button>
        </aside>

        <div class="ld-main">
          <div class="ld-timeline-strip">
            <ListingTimeline
              compact
              :timeline="product.timeline"
              :transition-infos="product.transitionInfos"
            />
          </div>

          <!-- 产品信息 -->
          <section id="ld-section-product" class="ld-section-card ld-section">
            <h3 class="ld-card-title">产品信息</h3>
            <div class="ld-product-body">
              <div class="ld-product-thumb">
                <img v-if="vm.imageUrl" :src="vm.imageUrl" :alt="disp(vm.productName)" />
                <span v-else class="ld-thumb-ph">主图</span>
              </div>
              <div class="ld-product-right">
                <div class="ld-product-title-row">
                  <h2 class="ld-product-name">{{ disp(vm.productName) }}</h2>
                  <div class="ld-product-tags">
                    <el-tag
                      v-for="(t, i) in vm.productTags"
                      :key="i"
                      :type="t.elType"
                      effect="light"
                      size="small"
                    >
                      {{ t.label }}
                    </el-tag>
                  </div>
                </div>
                <div class="ld-product-grid">
                  <div
                    v-for="f in productGridFields"
                    :key="f.key"
                    class="ld-pgrid-item"
                  >
                    <span class="ld-pgrid-lab">{{ f.label }}</span>
                    <span class="ld-pgrid-val">{{ disp(vm[f.key]) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 参考信息 -->
          <section id="ld-section-ref" class="ld-section-card ld-section">
            <h3 class="ld-card-title">参考信息</h3>

            <div class="ld-field-block">
              <div class="ld-field-label">开发思路</div>
              <div class="ld-dev-idea-box">{{ disp(vm.devIdea) }}</div>
            </div>

            <div class="ld-field-block ld-ref-photos">
              <div class="ld-field-label">参考图</div>
              <div class="ld-ref-img-row">
                <div
                  v-for="(slot, i) in vm.refImageThumbs"
                  :key="i"
                  class="ld-ref-slot"
                >
                  <img v-if="slot.url" :src="slot.url" alt="" />
                  <span v-else class="ld-ref-slot-ph">{{ disp('') }}</span>
                </div>
              </div>
              <div class="ld-ref-link-row">
                <a
                  v-for="(lnk, i) in vm.refImageLinks"
                  :key="i"
                  :href="lnk.href"
                  class="ld-ref-link"
                >{{ lnk.text }}</a>
              </div>
            </div>

            <div class="ld-ref-double">
              <div class="ld-ref-row">
                <div class="ld-ref-col">
                  <div class="ld-field-label">核心关键词</div>
                  <div class="ld-text-block">{{ disp(vm.coreKeywords) }}</div>
                </div>
                <div class="ld-ref-col">
                  <div class="ld-field-label">文字元素</div>
                  <div class="ld-text-block">{{ disp(vm.textElements) }}</div>
                </div>
              </div>
              <div class="ld-ref-row">
                <div class="ld-ref-col">
                  <div class="ld-field-label">变体规划</div>
                  <div class="ld-text-block">{{ disp(vm.variantPlan) }}</div>
                </div>
                <div class="ld-ref-col">
                  <div class="ld-field-label">备注</div>
                  <div class="ld-text-block">{{ disp(vm.remarkEarlyLate) }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- 采购信息 -->
          <section id="ld-section-purchase" class="ld-section-card ld-section">
            <h3 class="ld-card-title">采购信息</h3>

            <el-alert
              v-if="purchaseDraft"
              type="success"
              :closable="false"
              show-icon
              class="ld-purchase-draft-alert"
            >
              <template #title>
                <span class="ld-draft-title">本地采购计划草稿</span>
              </template>
              <div class="ld-draft-lines">
                <div><span class="ld-draft-k">计划单号</span>{{ purchaseDraft.outerNo }}</div>
                <div><span class="ld-draft-k">本单 SKU 数</span>{{ purchaseDraft.items?.length ?? 0 }}</div>
                <div><span class="ld-draft-k">状态</span>本地草稿（未同步三方）</div>
                <div v-if="purchaseDraft.updatedAt">
                  <span class="ld-draft-k">最近保存</span>{{ purchaseDraft.updatedAt.slice(0, 19).replace('T', ' ') }}
                </div>
              </div>
              <div class="ld-draft-actions">
                <el-button type="primary" link size="small" @click="purchasePlanDialogOpen = true">
                  {{ canEditPurchaseDraft ? '编辑草稿' : '查看草稿' }}
                </el-button>
              </div>
            </el-alert>

            <div class="ld-purchase-strip">
              <div
                v-for="(c, idx) in purchaseCells"
                :key="idx"
                class="ld-purchase-strip-item"
              >
                <span class="ld-purchase-lab">{{ c.lab }}</span>
                <span class="ld-purchase-val">{{ disp(c.val) }}</span>
              </div>
            </div>
          </section>

          <!-- 文件信息 -->
          <section id="ld-section-files" class="ld-section-card ld-section">
            <h3 class="ld-card-title">文件信息</h3>

            <div class="ld-file-block">
              <h4 class="ld-file-block-title">图案</h4>
              <div class="ld-file-rows">
                <div class="ld-file-row">
                  <span class="ld-file-lab">设计师</span>
                  <span class="ld-file-val">{{ disp(vm.patternDesigner) }}</span>
                </div>
                <div class="ld-file-row">
                  <span class="ld-file-lab">存储地址</span>
                  <span class="ld-file-val ld-file-val--break">{{ disp(vm.designStorageUrl) }}</span>
                </div>
                <div class="ld-file-row">
                  <span class="ld-file-lab">任务完成时间</span>
                  <span class="ld-file-val">{{ disp(vm.patternTaskEnd) }}</span>
                </div>
              </div>
            </div>

            <div class="ld-file-block">
              <h4 class="ld-file-block-title">平面</h4>
              <div class="ld-file-rows">
                <div class="ld-file-row">
                  <span class="ld-file-lab">设计师</span>
                  <span class="ld-file-val">{{ disp(vm.graphicDesigner) }}</span>
                </div>
                <div class="ld-file-row">
                  <span class="ld-file-lab">存储地址</span>
                  <span class="ld-file-val ld-file-val--break">{{ disp(vm.shelfImageUrl) }}</span>
                </div>
                <div class="ld-file-row">
                  <span class="ld-file-lab">任务完成时间</span>
                  <span class="ld-file-val">{{ disp(vm.graphicTaskEnd) }}</span>
                </div>
                <div class="ld-file-row">
                  <span class="ld-file-lab">折算系数</span>
                  <span class="ld-file-val">{{ disp(vm.discountFactor) }}</span>
                </div>
              </div>
            </div>

            <div class="ld-file-block ld-file-block--last">
              <h4 class="ld-file-block-title">摄影</h4>
              <div class="ld-file-rows">
                <div class="ld-file-row">
                  <span class="ld-file-lab">摄影师</span>
                  <span class="ld-file-val">{{ disp(vm.photoStaff) }}</span>
                </div>
                <div class="ld-file-row">
                  <span class="ld-file-lab">存储地址</span>
                  <span class="ld-file-val ld-file-val--break">{{ disp(vm.archiveUrl) }}</span>
                </div>
                <div class="ld-file-row">
                  <span class="ld-file-lab">任务完成时间</span>
                  <span class="ld-file-val">{{ disp(vm.photoTaskEnd) }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 操作日志 -->
          <section id="ld-section-log" class="ld-section-card ld-section">
            <h3 class="ld-card-title">操作日志</h3>
            <el-table
              :data="vm.operationLogs"
              stripe
              border
              size="small"
              class="ld-log-table"
              empty-text="--"
            >
              <el-table-column prop="time" label="操作时间" width="170" />
              <el-table-column prop="operator" label="操作人" width="110">
                <template #default="{ row }">
                  {{ disp(row.operator) }}
                </template>
              </el-table-column>
              <el-table-column prop="content" label="操作内容" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ disp(row.content) }}
                </template>
              </el-table-column>
              <el-table-column prop="source" label="来源" width="120">
                <template #default="{ row }">
                  {{ disp(row.source) }}
                </template>
              </el-table-column>
            </el-table>
          </section>
        </div>
      </div>
    </div>

    <div v-else class="ld-empty-inner">
      <span>暂无数据</span>
    </div>

    <PurchasePlanEditorDialog
      v-if="product"
      v-model="purchasePlanDialogOpen"
      :initial-draft-id="purchaseDraft?.draftId ?? null"
      :prefill-product-ids="detailPrefillIds"
      :picker-source="editorPickerSource"
      :editable="canEditPurchaseDraft"
      @saved="bumpPurchaseDraft"
    />
  </el-drawer>
</template>

<style scoped>
.ld-drawer-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
  padding-right: 8px;
}
.ld-drawer-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.ld-drawer-title-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.ld-status-sub {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
}
.ld-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}

.ld-drawer-body {
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
  margin: 0 -20px -20px;
  padding: 0 16px 24px;
}

.ld-shell {
  display: flex;
  gap: 0;
  min-height: 100%;
}

.ld-nav {
  width: 152px;
  flex-shrink: 0;
  padding: 16px 10px;
  border-right: 1px solid #e4e7ed;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}
.ld-nav-title {
  font-size: 11px;
  color: #909399;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}
.ld-nav-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.ld-nav-item:hover {
  background: #ecf5ff;
  color: #409eff;
}

.ld-main {
  flex: 1;
  min-width: 0;
  padding: 16px 0 8px 16px;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

.ld-timeline-strip {
  overflow-x: auto;
  margin: 0 0 16px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.ld-section {
  scroll-margin-top: 16px;
}

.ld-section-card {
  background: #fff;
  border: 1px solid #dcdfe6;
  border-left: 3px solid #409eff;
  border-radius: 8px;
  padding: 16px 18px 18px;
  margin-bottom: 16px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}

.ld-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px;
  padding-left: 0;
  line-height: 1.3;
  border-bottom: 2px solid rgba(64, 158, 255, 0.35);
  padding-bottom: 8px;
}

/* 产品信息 */
.ld-product-body {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.ld-product-thumb {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ld-product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ld-thumb-ph {
  font-size: 12px;
  color: #c0c4cc;
}
.ld-product-right {
  flex: 1;
  min-width: 240px;
}
.ld-product-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  margin-bottom: 14px;
}
.ld-product-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  line-height: 1.35;
}
.ld-product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ld-product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 20px;
}
@media (max-width: 1100px) {
  .ld-product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .ld-product-grid {
    grid-template-columns: 1fr;
  }
}
.ld-pgrid-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 44px;
}
.ld-pgrid-lab {
  font-size: 12px;
  color: #909399;
}
.ld-pgrid-val {
  font-size: 13px;
  color: #303133;
  word-break: break-word;
}

/* 参考信息 */
.ld-field-block {
  margin-bottom: 16px;
}
.ld-field-block:last-child {
  margin-bottom: 0;
}
.ld-field-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 8px;
}
.ld-dev-idea-box {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.65;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid #ebeef5;
}
.ld-ref-img-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.ld-ref-slot {
  width: 88px;
  height: 88px;
  border-radius: 6px;
  border: 1px dashed #dcdfe6;
  background: #fafafa;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ld-ref-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ld-ref-slot-ph {
  font-size: 13px;
  color: #c0c4cc;
}
.ld-ref-link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
}
.ld-ref-link {
  font-size: 12px;
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
}
.ld-ref-link:hover {
  text-decoration: underline;
}

.ld-ref-double {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 4px;
}
.ld-ref-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 720px) {
  .ld-ref-row {
    grid-template-columns: 1fr;
  }
}
.ld-ref-col {
  min-width: 0;
}
.ld-text-block {
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  line-height: 1.55;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}

.ld-purchase-draft-alert {
  margin-bottom: 14px;
}
.ld-draft-title {
  font-weight: 600;
}
.ld-draft-lines {
  font-size: 13px;
  color: #606266;
  line-height: 1.65;
  margin-top: 6px;
}
.ld-draft-k {
  display: inline-block;
  min-width: 72px;
  color: #909399;
  margin-right: 8px;
}
.ld-draft-actions {
  margin-top: 8px;
}

/* 采购单行平铺 */
.ld-purchase-strip {
  display: flex;
  flex-wrap: nowrap;
  gap: 0;
  overflow-x: auto;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
  -webkit-overflow-scrolling: touch;
}
.ld-purchase-strip-item {
  flex: 1 0 auto;
  min-width: 112px;
  padding: 12px 14px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ld-purchase-strip-item:last-child {
  border-right: none;
}
.ld-purchase-lab {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
}
.ld-purchase-val {
  font-size: 13px;
  color: #303133;
  word-break: break-word;
}

/* 文件子块 */
.ld-file-block {
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #e4e7ed;
}
.ld-file-block--last {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
.ld-file-block-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
}
.ld-file-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ld-file-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  align-items: start;
  font-size: 13px;
}
@media (max-width: 480px) {
  .ld-file-row {
    grid-template-columns: 1fr;
  }
}
.ld-file-lab {
  color: #909399;
  flex-shrink: 0;
}
.ld-file-val {
  color: #303133;
  word-break: break-word;
}
.ld-file-val--break {
  word-break: break-all;
}

.ld-log-table {
  width: 100%;
}

.ld-empty-inner {
  padding: 40px;
  text-align: center;
  color: #909399;
}
</style>

<style>
.ld-drawer .el-drawer__header {
  margin-bottom: 0;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f2f5;
}
.ld-drawer .el-drawer__body {
  padding-top: 0;
  background: #f5f7fa;
}
</style>
