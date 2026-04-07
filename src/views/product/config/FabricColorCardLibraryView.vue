<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  useFabricColorCardStore,
  fabricCardDisplayName,
  computeMeterPriceByFormula,
  mergeColorPriceHistory,
} from '@/features/product/useFabricColorCardStore.js'

const { list, add, update, remove, getById } = useFabricColorCardStore()

const keyword = ref('')
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return list.value
  return list.value.filter((c) => fabricCardDisplayName(c).toLowerCase().includes(k))
})

/** 列表「颜色摘要」：前几个色名 + 色数 */
function colorSummaryLabel(card) {
  const colors = card?.colors || []
  if (!colors.length) return '—'
  const names = colors.map((c) => c.zh || c.code).filter(Boolean)
  if (!names.length) return '—'
  const n = names.length
  const preview = names.slice(0, 3).join('、')
  if (n <= 3) return `${preview}（${n}色）`
  return `${preview}…（共${n}色）`
}

function colorTooltipLines(card) {
  const colors = card?.colors || []
  return colors.map((c, i) => `${i + 1}. ${c.zh || '—'} / ${c.en || '—'} [${c.code || '—'}]`)
}

const drawerVisible = ref(false)
const drawerCard = ref(null)

function openColorDrawer(row) {
  drawerCard.value = row
  drawerVisible.value = true
}

function fromDrawerToEdit() {
  if (!drawerCard.value) return
  const row = drawerCard.value
  drawerVisible.value = false
  openEdit(row)
}

function emptyColorRow() {
  return {
    zh: '',
    en: '',
    code: '',
    pricePerKg: '',
    pricePerMeter: '',
    pricePerYard: '',
    priceHistory: [],
  }
}

const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({
  supplier: '',
  model: '',
  composition: '',
  fabricType: '',
  widthCm: '',
  weightGsm: '',
  yieldMetersPerKg: '',
  colors: [emptyColorRow()],
})

function openAdd() {
  editingId.value = null
  form.value = {
    supplier: '',
    model: '',
    composition: '',
    fabricType: '',
    widthCm: '',
    weightGsm: '',
    yieldMetersPerKg: '',
    colors: [emptyColorRow()],
  }
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = {
    supplier: row.supplier || row.fabricName || '',
    model: row.model ?? '',
    composition: row.composition ?? '',
    fabricType: row.fabricType ?? '',
    widthCm: row.widthCm ?? '',
    weightGsm: row.weightGsm ?? '',
    yieldMetersPerKg: row.yieldMetersPerKg ?? '',
    colors: row.colors?.length
      ? JSON.parse(JSON.stringify(row.colors))
      : [emptyColorRow()],
  }
  dialogVisible.value = true
}

function addColorRow() {
  form.value.colors.push(emptyColorRow())
}

function removeColorRow(i) {
  if (form.value.colors.length <= 1) return
  form.value.colors.splice(i, 1)
}

/**
 * 批量填充颜色列（与采购计划「批量」一致：以第一行有值的为准写入全部行）
 * @param {'pricePerKg'|'pricePerMeter'|'pricePerYard'} field
 */
function applyColorColumnAll(field) {
  const rows = form.value.colors
  if (!rows.length) return
  const src = rows.find((r) => {
    const v = r[field]
    if (v === '' || v == null) return false
    const n = Number(v)
    return !Number.isNaN(n) && n >= 0
  })
  if (!src) {
    ElMessage.warning('请先在某一行填写该列数值')
    return
  }
  const val = src[field]
  for (const row of rows) {
    row[field] = val
  }
  ElMessage.success('已批量应用到全部颜色行')
}

function suggestedMeterPrice(col) {
  return computeMeterPriceByFormula(form.value.widthCm, form.value.weightGsm, col.pricePerKg)
}

function refMeterText(row) {
  const v = suggestedMeterPrice(row)
  return v != null ? v : '—'
}

function saveForm() {
  if (!form.value.supplier?.trim()) {
    ElMessage.warning('请填写面料商')
    return
  }
  if (!form.value.model?.trim()) {
    ElMessage.warning('请填写面料型号')
    return
  }
  if (!form.value.composition?.trim()) {
    ElMessage.warning('请填写成分')
    return
  }
  if (!form.value.fabricType?.trim()) {
    ElMessage.warning('请填写面料类型')
    return
  }
  const colorsRaw = form.value.colors.filter((c) => c.zh?.trim() || c.code?.trim())
  if (!colorsRaw.length) {
    ElMessage.warning('请至少维护一行颜色（中文名与编码为必填）')
    return
  }
  for (const c of colorsRaw) {
    if (!c.zh?.trim()) {
      ElMessage.warning('每行颜色需填写「颜色（中）」')
      return
    }
    if (!c.code?.trim()) {
      ElMessage.warning('每行颜色需填写「编码」（颜色唯一标识）')
      return
    }
  }

  const oldCard = editingId.value ? getById(editingId.value) : null
  const oldByCode = new Map((oldCard?.colors || []).map((c) => [String(c.code).trim(), c]))

  const colors = colorsRaw.map((c) => {
    const next = {
      zh: c.zh.trim(),
      en: (c.en || '').trim(),
      code: c.code.trim(),
      pricePerKg: c.pricePerKg === '' || c.pricePerKg == null ? '' : Number(c.pricePerKg),
      pricePerMeter: c.pricePerMeter === '' || c.pricePerMeter == null ? '' : Number(c.pricePerMeter),
      pricePerYard: c.pricePerYard === '' || c.pricePerYard == null ? '' : Number(c.pricePerYard),
      priceHistory: Array.isArray(c.priceHistory) ? c.priceHistory : [],
    }
    const prev = oldByCode.get(next.code)
    return mergeColorPriceHistory(prev, next)
  })

  const payload = {
    supplier: form.value.supplier.trim(),
    model: form.value.model.trim(),
    composition: form.value.composition.trim(),
    fabricType: form.value.fabricType.trim(),
    widthCm: form.value.widthCm === '' ? '' : Number(form.value.widthCm),
    weightGsm: form.value.weightGsm === '' ? '' : Number(form.value.weightGsm),
    yieldMetersPerKg: form.value.yieldMetersPerKg === '' ? '' : Number(form.value.yieldMetersPerKg),
    colors,
  }

  if (editingId.value) {
    update(editingId.value, payload)
    ElMessage.success('已保存')
  } else {
    add(payload)
    ElMessage.success('已添加')
  }
  dialogVisible.value = false
}

function delRow(row) {
  ElMessageBox.confirm('确认删除该面料色卡？', '提示', { type: 'warning' })
    .then(() => {
      remove(row.id)
      ElMessage.success('已删除')
      if (drawerCard.value?.id === row.id) {
        drawerVisible.value = false
        drawerCard.value = null
      }
    })
    .catch(() => {})
}

function placeholderImport() {
  ElMessage.info('导入模板与解析逻辑可后续对接；当前请使用「添加」维护')
}

function formatPriceHist(h) {
  if (!h?.length) return '—'
  return `${h.length} 条`
}

function fmtPrice(v) {
  if (v === '' || v == null) return '—'
  return v
}
</script>

<template>
  <div class="fc-page">
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>产品</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">面料色卡库</span>
      </div>
      <div class="header-right">
        <span class="tip">本地保存；列表可扫「颜色摘要」，点「查看」在侧栏浏览明细后再编辑</span>
      </div>
    </header>

    <div class="fc-body">
      <div class="fc-toolbar">
        <el-input v-model="keyword" placeholder="搜索面料商、型号、类型、颜色…" clearable style="width: 320px" />
        <el-button type="primary" @click="openAdd">添加</el-button>
        <el-button @click="placeholderImport">导入</el-button>
      </div>

      <el-table :data="filtered" border stripe row-key="id">
        <el-table-column label="面料商" prop="supplier" min-width="120" show-overflow-tooltip />
        <el-table-column label="面料型号" prop="model" min-width="130" show-overflow-tooltip />
        <el-table-column label="面料类型" prop="fabricType" width="104" show-overflow-tooltip />
        <el-table-column label="幅宽(cm)" width="88" align="right">
          <template #default="{ row }">{{ row.widthCm === '' || row.widthCm == null ? '—' : row.widthCm }}</template>
        </el-table-column>
        <el-table-column label="克重(g/m²)" width="96" align="right">
          <template #default="{ row }">{{ row.weightGsm === '' || row.weightGsm == null ? '—' : row.weightGsm }}</template>
        </el-table-column>
        <el-table-column label="出米数(m/kg)" width="108" align="right">
          <template #default="{ row }">{{ row.yieldMetersPerKg === '' || row.yieldMetersPerKg == null ? '—' : row.yieldMetersPerKg }}</template>
        </el-table-column>
        <el-table-column label="颜色摘要" min-width="168" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip v-if="row.colors?.length" placement="top" :show-after="200">
              <template #content>
                <div v-for="(line, i) in colorTooltipLines(row)" :key="i" class="fc-tip-line">{{ line }}</div>
              </template>
              <span class="fc-sum">{{ colorSummaryLabel(row) }}</span>
            </el-tooltip>
            <span v-else class="fc-sum fc-sum--muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="明细" width="88" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="!row.colors?.length"
              @click="openColorDrawer(row)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="规格摘要" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ fabricCardDisplayName(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="132" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="delRow(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 颜色明细：侧栏抽屉，避免主表展开行突兀 -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerCard ? `颜色明细 — ${drawerCard.supplier || ''} ${drawerCard.model || ''}` : ''"
      direction="rtl"
      size="640px"
      destroy-on-close
      class="fc-drawer"
    >
      <template v-if="drawerCard">
        <p class="fc-drawer-hint">以下为只读预览；改价、增删颜色请点下方「编辑整张色卡」。</p>
        <el-table :data="drawerCard.colors" border size="small" stripe class="fc-drawer-table">
          <el-table-column type="index" label="#" width="48" align="center" />
          <el-table-column prop="zh" label="颜色（中）" min-width="88" />
          <el-table-column prop="en" label="颜色（英）" min-width="88" />
          <el-table-column prop="code" label="编码" width="72" />
          <el-table-column label="公斤价" width="88" align="right">
            <template #default="{ row: c }">{{ fmtPrice(c.pricePerKg) }}</template>
          </el-table-column>
          <el-table-column label="米价" width="88" align="right">
            <template #default="{ row: c }">{{ fmtPrice(c.pricePerMeter) }}</template>
          </el-table-column>
          <el-table-column label="码价" width="88" align="right">
            <template #default="{ row: c }">{{ fmtPrice(c.pricePerYard) }}</template>
          </el-table-column>
          <el-table-column label="报价记录" width="88" align="center">
            <template #default="{ row: c }">{{ formatPriceHist(c.priceHistory) }}</template>
          </el-table-column>
        </el-table>
        <div class="fc-drawer-footer">
          <el-button type="primary" @click="fromDrawerToEdit">编辑整张色卡</el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑面料色卡' : '新增面料色卡'"
      width="min(1240px, 98vw)"
      top="4vh"
      destroy-on-close
      class="fc-dialog"
    >
      <el-form label-width="128px" size="default">
        <div class="form-section-title">面料基础信息</div>
        <el-row :gutter="12">
          <el-col :sm="24" :md="12">
            <el-form-item label="面料商" required>
              <el-input v-model="form.supplier" placeholder="手动维护，新品开发/建品引用" />
            </el-form-item>
          </el-col>
          <el-col :sm="24" :md="12">
            <el-form-item label="面料型号" required>
              <el-input v-model="form.model" placeholder="手动维护" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="成分" required>
              <el-input v-model="form.composition" placeholder="手动维护" />
            </el-form-item>
          </el-col>
          <el-col :sm="24" :md="12">
            <el-form-item label="面料类型" required>
              <el-input v-model="form.fabricType" placeholder="如：针织、梭织" />
            </el-form-item>
          </el-col>
          <el-col :sm="24" :md="12">
            <el-form-item label="幅宽(cm)">
              <el-input-number
                v-model="form.widthCm"
                :min="0"
                :precision="2"
                :controls="false"
                placeholder="单位 cm，用于预估成本"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :sm="24" :md="12">
            <el-form-item label="克重(g/m²)">
              <el-input-number
                v-model="form.weightGsm"
                :min="0"
                :precision="1"
                :controls="false"
                placeholder="每平方米克重"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :sm="24" :md="12">
            <el-form-item label="出米数(m/kg)">
              <el-input-number
                v-model="form.yieldMetersPerKg"
                :min="0"
                :precision="3"
                :controls="false"
                placeholder="每公斤面料产出米数，算损耗"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">颜色与价格</div>
        <p class="fc-hint">
          米价参考：<code>门幅(米)×克重×公斤价÷1000</code>，<b>门幅(米)=幅宽(cm)÷100</b>。列头「批量」将第一行已填数值应用到本列全部行（与采购计划一致）。
        </p>

        <el-table
          :data="form.colors"
          border
          size="small"
          class="fc-color-table"
          max-height="420"
          empty-text="点击下方添加一行颜色"
        >
          <el-table-column type="index" label="#" width="44" align="center" fixed />
          <el-table-column label="颜色（中）" min-width="100">
            <template #default="{ row }">
              <el-input v-model="row.zh" placeholder="必填" />
            </template>
          </el-table-column>
          <el-table-column label="颜色（英）" min-width="100">
            <template #default="{ row }">
              <el-input v-model="row.en" placeholder="选填" />
            </template>
          </el-table-column>
          <el-table-column label="编码" width="100">
            <template #default="{ row }">
              <el-input v-model="row.code" placeholder="必填" />
            </template>
          </el-table-column>
          <el-table-column width="130" align="center">
            <template #header>
              <span>公斤价</span>
              <el-button type="primary" link size="small" class="fc-batch" @click="applyColorColumnAll('pricePerKg')">批量</el-button>
            </template>
            <template #default="{ row }">
              <el-input-number v-model="row.pricePerKg" :min="0" :precision="4" controls-position="right" style="width: 118px" />
            </template>
          </el-table-column>
          <el-table-column width="130" align="center">
            <template #header>
              <span>米价</span>
              <el-button type="primary" link size="small" class="fc-batch" @click="applyColorColumnAll('pricePerMeter')">批量</el-button>
            </template>
            <template #default="{ row }">
              <el-input-number v-model="row.pricePerMeter" :min="0" :precision="4" controls-position="right" style="width: 118px" />
            </template>
          </el-table-column>
          <el-table-column width="130" align="center">
            <template #header>
              <span>码价</span>
              <el-button type="primary" link size="small" class="fc-batch" @click="applyColorColumnAll('pricePerYard')">批量</el-button>
            </template>
            <template #default="{ row }">
              <el-input-number v-model="row.pricePerYard" :min="0" :precision="4" controls-position="right" style="width: 118px" />
            </template>
          </el-table-column>
          <el-table-column label="参考米价" width="108" align="right">
            <template #default="{ row }">
              <span class="fc-ref-price">{{ refMeterText(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="报价快照" width="72" align="center">
            <template #default="{ row }">
              <el-tooltip v-if="row.priceHistory?.length" :content="row.priceHistory.map(h => (h.at||'').slice(0,10)+' 米'+ (h.pricePerMeter??'—')).join('\n')" placement="left">
                <span>{{ row.priceHistory.length }} 条</span>
              </el-tooltip>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="72" align="center" fixed="right">
            <template #default="{ $index }">
              <el-button
                link
                type="danger"
                size="small"
                :disabled="form.colors.length <= 1"
                @click="removeColorRow($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="fc-table-actions">
          <el-button size="small" @click="addColorRow">+ 添加颜色行</el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.fc-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}
.fc-body {
  padding: 16px 20px 24px;
  flex: 1;
}
.fc-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.tip {
  font-size: 12px;
  color: #9ca3af;
  max-width: 480px;
  text-align: right;
  line-height: 1.4;
}
.fc-sum {
  cursor: default;
  color: #374151;
}
.fc-sum--muted {
  color: #c0c4cc;
}
.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 8px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}
.fc-hint {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 12px;
  line-height: 1.5;
}
.fc-hint code {
  font-size: 11px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}
.fc-color-table {
  width: 100%;
}
.fc-color-table :deep(.el-table__cell) {
  vertical-align: middle;
}
.fc-batch {
  margin-left: 4px;
  vertical-align: baseline;
}
.fc-ref-price {
  font-size: 12px;
  color: #059669;
  font-variant-numeric: tabular-nums;
}
.fc-table-actions {
  margin-top: 10px;
}
.fc-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}
.fc-drawer-hint {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 12px;
  line-height: 1.5;
}
.fc-drawer-table {
  width: 100%;
}
.fc-drawer-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.fc-tip-line {
  font-size: 12px;
  line-height: 1.45;
  white-space: nowrap;
}
</style>
