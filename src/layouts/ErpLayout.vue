<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const productOpen  = ref(true)
const listingOpen  = ref(true)

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

const productMenuItems = [
  { path: '/product/scenes',  label: '🎯 场景管理' },
  { path: '/product/new-dev', label: '🚀 新品开发' },
  { path: '/product/sample-board', label: '🧵 样板管理' },
  { path: '/product/list',    label: '📋 产品管理' },
  { path: '/product/config/fabric-color-cards', label: '🎨 面料色卡库' },
  { path: '/product/config/size-library',       label: '📏 尺码库' },
]

const listingMenuItems = [
  { path: '/listing/tracking', label: '📦 上架跟踪' },
  { path: '/listing/config',   label: '⚙️ 时效配置' },
]

</script>

<template>
  <div class="erp-root">
    <nav class="erp-sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">⚡</span>
        <span class="logo-name">发发 YXF</span>
      </div>

      <!-- 产品 -->
      <div class="nav-section">
        <button
          type="button"
          class="nav-item nav-item-parent"
          :class="{ open: productOpen }"
          @click="productOpen = !productOpen"
        >
          <i class="ni">📦</i>
          <span class="nav-label">产品</span>
          <i class="nav-arrow">▾</i>
        </button>
        <div class="nav-children" :class="{ open: productOpen }">
          <router-link
            v-for="item in productMenuItems"
            :key="item.path"
            :to="item.path"
            class="nav-child"
            :class="{ active: isActive(item.path) }"
          >
            {{ item.label }}
          </router-link>
        </div>
      </div>

      <!-- 上架 -->
      <div class="nav-section">
        <button
          type="button"
          class="nav-item nav-item-parent"
          :class="{ open: listingOpen }"
          @click="listingOpen = !listingOpen"
        >
          <i class="ni">🚚</i>
          <span class="nav-label">上架</span>
          <i class="nav-arrow">▾</i>
        </button>
        <div class="nav-children" :class="{ open: listingOpen }">
          <router-link
            v-for="item in listingMenuItems"
            :key="item.path"
            :to="item.path"
            class="nav-child"
            :class="{ active: isActive(item.path) }"
          >
            {{ item.label }}
          </router-link>
        </div>
      </div>
    </nav>

    <div class="erp-main">
      <!-- 内层撑满 flex；勿对 Component 使用 v-if，异步路由加载中会短暂为假值导致主区域空白 -->
      <div class="erp-main-inner">
        <router-view v-slot="{ Component }">
          <!-- 不使用 transition，减少与异步路由/Element Plus 组合时的 parentNode/nextSibling 补丁异常 -->
          <component :is="Component" :key="route.fullPath" />
        </router-view>
      </div>
    </div>
  </div>
</template>

<style scoped>
.erp-main-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

</style>

<style src="@/assets/scene-dict.css"></style>
