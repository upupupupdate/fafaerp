<script setup>
import { ref } from 'vue'
import ApparelNpdPanel from './new-dev/ApparelNpdPanel.vue'
import GeneralNpdPanel from './new-dev/GeneralNpdPanel.vue'

/** 新品类型：与业务流程无关的 UI 切换，URL 不同步（按产品约定） */
const devCategory = ref('apparel')

const workflowTab = ref('all')

const workflowTabs = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿箱' },
  { key: 'pending_review', label: '待审核' },
  { key: 'pending_style', label: '待开款' },
  { key: 'sampling', label: '样板中' },
  { key: 'completed', label: '已完成' },
  { key: 'rejected', label: '审核驳回' },
  { key: 'void', label: '作废' },
]
</script>

<template>
  <div class="npd-page">
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>产品</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">新品开发</span>
      </div>
    </header>

    <div class="npd-toolbar">
      <el-radio-group v-model="devCategory" size="default">
        <el-radio-button value="general">综合类</el-radio-button>
        <el-radio-button value="apparel">服装类</el-radio-button>
      </el-radio-group>
    </div>

    <!-- Tab 仅切换 workflowTab，下方只挂载一份面板，避免每个 Tab 重复挂载引发 el-option/表单多次实例崩溃 -->
    <el-tabs v-model="workflowTab" class="npd-tabs">
      <el-tab-pane
        v-for="t in workflowTabs"
        :key="t.key"
        :name="t.key"
        :label="t.label"
      />
    </el-tabs>
    <div class="npd-panel-wrap">
      <ApparelNpdPanel
        v-if="devCategory === 'apparel'"
        :workflow-tab="workflowTab"
        @update:workflow-tab="workflowTab = $event"
      />
      <GeneralNpdPanel v-else />
    </div>
  </div>
</template>

<style scoped>
.npd-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}
.npd-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px 0;
  border-bottom: 1px solid #f0f2f5;
}
.npd-tabs {
  flex: 0 0 auto;
  padding: 0 16px 8px;
}
/* Tab 内容区无 slot，由下方独立面板渲染 */
.npd-tabs :deep(.el-tabs__content) {
  display: none;
}
.npd-panel-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
</style>
