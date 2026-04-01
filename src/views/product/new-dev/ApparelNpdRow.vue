<script setup>
import '@/features/product/npdApparelTableColumns.css'
import ListingTimeline from '@/features/listing/components/ListingTimeline.vue'
import {
  NPD_APPAREL_NODES,
  npdEstLabel,
  npdNoLabel,
  fitLabel,
} from '@/features/product/npdApparelDefs.js'

const props = defineProps({
  row: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['update:selected'])

function toggleSel(val) {
  emit('update:selected', val)
}

const phaseType = {
  draft: 'info',
  pending_review: 'warning',
  pending_style: 'primary',
  sampling: 'warning',
  completed: 'success',
  rejected: 'danger',
  void: 'info',
}
</script>

<template>
  <div class="anpr-block">
    <ListingTimeline
      :timeline="row.timeline"
      :transition-infos="row.transitionInfos"
      :sub-nodes="NPD_APPAREL_NODES"
      :no-label-fn="npdNoLabel"
      :est-label-fn="npdEstLabel"
    />

    <div class="anpr-field-row">
      <div class="npd-col-chk anpr-cell" @click.stop>
        <el-checkbox :model-value="selected" @update:model-value="toggleSel" />
      </div>

      <div class="npd-col-img anpr-cell">
        <div class="anpr-thumb">
          <img v-if="row.imageUrl" :src="row.imageUrl" :alt="row.nameCn" />
          <span v-else class="anpr-thumb-empty">📷</span>
        </div>
      </div>

      <div class="npd-col-info anpr-cell">
        <div class="anpr-name" :title="row.nameCn">{{ row.nameCn }}</div>
        <div class="anpr-sub">SPU: {{ row.spu }}</div>
        <div v-if="row.tags?.length" class="anpr-tags">
          <el-tag v-for="t in row.tags" :key="t" size="small" effect="plain" class="anpr-tag">{{ t }}</el-tag>
        </div>
      </div>

      <div class="npd-col-cat anpr-cell anpr-cell-muted">{{ row.category }}</div>
      <div class="npd-col-brand anpr-cell">{{ row.brand }}</div>
      <div class="npd-col-season anpr-cell anpr-cell-muted">{{ row.season }}</div>
      <div class="npd-col-forecast anpr-cell">{{ row.forecastSales ?? '—' }}</div>
      <div class="npd-col-market anpr-cell">{{ row.market }}</div>

      <div class="npd-col-staff anpr-cell">
        <div class="anpr-staff"><span class="anpr-role">开发</span>{{ row.staff?.dev ?? '—' }}</div>
        <div class="anpr-staff"><span class="anpr-role">工艺</span>{{ row.staff?.craft ?? '—' }}</div>
        <div class="anpr-staff"><span class="anpr-role">版师</span>{{ row.staff?.pattern ?? '—' }}</div>
      </div>

      <div class="npd-col-refimg anpr-cell">
        <div class="anpr-thumb sm">
          <img v-if="row.refImageUrl" :src="row.refImageUrl" alt="" />
          <span v-else class="anpr-thumb-empty">📷</span>
        </div>
      </div>

      <div class="npd-col-reflink anpr-cell">
        <a v-if="row.refLink" :href="row.refLink" class="anpr-link" target="_blank" rel="noopener" :title="row.refLink">链接</a>
        <span v-else class="anpr-muted">—</span>
      </div>

      <div class="npd-col-idea anpr-cell">
        <span class="anpr-clamp" :title="row.devIdea">{{ row.devIdea || '—' }}</span>
      </div>

      <div class="npd-col-kw anpr-cell">
        <span class="anpr-clamp" :title="row.keywords?.join('、')">{{ row.keywords?.length ? row.keywords.join('、') : '—' }}</span>
      </div>

      <div class="npd-col-specs anpr-cell">
        <div class="anpr-spec-line"><span class="k">版型</span>{{ fitLabel(row.fitType) }}</div>
        <div class="anpr-spec-line"><span class="k">米数</span>{{ row.fabricMeters || '—' }}</div>
        <div class="anpr-spec-note anpr-clamp" :title="row.specNote">{{ row.specNote || '' }}</div>
      </div>

      <div class="npd-col-attrs anpr-cell">
        <el-tag
          v-for="a in row.productAttrs"
          :key="a"
          size="small"
          type="primary"
          effect="plain"
          class="anpr-attr-tag"
        >
          {{ a }}
        </el-tag>
        <span v-if="!row.productAttrs?.length" class="anpr-muted">—</span>
      </div>

      <div class="npd-col-due anpr-cell">{{ row.dueDate || '—' }}</div>

      <div class="npd-col-status anpr-cell">
        <el-tag :type="phaseType[row.workflowPhase] ?? 'info'" size="small" effect="plain">
          {{ row.workflowLabel }}
        </el-tag>
      </div>

      <div class="npd-col-action anpr-cell">
        <span class="anpr-action">编辑</span>
        <span class="anpr-action">提交</span>
        <span class="anpr-action">复制</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anpr-block {
  border: 1px solid #f0f2f5;
  border-radius: 6px;
  background: #fff;
  margin-bottom: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.anpr-field-row {
  display: flex;
  align-items: stretch;
  padding: 4px 10px 6px;
  min-width: min-content;
}
.anpr-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 6px;
  font-size: 12px;
  color: #374151;
  border-right: 1px solid #f0f2f5;
}
.anpr-cell:last-child {
  border-right: none;
}
.anpr-cell-muted {
  font-size: 11.5px;
  color: #6b7280;
}
.anpr-thumb {
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
.anpr-thumb.sm {
  width: 44px;
  height: 44px;
}
.anpr-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.anpr-thumb-empty {
  font-size: 14px;
  color: #d9d9d9;
}
.anpr-name {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.anpr-sub {
  font-size: 10.5px;
  color: #9ca3af;
  line-height: 1.35;
}
.anpr-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.anpr-tag {
  margin: 0;
}
.anpr-staff {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  line-height: 1.5;
}
.anpr-role {
  font-size: 10px;
  color: #9ca3af;
  background: #f5f5f5;
  padding: 0 3px;
  border-radius: 2px;
  flex-shrink: 0;
}
.anpr-link {
  color: #1890ff;
  font-size: 11px;
  word-break: break-all;
}
.anpr-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.45;
  color: #4b5563;
}
.anpr-spec-line {
  font-size: 11px;
  line-height: 1.5;
  color: #374151;
}
.anpr-spec-line .k {
  color: #9ca3af;
  margin-right: 4px;
  font-size: 10px;
}
.anpr-spec-note {
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
}
.anpr-attr-tag {
  margin: 0 4px 4px 0;
}
.anpr-muted {
  color: #9ca3af;
  font-size: 11px;
}
.anpr-action {
  color: #1890ff;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 8px;
}
.anpr-action:first-child {
  margin-left: 0;
}
.anpr-action:hover {
  text-decoration: underline;
}
</style>
