<script setup>
// 单产品时间轴行组件 —— 纯展示，无副作用
// subNodes 传入时用于新品开发等场景，与上架跟踪 SUB_NODES 共用同一套布局
import { computed } from 'vue'
import { SUB_NODES, nodeState, noLabel as defaultNoLabel, estLabel as defaultEstLabel } from '@/features/listing/listingDefs.js'

const props = defineProps({
  timeline:         { type: Array, required: true },
  transitionInfos:  { type: Array, required: true },
  /** 自定义节点定义（{ key, label }[]）；不传则使用上架跟踪 9 节点 */
  subNodes:         { type: Array, default: null },
  noLabelFn:        { type: Function, default: null },
  estLabelFn:       { type: Function, default: null },
})

const labels = computed(() =>
  props.subNodes?.length ? props.subNodes : SUB_NODES,
)

function resolveNoLabel(idx) {
  return (props.noLabelFn ?? defaultNoLabel)(idx)
}

function resolveEstLabel(key) {
  return (props.estLabelFn ?? defaultEstLabel)(key)
}
</script>

<template>
  <div class="lts-row">
    <template v-for="(tl, idx) in timeline" :key="tl.key">

      <!-- 连接器：两节点之间，flex:1 撑满 -->
      <div v-if="idx > 0" class="lts-connector">

        <!-- top 区：双行时效标签 -->
        <div class="lts-top">
          <div
            v-if="transitionInfos[idx]"
            class="lts-duration"
            :class="transitionInfos[idx].state"
          >
            要求时效：{{ transitionInfos[idx].standard }}天／实际时效：{{
              transitionInfos[idx].actual != null ? `${transitionInfos[idx].actual}天` : '-/-'
            }}
          </div>
        </div>

        <!-- mid 区：连线 -->
        <div class="lts-mid">
          <!-- 连线仅表示上一节点是否已完成，不因超时/预警变色 -->
          <div
            class="lts-line"
            :class="timeline[idx - 1].done ? 'done' : 'pending'"
          />
        </div>

        <!-- bot 区：超时时在线下方打红色标签 -->
        <div class="lts-bot">
          <div
            v-if="transitionInfos[idx]?.state === 'overdue'"
            class="lts-overdue-tag"
          >
            超时{{ transitionInfos[idx].overdueDays }}天
          </div>
        </div>
      </div>

      <!-- 节点：固定宽 150px，z-index 高于连线 -->
      <div
        class="lts-node-wrap"
        :class="{ first: idx === 0 }"
      >
        <div class="lts-top" />
        <div class="lts-mid">
          <div class="lts-dot" :class="nodeState(tl, transitionInfos[idx])" />
        </div>
        <div class="lts-bot">
          <div class="lts-name">{{ labels[idx]?.label }}</div>

          <template v-if="tl.done">
            <div v-if="tl.person || tl.time" class="lts-info-row">
              {{ tl.person }}{{ tl.person && tl.time ? '\u00a0' : '' }}{{ idx < timeline.length - 1 ? tl.time : tl.time?.slice(0,10) }}
            </div>
            <div v-if="tl.no" class="lts-no">{{ resolveNoLabel(idx) }}：{{ tl.no }}</div>
          </template>

          <template v-else-if="tl.estimatedTime">
            <div class="lts-info-row muted">
              {{ resolveEstLabel(tl.key) }} {{ tl.estimatedTime.slice(0, 10) }}
            </div>
          </template>
        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
/* ── 颜色变量（弱化已完成，高亮异常/当前） ── */
:root {
  --success-gray: #C0C4CC;
  --line-gray:    #EBEEF2;
  --text-secondary: #909399;
}

/* ══ 时间轴行 ═══════════════════════════════════════════════════════════
   三区：top(时效) | mid(线/点，宜窄以贴近轴线) | bot(节点/超时)
   连线：absolute left/right:-75px
════════════════════════════════════════════════════════════════════════ */
.lts-row {
  display: flex;
  align-items: stretch;
  padding: 0 10px;
  background: #fafcff;
  border-bottom: 1px solid #f0f2f5;
  overflow: visible;
}

.lts-connector,
.lts-node-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lts-node-wrap { flex-shrink: 0; width: 150px; position: relative; z-index: 2; }
.lts-connector { flex: 1; min-width: 40px; overflow: visible; z-index: 1; }

/* top 区：单行时效，底贴 mid 上沿，无额外 padding 拉大与轴线距离 */
.lts-top {
  height: 18px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 0;
  box-sizing: border-box;
  flex-shrink: 0;
}

/* mid 区：略矮使轴线更靠近上下文案（轴线在 50%，条带越窄间距越小） */
.lts-mid {
  height: 11px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: visible;
  position: relative;
}

/* bot 区：自由高度，节点信息 / 超时标签 */
.lts-bot {
  flex: 1;
  width: 100%;
  padding: 2px 2px 5px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── 时效标签（连接器 top 区）
   原则：正常完成 → 浅灰无框，不抢眼球；只有异常/当前进行才着色 ── */
.lts-duration {
  font-size: 9px;
  font-weight: 500;
  white-space: nowrap;
  padding: 0 4px 1px;
  border-radius: 3px;
  pointer-events: none;
  line-height: 1.28;
}
.lts-duration.done    { color: #C0C4CC; background: transparent; border: none; }
.lts-duration.overdue { color: #ef4444; background: #fff2f0; border: 1px solid #ffa39e; }
.lts-duration.warning { color: #d97706; background: #fffbe6; border: 1px solid #ffe58f; }
.lts-duration.active  { color: #1890ff; background: #e6f4ff; border: 1px solid #91caff; }
.lts-duration.pending { color: #C0C4CC; background: transparent; border: none; }

/* ── 超时标签（连接器 bot 区，线下方） ── */
.lts-overdue-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  color: #ef4444;
  background: #fff2f0;
  border: 1px solid #ffa39e;
  border-radius: 3px;
  padding: 0 5px;
  margin-top: -6px;
  line-height: 1.28;
  white-space: nowrap;
}

/* ── 连线：仅区分已走过 / 未走过；超时信息只在上下标签与节点圆点 ── */
.lts-line {
  position: absolute;
  left: -75px;
  right: -75px;
  top: 50%;
  height: 0;
  z-index: 0;
}
.lts-line.done    { border-top: 1px solid #EBEEF2; }
.lts-line.pending { border-top: 1px dashed #E4E7ED; }

/* 第一个节点的 mid 区：阻止左侧连线视觉穿透 */
.lts-node-wrap.first .lts-mid { overflow: hidden; }

/* ── 圆点：按时完成→蓝实心；入边区间超时完成→红实心；进行中超时→红脉冲；当前→蓝环；未到达→灰边 ── */
.lts-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid;
  background: #fff;
  flex-shrink: 0;
  position: relative;
  z-index: 3;
}
.lts-dot.done    { background: #1890ff; border-color: #1890ff; width: 8px; height: 8px; }
.lts-dot.done-overdue {
  background: #ef4444;
  border-color: #ef4444;
  width: 8px;
  height: 8px;
  box-shadow: none;
  animation: none;
}
.lts-dot.overdue { background: #fff; border-color: #ef4444; width: 10px; height: 10px; box-shadow: 0 0 0 3px rgba(239,68,68,.2); animation: pulse-red 1.5s infinite; }
.lts-dot.active  { background: #fff; border-color: #1890ff; width: 10px; height: 10px; box-shadow: 0 0 0 3px rgba(24,144,255,.2); animation: pulse-blue 1.5s infinite; }
.lts-dot.pending { background: #fff; border-color: #E4E7ED; }

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,.2); }
  50%       { box-shadow: 0 0 0 5px rgba(239,68,68,.05); }
}
@keyframes pulse-blue {
  0%, 100% { box-shadow: 0 0 0 3px rgba(24,144,255,.2); }
  50%       { box-shadow: 0 0 0 5px rgba(24,144,255,.05); }
}

/* ── 节点文字 ── */
.lts-name     { font-size: 10px; font-weight: 500; color: #909399; white-space: nowrap; }
.lts-info-row {
  display: block;
  text-align: center;
  font-size: 8.5px;
  color: #909399;
  line-height: 1.5;
  margin-top: 1px;
  white-space: nowrap;
}
.lts-info-row.muted { color: #c0c4cc; font-style: italic; }
.lts-no { font-size: 8px; color: #c0c4cc; white-space: nowrap; }
</style>
