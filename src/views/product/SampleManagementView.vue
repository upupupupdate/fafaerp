<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSampleManagementStore } from '@/features/product/useSampleManagementStore.js'
import { useNpdApparelStore } from '@/features/product/useNpdApparelStore.js'
import { fabricCardDisplayName } from '@/features/product/useFabricColorCardStore.js'
import { useFabricColorCardStore } from '@/features/product/useFabricColorCardStore.js'
import { useSizeLibraryStore } from '@/features/product/useSizeLibraryStore.js'

const route = useRoute()
const sampleStore = useSampleManagementStore()
const npdStore = useNpdApparelStore()
const fabricStore = useFabricColorCardStore()
const sizeStore = useSizeLibraryStore()

const tab = ref('all')
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'sampling', label: '打样中' },
  { key: 'revision', label: '待改版' },
  { key: 'finalized', label: '已定版' },
  { key: 'published', label: '已推送' },
]

const filtered = computed(() => sampleStore.filterByTab(tab.value))

const highlightId = ref('')
watch(
  () => route.query.highlight,
  (q) => {
    highlightId.value = typeof q === 'string' ? q : ''
  },
  { immediate: true },
)

const STATUS_LABEL = {
  received: '已接收',
  sampling: '打样中',
  revision: '待改版',
  finalized: '已定版',
  published: '已推送',
}

function fabricCardLabel(id) {
  if (!id) return '—'
  const c = fabricStore.getById(id)
  return c ? fabricCardDisplayName(c) : id
}

function sizeChartLabel(id) {
  if (!id) return '—'
  const ch = sizeStore.getById(id)
  return ch?.name ?? id
}

function cell(v) {
  if (v === null || v === undefined || v === '') return '—'
  return v
}

function onFinalize(row) {
  const { ok, count, msg } = sampleStore.finalizeStyle(row.id)
  if (!ok) {
    ElMessage.warning(msg || '定版失败')
    return
  }
  ElMessage.success(`已定版，按色卡×尺码生成 ${count} 条 SKU，可「出版」推送至产品管理`)
}

async function onPublish(row) {
  try {
    await ElMessageBox.confirm(
      '将把已定版 SKU 写入产品管理待导入队列（基于当前面料色卡与尺码库笛卡尔积结果）。是否继续？',
      '出版',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const { ok, count, msg } = sampleStore.publishStyle(row.id)
  if (!ok) {
    ElMessage.warning(msg || '出版失败')
    return
  }
  ElMessage.success(`已推送 ${count} 条 SKU，请到「产品管理」点击导入`)
}

async function onRevision(row) {
  try {
    await ElMessageBox.confirm('将退回开发调整版单，新品开发对应单将回到「待开款」。', '复版退回', {
      type: 'warning',
    })
  } catch {
    return
  }
  sampleStore.requestRevision(row.id)
  npdStore.backToPendingStyleForRevision(row.npdId)
  ElMessage.info('已标记复版，新品开发可继续调整')
}

function rowClassName({ row }) {
  return highlightId.value && row.npdId === highlightId.value ? 'sm-row-highlight' : ''
}
</script>

<template>
  <div class="sm-page">
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>产品</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">样板管理</span>
      </div>
    </header>

    <div class="sm-toolbar">
      <el-radio-group v-model="tab" size="default">
        <el-radio-button v-for="t in tabs" :key="t.key" :value="t.key">{{ t.label }}</el-radio-button>
      </el-radio-group>
      <p class="sm-tip">
        本地无数据时会自动写入两条演示样板（与新品开发列表中带「【演示】」的开发单对应）。在「待开款」行维护色卡与尺码表后<strong>提交开款</strong>也会同步至此列表。定版后按<strong>面料色卡颜色 × 尺码库尺码</strong>生成 SKU，「出版」推送到产品管理待导入队列。配置：
        <router-link class="link" to="/product/config/fabric-color-cards">面料色卡库</router-link>
        、
        <router-link class="link" to="/product/config/size-library">尺码库</router-link>
      </p>
    </div>

    <div class="sm-table-wrap">
      <el-table
        :data="filtered"
        border
        stripe
        size="small"
        class="sm-table"
        :row-class-name="rowClassName"
        empty-text="暂无样板数据，请在新品开发「待开款」中提交开款"
      >
        <el-table-column type="expand">
          <template #default="{ row: r }">
            <div class="sm-expand">
              <div class="sm-expand-title">颜色变体（不计入笛卡尔积的「面辅料」等在主表维护）</div>
              <el-table :data="r.variants || []" border size="small" class="sm-var-table">
                <el-table-column prop="fabricLine" label="面辅料（面料行）" min-width="220" show-overflow-tooltip />
                <el-table-column label="颜色" width="140">
                  <template #default="{ row: v }">{{ v.colorZh }}{{ v.colorCode ? ` #${v.colorCode}` : '' }}</template>
                </el-table-column>
                <el-table-column label="尺码" min-width="160">
                  <template #default="{ row: v }">{{ (v.sizes || []).join(', ') }}</template>
                </el-table-column>
                <el-table-column label="预估成本(米价)" width="120" align="right">
                  <template #default="{ row: v }">{{ v.estCost != null ? `¥${v.estCost}` : '—' }}</template>
                </el-table-column>
                <el-table-column prop="devName" label="开发" width="88" />
              </el-table>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="款式图" width="72" align="center" fixed="left">
          <template #default="{ row: r }">
            <div class="sm-thumb">
              <img v-if="r.imageUrl" :src="r.imageUrl" alt="" />
              <span v-else class="sm-thumb-ph">—</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="designNo" label="设计号" width="120" fixed="left" show-overflow-tooltip />
        <el-table-column prop="styleName" label="款名" min-width="140" show-overflow-tooltip />
        <el-table-column prop="spu" label="SPU" width="150" show-overflow-tooltip />
        <el-table-column label="版型" width="72">
          <template #default="{ row: r }">{{ cell(r.fitTypeLabel) }}</template>
        </el-table-column>
        <el-table-column label="面料色卡库" min-width="160" show-overflow-tooltip>
          <template #default="{ row: r }">{{ fabricCardLabel(r.fabricCardId) }}</template>
        </el-table-column>
        <el-table-column label="尺码库" min-width="120" show-overflow-tooltip>
          <template #default="{ row: r }">{{ sizeChartLabel(r.sizeChartId) }}</template>
        </el-table-column>
        <el-table-column prop="mainFabricExtra" label="面辅料" min-width="120" show-overflow-tooltip />
        <el-table-column prop="accessories" label="辅料" min-width="100" show-overflow-tooltip />
        <el-table-column prop="patternName" label="图案名称" width="96" show-overflow-tooltip />
        <el-table-column prop="brand" label="品牌" width="88" show-overflow-tooltip />
        <el-table-column prop="season" label="季节" width="100" show-overflow-tooltip />
        <el-table-column prop="shelfYear" label="上架年份" width="88" />
        <el-table-column prop="gender" label="人群" width="72" />
        <el-table-column prop="scene" label="场景" width="72" show-overflow-tooltip />
        <el-table-column prop="category" label="品类" width="96" show-overflow-tooltip />
        <el-table-column label="打样尺码/克重" width="120">
          <template #default="{ row: r }">{{ r.sampleSize }} / {{ r.sampleWeightGsm }}g</template>
        </el-table-column>
        <el-table-column prop="targetPrice" label="目标价格" width="88" align="right" />
        <el-table-column label="预估成本" width="88" align="right">
          <template #default="{ row: r }">{{ r.avgEstCost != null ? `¥${r.avgEstCost}` : '—' }}</template>
        </el-table-column>
        <el-table-column prop="materialCost" label="用料成本" width="88" align="right" />
        <el-table-column prop="productionCost" label="生产成本" width="88" align="right" />
        <el-table-column prop="leadTime" label="货期" width="80" show-overflow-tooltip />
        <el-table-column prop="materialLeadTime" label="料期" width="80" show-overflow-tooltip />
        <el-table-column prop="outsourceFactory" label="外发工厂" min-width="100" show-overflow-tooltip />
        <el-table-column prop="workshopNotes" label="车间及尾部工艺" min-width="120" show-overflow-tooltip />
        <el-table-column prop="craftNotes" label="工艺注意事项" min-width="120" show-overflow-tooltip />
        <el-table-column prop="openDate" label="开款时间" width="108" />
        <el-table-column prop="revisionDate" label="复版时间" width="108" />
        <el-table-column prop="packagingType" label="包装方式" width="100" show-overflow-tooltip />
        <el-table-column prop="packagingMaterials" label="包装物料" min-width="100" show-overflow-tooltip />
        <el-table-column prop="market" label="市场" width="72" />
        <el-table-column label="状态" width="88" fixed="right">
          <template #default="{ row: r }">
            <el-tag size="small" effect="plain">{{ STATUS_LABEL[r.sampleStatus] ?? r.sampleStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row: r }">
            <el-button
              v-if="r.sampleStatus === 'sampling' || r.sampleStatus === 'revision' || r.sampleStatus === 'received'"
              type="primary"
              link
              @click="onFinalize(r)"
            >
              定版
            </el-button>
            <el-button v-if="r.sampleStatus === 'finalized'" type="success" link @click="onPublish(r)">出版</el-button>
            <el-button
              v-if="r.sampleStatus === 'sampling' || r.sampleStatus === 'received'"
              type="danger"
              link
              @click="onRevision(r)"
            >
              复版退回
            </el-button>
            <router-link class="sm-link" :to="{ path: '/product/new-dev', query: { focus: r.npdId } }">新品开发</router-link>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.sm-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}
.erp-header {
  padding: 12px 20px;
  border-bottom: 1px solid #f0f2f5;
}
.header-breadcrumb {
  font-size: 14px;
  color: #6b7280;
}
.bc-sep {
  margin: 0 8px;
  color: #d1d5db;
}
.bc-cur {
  color: #111827;
  font-weight: 600;
}
.sm-toolbar {
  padding: 12px 20px;
  border-bottom: 1px solid #f0f2f5;
}
.sm-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
  max-width: 1100px;
}
.sm-tip .link {
  color: #1890ff;
}
.sm-table-wrap {
  flex: 1;
  min-height: 0;
  padding: 12px 16px 24px;
  overflow: auto;
}
.sm-table {
  width: max-content;
  min-width: 100%;
}
.sm-table :deep(.sm-row-highlight) > td {
  background-color: #e6f7ff !important;
}
.sm-thumb {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}
.sm-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sm-thumb-ph {
  font-size: 11px;
  color: #d1d5db;
}
.sm-expand {
  padding: 8px 12px 16px 48px;
  background: #fafbfc;
}
.sm-expand-title {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}
.sm-var-table {
  max-width: 960px;
}
.sm-link {
  margin-left: 6px;
  font-size: 12px;
  color: #1890ff;
}
</style>
