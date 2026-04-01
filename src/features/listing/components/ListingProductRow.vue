<script setup>
// 单产品完整行：时间轴 + 字段行
import '@/features/listing/listingTableColumns.css'
import { mainTabs, SUB_NODES } from '@/features/listing/listingDefs.js'
import ListingTimeline from './ListingTimeline.vue'

const props = defineProps({
  product: { type: Object, required: true },
})

const emit = defineEmits(['detail'])
</script>

<template>
  <div class="lpr-block">
    <!-- 时间轴行 -->
    <ListingTimeline
      :timeline="product.timeline"
      :transition-infos="product.transitionInfos"
    />

    <!-- 字段行 -->
    <div class="lpr-field-row">
      <div class="lt-col-img lt-cell">
        <div class="lpr-thumb">
          <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.nameCn" />
          <span v-else class="lpr-thumb-empty">📷</span>
        </div>
      </div>

        <div class="lt-col-info lt-cell">
        <div class="lpr-name" :title="product.nameCn">{{ product.nameCn }}</div>
        <div class="lpr-sub">SKU: {{ product.sku }}</div>
        <div class="lpr-sub">MSKU: {{ product.msku }}</div>
        <div class="lpr-sub blue">{{ product.asin }}</div>
      </div>

      <div class="lt-col-status lt-cell">
        <el-tag
          :type="{ pending:'info', stocking:'warning', ready:'primary', listed:'success' }[product.mainStatus] ?? 'info'"
          size="small" effect="plain"
        >
          {{ mainTabs.find(t => t.key === product.mainStatus)?.label }}
        </el-tag>
        <div v-if="product.subNode" class="lpr-sub-node">
          {{ SUB_NODES.find(n => n.key === product.subNode)?.label }}
        </div>
      </div>

      <div class="lt-col-cat    lt-cell lt-cell-sm">{{ product.category }}</div>
      <div class="lt-col-scene  lt-cell lt-cell-sm">{{ product.scene }}</div>
      <div class="lt-col-season lt-cell lt-cell-sm">{{ product.season }}</div>
      <div class="lt-col-brand  lt-cell lt-cell-sm">{{ product.brand }}</div>
      <div class="lt-col-shop   lt-cell lt-cell-sm">{{ product.shop }}</div>

      <div class="lt-col-staff lt-cell">
        <div class="lpr-staff"><span class="lpr-role">开发</span>{{ product.staff.dev }}</div>
        <div class="lpr-staff"><span class="lpr-role">运营</span>{{ product.staff.ops }}</div>
        <div class="lpr-staff"><span class="lpr-role">平面</span>{{ product.staff.design }}</div>
        <div class="lpr-staff"><span class="lpr-role">采购</span>{{ product.staff.purchase }}</div>
      </div>

      <div class="lt-col-listing lt-cell">
        <el-tag :type="product.listingStatus === '已上传' ? 'success' : 'info'" size="small" effect="plain">
          {{ product.listingStatus }}
        </el-tag>
      </div>
      <div class="lt-col-time   lt-cell lt-cell-sm">{{ product.listingUploadTime || '—' }}</div>
      <div class="lt-col-design lt-cell">
        <el-tag :type="product.designStatus === '完成平面设计' ? 'success' : 'warning'" size="small" effect="plain">
          {{ product.designStatus }}
        </el-tag>
      </div>
      <div class="lt-col-design-time lt-cell lt-cell-sm">{{ product.designCompletedTime || '—' }}</div>
      <div class="lt-col-auth    lt-cell lt-cell-sm">{{ product.authTime || '—' }}</div>
      <div class="lt-col-ready   lt-cell lt-cell-sm">{{ product.readyTime || '—' }}</div>
      <div class="lt-col-total   lt-cell lt-cell-sm">
        <span v-if="product.totalDays">{{ product.totalDays }}天</span>
        <span v-else class="lpr-muted">计算中</span>
      </div>
      <div class="lt-col-logistics lt-cell lt-cell-sm">{{ product.logistics }}</div>

      <!-- 操作列：详情入口，后续按阶段补充更多操作 -->
      <div class="lt-col-action lt-cell">
        <span class="lpr-action-link" @click="emit('detail', product)">详情</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lpr-block {
  border: 1px solid #f0f2f5;
  border-radius: 6px;
  background: #fff;
  margin-bottom: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .04);
  transition: box-shadow .2s, transform .1s;
  overflow: hidden;
}
.lpr-block:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, .08);
  transform: translateY(-1px);
  z-index: 1;
  position: relative;
}

/* 字段行 */
.lpr-field-row {
  display: flex;
  align-items: stretch;
  padding: 3px 10px;
}
.lt-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 6px;
  font-size: 12px;
  color: #374151;
  border-right: 1px solid #f0f2f5;
}
.lt-cell:last-child { border-right: none; }
/* 次要字段：数值降灰，减少视觉噪声 */
.lt-cell-sm { font-size: 11.5px; color: #909399; }

/* 列宽见 listingTableColumns.css（与列表页列头共用） */

/* 图片 */
.lpr-thumb {
  width: 56px;
  height: 56px;
  border: 1px solid #e8ecf0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fafafa;
}
.lpr-thumb img      { width: 100%; height: 100%; object-fit: cover; }
.lpr-thumb-empty    { font-size: 16px; color: #d9d9d9; }

/* 产品信息 */
.lpr-name    { font-size: 12px; font-weight: 600; color: #111827; line-height: 1.4; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lpr-sub     { font-size: 10.5px; color: #9ca3af; line-height: 1.4; }
.lpr-sub.blue { color: #1890ff; }
.lpr-sub-node { font-size: 10.5px; color: #6b7280; margin-top: 3px; }

/* 参与人员 */
.lpr-staff   { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #374151; line-height: 1.6; }
.lpr-role    { font-size: 10px; color: #9ca3af; background: #f5f5f5; padding: 0 3px; border-radius: 2px; }

/* 操作列 */
.lpr-action-link {
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.lpr-action-link:hover { text-decoration: underline; }

.lpr-muted { color: #9ca3af; font-size: 11px; }
</style>
