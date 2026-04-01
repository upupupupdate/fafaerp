<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Plus, Search } from '@element-plus/icons-vue'
import { createProduct, fetchProductList } from '@/api/products.js'
import { downloadProductTemplateXlsx } from '@/utils/productTemplateExport.js'
import ProductCreateDrawer from '@/components/product/ProductCreateDrawer.vue'
import SkuCreateDialog from '@/components/product/SkuCreateDialog.vue'

// ── 当前视图维度：'spu' | 'sku' ─────────────────────────────────────
const viewMode = ref('spu')

// ── SPU 父表列宽（拖拽时同步到嵌套子表） ────────────────────────────
// 索引顺序：展开(0) 复选(1) 图片(2) 品名(3) 变体(4) 分类(5) 品牌(6) 类型(7) 状态(8) 型号(9) 单位(10) 成本(11) 时间(12)
const spuColWidths = ref([35, 40, 80, 180, 100, 96, 88, 80, 80, 70, 56, 96, 120])

function onSpuColResize(newWidth, _oldWidth, column) {
  const idx = column.no  // Element Plus 内部 0-based 列序号
  if (typeof idx === 'number' && idx >= 0 && idx < spuColWidths.value.length) {
    spuColWidths.value[idx] = Math.round(newWidth)
  }
}

// ── 筛选条件 ─────────────────────────────────────────────────────────
const keyword = ref('')
const filters = ref({
  productType: '', spuStatus: '', categoryName: '',
  brandName: '', createdFrom: '', createdTo: '', skuActive: '',
})

// ── 数据 ─────────────────────────────────────────────────────────────
// SPU 模式：[{ ...spu, children:[...skus] }]；SKU 模式：[...skus]
const loading = ref(false)
const tableData = ref([])

// SKU 维度勾选的行（用于批量操作）
const skuSelectedRows = ref([])

// ── 新增产品（右侧抽屉） ──────────────────────────────────────────────
const drawerVisible    = ref(false)
// ── 添加单个商品（弹窗） ──────────────────────────────────────────────
const skuDialogVisible = ref(false)

function handleSkuSaved(payload) {
  // 将新建单品追加到 SKU 维度列表头部
  const newRow = {
    skuId:        Date.now(),
    skuCode:      payload.skuCode     || `SKU-${Date.now()}`,
    skuName:      payload.productName || '',
    spuCode:      payload.spuCode     || '',
    spuNameCn:    payload.styleName   || '',
    categoryName: payload.categoryName || '',
    brandName:    payload.brandName   || '',
    productType:  payload.productType  || 'NORMAL',
    status:       payload.status       || 'ACTIVE',
    level:        payload.level        || '',
    imageUrl:     payload.mainImageUrl || '',
    launchDate:   new Date().toISOString().split('T')[0],
    active:       true,
  }
  if (viewMode.value === 'sku') {
    tableData.value = [newRow, ...tableData.value]
  }
}

function handleDrawerSubmit(payload) {
  // 将 drawer 提交的数据追加到当前列表（实际项目应调 createProduct 接口后 reload）
  const newRow = {
    skuId: Date.now(),
    skuCode:     payload.skuCode  || `NEW-${Date.now()}`,
    skuName:     payload.productName || '',
    spuCode:     payload.spuCode || '',
    spuNameCn:   payload.styleName || '',
    categoryName: payload.category || '',
    brandName:   payload.brand    || '',
    productType:  payload.productType || 'FINISHED',
    status:       payload.status  || 'ACTIVE',
    level:        payload.level   || 'A',
    valueType:    payload.valueType,
    positioning:  payload.positioning,
    launchDate:   payload.launchDate,
    imageUrl:     payload.mainImage || '',
    active:       true,
  }
  if (viewMode.value === 'sku') {
    tableData.value = [newRow, ...tableData.value]
  }
  ElMessage.success('产品已追加至列表')
}

// ── 保留旧弹窗相关状态（内部使用），不再由按钮触发 ─────────────────────
const dialogVisible = ref(false)
const saving = ref(false)
const form = ref({
  spuCode: '', nameCn: '', nameEn: '',
  productType: 'FINISHED', status: 'ACTIVE',
  categoryName: '', brandName: '', remark: '',
})
const skuRows = ref([
  { skuCode: '', skuName: '', variantJson: '{}', model: '', unit: '', purchaseCost: '' },
])
const bundleRows = ref([{ childSkuCode: '', quantity: 1 }])

// ── 静态配置 ──────────────────────────────────────────────────────────
const productTypeOptions = [
  { value: 'FINISHED', label: '成品' },
  { value: 'SEMI_FINISHED', label: '半成品' },
  { value: 'PACKAGING', label: '包材' },
  { value: 'BUNDLE', label: '组合品' },
]
const spuStatusOptions = [
  { value: 'ACTIVE', label: '在售' },
  { value: 'CLEARANCE', label: '清仓' },
  { value: 'STOPPED', label: '停售' },
  { value: 'ARCHIVED', label: '归档' },
]
const skuActiveOptions = [
  { value: '', label: '全部' },
  { value: true, label: '启用' },
  { value: false, label: '停用' },
]

const STATUS_BADGE = {
  ACTIVE:       { label: '在售',   color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  CLEARANCE:    { label: '清仓',   color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  STOPPED:      { label: '停售',   color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  ARCHIVED:     { label: '归档',   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
}
const TYPE_BADGE = {
  FINISHED:      { label: '成品',   color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  SEMI_FINISHED: { label: '半成品', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  PACKAGING:     { label: '包材',   color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
  BUNDLE:        { label: '组合品', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
}

const isBundle = computed(() => form.value.productType === 'BUNDLE')
const useProductMock = import.meta.env.VITE_USE_MOCK === 'true'

// SPU/SKU 数量统计
const spuCount = computed(() => tableData.value.length)
const skuCount = computed(() =>
  tableData.value.reduce((n, r) => n + (r.children?.length ?? 0), 0),
)

// ── 样式辅助 ──────────────────────────────────────────────────────────
function statusBadgeStyle(code) {
  const s = STATUS_BADGE[code]
  return s ? { color: s.color, background: s.bg, border: `1px solid ${s.border}` } : {}
}
function typeBadgeStyle(code) {
  const t = TYPE_BADGE[code]
  return t ? { color: t.color, background: t.bg, border: `1px solid ${t.border}` } : {}
}
function typeLabel(code)   { return TYPE_BADGE[code]?.label   ?? code ?? '—' }
function statusLabel(code) { return STATUS_BADGE[code]?.label ?? code ?? '—' }

function fmtTime(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }) } catch { return String(iso) }
}
function fmtMoney(v) {
  if (v == null) return '—'
  const n = Number(v)
  return Number.isNaN(n) ? '—' : (n.toFixed(4).replace(/\.?0+$/, '') || '0')
}
function formatVariantJson(s) {
  if (!s || s === '{}') return '—'
  try {
    return Object.entries(JSON.parse(s)).map(([k, v]) => `${k}：${v}`).join(' · ')
  } catch { return String(s) }
}

// ── API 辅助 ──────────────────────────────────────────────────────────
function extractErr(e) {
  const d = e?.response?.data
  if (typeof d === 'string') return d
  if (d?.message) return d.message
  return e?.message || '请求失败'
}

function buildQueryParams() {
  const f = filters.value
  const p = {}
  if (viewMode.value === 'spu') p.nested = true
  if (keyword.value?.trim()) p.keyword = keyword.value.trim()
  if (f.productType) p.productType = f.productType
  if (f.spuStatus) p.spuStatus = f.spuStatus
  if (f.categoryName?.trim()) p.categoryName = f.categoryName.trim()
  if (f.brandName?.trim()) p.brandName = f.brandName.trim()
  if (f.createdFrom) p.createdFrom = f.createdFrom
  if (f.createdTo) p.createdTo = f.createdTo
  if (f.skuActive === true || f.skuActive === false) p.skuActive = f.skuActive
  return p
}

// 判断后端返回是否为 [{ spu, skus }] 树形格式
function isSpuTreeApiPayload(raw) {
  return Array.isArray(raw) && raw.length > 0 &&
    raw[0] != null && typeof raw[0].spu === 'object' && Array.isArray(raw[0].skus)
}

// 将后端 [{ spu, skus }] 转为树形行；rowType 用于列模板中区分 SPU/SKU 行的渲染内容
function spuGroupsToTree(groups) {
  return (groups || [])
    .filter((g) => g?.spu?.id != null)
    .map((g) => ({
      ...g.spu,
      id: `spu-${g.spu.id}`,
      rowType: 'spu',
      children: (g.skus || [])
        .filter((s) => s?.skuId != null)
        .map((s) => ({ ...s, id: `sku-${s.skuId}`, rowType: 'sku' })),
    }))
}

function spuFlatListToRows(flat) {
  return (flat || [])
    .filter((r) => r?.id != null)
    .map((r) => ({ ...r, id: `spu-${r.id}`, rowType: 'spu', children: [] }))
}

async function load() {
  loading.value = true
  try {
    const raw = await fetchProductList(viewMode.value, buildQueryParams())
    if (viewMode.value === 'spu') {
      tableData.value = isSpuTreeApiPayload(raw)
        ? spuGroupsToTree(raw)
        : spuFlatListToRows(raw)
    } else {
      tableData.value = raw
    }
  } catch (e) {
    console.error(e)
    ElMessage.error(extractErr(e))
    tableData.value = []
  } finally {
    loading.value = false
  }
  await nextTick()
}

function resetFilters() {
  keyword.value = ''
  filters.value = {
    productType: '', spuStatus: '', categoryName: '',
    brandName: '', createdFrom: '', createdTo: '', skuActive: '',
  }
  load()
}

// 切换维度时清空勾选并重新加载
watch(viewMode, () => {
  skuSelectedRows.value = []
  load()
})

// ── 弹窗 CRUD ─────────────────────────────────────────────────────────
function openCreate() {
  form.value = {
    spuCode: '', nameCn: '', nameEn: '',
    productType: 'FINISHED', status: 'ACTIVE',
    categoryName: '', brandName: '', remark: '',
  }
  skuRows.value = [{ skuCode: '', skuName: '', variantJson: '{}', model: '', unit: '', purchaseCost: '' }]
  bundleRows.value = [{ childSkuCode: '', quantity: 1 }]
  dialogVisible.value = true
}
function addSkuRow() {
  skuRows.value.push({ skuCode: '', skuName: '', variantJson: '{}', model: '', unit: '', purchaseCost: '' })
}
function removeSkuRow(i) {
  skuRows.value.splice(i, 1)
  if (!skuRows.value.length) addSkuRow()
}
function addBundleRow() { bundleRows.value.push({ childSkuCode: '', quantity: 1 }) }
function removeBundleRow(i) {
  bundleRows.value.splice(i, 1)
  if (!bundleRows.value.length) addBundleRow()
}

function parsePurchaseCost(raw) {
  if (raw === '' || raw == null) return null
  const n = Number(String(raw).trim())
  return Number.isNaN(n) ? undefined : n
}

async function submitCreate() {
  if (!form.value.spuCode?.trim() || !form.value.nameCn?.trim()) {
    ElMessage.warning('请填写 SPU 编码与中文名')
    return
  }
  const skus = []
  for (const r of skuRows.value.filter((x) => x.skuCode?.trim())) {
    const pc = parsePurchaseCost(r.purchaseCost)
    if (pc === undefined) {
      ElMessage.warning(`SKU ${r.skuCode} 采购成本格式不正确`)
      return
    }
    skus.push({
      skuCode: r.skuCode.trim(),
      skuName: r.skuName?.trim() || null,
      variantJson: r.variantJson?.trim() || null,
      model: r.model?.trim() || null,
      unit: r.unit?.trim() || null,
      purchaseCost: pc,
    })
  }
  if (!isBundle.value && !skus.length) {
    ElMessage.warning('请至少添加一行有效 SKU')
    return
  }
  let bundleLines = []
  if (isBundle.value) {
    bundleLines = bundleRows.value
      .filter((r) => r.childSkuCode?.trim())
      .map((r) => ({ childSkuCode: r.childSkuCode.trim(), quantity: Math.max(1, Number(r.quantity)) }))
    if (!bundleLines.length) {
      ElMessage.warning('组合品请至少填写一条子 SKU')
      return
    }
  }
  saving.value = true
  try {
    await createProduct({
      spuCode: form.value.spuCode.trim(),
      nameCn: form.value.nameCn.trim(),
      nameEn: form.value.nameEn?.trim() || null,
      productType: form.value.productType,
      status: form.value.status,
      categoryName: form.value.categoryName?.trim() || null,
      brandName: form.value.brandName?.trim() || null,
      remark: form.value.remark?.trim() || null,
      skus,
      bundleLines: isBundle.value ? bundleLines : [],
    })
    ElMessage.success('创建成功')
    dialogVisible.value = false
    await load()
  } catch (e) {
    ElMessage.error(extractErr(e))
  } finally {
    saving.value = false
  }
}

load()
</script>

<template>
  <div class="pm-page">

    <!-- ── 页头 ── -->
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>产品</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">产品管理</span>
      </div>
      <div class="header-right">
        <el-tag v-if="useProductMock" type="warning" effect="plain" size="small">假数据</el-tag>
        <el-button type="primary" :icon="Plus" size="small" @click="drawerVisible = true">新增产品</el-button>
        <el-button :icon="Download" size="small" @click="downloadProductTemplateXlsx">导出模板</el-button>
      </div>
    </header>

    <!-- ── 工具栏：维度切换 + 关键字搜索 ── -->
    <div class="pm-toolbar">
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button value="spu">SPU 维度</el-radio-button>
        <el-radio-button value="sku">SKU 维度</el-radio-button>
      </el-radio-group>
      <el-input
        v-model="keyword"
        clearable
        placeholder="编码 / 名称 / 分类 / 品牌"
        size="small"
        style="width: 220px"
        @keyup.enter="load"
      />
      <el-button type="primary" :icon="Search" size="small" @click="load">查询</el-button>
      <el-button size="small" @click="resetFilters">重置</el-button>
    </div>

    <!-- ── 高级筛选行 ── -->
    <div class="pm-filter-row">
      <el-select v-model="filters.productType" clearable placeholder="产品类型" size="small" style="width:120px">
        <el-option v-for="o in productTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
      <el-select v-model="filters.spuStatus" clearable placeholder="SPU状态" size="small" style="width:110px">
        <el-option v-for="o in spuStatusOptions" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
      <el-input v-model="filters.categoryName" clearable placeholder="分类" size="small" style="width:110px" />
      <el-input v-model="filters.brandName" clearable placeholder="品牌" size="small" style="width:110px" />
      <el-date-picker
        v-model="filters.createdFrom"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="创建起"
        size="small"
        style="width:130px"
      />
      <el-date-picker
        v-model="filters.createdTo"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="创建止"
        size="small"
        style="width:130px"
      />
      <el-select v-model="filters.skuActive" placeholder="SKU启用" size="small" style="width:100px">
        <el-option v-for="(o, i) in skuActiveOptions" :key="i" :label="o.label" :value="o.value" />
      </el-select>
    </div>

    <!-- ── 操作栏 ── -->
    <div class="pm-action-bar">
      <div class="pm-action-left">
        <!-- 筛选器下方：添加单个商品入口 -->
        <el-button type="primary" size="small" @click="skuDialogVisible = true">
          + 添加单个商品
        </el-button>
        <span v-if="viewMode === 'sku' && skuSelectedRows.length" class="pm-selected-hint">
          已选 {{ skuSelectedRows.length }} 个 SKU
        </span>
      </div>
      <span class="pm-total-hint">
        <template v-if="viewMode === 'spu'">共 {{ spuCount }} 款式 · {{ skuCount }} 个 SKU</template>
        <template v-else>共 {{ tableData.length }} 个 SKU</template>
      </span>
    </div>

    <!-- ── 表格区域 ── -->
    <div class="pm-table-outer">

      <!--
        ══════════════════════════════════════════════════════════
        SPU 维度表格：type="expand" 展开式嵌套子表格
        列顺序（与 SKU 维度完全对称）：
          展开(35px) → 复选(40px) → 图片(80px) → 数据列(固定宽)
        展开后：嵌套 el-table（无表头）的各列宽度与父表严格对齐，
        首列使用 35px 占位确保"图片"在同一垂直线上。
        ══════════════════════════════════════════════════════════
      -->
      <el-table
        v-if="viewMode === 'spu'"
        v-loading="loading"
        :data="tableData"
        row-key="id"
        size="small"
        height="100%"
        border
        empty-text="暂无数据"
        class="pm-table spu-table"
        @header-dragend="onSpuColResize"
      >
        <!-- 列 1（no=0）：展开箭头 35px -->
        <el-table-column type="expand" width="35">
          <template #default="{ row }">
            <!-- 嵌套子表：所有列宽与父表 spuColWidths 完全同步 -->
            <el-table
              :data="row.children || []"
              :show-header="false"
              size="small"
              empty-text="暂无子 SKU"
              class="sku-sub-table"
            >
              <!-- no=0 占位，对齐父表展开列 -->
              <el-table-column :width="spuColWidths[0]" />
              <!-- no=1 复选框 -->
              <el-table-column type="selection" :width="spuColWidths[1]" />
              <!-- no=2 图片 -->
              <el-table-column :width="spuColWidths[2]" align="center">
                <template #default="{ row: sku }">
                  <div class="image-wrapper">
                    <img v-if="sku.imageUrl" :src="sku.imageUrl" :alt="sku.skuName" />
                    <span v-else class="thumb-empty">📷</span>
                  </div>
                </template>
              </el-table-column>
              <!-- no=3 SKU 名 / 编码 -->
              <el-table-column :width="spuColWidths[3]">
                <template #default="{ row: sku }">
                  <div class="cell-sku-name">{{ sku.skuName || '—' }}</div>
                  <div class="cell-sku-code">{{ sku.skuCode }}</div>
                </template>
              </el-table-column>
              <!-- no=4 变体属性 -->
              <el-table-column :width="spuColWidths[4]">
                <template #default="{ row: sku }">
                  <span class="cell-variant">{{ formatVariantJson(sku.variantJson) }}</span>
                </template>
              </el-table-column>
              <!-- no=5 分类 -->
              <el-table-column :width="spuColWidths[5]">
                <template #default="{ row: sku }">
                  <span class="cell-sm">{{ sku.categoryName || '—' }}</span>
                </template>
              </el-table-column>
              <!-- no=6 品牌 -->
              <el-table-column :width="spuColWidths[6]">
                <template #default="{ row: sku }">
                  <span class="cell-sm">{{ sku.brandName || '—' }}</span>
                </template>
              </el-table-column>
              <!-- no=7 类型占位（SKU 级不显示） -->
              <el-table-column :width="spuColWidths[7]" />
              <!-- no=8 状态 -->
              <el-table-column :width="spuColWidths[8]">
                <template #default="{ row: sku }">
                  <el-tag :type="sku.active ? 'success' : 'info'" size="small">
                    {{ sku.active ? '启用' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <!-- no=9 型号 -->
              <el-table-column :width="spuColWidths[9]">
                <template #default="{ row: sku }">
                  <span class="cell-sm">{{ sku.model || '—' }}</span>
                </template>
              </el-table-column>
              <!-- no=10 单位 -->
              <el-table-column :width="spuColWidths[10]">
                <template #default="{ row: sku }">
                  <span class="cell-sm">{{ sku.unit || '—' }}</span>
                </template>
              </el-table-column>
              <!-- no=11 采购成本 -->
              <el-table-column :width="spuColWidths[11]" align="right">
                <template #default="{ row: sku }">
                  <span class="cell-num">{{ fmtMoney(sku.purchaseCost) }}</span>
                </template>
              </el-table-column>
              <!-- no=12 占位（吸收剩余宽度，与父表创建时间列对齐） -->
              <el-table-column :min-width="spuColWidths[12]" />
            </el-table>
          </template>
        </el-table-column>

        <!-- 列 2（no=1）：复选框 40px -->
        <el-table-column type="selection" width="40" />

        <!-- 列 3：图片 80px；组合品右上角显示橙色"组"角标 -->
        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <div class="image-wrapper">
              <img v-if="row.imageUrl" :src="row.imageUrl" :alt="row.nameCn" />
              <span v-else class="thumb-empty">📷</span>
              <span v-if="row.productType === 'BUNDLE'" class="bundle-tag">组</span>
            </div>
          </template>
        </el-table-column>

        <!-- 列 4（no=3）：品名 / 编码 -->
        <el-table-column label="品名 / 编码" :width="spuColWidths[3]">
          <template #default="{ row }">
            <div class="cell-name">{{ row.nameCn }}</div>
            <div class="cell-code">{{ row.spuCode }}</div>
          </template>
        </el-table-column>

        <!-- 列 5（no=4）：变体 / 规格 -->
        <el-table-column label="变体 / 规格" :width="spuColWidths[4]">
          <template #default="{ row }">
            <span class="cell-sm text-muted">
              共 {{ row.skuCount ?? row.children?.length ?? 0 }} 个 SKU
            </span>
          </template>
        </el-table-column>

        <!-- 列 6（no=5）：分类 -->
        <el-table-column label="分类" :width="spuColWidths[5]">
          <template #default="{ row }">
            <span class="cell-sm">{{ row.categoryName || '—' }}</span>
          </template>
        </el-table-column>

        <!-- 列 7（no=6）：品牌 -->
        <el-table-column label="品牌" :width="spuColWidths[6]">
          <template #default="{ row }">
            <span class="cell-sm">{{ row.brandName || '—' }}</span>
          </template>
        </el-table-column>

        <!-- 列 8（no=7）：类型 -->
        <el-table-column label="类型" :width="spuColWidths[7]">
          <template #default="{ row }">
            <span class="pm-badge" :style="typeBadgeStyle(row.productType)">
              {{ typeLabel(row.productType) }}
            </span>
          </template>
        </el-table-column>

        <!-- 列 9（no=8）：状态 -->
        <el-table-column label="状态" :width="spuColWidths[8]">
          <template #default="{ row }">
            <span class="pm-badge" :style="statusBadgeStyle(row.status)">
              {{ statusLabel(row.status) }}
            </span>
          </template>
        </el-table-column>

        <!-- 列 10（no=9）：型号（SPU 级无型号） -->
        <el-table-column label="型号" :width="spuColWidths[9]">
          <template #default>
            <span class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 列 11（no=10）：单位（SPU 级无单位） -->
        <el-table-column label="单位" :width="spuColWidths[10]">
          <template #default>
            <span class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 列 12（no=11）：采购成本（SPU 级无成本） -->
        <el-table-column label="采购成本" :width="spuColWidths[11]" align="right">
          <template #default>
            <span class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 列 13（no=12）：创建时间，min-width 吸收剩余宽度 -->
        <el-table-column label="创建时间" :min-width="spuColWidths[12]">
          <template #default="{ row }">
            <span class="cell-time">{{ fmtTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!--
        ══════════════════════════════════════════════════════════
        SKU 维度表格（完全独立的 el-table）
        列顺序：展开(1) → 复选框(2) → 图片(3) → 数据列...
        展开行显示该 SKU 的扩展属性（型号/单位/成本/变体等）。
        ══════════════════════════════════════════════════════════
      -->
      <el-table
        v-else
        v-loading="loading"
        :data="tableData"
        size="small"
        height="100%"
        border
        empty-text="暂无数据"
        class="pm-table"
        @selection-change="(rows) => (skuSelectedRows = rows)"
      >
        <!-- 第一列：展开箭头 35px（与 SPU 维度对称） -->
        <el-table-column type="expand" width="35">
          <template #default="{ row }">
            <div class="sku-expand-content">
              <div class="sku-expand-item">
                <span class="sku-expand-label">型号</span>
                <span class="sku-expand-value">{{ row.model || '—' }}</span>
              </div>
              <div class="sku-expand-item">
                <span class="sku-expand-label">单位</span>
                <span class="sku-expand-value">{{ row.unit || '—' }}</span>
              </div>
              <div class="sku-expand-item">
                <span class="sku-expand-label">采购成本</span>
                <span class="sku-expand-value">{{ fmtMoney(row.purchaseCost) }}</span>
              </div>
              <div class="sku-expand-item">
                <span class="sku-expand-label">变体属性</span>
                <span class="sku-expand-value">{{ formatVariantJson(row.variantJson) || '—' }}</span>
              </div>
              <div class="sku-expand-item">
                <span class="sku-expand-label">所属 SPU</span>
                <span class="sku-expand-value">{{ row.spuCode || '—' }}</span>
              </div>
              <div v-if="row.spuNameCn" class="sku-expand-item">
                <span class="sku-expand-label">款名</span>
                <span class="sku-expand-value">{{ row.spuNameCn }}</span>
              </div>
              <div v-if="row.brandName" class="sku-expand-item">
                <span class="sku-expand-label">品牌</span>
                <span class="sku-expand-value">{{ row.brandName }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 第二列：复选框 -->
        <el-table-column type="selection" width="40" />

        <!-- 第三列：图片 80px，组合品右上角显示橙色"组"角标 -->
        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <div class="image-wrapper">
              <img v-if="row.imageUrl" :src="row.imageUrl" :alt="row.skuName" />
              <span v-else class="thumb-empty">📷</span>
              <span v-if="row.productType === 'BUNDLE'" class="bundle-tag">组</span>
            </div>
          </template>
        </el-table-column>

        <!-- 品名/sku：SKU编码(粗体) + 品名(灰色细字) -->
        <el-table-column label="品名/sku" min-width="180">
          <template #default="{ row }">
            <div class="cell-id-primary">{{ row.skuCode || '—' }}</div>
            <div class="cell-id-sub gray">{{ row.skuName || '—' }}</div>
          </template>
        </el-table-column>

        <!-- 母体关联：SPU编码(粗体) + 款名(蓝色细字) -->
        <el-table-column label="母体关联" min-width="180">
          <template #default="{ row }">
            <div class="cell-id-primary">{{ row.spuCode || '—' }}</div>
            <div class="cell-id-sub blue">{{ row.spuNameCn || '—' }}</div>
          </template>
        </el-table-column>

        <!-- 核心属性：颜色 / 尺寸（由变体 JSON 解析） -->
        <el-table-column label="核心属性" min-width="160">
          <template #default="{ row }">
            <span class="cell-variant">{{ formatVariantJson(row.variantJson) }}</span>
          </template>
        </el-table-column>

        <!-- 品类 -->
        <el-table-column label="品类" min-width="88">
          <template #default="{ row }">
            <span class="cell-sm">{{ row.categoryName || '—' }}</span>
          </template>
        </el-table-column>

        <!-- 级别 -->
        <el-table-column label="级别" width="60" align="center">
          <template #default="{ row }">
            <span v-if="row.level" class="level-badge">{{ row.level }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 类型 -->
        <el-table-column label="类型" width="76">
          <template #default="{ row }">
            <span class="pm-badge" :style="typeBadgeStyle(row.productType)">
              {{ typeLabel(row.productType) }}
            </span>
          </template>
        </el-table-column>

        <!-- 状态：Switch 开关控制启用/停用 -->
        <el-table-column label="启用" width="68" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.active"
              size="small"
              :active-value="true"
              :inactive-value="false"
            />
          </template>
        </el-table-column>

        <!-- 上架日期 -->
        <el-table-column label="上架日期" min-width="106">
          <template #default="{ row }">
            <span class="cell-time">{{ row.launchDate || fmtTime(row.spuCreatedAt) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ── 新增产品抽屉（按款式维度创建，含变体矩阵） ── -->
    <ProductCreateDrawer
      v-model="drawerVisible"
      @submit="handleDrawerSubmit"
    />

    <!-- ── 添加单个商品弹窗（SKU 级别快速录入） ── -->
    <SkuCreateDialog
      v-model="skuDialogVisible"
      @saved="handleSkuSaved"
    />
  </div>
</template>

<style scoped>
/* ── 页面整体布局：与 scene-dict-page 保持一致，不加 height/width 干扰 flex ── */
.pm-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #f0f2f5;
}

/* 页头（复用 scene-dict.css 中的 .erp-header 类） */
.erp-header {
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  flex-shrink: 0;
}

/* 工具栏 */
.pm-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px 8px;
  background: #fff;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* 高级筛选行 */
.pm-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 20px 12px;
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* 操作栏 */
.pm-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 6px;
  flex-shrink: 0;
  box-sizing: border-box;
}
.pm-action-left { display: flex; align-items: center; gap: 8px; }
.pm-total-hint  { font-size: 12px; color: #9ca3af; }
.pm-selected-hint {
  font-size: 13px;
  color: #1890ff;
  background: #e6f4ff;
  padding: 2px 10px;
  border-radius: 10px;
}

/* ── 表格外层容器：flex: 1 撑满剩余高度，padding 代替 margin 避免宽度计算问题 ── */
.pm-table-outer {
  flex: 1;
  min-height: 0;
  padding: 0 20px 16px;
  background: transparent;
  overflow: hidden;
  box-sizing: border-box;
}

/* 表格卡片：在 padding 容器内展示白底阴影 */
.pm-table-outer :deep(.el-table) {
  border-radius: 6px;
  border: 1px solid #e8ecf0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .04);
}

/* ── border 模式：保留竖线，调整颜色使其柔和 ── */
.pm-table :deep(.el-table__cell) {
  border-color: #edf0f4 !important;
}
.pm-table :deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 10px;
}
.pm-table :deep(.el-table th.el-table__cell) {
  background: #fafafa !important;
  border-bottom: 2px solid #e8ecf0 !important;
  color: #374151;
  font-weight: 600;
  font-size: 13px;
  padding: 9px 10px;
}
.pm-table :deep(.el-table__inner-wrapper::before),
.pm-table :deep(.el-table__inner-wrapper::after) {
  display: none;
}

/* ── 展开行 cell：消除默认 padding，使嵌套表格左边缘与父表零偏移对齐 ── */
.pm-table :deep(.el-table__expanded-cell) {
  padding: 0 !important;
}

/* ── 嵌套 SKU 子表格（expand 展开区域内） ── */
.sku-sub-table :deep(.el-table__inner-wrapper) {
  box-shadow: none;
}
.sku-sub-table :deep(.el-table__inner-wrapper::before),
.sku-sub-table :deep(.el-table__inner-wrapper::after) {
  display: none;
}
.sku-sub-table :deep(.el-table__cell) {
  border-right: none !important;
}
.sku-sub-table :deep(td.el-table__cell) {
  background: #f4f8ff;
  border-bottom: 1px dashed #dbeafe;
  padding: 8px 10px;
}
.sku-sub-table :deep(tr:hover td.el-table__cell) {
  background: #eaf2ff !important;
}
/* 子表格复选框列垂直居中 */
.sku-sub-table :deep(.el-table__expand-column .cell),
.sku-sub-table :deep(.el-table-column--selection .cell) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/* ── 图片容器（统一规格，支持角标叠加） ── */
.image-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 5px;
  border: 1px solid #e8ecf0;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.image-wrapper-sm { width: 40px; height: 40px; }
.thumb-empty { font-size: 16px; opacity: .3; }

/* ── 组合品"组"角标 ── */
.bundle-tag {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  line-height: 18px;
  text-align: center;
  border: 1px solid #ff9800;
  color: #ff9800;
  background: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 0 4px 0 3px;
  z-index: 10;
  letter-spacing: 0;
}

/* ── 展开 / 复选框列：紧凑宽度 + 垂直居中 ── */
.pm-table :deep(.el-table__expand-column),
.pm-table :deep(.el-table-column--selection) {
  text-align: center !important;
}
.pm-table :deep(.el-table__expand-column .cell),
.pm-table :deep(.el-table-column--selection .cell) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: visible;
}
/* 展开箭头图标垂直居中 */
.pm-table :deep(.el-table__expand-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  height: 100%;
}

/* ── SKU 展开行内容 ── */
.sku-expand-content {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 32px;
  padding: 14px 20px 14px 56px;
  background: #f5f8ff;
  border-top: 1px dashed #dbeafe;
}
.sku-expand-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 90px;
}
.sku-expand-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  line-height: 1;
}
.sku-expand-value {
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
  line-height: 1.3;
}

/* ── 文字辅助类 ── */
.cell-name     { font-weight: 600; font-size: 13.5px; color: #111827; line-height: 1.3; }
.cell-code     { font-size: 11.5px; color: #1890ff; margin-top: 2px; font-weight: 500; }
.cell-sku-code { font-size: 12px; color: #1890ff; font-weight: 500; }
.cell-sku-name { font-size: 12px; color: #6b7280; margin-top: 2px; }
.cell-variant  { font-size: 12px; color: #374151; line-height: 1.4; }
.cell-sm       { font-size: 12.5px; color: #374151; }
.cell-num      { font-size: 12.5px; color: #1f2937; font-variant-numeric: tabular-nums; }
.cell-time     { font-size: 11.5px; color: #6b7280; line-height: 1.5; }
.text-muted    { color: #9ca3af; font-size: 12px; }

/* ── SKU 维度：合并列样式 ── */
/* 上行：编码（粗体） */
.cell-id-primary {
  font-weight: 700;
  font-size: 13px;
  color: #111827;
  line-height: 1.35;
}
/* 下行：名称（灰色细字 / 蓝色细字） */
.cell-id-sub {
  font-size: 11.5px;
  margin-top: 2px;
  line-height: 1.3;
}
.cell-id-sub.gray { color: #9ca3af; }
.cell-id-sub.blue { color: #1890ff; cursor: pointer; }
.cell-id-sub.blue:hover { text-decoration: underline; }

/* ── 产品级别徽章 ── */
.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

/* ── 状态/类型徽章 ── */
.pm-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.mt8 { margin-top: 8px; }
</style>
