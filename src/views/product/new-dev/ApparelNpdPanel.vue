<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ApparelNpdRow from './ApparelNpdRow.vue'
import '@/features/product/npdApparelTableColumns.css'
import { genNpdApparelMockList } from '@/features/product/npdApparelMock.js'
import { useFabricColorCardStore, fabricCardDisplayName } from '@/features/product/useFabricColorCardStore.js'
import { useSizeLibraryStore } from '@/features/product/useSizeLibraryStore.js'
import { cartesianColorSize } from '@/features/product/apparelSkuHelpers.js'

const props = defineProps({
  /** 与新品开发页 Tab 联动：all | draft | pending_review | … */
  workflowTab: { type: String, default: 'all' },
})

const fabricStore = useFabricColorCardStore()
const sizeStore = useSizeLibraryStore()

/** 过滤非法项，避免 el-option 访问 undefined.id 导致整页崩溃 */
const safeFabricCards = computed(() => {
  const raw = fabricStore.list?.value ?? fabricStore.list
  const arr = Array.isArray(raw) ? raw : []
  return arr.filter(c => c && c.id != null && String(c.id).length)
})
const safeSizeCharts = computed(() => {
  const raw = sizeStore.list?.value ?? sizeStore.list
  const arr = Array.isArray(raw) ? raw : []
  return arr.filter(ch => ch && ch.id != null && String(ch.id).length)
})

const selectedFabricId = ref('')
const selectedColorZh = ref([])
const selectedChartId = ref('')
const selectedSizes = ref([])

const currentFabric = computed(() => fabricStore.getById(selectedFabricId.value))
const currentChart = computed(() => sizeStore.getById(selectedChartId.value))

const colorOptions = computed(() => {
  const f = currentFabric.value
  if (!f?.colors?.length) return []
  return f.colors.map(c => ({ label: `${c.zh}${c.code ? ` (${c.code})` : ''}`, value: c.zh }))
})

watch(selectedFabricId, () => {
  selectedColorZh.value = []
})

watch(selectedChartId, id => {
  const ch = sizeStore.getById(id)
  selectedSizes.value = ch?.sizes ? [...ch.sizes] : []
})

watch(safeFabricCards, () => {
  if (selectedFabricId.value && !safeFabricCards.value.some(c => c.id === selectedFabricId.value)) {
    selectedFabricId.value = ''
  }
})
watch(safeSizeCharts, () => {
  if (selectedChartId.value && !safeSizeCharts.value.some(ch => ch.id === selectedChartId.value)) {
    selectedChartId.value = ''
  }
})

const previewRows = computed(() => cartesianColorSize(selectedColorZh.value, selectedSizes.value))

const allRows = ref(genNpdApparelMockList(14))
const selectedIds = ref(new Set())

const filterBrand = ref('')
const filterSeason = ref('')
const filterCategory = ref('')
const filterGender = ref('')
const keyword = ref('')

const brandOptions = computed(() => [...new Set(allRows.value.map(r => r.brand))].sort())
const seasonOptions = computed(() => [...new Set(allRows.value.map(r => r.season))].sort())
const categoryOptions = computed(() => [...new Set(allRows.value.map(r => r.category))].sort())
const genderOptions = computed(() => [...new Set(allRows.value.map(r => r.gender))].sort())

const filteredRows = computed(() => {
  let list = allRows.value
  if (props.workflowTab !== 'all') {
    list = list.filter(r => r.workflowPhase === props.workflowTab)
  }
  if (filterBrand.value) list = list.filter(r => r.brand === filterBrand.value)
  if (filterSeason.value) list = list.filter(r => r.season === filterSeason.value)
  if (filterCategory.value) list = list.filter(r => r.category === filterCategory.value)
  if (filterGender.value) list = list.filter(r => r.gender === filterGender.value)
  const k = keyword.value.trim().toLowerCase()
  if (k) {
    list = list.filter(r =>
      r.nameCn.toLowerCase().includes(k)
      || r.spu.toLowerCase().includes(k)
      || r.devIdea?.toLowerCase().includes(k),
    )
  }
  return list.filter(r => r && r.id != null)
})

function rowSelected(id) {
  return selectedIds.value.has(id)
}

function setRowSelected(id, val) {
  const next = new Set(selectedIds.value)
  if (val) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

function onToolbarAdd() {
  ElMessage.info('新增开发单：对接审批流后打开表单')
}

function onToolbarImport() {
  ElMessage.info('导入：对接后端后支持')
}

function onToolbarExport() {
  ElMessage.info('导出：对接后端后支持')
}

const codePreview = ref('26 · SS · 01 · L · 2503 · 01')
</script>

<template>
  <div class="apparel-npd">
    <div class="anp-toolbar">
      <div class="anp-filters">
        <el-select v-model="filterBrand" placeholder="品牌" clearable filterable style="width: 120px">
          <el-option v-for="b in brandOptions" :key="b" :label="b" :value="b" />
        </el-select>
        <el-select v-model="filterSeason" placeholder="季节" clearable filterable style="width: 120px">
          <el-option v-for="s in seasonOptions" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filterCategory" placeholder="品类" clearable filterable style="width: 120px">
          <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterGender" placeholder="性别" clearable style="width: 100px">
          <el-option v-for="g in genderOptions" :key="g" :label="g" :value="g" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索品名 / SPU / 开发思路" clearable style="width: 240px" />
      </div>
      <div class="anp-actions">
        <el-button type="primary" @click="onToolbarAdd">新增</el-button>
        <el-button @click="onToolbarImport">导入</el-button>
        <el-button @click="onToolbarExport">导出</el-button>
        <el-button>筛选</el-button>
      </div>
    </div>

    <div class="anp-hint">
      共 <strong>{{ filteredRows.length }}</strong> 条
      <span class="sep">·</span>
      进度条与
      <router-link class="link" to="/listing/tracking">上架跟踪列表</router-link>
      共用同一套时间轴组件（节点为服装开发环节）
    </div>

    <div class="anp-table-wrap">
      <div class="anp-head-row">
        <div class="npd-col-chk anp-cell-head" />
        <div class="npd-col-img anp-cell-head">图</div>
        <div class="npd-col-info anp-cell-head">产品信息</div>
        <div class="npd-col-cat anp-cell-head">品类</div>
        <div class="npd-col-brand anp-cell-head">品牌</div>
        <div class="npd-col-season anp-cell-head">上架季节</div>
        <div class="npd-col-forecast anp-cell-head">预测销量</div>
        <div class="npd-col-market anp-cell-head">市场</div>
        <div class="npd-col-staff anp-cell-head">参与人</div>
        <div class="npd-col-refimg anp-cell-head">参考图</div>
        <div class="npd-col-reflink anp-cell-head">参考链接</div>
        <div class="npd-col-idea anp-cell-head">开发思路</div>
        <div class="npd-col-kw anp-cell-head">关键词</div>
        <div class="npd-col-specs anp-cell-head">关键规格</div>
        <div class="npd-col-attrs anp-cell-head">产品属性</div>
        <div class="npd-col-due anp-cell-head">要求完成</div>
        <div class="npd-col-status anp-cell-head">状态</div>
        <div class="npd-col-action anp-cell-head">操作</div>
      </div>

      <ApparelNpdRow
        v-for="row in filteredRows"
        :key="row.id"
        :row="row"
        :selected="rowSelected(row.id)"
        @update:selected="v => setRowSelected(row.id, v)"
      />

      <el-empty v-if="!filteredRows.length" description="当前 Tab 或筛选条件下暂无数据" />
    </div>

    <el-collapse class="anp-collapse">
      <el-collapse-item title="样板信息（引用色卡库 / 尺码库）— SKU 组合预览不落库" name="sample">
        <p class="anp-intro-mini">
          款号由后端生成；此处仅本地配置引用。
          <router-link class="link" to="/product/config/fabric-color-cards">面料色卡库</router-link>
          、
          <router-link class="link" to="/product/config/size-library">尺码库</router-link>
        </p>
        <div class="code-strip">
          <span class="lbl">款号占位</span>
          <code class="mono">{{ codePreview }}</code>
        </div>
        <el-form label-width="110px" size="default">
          <el-form-item label="面料色卡">
            <el-select
              v-model="selectedFabricId"
              placeholder="请选择已维护的面料色卡"
              filterable
              clearable
              style="width: min(100%, 520px)"
            >
              <el-option
                v-for="c in safeFabricCards"
                :key="c.id"
                :label="fabricCardDisplayName(c)"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="colorOptions.length" label="颜色">
            <el-checkbox-group v-model="selectedColorZh">
              <el-checkbox v-for="opt in colorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item v-else-if="selectedFabricId" label="颜色">
            <span class="hint">该色卡无颜色行，请至色卡库维护</span>
          </el-form-item>
          <el-form-item label="尺码表">
            <el-select
              v-model="selectedChartId"
              placeholder="请选择尺码表"
              filterable
              clearable
              style="width: min(100%, 400px)"
            >
              <el-option
                v-for="ch in safeSizeCharts"
                :key="ch.id"
                :label="ch.name"
                :value="ch.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="currentChart?.sizes?.length" label="启用尺码">
            <el-checkbox-group v-model="selectedSizes">
              <el-checkbox v-for="s in currentChart.sizes" :key="s" :value="s">{{ s }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
        <div class="preview-title">SKU 组合预览（不落库）</div>
        <el-table v-if="previewRows.length" :data="previewRows" border size="small" max-height="280">
          <el-table-column type="index" label="#" width="48" />
          <el-table-column prop="color" label="颜色" width="120" />
          <el-table-column prop="size" label="尺码" width="80" />
          <el-table-column label="SKU 编码">
            <template #default>—（后端生成）</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="请选择色卡与颜色、尺码表与尺码后显示组合" :image-size="72" />
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.apparel-npd {
  padding: 0 4px 20px;
}
.anp-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.anp-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.anp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.anp-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 10px;
  line-height: 1.5;
}
.anp-hint .sep {
  margin: 0 6px;
}
.anp-hint .link {
  color: #1890ff;
}
.anp-table-wrap {
  overflow-x: auto;
  padding-bottom: 8px;
}
.anp-head-row {
  display: flex;
  align-items: stretch;
  min-width: min-content;
  padding: 6px 10px;
  background: #fafafa;
  border: 1px solid #f0f2f5;
  border-radius: 6px 6px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
.anp-cell-head {
  display: flex;
  align-items: center;
  padding: 0 6px;
  border-right: 1px solid #f0f2f5;
}
.anp-cell-head:last-child {
  border-right: none;
}
.anp-collapse {
  margin-top: 16px;
  border: 1px solid #f0f2f5;
  border-radius: 8px;
  --el-collapse-border-color: transparent;
}
.anp-intro-mini {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 10px;
}
.anp-intro-mini .link {
  color: #1890ff;
}
.code-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  margin-bottom: 12px;
}
.code-strip .lbl {
  font-size: 12px;
  color: #9ca3af;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: #374151;
}
.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin: 12px 0 8px;
}
.hint {
  font-size: 12px;
  color: #9ca3af;
}
</style>
