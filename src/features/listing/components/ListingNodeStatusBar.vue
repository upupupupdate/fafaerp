<script setup>
// 备货发货子节点统计面板
// nodes : STOCKING_PANELS 数组（含货件入仓派生面板）
// stats : { [nodeKey]: { total, warning, overdue } }，随筛选联动由父组件传入
// v-model:active : 当前选中的子节点 key（null = 全部）

const props = defineProps({
  nodes: { type: Array, required: true },
  stats: { type: Object, required: true },
})
const active = defineModel('active', { default: null })

function toggle(key) {
  active.value = active.value === key ? null : key
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
      <div class="lnsb-label">{{ node.label }}</div>
      <div class="lnsb-total">{{ stats[node.key]?.total ?? 0 }} 件</div>
      <!-- 预警行：仅在有预警时显示橙色 -->
      <div
        v-if="(stats[node.key]?.warning ?? 0) > 0"
        class="lnsb-warning"
      >
        预警 {{ stats[node.key].warning }} 件
      </div>
      <!-- 超时行：始终占位，有超时时变红 -->
      <div
        class="lnsb-overdue"
        :class="{ 'has-overdue': (stats[node.key]?.overdue ?? 0) > 0 }"
      >
        超时 {{ stats[node.key]?.overdue ?? 0 }} 件
      </div>
    </div>
  </div>
</template>

<style scoped>
.lnsb-wrap {
  display: flex;
  gap: 8px;
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  padding: 8px 16px;
  flex-shrink: 0;
}
.lnsb-card {
  flex: 1;
  min-width: 72px;
  padding: 5px 6px;
  border: 1px solid #e8ecf0;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition: all .15s;
  background: #fafafa;
}
.lnsb-card:hover  { border-color: #1890ff; background: #e6f4ff; }
.lnsb-card.active { border-color: #1890ff; background: #e6f4ff; }
.lnsb-label   { font-size: 10.5px; color: #374151; font-weight: 600; white-space: nowrap; }
.lnsb-total   { font-size: 14px;   color: #1890ff; font-weight: 700; margin: 2px 0 1px; }
.lnsb-warning { font-size: 10px;   color: #d97706; font-weight: 600; }
.lnsb-overdue { font-size: 10px;   color: #9ca3af; }
.lnsb-overdue.has-overdue { color: #ef4444; font-weight: 600; }
</style>
