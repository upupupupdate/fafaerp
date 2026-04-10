<script setup>
/**
 * 上架跟踪 — 列表视图（仅「进度/列表」中的列表模式使用）
 * 列字段与产品方案对齐，进度行样式见 ListingProductRow
 */
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'
import { resolveListStatusLabel } from '@/features/listing/listingDefs.js'
import { computeDesignListingFlatSla, hasFlatSlaOverdue } from '@/features/listing/listingFlatSla.js'

defineProps({
  products: { type: Array, required: true },
  selectedIds: { type: Object, required: true },
})

const emit = defineEmits(['toggle-select', 'detail'])

function fmt(v) {
  if (v == null || v === '') return '—'
  return String(v)
}

function line(tl) {
  if (!tl?.done || !tl?.time) return '—'
  return tl.time
}

async function copyText(label, text) {
  if (text == null || text === '') return
  try {
    await navigator.clipboard.writeText(String(text))
    ElMessage.success(`${label}已复制`)
  } catch {
    ElMessage.warning('复制失败')
  }
}

/** 时间轴已移除「待物流提货」节点，提货时间无独立轴点则占位 */
function pickupTimeDisplay() {
  return '—'
}

function flatSla(row) {
  return row.flatSla ?? computeDesignListingFlatSla(row)
}

/** 主时间轴节点超时（transitionInfos） */
function hasTimelineOverdue(row) {
  return Array.isArray(row.transitionInfos) && row.transitionInfos.some((t) => t?.state === 'overdue')
}

function hasRowAnyOverdue(row) {
  return hasTimelineOverdue(row) || hasFlatSlaOverdue(row)
}
</script>

<template>
  <div class="lrt-wrap">
    <div class="lrt-dense">
      <div class="lrt-dense-head">
        <div class="lrt-col lrt-col-check" />
        <div class="lrt-col lrt-col-img" title="图片">图片</div>
        <div class="lrt-col lrt-col-prod" title="品名、SKU、设计款/非设计款、成品/组合品、MSKU、ASIN">
          产品信息
        </div>
        <div class="lrt-col lrt-col-status">状态</div>
        <div
          class="lrt-col lrt-col-sla-summary"
          title="节点时间轴超时、平面/Listing 全链路超时（与「其他节点时间」列明细一致）"
        >
          超时摘要
        </div>
        <div class="lrt-col lrt-col-cat">品类</div>
        <div class="lrt-col lrt-col-scene">场景</div>
        <div class="lrt-col lrt-col-season">季节性</div>
        <div class="lrt-col lrt-col-shop" title="店铺、市场、品牌">店铺/市场/品牌</div>
        <div class="lrt-col lrt-col-staff" title="开发、运营、平面、摄影">参与人员</div>
        <div class="lrt-col lrt-col-block" title="运营分配、PL时间、PL审核时间、采购时间、预计入库、采购入库">
          <span class="lrt-head-main">备货节点时间</span>
          <span class="lrt-head-sub">（国内段）</span>
        </div>
        <div class="lrt-col lrt-col-block" title="货件时间、提货时间、预计到仓、实际到仓">
          发货节点时间
        </div>
        <div class="lrt-col lrt-col-block" title="开发授权、平面完成、最晚Listing、Listing上传、开售日期">
          其他节点时间
        </div>
        <div class="lrt-col lrt-col-relate" title="提案编号、PL单号、PO单号、调拨单号、FBA货件号、头程单号">
          关联信息
        </div>
        <div class="lrt-col lrt-col-logistics">物流方式</div>
        <div class="lrt-col lrt-col-plane">平面状态</div>
        <div class="lrt-col lrt-col-listing-st">Listing状态</div>
        <div class="lrt-col lrt-col-act">操作</div>
      </div>

      <div v-if="!products.length" class="lrt-empty">
        <el-empty description="暂无数据" />
      </div>

      <div
        v-for="row in products"
        :key="row.id"
        class="lrt-dense-row"
        :class="{ 'lrt-dense-row--overdue': hasRowAnyOverdue(row) }"
      >
        <div class="lrt-col lrt-col-check">
          <el-checkbox
            :model-value="selectedIds.has(row.id)"
            @change="emit('toggle-select', row.id)"
          />
        </div>

        <div class="lrt-col lrt-col-img">
          <img
            class="lrt-thumb"
            :src="row.listThumbUrl || row.imageUrl || 'https://picsum.photos/seed/placeholder/80/80'"
            alt=""
            width="52"
            height="52"
            loading="lazy"
          >
        </div>

        <div class="lrt-col lrt-col-prod">
          <div class="lrt-title" :title="row.nameCn">{{ row.nameCn }}</div>
          <div class="lrt-ids-line">
            <span class="lrt-id-pill">SKU {{ row.sku }}</span>
            <button
              type="button"
              class="lrt-copy"
              title="复制 SKU"
              @click="copyText('SKU', row.sku)"
            >
              <el-icon :size="12"><DocumentCopy /></el-icon>
            </button>
          </div>
          <div class="lrt-tags">
            <el-tag size="small" type="primary" effect="plain">{{ row.tagDesign }}</el-tag>
            <el-tag size="small" type="info" effect="plain">{{ row.tagProductForm }}</el-tag>
          </div>
          <div class="lrt-ids-line lrt-ids-sub">
            <span>MSKU {{ row.msku }}</span>
          </div>
          <div class="lrt-ids-line lrt-ids-sub">
            <span>ASIN {{ row.asin }}</span>
          </div>
        </div>

        <div class="lrt-col lrt-col-status lrt-cell-plain">
          {{ resolveListStatusLabel(row) }}
        </div>
        <div class="lrt-col lrt-col-sla-summary">
          <div class="lrt-sla-summary-tags">
            <el-tag v-if="hasTimelineOverdue(row)" size="small" type="danger" effect="plain">节点</el-tag>
            <el-tag v-if="flatSla(row).designOverdueDays" size="small" type="danger" effect="light">平面</el-tag>
            <el-tag v-if="flatSla(row).listingOverdueDays" size="small" type="danger" effect="light">Listing</el-tag>
            <span v-if="!hasRowAnyOverdue(row)" class="lrt-sla-none">—</span>
          </div>
        </div>
        <div class="lrt-col lrt-col-cat lrt-cell-plain">{{ fmt(row.category) }}</div>
        <div class="lrt-col lrt-col-scene lrt-cell-plain">{{ fmt(row.scene) }}</div>
        <div class="lrt-col lrt-col-season lrt-cell-plain">{{ fmt(row.season) }}</div>

        <div class="lrt-col lrt-col-shop">
          <div class="lrt-stack tight">
            <div><span class="lrt-k">店铺</span>{{ fmt(row.shop) }}</div>
            <div><span class="lrt-k">市场</span>{{ fmt(row.destMarketCode) }}</div>
            <div><span class="lrt-k">品牌</span>{{ fmt(row.brand) }}</div>
          </div>
        </div>

        <div class="lrt-col lrt-col-staff">
          <div class="lrt-stack tight">
            <div><span class="lrt-k">开发</span>{{ row.staff?.dev }}</div>
            <div><span class="lrt-k">运营</span>{{ row.staff?.ops }}</div>
            <div><span class="lrt-k">平面</span>{{ row.staff?.design }}</div>
            <div><span class="lrt-k">摄影</span>{{ row.staff?.photo }}</div>
          </div>
        </div>

        <div class="lrt-col lrt-col-block">
          <div class="lrt-stack tight">
            <div><span class="lrt-k">运营分配</span>{{ fmt(row.timeline?.[0]?.time) }}</div>
            <div><span class="lrt-k">PL时间</span>{{ line(row.timeline?.[1]) }}</div>
            <div><span class="lrt-k">PL审核时间</span>{{ line(row.timeline?.[2]) }}</div>
            <div><span class="lrt-k">采购时间</span>{{ line(row.timeline?.[3]) }}</div>
            <div>
              <span class="lrt-k">预计入库</span>
              <span :title="row.firstLegSlaSource === 'jijia' ? '积加演示' : ''">{{ fmt(row.jiujiaEstPurchaseInboundAt) }}</span>
            </div>
            <div><span class="lrt-k">采购入库</span>{{ line(row.timeline?.[4]) }}</div>
          </div>
        </div>

        <div class="lrt-col lrt-col-block">
          <div class="lrt-stack tight">
            <div><span class="lrt-k">货件时间</span>{{ line(row.timeline?.[5]) }}</div>
            <div><span class="lrt-k">提货时间</span>{{ pickupTimeDisplay() }}</div>
            <div>
              <span class="lrt-k">预计到仓</span>
              {{ fmt(row.jiujiaEstWarehouseArrivalAt) }}
            </div>
            <div><span class="lrt-k">实际到仓</span>{{ line(row.timeline?.[7]) }}</div>
          </div>
        </div>

        <div class="lrt-col lrt-col-block">
          <div class="lrt-stack tight">
            <div><span class="lrt-k">开发授权</span>{{ fmt(row.authTime) }}</div>
            <div class="lrt-flat-wrap">
              <div><span class="lrt-k">平面完成</span>{{ fmt(row.designCompletedTime) }}</div>
              <el-tag
                v-if="flatSla(row).designOverdueDays"
                type="danger"
                size="small"
                effect="light"
                class="lrt-flat-tag"
              >
                超时{{ flatSla(row).designOverdueDays }}天
              </el-tag>
            </div>
            <div><span class="lrt-k">最晚Listing</span>{{ fmt(row.readyTime) }}</div>
            <div class="lrt-flat-wrap">
              <div><span class="lrt-k">Listing上传</span>{{ fmt(row.listingUploadTime) }}</div>
              <el-tag
                v-if="flatSla(row).listingOverdueDays"
                type="danger"
                size="small"
                effect="light"
                class="lrt-flat-tag"
              >
                超时{{ flatSla(row).listingOverdueDays }}天
              </el-tag>
            </div>
            <div><span class="lrt-k">开售日期</span>{{ line(row.timeline?.[9]) }}</div>
          </div>
        </div>

        <div class="lrt-col lrt-col-relate">
          <div class="lrt-stack tight">
            <div><span class="lrt-k">提案编号</span>{{ fmt(row.proposalNo) }}</div>
            <div><span class="lrt-k">PL单号</span>{{ row.timeline?.[1]?.no || '—' }}</div>
            <div><span class="lrt-k">PO单号</span>{{ row.timeline?.[3]?.no || '—' }}</div>
            <div><span class="lrt-k">调拨单号</span>{{ fmt(row.transferOrderNo) }}</div>
            <div><span class="lrt-k">FBA货件号</span>{{ row.timeline?.[5]?.no || '—' }}</div>
            <div><span class="lrt-k">头程单号</span>{{ fmt(row.firstLegTrackingNo) }}</div>
          </div>
        </div>

        <div class="lrt-col lrt-col-logistics lrt-cell-plain">{{ fmt(row.logistics) }}</div>
        <div class="lrt-col lrt-col-plane lrt-cell-plain">{{ fmt(row.designStatus) }}</div>
        <div class="lrt-col lrt-col-listing-st lrt-cell-plain">{{ fmt(row.listingStatus) }}</div>

        <div class="lrt-col lrt-col-act">
          <el-button class="lrt-act-btn" link type="primary" size="small" @click="emit('detail', row)">详情</el-button>
          <el-button class="lrt-act-btn" link type="primary" size="small" disabled title="AI生成（对接后可用）">AI生成</el-button>
        </div>
      </div>
    </div>
    <p class="lrt-footnote">
      列表模式字段与上架业务方案对齐；「预计入库/预计到仓」为积加演示占位。提货时间无独立轴点时显示「—」。
      「平面完成 / Listing上传」下红色标签为全链路指标：以「运营分配完成日」为起点加标准天（与时效配置中「平面设计总用时」「Listing上传总用时」一致），与主时间轴节点超时独立计算。
      「超时摘要」列汇总：节点（主时间轴 transitionInfos 超时）、平面 / Listing（与上列标签一致）；整行浅红底与左侧色条表示该行存在任一类超时。
    </p>
  </div>
</template>

<style scoped>
.lrt-wrap {
  width: 100%;
  overflow-x: auto;
}
.lrt-dense {
  /* 列宽合计约 2094px：勾选38 + 图60 + 产品310 + 状态80 + 超时摘要96 + 品类150 + 场景70 + 季节70 + 店铺150 + 人员100 + 时间块160×4 + 物流/平面/Listing各80 + 操作50 */
  min-width: 2100px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
}
.lrt-dense-head {
  display: flex;
  align-items: stretch;
  gap: 0;
  background: linear-gradient(180deg, #e8f4ff 0%, #dcecf9 100%);
  border-bottom: 1px solid #c6e2ff;
  font-size: 11px;
  font-weight: 600;
  color: #303133;
}
.lrt-dense-head .lrt-col {
  padding: 8px 5px;
  border-right: 1px solid #d9ecff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.25;
}
.lrt-dense-head .lrt-col:last-child {
  border-right: none;
}
.lrt-head-main {
  display: block;
}
.lrt-head-sub {
  font-size: 10px;
  font-weight: 500;
  color: #606266;
}
.lrt-dense-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-bottom: 1px solid #f0f2f5;
  font-size: 10px;
}
.lrt-dense-row:nth-child(even) {
  background: #fafbfc;
}
.lrt-dense-row--overdue,
.lrt-dense-row--overdue:nth-child(even) {
  background: #fff8f8;
  box-shadow: inset 3px 0 0 #f56c6c;
}
.lt-scroll-area--regular .lrt-dense-row:last-child {
  border-bottom: none;
}
.lrt-col {
  padding: 8px 5px;
  border-right: 1px solid #f0f2f5;
  flex-shrink: 0;
}
.lrt-col:last-child {
  border-right: none;
}
.lrt-col-check {
  width: 38px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
}
.lrt-col-img {
  width: 60px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 6px;
}
.lrt-thumb {
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #ebeef5;
}
.lrt-col-prod {
  width: 310px;
}
.lrt-col-status {
  width: 80px;
}
.lrt-col-sla-summary {
  width: 96px;
}
.lrt-sla-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding-top: 4px;
}
.lrt-sla-none {
  color: #c0c4cc;
  font-size: 11px;
}
.lrt-col-cat {
  width: 150px;
}
.lrt-col-scene {
  width: 70px;
}
.lrt-col-season {
  width: 70px;
}
.lrt-col-shop {
  width: 150px;
}
.lrt-col-staff {
  width: 100px;
}
.lrt-col-block {
  width: 160px;
}
.lrt-col-relate {
  width: 160px;
}
.lrt-col-logistics {
  width: 80px;
}
.lrt-col-plane {
  width: 80px;
}
.lrt-col-listing-st {
  width: 80px;
}
.lrt-col-act {
  width: 50px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding-top: 6px;
  box-sizing: border-box;
}
.lrt-act-btn {
  padding: 0 !important;
  margin: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  font-size: 10px !important;
  line-height: 1.35 !important;
  justify-content: flex-start !important;
}
.lrt-title {
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 11px;
}
.lrt-ids-line {
  margin-top: 4px;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.lrt-ids-sub {
  font-size: 10px;
  color: #6b7280;
}
.lrt-id-pill {
  font-weight: 600;
  font-size: 10px;
}
.lrt-copy {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: #409eff;
  display: inline-flex;
  align-items: center;
}
.lrt-tags {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.lrt-stack {
  color: #303133;
  line-height: 1.4;
  text-align: left;
}
.lrt-stack.tight {
  font-size: 10px;
}
.lrt-stack .lrt-k {
  display: inline-block;
  min-width: 4.5em;
  margin-right: 3px;
  color: #6b7280;
}
.lrt-cell-plain {
  word-break: break-all;
  line-height: 1.35;
  padding-top: 6px;
}
.lrt-empty {
  padding: 24px;
}
.lrt-flat-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}
.lrt-flat-tag {
  margin-top: 2px;
  max-width: 100%;
  white-space: normal;
  line-height: 1.25;
}
.lrt-footnote {
  margin: 8px 0 0;
  font-size: 11px;
  color: #909399;
  line-height: 1.5;
}
</style>
