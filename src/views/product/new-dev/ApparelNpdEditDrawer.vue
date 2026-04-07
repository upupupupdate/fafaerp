<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useNpdApparelStore } from '@/features/product/useNpdApparelStore.js'
import { useFabricColorCardStore, fabricCardDisplayName } from '@/features/product/useFabricColorCardStore.js'
import { useSizeLibraryStore } from '@/features/product/useSizeLibraryStore.js'
import { FIT_OPTIONS } from '@/features/product/npdApparelDefs.js'
import {
  LAUNCH_SEASON_OPTIONS,
  mergeNpdApparelRow,
} from '@/features/product/npdApparelRowFields.js'
import {
  buildQuickPatternRows,
  skuCountFromSelection,
} from '@/features/product/npdPatternHelpers.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  rowId: { type: String, default: null },
})

const emit = defineEmits(['update:visible', 'saved'])

const npdStore = useNpdApparelStore()
const fabricStore = useFabricColorCardStore()
const sizeStore = useSizeLibraryStore()

const form = ref(null)
const openNames = ref(['base', 'ref', 'pattern', 'sample', 'audit'])

const SAMPLE_USAGE_OPTIONS = ['门店打样', '拍照样', '参考面料', '留样', '客户批样']

const safeFabricCards = computed(() => {
  const raw = fabricStore.list?.value ?? fabricStore.list
  return Array.isArray(raw) ? raw.filter((c) => c && c.id != null) : []
})
const safeSizeCharts = computed(() => {
  const raw = sizeStore.list?.value ?? sizeStore.list
  return Array.isArray(raw) ? raw.filter((ch) => ch && ch.id != null) : []
})

const currentFabric = computed(() =>
  form.value?.fabricCardId ? fabricStore.getById(form.value.fabricCardId) : null,
)
const currentChart = computed(() =>
  form.value?.sizeChartId ? sizeStore.getById(form.value.sizeChartId) : null,
)

const auxFabricOptions = computed(() => {
  const main = form.value?.fabricCardId
  return safeFabricCards.value.filter((c) => c.id !== main)
})

const skuPreviewCount = computed(() => {
  if (!form.value) return 0
  return skuCountFromSelection(
    currentFabric.value,
    currentChart.value,
    form.value.selectedFabricColorZh,
    form.value.selectedSizes,
  )
})

const yearOptions = computed(() => {
  const y = new Date().getFullYear()
  return [y, y + 1].map((n) => ({ value: String(n), label: `${n}年` }))
})

function padSlots(arr, len) {
  const a = [...(arr || [])]
  while (a.length < len) a.push('')
  return a.slice(0, len)
}

watch(
  () => [props.visible, props.rowId],
  () => {
    if (!props.visible || !props.rowId) {
      form.value = null
      return
    }
    const r = npdStore.rows.value.find((x) => x.id === props.rowId)
    if (!r) {
      form.value = null
      return
    }
    const m = mergeNpdApparelRow(JSON.parse(JSON.stringify(r)))
    m.competitorImages = padSlots(m.competitorImages, 5)
    m.competitorLinks = padSlots(m.competitorLinks, 5)
    form.value = m
  },
  { immediate: true },
)

watch(
  () => form.value?.fabricCardId,
  (fid) => {
    if (!form.value || !fid) return
    const card = fabricStore.getById(fid)
    const valid = new Set((card?.colors || []).map((c) => c.zh))
    form.value.selectedFabricColorZh = (form.value.selectedFabricColorZh || []).filter((zh) =>
      valid.has(zh),
    )
    form.value.auxFabricCardIds = (form.value.auxFabricCardIds || []).filter((id) => id !== fid)
  },
)

watch(
  () => form.value?.sizeChartId,
  (sid) => {
    if (!form.value || !sid) return
    const ch = sizeStore.getById(sid)
    const valid = new Set(ch?.sizes || [])
    form.value.selectedSizes = (form.value.selectedSizes || []).filter((s) => valid.has(s))
  },
)

function close() {
  emit('update:visible', false)
}

function pushAudit(action) {
  if (!form.value) return
  if (!Array.isArray(form.value.auditLog)) form.value.auditLog = []
  form.value.auditLog.unshift({
    at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    operator: '本地用户',
    action,
  })
}

function onSave() {
  if (!form.value?.id) return
  const payload = { ...form.value }
  payload.competitorImages = (payload.competitorImages || []).filter(Boolean).slice(0, 5)
  payload.competitorLinks = (payload.competitorLinks || []).filter(Boolean).slice(0, 5)
  payload.refImageUrl = payload.competitorImages[0] || ''
  payload.refLink = payload.competitorLinks[0] || ''
  pushAudit('保存开发单')
  npdStore.patchRow(payload.id, payload)
  ElMessage.success('已保存（本地）')
  emit('saved', form.value.id)
  close()
}

function onFetchSeasonality() {
  if (!form.value) return
  const kw = (form.value.keywords || []).join(' ')
  const tags = kw
    ? ['春季', '休闲', kw.slice(0, 4)].filter((x, i, a) => a.indexOf(x) === i).slice(0, 5)
    : ['未分类']
  form.value.seasonalityTags = tags
  form.value.seasonalityAutoFetched = true
  ElMessage.success('已更新季节性标签（演示逻辑）')
}

function toggleAllColors(checked) {
  if (!form.value || !currentFabric.value?.colors?.length) return
  form.value.selectedFabricColorZh = checked
    ? currentFabric.value.colors.map((c) => c.zh)
    : []
}

function toggleAllSizes(checked) {
  if (!form.value || !currentChart.value?.sizes?.length) return
  form.value.selectedSizes = checked ? [...currentChart.value.sizes] : []
}

function onQuickGeneratePattern() {
  if (!form.value) return
  if (!form.value.fabricCardId || !form.value.sizeChartId) {
    ElMessage.warning('请先选择主面料色卡与尺码库')
    return
  }
  if (!form.value.selectedFabricColorZh?.length) {
    ElMessage.warning('请至少勾选一种面料颜色')
    return
  }
  if (!form.value.selectedSizes?.length) {
    ElMessage.warning('请至少勾选一个尺码')
    return
  }
  const rows = buildQuickPatternRows(
    { id: form.value.id, nameCn: form.value.nameCn, designNo: form.value.designNo, spu: form.value.spu },
    currentFabric.value,
    form.value.selectedFabricColorZh,
    form.value.selectedSizes,
  )
  if (!rows.length) {
    ElMessage.warning('无法生成：请确认色卡含所选颜色、尺码表含所选尺码')
    return
  }
  form.value.patternColorRows = rows
  pushAudit('快速生成样版 SKC 列表')
  ElMessage.success(`已生成 ${rows.length} 条颜色行，共 ${skuPreviewCount.value} 个 SKU（色×码）`)
}

function removePatternRow(index) {
  if (!form.value?.patternColorRows) return
  form.value.patternColorRows.splice(index, 1)
}

function addPatternRow() {
  if (!form.value) return
  if (!form.value.fabricCardId) {
    ElMessage.warning('请先选择主面料色卡')
    return
  }
  const card = currentFabric.value
  const col = card?.colors?.[0]
  const sizes = form.value.selectedSizes?.length
    ? [...form.value.selectedSizes]
    : [...(currentChart.value?.sizes || [])]
  if (!col || !sizes.length) {
    ElMessage.warning('请勾选颜色与尺码后新增，或完善色卡/尺码表')
    return
  }
  const base = String(form.value.designNo || form.value.spu || 'NEW').replace(/\s/g, '') || 'NEW'
  const idx = form.value.patternColorRows?.length ?? 0
  form.value.patternColorRows = form.value.patternColorRows || []
  form.value.patternColorRows.push({
    id: `pc_manual_${form.value.id}_${Date.now()}`,
    colorZh: col.zh,
    colorCode: col.code || '',
    skcCode: `${base}-NEW-${idx + 1}`.slice(0, 80),
    colorDisplayName: `${form.value.nameCn || '新款'} — ${col.zh}`,
    imageUrl: '',
    sizesSnapshot: [...sizes],
  })
}

function onPatternRowColorChange(row, zh) {
  const col = currentFabric.value?.colors?.find((c) => c.zh === zh)
  if (!col || !row) return
  row.colorZh = col.zh
  row.colorCode = col.code || ''
}
</script>

<template>
  <el-dialog
    class="npd-edit-dialog"
    :model-value="visible"
    :title="form ? `编辑开发单 · ${form.nameCn || form.id}` : '编辑开发单'"
    align-center
    width="1280px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="(v) => emit('update:visible', v)"
  >
    <div v-if="form" class="npd-dialog-scroll">
      <el-collapse v-model="openNames">
        <!-- 1 基础信息 -->
        <el-collapse-item title="基础信息" name="base">
          <el-form label-width="118px" size="default" class="npd-form-grid">
            <el-form-item label="款式图 URL">
              <el-input v-model="form.imageUrl" placeholder="图片地址，可后续改为上传" clearable />
            </el-form-item>
            <el-form-item label="设计号">
              <el-input v-model="form.designNo" placeholder="保存后由规则自动生成" disabled />
            </el-form-item>
            <el-form-item label="款名" required>
              <el-input v-model="form.nameCn" placeholder="必填" />
            </el-form-item>
            <el-form-item label="SPU">
              <el-input v-model="form.spu" placeholder="提交开款后必填，可先生成再手改" />
            </el-form-item>
            <el-form-item label="品类" required>
              <el-input v-model="form.category" placeholder="必填" />
            </el-form-item>
            <el-form-item label="品牌">
              <el-input v-model="form.brand" />
            </el-form-item>
            <el-form-item label="人群" required>
              <el-input v-model="form.audience" placeholder="人群字典" />
            </el-form-item>
            <el-form-item label="场景" required>
              <el-input v-model="form.scene" placeholder="场景字典" />
            </el-form-item>
            <el-form-item label="市场" required>
              <el-input v-model="form.market" />
            </el-form-item>
            <el-form-item label="上架年份" required>
              <el-select v-model="form.shelfYear" placeholder="选择年份" style="width: 100%">
                <el-option v-for="y in yearOptions" :key="y.value" :label="y.label" :value="y.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="上架季节" required>
              <el-radio-group v-model="form.launchSeason">
                <el-radio v-for="o in LAUNCH_SEASON_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="版型" required>
              <el-radio-group v-model="form.fitType">
                <el-radio v-for="f in FIT_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="面料类型">
              <el-input v-model="form.fabricType" placeholder="对应色卡库筛选" />
            </el-form-item>
            <el-form-item label="工艺">
              <el-input v-model="form.craftDict" placeholder="工艺字典" />
            </el-form-item>
            <el-form-item label="设计点">
              <el-input v-model="form.designPoint" placeholder="用于款名/SPU/SKU" />
            </el-form-item>
            <el-form-item label="产品级别">
              <el-input v-model="form.productLevel" />
            </el-form-item>
            <el-form-item label="产品标签" class="npd-form-span2">
              <el-select
                v-model="form.productTags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="输入后回车添加"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="人员·开发" class="npd-form-span2">
              <div class="npd-staff-inline">
                <el-input v-model="form.staff.dev" placeholder="开发" style="max-width: 140px" />
                <el-input v-model="form.staff.craft" placeholder="工艺师" style="max-width: 140px" />
                <el-input v-model="form.staff.ops" placeholder="运营" style="max-width: 140px" />
                <el-input v-model="form.staff.pattern" placeholder="版师" style="max-width: 140px" />
              </div>
            </el-form-item>
            <el-form-item label="要求完成" class="npd-form-span2">
              <el-input v-model="form.dueDate" placeholder="YYYY-MM-DD" style="max-width: 200px" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 2 参考信息 -->
        <el-collapse-item title="参考信息" name="ref">
          <el-form label-width="118px" size="default">
            <el-form-item label="核心关键词">
              <el-select
                v-model="form.keywords"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="综品关键词逻辑（演示）"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="季节性标签">
              <div class="tag-row">
                <el-tag
                  v-for="(t, i) in form.seasonalityTags"
                  :key="i"
                  closable
                  class="mr6"
                  @close="form.seasonalityTags.splice(i, 1)"
                >
                  {{ t }}
                </el-tag>
                <span v-if="!form.seasonalityTags?.length" class="hint">暂无</span>
              </div>
              <el-button class="mt8" size="small" @click="onFetchSeasonality">获取季节性标签（演示）</el-button>
            </el-form-item>
            <el-form-item label="竞品图片 URL">
              <div class="comp-input-grid">
                <el-input
                  v-for="(_, i) in 5"
                  :key="'ci' + i"
                  v-model="form.competitorImages[i]"
                  :placeholder="`第 ${i + 1} 张，最多 5 张`"
                  clearable
                />
              </div>
            </el-form-item>
            <el-form-item label="竞品链接">
              <div class="comp-input-grid">
                <el-input
                  v-for="(_, i) in 5"
                  :key="'cl' + i"
                  v-model="form.competitorLinks[i]"
                  :placeholder="`第 ${i + 1} 条`"
                  clearable
                />
              </div>
            </el-form-item>
            <el-form-item label="开发思路">
              <el-input v-model="form.devIdea" type="textarea" :rows="3" placeholder="开发思路" />
            </el-form-item>
            <el-form-item label="产品关键信息">
              <el-input v-model="form.productKeyInfo" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 3 样版信息 -->
        <el-collapse-item title="样版信息（色卡 / 尺码 / SKC）" name="pattern">
          <p class="npd-block-tip">
            主面料色卡与尺码库从配置引用；勾选颜色与尺码后「快速生成」得到每色一行 SKC 列表。SKU 总数 = 已选颜色数 × 已选尺码数（笛卡尔积），提交开款后同步至样板管理。
          </p>
          <el-form label-width="120px" size="default" class="npd-pattern-form">
            <el-form-item label="图采款">
              <el-radio-group v-model="form.isGraphicDesign">
                <el-radio :value="false">否</el-radio>
                <el-radio :value="true">是</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="主面料色卡" required>
              <el-select
                v-model="form.fabricCardId"
                clearable
                filterable
                placeholder="从面料色卡库选择"
                style="width: min(100%, 560px)"
              >
                <el-option
                  v-for="c in safeFabricCards"
                  :key="c.id"
                  :label="fabricCardDisplayName(c)"
                  :value="c.id"
                />
              </el-select>
              <div class="field-hint">选择后下方展示该色卡可选颜色（与色卡库维护一致）</div>
            </el-form-item>
            <el-form-item v-if="currentFabric?.colors?.length" label="面料颜色">
              <div class="color-toolbar">
                <el-button type="primary" link size="small" @click="toggleAllColors(true)">全选</el-button>
                <el-button link size="small" @click="toggleAllColors(false)">清空</el-button>
              </div>
              <el-checkbox-group v-model="form.selectedFabricColorZh" class="color-chk-group">
                <el-checkbox v-for="col in currentFabric.colors" :key="col.zh" :value="col.zh">
                  {{ col.code ? `#${col.code} ` : '' }}{{ col.zh }}
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item v-else-if="form.fabricCardId" label="面料颜色">
              <span class="hint">该色卡无颜色行，请至「面料色卡库」维护</span>
            </el-form-item>

            <el-form-item label="面辅料引用">
              <el-select
                v-model="form.auxFabricCardIds"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
                placeholder="可选：附加引用其他色卡（演示）"
                style="width: min(100%, 560px)"
              >
                <el-option
                  v-for="c in auxFabricOptions"
                  :key="c.id"
                  :label="fabricCardDisplayName(c)"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="尺码库" required>
              <el-select
                v-model="form.sizeChartId"
                clearable
                filterable
                placeholder="从尺码库选择"
                style="width: min(100%, 400px)"
              >
                <el-option v-for="ch in safeSizeCharts" :key="ch.id" :label="ch.name" :value="ch.id" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="currentChart?.sizes?.length" label="启用尺码">
              <div class="color-toolbar">
                <el-button type="primary" link size="small" @click="toggleAllSizes(true)">全选</el-button>
                <el-button link size="small" @click="toggleAllSizes(false)">清空</el-button>
              </div>
              <el-checkbox-group v-model="form.selectedSizes" class="size-chk-group">
                <el-checkbox v-for="s in currentChart.sizes" :key="s" :value="s">{{ s }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item v-else-if="form.sizeChartId" label="启用尺码">
              <span class="hint">该尺码表无尺码，请至「尺码库」维护</span>
            </el-form-item>

            <el-form-item label="快速生成">
              <el-button type="primary" @click="onQuickGeneratePattern">快速生成样版列表</el-button>
              <span class="sku-summary">
                当前预计共 <strong>{{ skuPreviewCount }}</strong> 个 SKU（色×码）；已生成
                <strong>{{ form.patternColorRows?.length || 0 }}</strong> 条颜色行（SKC）
              </span>
              <div class="field-hint">同颜色仅需维护一行图片时，图片 URL 填在对应 SKC 行；定版时按色×码展开。</div>
            </el-form-item>

            <el-form-item label="样版列表" class="npd-form-span-full">
              <div class="pattern-table-actions">
                <el-button size="small" link type="primary" @click="addPatternRow">+ 新增一行</el-button>
              </div>
              <el-table
                v-if="form.patternColorRows?.length"
                :data="form.patternColorRows"
                border
                size="small"
                class="pattern-skctable"
                max-height="320"
              >
                <el-table-column label="图片" width="100">
                  <template #default="{ row }">
                    <el-input v-model="row.imageUrl" placeholder="URL" clearable size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="颜色名称" min-width="200">
                  <template #default="{ row }">
                    <el-input v-model="row.colorDisplayName" type="textarea" :rows="2" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="SKC" width="200">
                  <template #default="{ row }">
                    <el-input v-model="row.skcCode" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="面料颜色" width="140">
                  <template #default="{ row }">
                    <el-select
                      :model-value="row.colorZh"
                      size="small"
                      style="width: 100%"
                      @update:model-value="(v) => onPatternRowColorChange(row, v)"
                    >
                      <el-option
                        v-for="c in currentFabric?.colors || []"
                        :key="c.zh"
                        :label="c.code ? `${c.zh} (#${c.code})` : c.zh"
                        :value="c.zh"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="尺码信息" min-width="160">
                  <template #default="{ row }">
                    {{ (row.sizesSnapshot || []).join(', ') }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="72" fixed="right">
                  <template #default="{ $index }">
                    <el-button type="danger" link size="small" @click="removePatternRow($index)">移除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="勾选颜色与尺码后点击「快速生成」，或手动新增一行" :image-size="64" />
            </el-form-item>

            <el-form-item label="样板单">
              <el-input v-model="form.patternSheetName" placeholder="附件文件名或链接（演示）" clearable style="max-width: 480px" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 4 样衣信息 -->
        <el-collapse-item title="样衣信息" name="sample">
          <el-form label-width="118px" size="default" class="npd-form-cost-grid">
            <el-form-item label="样衣颜色">
              <el-input v-model="form.sampleGarmentColor" placeholder="实物样衣颜色" />
            </el-form-item>
            <el-form-item label="打样尺码">
              <el-input v-model="form.sampleSize" placeholder="如 M" />
            </el-form-item>
            <el-form-item label="克重(g/m²)">
              <el-input v-model="form.sampleWeightGsm" placeholder="克重" />
            </el-form-item>
            <el-form-item label="外勤/现场">
              <el-input v-model="form.sampleFieldwork" placeholder="外勤说明" />
            </el-form-item>
            <el-form-item label="用途" class="npd-form-span2">
              <el-checkbox-group v-model="form.sampleUsages">
                <el-checkbox v-for="u in SAMPLE_USAGE_OPTIONS" :key="u" :value="u">{{ u }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="外链" class="npd-form-span2">
              <el-input v-model="form.sampleOuterLink" placeholder="亚马逊等链接" clearable />
            </el-form-item>
            <el-form-item label="样衣备注" class="npd-form-span2">
              <el-input v-model="form.sampleGarmentRemark" type="textarea" :rows="2" />
            </el-form-item>
            <el-divider content-position="left">成本与首批</el-divider>
            <el-form-item label="目标成本">
              <el-input v-model="form.targetCost" placeholder="含用料+生产，评毛利" />
            </el-form-item>
            <el-form-item label="新面料寻源">
              <el-switch v-model="form.needFabricSourcing" />
            </el-form-item>
            <el-form-item label="首批起订量">
              <el-input v-model="form.firstMoq" />
            </el-form-item>
            <el-form-item label="首批备货颜色">
              <el-input v-model="form.firstStockColors" />
            </el-form-item>
            <el-form-item label="首批物流方式" class="npd-form-span2">
              <el-input v-model="form.firstLogisticsType" placeholder="积加物流类型" />
            </el-form-item>
            <el-divider content-position="left">图案 / 共享</el-divider>
            <el-form-item label="图案款">
              <el-switch v-model="form.isPatternStyle" />
            </el-form-item>
            <template v-if="form.isPatternStyle">
              <el-form-item label="图案名称">
                <el-input v-model="form.patternName" />
              </el-form-item>
              <el-form-item label="图案设计">
                <el-input v-model="form.patternDesign" />
              </el-form-item>
              <el-form-item label="图案系数">
                <el-input v-model="form.patternCoeff" />
              </el-form-item>
            </template>
            <el-form-item label="共享盘地址" class="npd-form-span2">
              <el-input v-model="form.shareFolderUrl" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 5 操作日志 -->
        <el-collapse-item title="操作日志" name="audit">
          <el-table v-if="form.auditLog?.length" :data="form.auditLog" border size="small" max-height="240">
            <el-table-column prop="at" label="时间" width="168" />
            <el-table-column prop="operator" label="操作人" width="100" />
            <el-table-column prop="action" label="内容" min-width="200" show-overflow-tooltip />
          </el-table>
          <el-empty v-else description="保存或生成样版后将在此记录（本地演示）" :image-size="56" />
        </el-collapse-item>
      </el-collapse>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.npd-edit-dialog :deep(.el-dialog) {
  width: min(1280px, 96vw) !important;
  max-width: 96vw;
  margin-top: 4vh !important;
  display: flex;
  flex-direction: column;
  max-height: 94vh;
}
.npd-edit-dialog :deep(.el-dialog__body) {
  padding: 8px 20px 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.npd-dialog-scroll {
  max-height: min(720px, calc(90vh - 140px));
  overflow-y: auto;
  padding-bottom: 8px;
}
.npd-form-grid :deep(.el-form-item) {
  margin-bottom: 12px;
}
.npd-form-grid {
  align-items: start;
}
@media (min-width: 900px) {
  .npd-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
  }
  .npd-form-grid :deep(.npd-form-span2) {
    grid-column: 1 / -1;
  }
}
.npd-staff-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}
@media (min-width: 700px) {
  .npd-form-cost-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
    align-items: start;
  }
  .npd-form-cost-grid :deep(.npd-form-span2) {
    grid-column: 1 / -1;
  }
}
.npd-pattern-form :deep(.npd-form-span-full) {
  display: block;
  width: 100%;
}
.npd-pattern-form :deep(.npd-form-span-full .el-form-item__content) {
  display: block;
}
.npd-block-tip {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 12px;
  line-height: 1.5;
  max-width: 960px;
}
.field-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}
.color-toolbar {
  margin-bottom: 8px;
}
.color-chk-group,
.size-chk-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.sku-summary {
  margin-left: 12px;
  font-size: 13px;
  color: #475569;
}
.pattern-table-actions {
  margin-bottom: 8px;
}
.pattern-skctable {
  width: 100%;
}
.comp-input-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  width: 100%;
}
@media (min-width: 640px) {
  .comp-input-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1000px) {
  .comp-input-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.mr6 {
  margin-right: 6px;
}
.mt8 {
  margin-top: 8px;
}
.hint {
  font-size: 12px;
  color: #9ca3af;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
</style>
