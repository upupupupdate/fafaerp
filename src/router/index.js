import { createRouter, createWebHistory } from 'vue-router'
import ErpLayout from '@/layouts/ErpLayout.vue'

const routes = [
  {
    path: '/',
    component: ErpLayout,
    redirect: '/product/scenes',
    children: [
      {
        path: 'product/scenes',
        name: 'ProductScenes',
        component: () => import('@/views/product/SceneManagementView.vue'),
        meta: { breadcrumb: ['产品', '场景管理'] },
      },
      {
        path: 'product/new-dev',
        name: 'ProductNewDev',
        component: () => import('@/views/product/NewProductDevView.vue'),
        meta: { breadcrumb: ['产品', '新品开发'] },
      },
      {
        path: 'product/sample-board',
        name: 'SampleManagement',
        component: () => import('@/views/product/SampleManagementView.vue'),
        meta: { breadcrumb: ['产品', '样板管理'] },
      },
      {
        path: 'product/list',
        name: 'ProductList',
        component: () => import('@/views/product/ProductManagementView.vue'),
        meta: { breadcrumb: ['产品', '产品管理'] },
      },
      {
        path: 'product/config/fabric-color-cards',
        name: 'FabricColorCardLibrary',
        component: () => import('@/views/product/config/FabricColorCardLibraryView.vue'),
        meta: { breadcrumb: ['产品', '面料色卡库'] },
      },
      {
        path: 'product/config/size-library',
        name: 'SizeLibrary',
        component: () => import('@/views/product/config/SizeLibraryView.vue'),
        meta: { breadcrumb: ['产品', '尺码库'] },
      },
      {
        path: 'listing/tracking',
        name: 'ListingTracking',
        component: () => import('@/views/listing/ListingTrackingView.vue'),
        meta: { breadcrumb: ['上架', '上架跟踪'] },
      },
      {
        path: 'listing/config',
        name: 'ListingConfig',
        component: () => import('@/views/listing/ListingConfigView.vue'),
        meta: { breadcrumb: ['上架', '时效配置'] },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
