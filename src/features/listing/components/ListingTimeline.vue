<script setup>
// 上架跟踪时间轴：类 Steps — 对勾/序号节点、实线轨道；超时节点与文案 #F56C6C
import { Check } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { SUB_NODES, nodeState, noLabel as defaultNoLabel, estLabel as defaultEstLabel } from '@/features/listing/listingDefs.js'

const props = defineProps({
  timeline:         { type: Array, required: true },
  transitionInfos:  { type: Array, required: true },
  subNodes:         { type: Array, default: null },
  noLabelFn:        { type: Function, default: null },
  estLabelFn:       { type: Function, default: null },
  /** 详情页等场景：更紧凑、扁平的步骤条 */
  compact:          { type: Boolean, default: false },
})

const labels = computed(() =>
  props.subNodes?.length ? props.subNodes : SUB_NODES,
)

const activeNodeIdx = computed(() => {
  const t = props.timeline
  for (let i = 0; i < t.length; i++) {
    if (!t[i].done) return i
  }
  return Math.max(0, t.length - 1)
})

function resolveNoLabel(idx) {
  return (props.noLabelFn ?? defaultNoLabel)(idx)
}

function resolveEstLabel(key) {
  return (props.estLabelFn ?? defaultEstLabel)(key)
}

/** 节点视觉：done | done-warn | current | current-overdue | pending */
function stepKind(idx) {
  const tl = props.timeline[idx]
  const ns = nodeState(tl, props.transitionInfos[idx])
  const isCurrent = idx === activeNodeIdx.value && !tl.done
  if (tl.done) return ns === 'done-overdue' ? 'done-warn' : 'done'
  if (isCurrent) {
    return ns === 'overdue' || tl.overdue ? 'current-overdue' : 'current'
  }
  return 'pending'
}

/** 下方整块文案是否用超时红（当前卡点超时 / 已完成但曾超时） */
function isBlockOverdue(idx) {
  const tl = props.timeline[idx]
  const ns = nodeState(tl, props.transitionInfos[idx])
  if (tl.done) return ns === 'done-overdue'
  if (idx === activeNodeIdx.value && !tl.done) {
    return props.transitionInfos[idx]?.state === 'overdue' || tl.overdue === true
  }
  return false
}

function trackSegmentClass(idx) {
  if (idx <= 0) return ''
  const prevDone = props.timeline[idx - 1]?.done
  if (!prevDone) return 'track-idle'
  const tr = props.transitionInfos[idx]
  if (!tr) return 'track-idle'
  if (tr.state === 'overdue') return 'track-overdue'
  if (tr.state === 'warning' || tr.state === 'active') return 'track-active'
  if (tr.state === 'done') return 'track-done'
  return 'track-idle'
}

function personLine(tl, idx) {
  if (tl.done && tl.person) return tl.person
  if (!tl.done && (props.transitionInfos[idx]?.state === 'overdue' || tl.overdue)) return tl.person || '—'
  if (!tl.done) return '—'
  return tl.person || '—'
}

function timeLine(tl, idx) {
  if (tl.done && tl.time) {
    return idx < props.timeline.length - 1 ? tl.time : (tl.time?.slice(0, 10) ?? '')
  }
  if (tl.estimatedTime) return `${resolveEstLabel(tl.key)} ${tl.estimatedTime.slice(0, 10)}`
  return '—'
}
</script>

<template>
  <div class="lts-row" :class="{ 'lts-row--compact': props.compact }">
    <template v-for="(tl, idx) in timeline" :key="tl.key">

      <div v-if="idx > 0" class="lts-connector">
        <div class="lts-connector-top">
          <div
            v-if="transitionInfos[idx]"
            class="lts-duration"
            :class="transitionInfos[idx].state"
          >
            要求{{ transitionInfos[idx].standard }}天／实际{{
              transitionInfos[idx].actual != null ? `${transitionInfos[idx].actual}天` : '-/-'
            }}
          </div>
        </div>
        <div class="lts-connector-mid">
          <div class="lts-track-wrap">
            <div class="lts-track-bar" :class="trackSegmentClass(idx)" />
          </div>
        </div>
        <div class="lts-connector-bot">
          <div
            v-if="transitionInfos[idx]?.state === 'overdue'"
            class="lts-overdue-tag"
          >
            超时{{ transitionInfos[idx].overdueDays }}天
          </div>
        </div>
      </div>

      <div class="lts-node-wrap" :class="{ first: idx === 0 }">
        <div class="lts-connector-top lts-connector-top--spacer" />
        <div class="lts-node-mid">
          <div
            class="lts-step-circle"
            :class="{
              'lts-step--done': stepKind(idx) === 'done',
              'lts-step--done-warn': stepKind(idx) === 'done-warn',
              'lts-step--current': stepKind(idx) === 'current',
              'lts-step--current-od': stepKind(idx) === 'current-overdue',
              'lts-step--pending': stepKind(idx) === 'pending',
            }"
          >
            <el-icon v-if="stepKind(idx) === 'done' || stepKind(idx) === 'done-warn'" class="lts-step-icon" :size="props.compact ? 8 : 9">
              <Check />
            </el-icon>
            <span v-else class="lts-step-num">{{ idx + 1 }}</span>
          </div>
        </div>
        <div
          class="lts-step-meta"
          :class="{ 'lts-step-meta--overdue': isBlockOverdue(idx) }"
        >
          <div class="lts-title">{{ labels[idx]?.label }}</div>
          <div class="lts-person">{{ personLine(tl, idx) }}</div>
          <div class="lts-time">{{ timeLine(tl, idx) }}</div>
          <div v-if="tl.done && tl.no" class="lts-no">{{ resolveNoLabel(idx) }}：{{ tl.no }}</div>
        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
.lts-row {
  display: flex;
  align-items: flex-start;
  padding: 2px 6px 4px;
  background: #fff;
  border-bottom: 1px solid #f0f2f5;
  overflow-x: auto;
  overflow-y: visible;
}

.lts-connector,
.lts-node-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lts-node-wrap {
  flex: 0 0 auto;
  width: 108px;
  min-width: 96px;
  position: relative;
  z-index: 2;
}
.lts-connector {
  flex: 1 1 36px;
  min-width: 28px;
  max-width: 80px;
  z-index: 1;
}

.lts-connector-top {
  min-height: 12px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex-shrink: 0;
}
.lts-connector-top--spacer {
  min-height: 12px;
}

.lts-duration {
  font-size: 8px;
  font-weight: 500;
  white-space: nowrap;
  padding: 0 3px;
  border-radius: 2px;
  line-height: 1.2;
}
.lts-duration.done    { color: #c0c4cc; }
.lts-duration.overdue { color: #f56c6c; background: #fef0f0; border: 1px solid #fbc4c4; }
.lts-duration.warning { color: #d97706; background: #fffbe6; border: 1px solid #ffe58f; }
.lts-duration.active  { color: #409eff; background: #ecf5ff; border: 1px solid #b3d8ff; }
.lts-duration.pending { color: #c0c4cc; }

.lts-connector-mid {
  height: 16px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
}

.lts-node-mid {
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

/* 轨道 */
.lts-track-wrap {
  position: absolute;
  left: -54px;
  right: -54px;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  z-index: 0;
  pointer-events: none;
}
.lts-track-bar {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  transition: background 0.15s ease;
}
.track-done {
  background: #409eff;
}
.track-active {
  background: #409eff;
}
.track-overdue {
  background: #f56c6c;
}
.track-idle {
  background: #e4e7ed;
}

.lts-node-wrap.first .lts-connector-mid {
  overflow: hidden;
}

/* 步骤圆：示意图 — 完成浅蓝+勾，当前蓝底序号，未开始灰底序号，超时红 */
.lts-step-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 3;
  box-sizing: border-box;
}
.lts-step--done {
  background: #79bbff;
  color: #fff;
}
.lts-step--done .lts-step-icon {
  color: #fff;
}
.lts-step--done-warn {
  background: #f56c6c;
  color: #fff;
}
.lts-step--done-warn .lts-step-icon {
  color: #fff;
}
.lts-step--current {
  background: #409eff;
  color: #fff;
  box-shadow: 0 1px 3px rgba(64, 158, 255, 0.35);
}
.lts-step--current-od {
  background: #f56c6c;
  color: #fff;
  box-shadow: 0 1px 3px rgba(245, 108, 108, 0.35);
}
.lts-step--pending {
  background: #ebeef5;
  border: 1px solid #e4e7ed;
}
.lts-step-num {
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}
.lts-step--pending .lts-step-num {
  color: #909399;
}

.lts-overdue-tag {
  font-size: 8px;
  font-weight: 600;
  color: #f56c6c;
  margin-top: 0;
  white-space: nowrap;
}

/* 下方：标题 + 人 + 时间 三行居中 */
.lts-step-meta {
  width: 100%;
  text-align: center;
  padding: 0 2px;
}
.lts-step-meta--overdue .lts-title,
.lts-step-meta--overdue .lts-person,
.lts-step-meta--overdue .lts-time {
  color: #f56c6c !important;
}
.lts-title {
  font-size: 9px;
  font-weight: 600;
  color: #303133;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lts-person {
  font-size: 8px;
  color: #606266;
  margin-top: 0;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lts-time {
  font-size: 8px;
  color: #909399;
  margin-top: 0;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lts-no {
  font-size: 7px;
  color: #c0c4cc;
  margin-top: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lts-connector-bot {
  min-height: 8px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* 详情抽屉：紧凑扁平 11 节点 */
.lts-row--compact {
  padding: 0 4px 2px;
  border-bottom: none;
  background: #fafbfc;
}
.lts-row--compact .lts-node-wrap {
  width: 86px;
  min-width: 72px;
}
.lts-row--compact .lts-connector {
  min-width: 22px;
  max-width: 56px;
}
.lts-row--compact .lts-connector-top,
.lts-row--compact .lts-connector-top--spacer {
  min-height: 8px;
}
.lts-row--compact .lts-duration {
  font-size: 7px;
  padding: 0 2px;
  transform: scale(0.95);
  transform-origin: center bottom;
}
.lts-row--compact .lts-connector-mid,
.lts-row--compact .lts-node-mid {
  height: 12px;
}
.lts-row--compact .lts-node-mid {
  margin-bottom: 1px;
}
.lts-row--compact .lts-track-wrap {
  left: -43px;
  right: -43px;
  height: 2px;
}
.lts-row--compact .lts-step-circle {
  width: 13px;
  height: 13px;
}
.lts-row--compact .lts-step--current,
.lts-row--compact .lts-step--current-od {
  box-shadow: none;
}
.lts-row--compact .lts-step-num {
  font-size: 7px;
}
.lts-row--compact .lts-title {
  font-size: 8px;
}
.lts-row--compact .lts-person,
.lts-row--compact .lts-time {
  font-size: 7px;
}
.lts-row--compact .lts-no {
  font-size: 6px;
}
.lts-row--compact .lts-connector-bot {
  min-height: 6px;
}
.lts-row--compact .lts-overdue-tag {
  font-size: 7px;
}
</style>
