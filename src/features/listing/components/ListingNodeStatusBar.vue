<script setup>
import { STOCKING_PANEL_ACCENTS } from '@/features/listing/listingDefs.js'

const props = defineProps({
  nodes: { type: Array, required: true },
  stats: { type: Object, required: true },
  /** 可选：各节点左侧色条；不传则使用备货发货 STOCKING_PANEL_ACCENTS */
  accents: { type: Object, default: null },
})
const active = defineModel('active', { default: null })

function toggle(key) {
  active.value = active.value === key ? null : key
}

function accent(key) {
  const map = props.accents ?? STOCKING_PANEL_ACCENTS
  return map[key] || '#409EFF'
}
</script>

<template>
  <div class="lnsb-wrap">
    <div
      v-for="node in nodes"
      :key="node.key"
      class="lnsb-card"
      :class="{ active: active === node.key }"
      @click="toggle(node.key)"
    >
      <div class="lnsb-accent" :style="{ background: accent(node.key) }" />
      <div class="lnsb-inner">
        <div class="lnsb-title">{{ node.label }}</div>
        <div class="lnsb-metric">共 {{ stats[node.key]?.total ?? 0 }} 件</div>
        <div
          v-if="(stats[node.key]?.warning ?? 0) > 0"
          class="lnsb-warning"
        >
          预警 {{ stats[node.key].warning }} 件
        </div>
        <div
          class="lnsb-overdue"
          :class="{ 'has-overdue': (stats[node.key]?.overdue ?? 0) > 0 }"
        >
          超时 {{ stats[node.key]?.overdue ?? 0 }} 件
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lnsb-wrap {
  display: flex;
  gap: 8px;
  background: transparent;
  padding: 6px 12px;
  flex-shrink: 0;
}
.lnsb-card {
  flex: 1;
  min-width: 72px;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  overflow: hidden;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.lnsb-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #d9ecff;
}
.lnsb-card.active {
  border-color: #409eff;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.2);
}
.lnsb-accent {
  width: 4px;
  flex-shrink: 0;
}
.lnsb-inner {
  flex: 1;
  padding: 6px 6px 5px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.lnsb-title {
  font-size: 12px;
  color: #303133;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.lnsb-metric {
  font-size: 14px;
  font-weight: 700;
  color: #409eff;
  line-height: 1.2;
}
.lnsb-warning {
  font-size: 10px;
  color: #d97706;
  font-weight: 600;
}
.lnsb-overdue {
  font-size: 10px;
  color: #c0c4cc;
}
.lnsb-overdue.has-overdue {
  color: #f56c6c;
  font-weight: 600;
}
</style>
