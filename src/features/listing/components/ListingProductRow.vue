<script setup>
// 单产品完整行：时间轴 + 字段行（卡片式生命周期）
import '@/features/listing/listingTableColumns.css'
import { computed } from 'vue'
import { formatListedTotalUseDays, resolveListStatusLabel } from '@/features/listing/listingDefs.js'
import { computeDesignListingFlatSla, hasFlatSlaOverdue } from '@/features/listing/listingFlatSla.js'
import ListingTimeline from './ListingTimeline.vue'

const props = defineProps({
  product: { type: Object, required: true },
  /** 当前行是否在勾选集中（筛选结果内） */
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['detail', 'toggle-select'])

const totalUseDisplay = computed(() => formatListedTotalUseDays(props.product))

/** 平面 / Listing 全链路超时（以运营分配日为起点，与时效配置「全链路指标」一致，不并入主时间轴） */
const flatSla = computed(() =>
  props.product.flatSla ?? computeDesignListingFlatSla(props.product),
)
</script>

<template>
  <div class="lpr-block" :class="{ 'lpr-block--overdue': hasRowAnyOverdue }">
    <div class="lpr-body">
      <div class="lt-col-check lt-cell lpr-check-cell" @click.stop>
        <el-checkbox :model-value="selected" @change="emit('toggle-select')" />
      </div>
      <div class="lpr-main">
        <div class="lpr-timeline-strip">
          <ListingTimeline
            :timeline="product.timeline"
            :transition-infos="product.transitionInfos"
          />
        </div>

        <div class="lpr-field-row">
      <!-- 产品名片区：图 + SKU / ASIN / 品名（与表头「图片」「产品信息」两列对齐） -->
      <div class="lt-col-img lt-cell lpr-identity-cell">
        <div class="lpr-thumb">
          <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.nameCn" />
          <span v-else class="lpr-thumb-empty">📷</span>
        </div>
      </div>
      <div class="lt-col-info lt-cell lpr-identity-cell">
        <div class="lpr-identity-main">
          <div class="lpr-sku">{{ product.sku }}</div>
          <a
            class="lpr-asin"
            :href="`https://www.amazon.com/dp/${product.asin}`"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >{{ product.asin }}</a>
          <div class="lpr-title" :title="product.nameCn">{{ product.nameCn }}</div>
          <div class="lpr-msku">MSKU {{ product.msku }}</div>
        </div>
      </div>

      <div class="lt-col-status lt-cell">
        <div class="lpr-status-only">{{ resolveListStatusLabel(product) }}</div>
      </div>

      <!-- 分组 A：基础信息 -->
      <div class="lt-col-cat    lt-cell lpr-group-a">{{ product.category }}</div>
      <div class="lt-col-scene  lt-cell lpr-group-a">{{ product.scene }}</div>
      <div class="lt-col-season lt-cell lpr-group-a">{{ product.season }}</div>
      <div class="lt-col-brand  lt-cell lpr-group-a">{{ product.brand }}</div>
      <div class="lt-col-shop   lt-cell lpr-group-a">{{ product.shop }}</div>

      <div class="lt-col-staff lt-cell">
        <div class="lpr-staff"><span class="lpr-role">开发</span>{{ product.staff.dev }}</div>
        <div class="lpr-staff"><span class="lpr-role">运营</span>{{ product.staff.ops }}</div>
        <div class="lpr-staff"><span class="lpr-role">平面</span>{{ product.staff.design }}</div>
        <div class="lpr-staff"><span class="lpr-role">摄影</span>{{ product.staff.photo ?? '—' }}</div>
      </div>

      <!-- 分组 B：状态 -->
      <div class="lt-col-listing lt-cell lpr-group-b">
        <el-tag :type="product.listingStatus === '已上传' ? 'success' : 'info'" size="small" effect="plain">
          {{ product.listingStatus }}
        </el-tag>
      </div>
      <div class="lt-col-time lt-cell lt-cell-sm lpr-sla-cell">
        <span>{{ product.listingUploadTime || '—' }}</span>
        <el-tag
          v-if="flatSla.listingOverdueDays"
          type="danger"
          size="small"
          effect="light"
          class="lpr-sla-tag"
        >
          超时{{ flatSla.listingOverdueDays }}天
        </el-tag>
      </div>
      <div class="lt-col-design lt-cell lpr-group-b">
        <el-tag :type="product.designStatus === '完成平面设计' ? 'success' : 'info'" size="small" effect="plain">
          {{ product.designStatus }}
        </el-tag>
      </div>
      <div class="lt-col-design-time lt-cell lt-cell-sm lpr-sla-cell">
        <span>{{ product.designCompletedTime || '—' }}</span>
        <el-tag
          v-if="flatSla.designOverdueDays"
          type="danger"
          size="small"
          effect="light"
          class="lpr-sla-tag"
        >
          超时{{ flatSla.designOverdueDays }}天
        </el-tag>
      </div>

      <div class="lt-col-auth lt-cell lt-cell-sm">{{ product.authTime || '—' }}</div>
      <div class="lt-col-total lt-cell lt-cell-sm">
        <span :class="{ 'lpr-muted': totalUseDisplay === '-/-' }">{{ totalUseDisplay }}</span>
      </div>

      <div class="lt-col-logistics lt-cell lt-cell-sm">{{ product.logistics }}</div>

      <div class="lt-col-action lt-cell">
        <span class="lpr-action-link" @click="emit('detail', product)">详情</span>
      </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lpr-block {
  border-radius: 8px;
  background: #fff;
  margin-bottom: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #eef0f3;
  transition: box-shadow 0.22s ease, transform 0.18s ease;
  overflow: hidden;
}

.lpr-block:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  z-index: 2;
  position: relative;
}

/* 悬浮时时间轴轨道轻微缩放 */
.lpr-block:hover :deep(.lts-track-bar) {
  transform: scaleY(1.25);
}

.lpr-block.lpr-block--overdue {
  border-left: 4px solid #f56c6c;
  background: linear-gradient(90deg, rgba(245, 108, 108, 0.07) 0%, #fff 48px);
}

.lpr-body {
  display: flex;
  align-items: stretch;
}
.lpr-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.lpr-timeline-strip {
  overflow-x: auto;
}

.lpr-field-row {
  display: flex;
  align-items: stretch;
  padding: 4px 8px 6px;
  border-top: 1px solid #f5f7fa;
}
.lpr-check-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 4px;
  padding-right: 4px;
  align-self: stretch;
}
.lt-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 6px;
  font-size: 12px;
  color: #374151;
}
.lt-cell-sm { font-size: 11.5px; color: #909399; }

/* 名片区 */
.lpr-identity-cell {
  padding-left: 8px;
}
.lpr-identity-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
  min-height: 40px;
}
.lpr-sku {
  font-size: 12px;
  font-weight: 700;
  color: #303133;
  line-height: 1.3;
}
.lpr-asin {
  font-size: 12px;
  font-weight: 500;
  color: #409eff;
  text-decoration: none;
  line-height: 1.3;
}
.lpr-asin:hover { text-decoration: underline; }
.lpr-title {
  font-size: 11px;
  color: #909399;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lpr-msku {
  font-size: 11px;
  color: #c0c4cc;
}

.lpr-thumb {
  width: 40px;
  height: 40px;
  border: 1px solid #e8ecf0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fafafa;
  flex-shrink: 0;
}
.lpr-thumb img      { width: 100%; height: 100%; object-fit: cover; }
.lpr-thumb-empty    { font-size: 16px; color: #d9d9d9; }

.lpr-status-only { font-size: 12px; font-weight: 600; color: #374151; }

.lpr-group-a {
  font-size: 11px;
  color: #909399;
}

.lpr-group-b {
  align-items: flex-start;
}

.lpr-staff {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #374151;
  line-height: 1.28;
}
.lpr-role {
  font-size: 10px;
  color: #9ca3af;
  background: #f5f7fa;
  padding: 0 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.lpr-action-link {
  color: #409eff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.lpr-action-link:hover { text-decoration: underline; }

.lpr-muted { color: #9ca3af; font-size: 11px; }

.lpr-sla-cell {
  gap: 4px;
  align-items: flex-start !important;
}
.lpr-sla-tag {
  margin-top: 2px;
  max-width: 100%;
  white-space: normal;
  line-height: 1.25;
}
</style>
