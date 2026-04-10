<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useCategoryStore } from '@/features/product/useCategoryStore.js'
import {
  AMAZON_SITE_CODES,
  buildSiteMappingsMock,
  buildTop3ForSite,
  computeShareRatioPct,
  createDefaultTop3Template,
} from '@/features/product/categoryMock.js'
import CategorySiteTop3Table from '@/views/product/CategorySiteTop3Table.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  categoryId: { type: String, default: '' },
  /** 打开时主 Tab：basic | mapping */
  initialMainTab: { type: String, default: 'basic' },
  /** 映射 Tab 下默认站点 */
  initialSite: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useCategoryStore()

const mainTab = ref('basic')
const activeTab = ref('US')
const localMappings = ref([])
const syncingAmazon = ref(false)

const editFormRef = ref(null)
const editForm = ref({
  id: '',
  code: '',
  name: '',
  description: '',
  status: true,
  isLeaf: false,
  graphicCoeff: 0.8,
  photoCoeff: 0.6,
})

const editRules = {
  code: [{ required: true, message: '请输入品类编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入品类名称', trigger: 'blur' }],
}

function mergeTop3Rows(saved, defaults, site) {
  const base =
    defaults?.length >= 3 ? defaults : createDefaultTop3Template(site)
  return base.map((d, i) => {
    const s = saved?.[i]
    if (!s) return { ...d }
    const listedSkuCount = Number.isFinite(s.listedSkuCount)
      ? s.listedSkuCount
      : d.listedSkuCount
    const listedProductTotal = Number.isFinite(s.listedProductTotal)
      ? s.listedProductTotal
      : d.listedProductTotal
    const shareRatioPct =
      computeShareRatioPct(listedSkuCount, listedProductTotal) ?? 0
    return {
      ...d,
      ...s,
      rank: d.rank,
      listedSkuCount,
      listedProductTotal,
      shareRatioPct,
      browseNodeId:
        s.browseNodeId != null && s.browseNodeId !== ''
          ? s.browseNodeId
          : d.browseNodeId,
      path: s.path != null && s.path !== '' ? s.path : d.path,
      url: s.url || d.url,
      mappingType: s.mappingType ?? d.mappingType,
    }
  })
}

function syncSiteSummaryFromTop3(m) {
  const t0 = m.top3?.[0]
  if (!t0) {
    m.browseNodeId = ''
    m.amazonPath = ''
    return
  }
  m.browseNodeId = t0.browseNodeId ?? ''
  m.amazonPath = t0.path ?? ''
}

function cloneMappings(row) {
  const defaults = buildSiteMappingsMock(0)
  if (!row?.siteMappings?.length) return defaults
  return AMAZON_SITE_CODES.map((site, i) => {
    const m = row.siteMappings.find((x) => x.site === site)
    const d = defaults[i]
    if (!m) return d
    const top3 = mergeTop3Rows(m.top3, d.top3, d.site)
    const next = {
      ...d,
      ...m,
      top3,
    }
    syncSiteSummaryFromTop3(next)
    return next
  })
}

const dialogTitle = computed(() => {
  const r = store.getById(props.categoryId)
  return r ? `编辑品类 · ${r.name} · ${r.code}` : '编辑品类'
})

const currentMap = computed(() =>
  localMappings.value.find((m) => m.site === activeTab.value) ?? null,
)

function loadEditForm() {
  const row = store.getById(props.categoryId)
  if (!row) return
  editForm.value = {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? '',
    status: row.status !== false,
    isLeaf: !!row.isLeaf,
    graphicCoeff: row.graphicCoeff ?? 0.8,
    photoCoeff: row.photoCoeff ?? 0.6,
  }
}

function loadMappings() {
  const row = store.getById(props.categoryId)
  localMappings.value = cloneMappings(row)
  activeTab.value =
    props.initialSite && AMAZON_SITE_CODES.includes(props.initialSite)
      ? props.initialSite
      : AMAZON_SITE_CODES[0]
}

watch(
  () => [props.modelValue, props.categoryId, props.initialMainTab, props.initialSite],
  () => {
    if (!props.modelValue || !props.categoryId) return
    loadEditForm()
    loadMappings()
    const row = store.getById(props.categoryId)
    const canMap = !!row?.isLeaf
    mainTab.value =
      props.initialMainTab === 'mapping' && canMap ? 'mapping' : 'basic'
    nextTick(() => editFormRef.value?.clearValidate?.())
  },
)

watch(
  () => [props.modelValue, currentMap.value?.mapped, activeTab.value],
  () => {
    if (!props.modelValue || !currentMap.value) return
    const m = currentMap.value
    if (m.mapped && (!m.top3 || m.top3.length === 0)) {
      m.top3 = createDefaultTop3Template(activeTab.value)
      syncSiteSummaryFromTop3(m)
    }
  },
  { flush: 'post' },
)

function close() {
  emit('update:modelValue', false)
}

async function saveBasic() {
  const form = editFormRef.value
  if (form) {
    try {
      await form.validate()
    } catch {
      return
    }
  }
  const f = editForm.value
  const res = store.updateCategory(f.id, {
    code: f.code,
    name: f.name,
    description: f.description,
    status: f.status,
    graphicCoeff: f.isLeaf ? f.graphicCoeff : undefined,
    photoCoeff: f.isLeaf ? f.photoCoeff : undefined,
  })
  if (!res.ok) {
    ElMessage.error(res.message)
    return
  }
  ElMessage.success('基本信息已保存')
}

function applyShareRatioToAllTop3() {
  for (const m of localMappings.value) {
    if (!m.top3?.length) continue
    for (const row of m.top3) {
      const p = computeShareRatioPct(row.listedSkuCount, row.listedProductTotal)
      row.shareRatioPct = p == null ? 0 : p
    }
  }
}

function syncAmazonRelationsMock() {
  syncingAmazon.value = true
  const seed = Date.now()
  window.setTimeout(() => {
    for (const m of localMappings.value) {
      if (!m.mapped || !m.top3?.length) continue
      const fresh = buildTop3ForSite(seed + m.site.charCodeAt(0), m.site)
      m.top3.forEach((row, i) => {
        if (!fresh[i]) return
        row.listedSkuCount = fresh[i].listedSkuCount
        row.listedProductTotal = fresh[i].listedProductTotal
        row.shareRatioPct =
          computeShareRatioPct(row.listedSkuCount, row.listedProductTotal) ?? 0
      })
    }
    syncingAmazon.value = false
    ElMessage.success('已同步 Amazon 类目关系（示例数据，对接三方后替换为真实接口）')
  }, 600)
}

function saveMapping() {
  applyShareRatioToAllTop3()
  for (const m of localMappings.value) {
    syncSiteSummaryFromTop3(m)
  }
  const res = store.saveSiteMappings(props.categoryId, localMappings.value)
  if (!res.ok) {
    ElMessage.error(res.message)
    return
  }
  ElMessage.success('映射已保存')
  emit('saved')
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    align-center
    destroy-on-close
    class="cld-dialog"
    append-to-body
    @update:model-value="(v) => $emit('update:modelValue', v)"
  >
    <el-tabs v-model="mainTab" type="border-card" class="cld-main-tabs">
      <el-tab-pane label="基本信息" name="basic">
        <div class="cld-pane">
          <el-form
            ref="editFormRef"
            :model="editForm"
            :rules="editRules"
            label-width="120px"
            size="default"
          >
            <el-form-item label="品类编码" prop="code">
              <el-input v-model="editForm.code" clearable maxlength="64" show-word-limit />
            </el-form-item>
            <el-form-item label="品类名称" prop="name">
              <el-input v-model="editForm.name" clearable maxlength="128" show-word-limit />
            </el-form-item>
            <el-form-item label="描述">
              <el-input
                v-model="editForm.description"
                type="textarea"
                :rows="2"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="editForm.status" />
            </el-form-item>
            <template v-if="editForm.isLeaf">
              <el-form-item label="平面设计系数">
                <el-input-number
                  v-model="editForm.graphicCoeff"
                  :min="0"
                  :max="999"
                  :precision="2"
                  :step="0.01"
                  controls-position="right"
                  style="width: 200px"
                />
              </el-form-item>
              <el-form-item label="摄影折算系数">
                <el-input-number
                  v-model="editForm.photoCoeff"
                  :min="0"
                  :max="999"
                  :precision="2"
                  :step="0.01"
                  controls-position="right"
                  style="width: 200px"
                />
              </el-form-item>
              <p class="cld-hint">
                Amazon 类目映射请在「Amazon 映射」页签中维护；此处仅改两系数。
              </p>
            </template>
            <p v-else class="cld-hint">
              当前为<strong>中间层</strong>品类，可改编码、名称、描述与状态。
            </p>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane
        v-if="editForm.isLeaf"
        label="Amazon 映射"
        name="mapping"
      >
        <div class="cld-pane cld-mapping-pane">
          <div class="cld-site-row">
            <el-radio-group v-model="activeTab" size="default" class="cld-site-radios">
              <el-radio-button
                v-for="site in AMAZON_SITE_CODES"
                :key="site"
                :label="site"
              >
                {{ site }}
              </el-radio-button>
            </el-radio-group>
            <el-button
              type="primary"
              plain
              :loading="syncingAmazon"
              @click="syncAmazonRelationsMock"
            >
              一键同步 Amazon 类目关系
            </el-button>
          </div>

          <div v-if="currentMap" class="cld-map-body">
            <el-form label-width="112px" size="default">
              <el-form-item label="已配置映射">
                <el-switch v-model="currentMap.mapped" />
              </el-form-item>
            </el-form>

            <div class="cld-table-title">
              Amazon 类目 TOP3
            </div>
            <CategorySiteTop3Table
              :mapped="currentMap.mapped"
              :rows="currentMap.top3 || []"
              editable
              :disabled="!currentMap.mapped"
            />
            <p class="cld-hint">
              每行对应一条 TOP3 类目；上架 SKU 数、品类产品总数为该站点该行独立数据，占比由二者自动计算。保存时将与首行同步站点摘要（Node / 路径）。
            </p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="cld-footer">
        <el-button @click="close">关闭</el-button>
        <template v-if="mainTab === 'basic'">
          <el-button type="primary" @click="saveBasic">保存基本信息</el-button>
        </template>
        <template v-else-if="mainTab === 'mapping' && editForm.isLeaf">
          <el-button type="primary" @click="saveMapping">保存映射</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 加宽容器，避免 Amazon TOP3 表出现横向滚动条；小屏仍不超过视口 */
.cld-dialog :deep(.el-dialog) {
  width: min(1280px, 96vw) !important;
  max-width: 96vw;
  margin: 0 auto;
}
.cld-dialog :deep(.el-dialog__body) {
  padding: 12px 20px 8px;
  max-height: min(82vh, 900px);
  overflow: hidden auto;
  box-sizing: border-box;
}
.cld-main-tabs {
  margin-top: -4px;
}
.cld-main-tabs :deep(.el-tabs__content) {
  padding-top: 12px;
}
.cld-pane {
  min-height: 120px;
}
.cld-mapping-pane {
  min-height: 200px;
}
.cld-site-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.cld-site-radios {
  flex: 1;
  min-width: 0;
}
.cld-map-body {
  overflow-x: auto;
  max-width: 100%;
}
.cld-table-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.cld-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.cld-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
