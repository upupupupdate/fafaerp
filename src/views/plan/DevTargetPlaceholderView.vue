<script setup>
</script>

<template>
  <div class="plan-placeholder">
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>计划</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">开发目标</span>
      </div>
    </header>
    <div class="plan-placeholder-body">
      <p class="plan-placeholder-text">开发目标模块占位，后续与里程碑、负责人等对接。</p>
    </div>
  </div>
</template>

<style scoped>
.plan-placeholder {
  height: 100%;
  background: #f0f2f5;
}
.erp-header {
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}
.header-breadcrumb {
  font-size: 14px;
  color: #606266;
}
.bc-sep {
  margin: 0 6px;
  color: #c0c4cc;
}
.bc-cur {
  color: #303133;
  font-weight: 600;
}
.plan-placeholder-body {
  padding: 24px 20px;
}
.plan-placeholder-text {
  color: #909399;
  font-size: 14px;
}
</style>
