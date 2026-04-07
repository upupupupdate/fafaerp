<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ListingTimeline from '@/features/listing/components/ListingTimeline.vue'
import {
  NPD_APPAREL_NODES,
  npdEstLabel,
  npdNoLabel,
} from '@/features/product/npdApparelDefs.js'
import { useNpdApparelStore } from '@/features/product/useNpdApparelStore.js'
import { launchSeasonLabel } from '@/features/product/npdApparelRowFields.js'

const router = useRouter()
const npdStore = useNpdApparelStore()

const props = defineProps({
  row: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['update:selected', 'edit'])

const phaseType = {
  draft: 'info',
  pending_review: 'warning',
  pending_style: 'primary',
  sampling: 'warning',
  completed: 'success',
  rejected: 'danger',
  void: 'info',
}

const shelfLine = computed(() => {
  const y = props.row.shelfYear || '—'
  const s = props.row.launchSeason ? launchSeasonLabel(props.row.launchSeason) : '—'
  return `${y} / ${s}`
})

function onSubmitStyleOpening() {
  npdStore.submitStyleOpening(props.row.id)
}

function goSampleBoard() {
  router.push({ path: '/product/sample-board', query: { highlight: props.row.id } })
}

function onEdit() {
  emit('edit', props.row.id)
}
</script>

<template>
  <div class="anp-mini-card">
    <div class="anp-mini-card__timeline">
      <ListingTimeline
        compact
        :timeline="row.timeline"
        :transition-infos="row.transitionInfos"
        :sub-nodes="NPD_APPAREL_NODES"
        :no-label-fn="npdNoLabel"
        :est-label-fn="npdEstLabel"
      />
    </div>
    <div class="anp-mini-card__body">
      <div class="anp-mini-card__top">
        <el-checkbox
          :model-value="selected"
          @update:model-value="(v) => emit('update:selected', v)"
          @click.stop
        />
        <el-tag :type="phaseType[row.workflowPhase] ?? 'info'" size="small" effect="plain" class="anp-mini-card__status">
          {{ row.workflowLabel }}
        </el-tag>
      </div>
      <div class="anp-mini-card__main">
        <div class="anp-mini-card__thumb">
          <img v-if="row.imageUrl" :src="row.imageUrl" :alt="row.nameCn" />
          <span v-else class="anp-mini-card__ph">📷</span>
        </div>
        <div class="anp-mini-card__info">
          <div class="anp-mini-card__title" :title="row.nameCn">{{ row.nameCn || '—' }}</div>
          <div class="anp-mini-card__sub mono">{{ row.designNo ? `设计号 ${row.designNo}` : '设计号 —' }}</div>
          <div class="anp-mini-card__sub">SPU {{ row.spu || '—' }}</div>
          <div class="anp-mini-card__meta">
            <span>{{ row.category || '—' }}</span>
            <span class="dot">·</span>
            <span>{{ row.brand || '—' }}</span>
          </div>
          <div class="anp-mini-card__meta muted">{{ shelfLine }} · {{ row.audience || row.gender || '—' }}</div>
          <div v-if="row.staff?.dev" class="anp-mini-card__meta muted">开发 {{ row.staff.dev }}</div>
        </div>
      </div>
      <div class="anp-mini-card__actions">
        <span v-if="row.workflowPhase === 'pending_style'" class="anp-mini-card__link primary" @click="onSubmitStyleOpening">提交开款</span>
        <span v-if="row.workflowPhase === 'sampling'" class="anp-mini-card__link" @click="goSampleBoard">查看样板</span>
        <span class="anp-mini-card__link" @click="onEdit">编辑</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anp-mini-card {
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eef0f3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: box-shadow 0.22s ease, transform 0.18s ease;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.anp-mini-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
.anp-mini-card__timeline {
  overflow-x: auto;
  border-bottom: 1px solid #f0f2f5;
  background: #fafbfc;
}
.anp-mini-card__timeline :deep(.lts-track-bar) {
  transition: transform 0.18s ease;
}
.anp-mini-card:hover .anp-mini-card__timeline :deep(.lts-track-bar) {
  transform: scaleY(1.2);
}
.anp-mini-card__body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.anp-mini-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.anp-mini-card__status {
  flex-shrink: 0;
}
.anp-mini-card__main {
  display: flex;
  gap: 10px;
  min-width: 0;
}
.anp-mini-card__thumb {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}
.anp-mini-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.anp-mini-card__ph {
  font-size: 22px;
  color: #d9d9d9;
}
.anp-mini-card__info {
  flex: 1;
  min-width: 0;
}
.anp-mini-card__title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.anp-mini-card__sub {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  line-height: 1.3;
}
.anp-mini-card__sub.mono {
  font-family: ui-monospace, monospace;
  font-size: 10px;
}
.anp-mini-card__meta {
  font-size: 11px;
  color: #4b5563;
  margin-top: 4px;
  line-height: 1.35;
}
.anp-mini-card__meta.muted {
  color: #9ca3af;
  font-size: 10.5px;
}
.anp-mini-card__meta .dot {
  margin: 0 4px;
  color: #d1d5db;
}
.anp-mini-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding-top: 2px;
  border-top: 1px solid #f0f2f5;
}
.anp-mini-card__link {
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
}
.anp-mini-card__link:hover {
  text-decoration: underline;
}
.anp-mini-card__link.primary {
  font-weight: 600;
  color: #059669;
}
</style>
