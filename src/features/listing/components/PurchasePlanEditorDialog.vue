<script setup>
/**
 * 采购计划草稿：多行编辑；保存时按【目的仓 + 平台站点 + MSKU】拆成多张本地草稿；备注/附件各单共享。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  buildDefaultLineFromProduct,
  buildThirdPartyRequestPreview,
  createEmptyDraftShell,
  getPurchasePlanDraftById,
  getPurchasePlanDraftForListing,
  groupItemsByWarehouseMarketMsku,
  isListingEligibleForPurchasePlan,
  MAX_ITEMS,
  MOCK_MARKETS,
  MOCK_WAREHOUSES,
  removePurchasePlanDraftById,
  savePurchasePlansSplit,
  warehouseIsFba,
} from '@/features/listing/purchasePlanDraft.js'
import PurchasePlanAddProductDialog from '@/features/listing/components/PurchasePlanAddProductDialog.vue'

const visible = defineModel({ type: Boolean, default: false })

const props = defineProps({
  initialDraftId: { type: String, default: null },
  prefillProductIds: { type: Array, default: () => [] },
  pickerSource: { type: Array, default: () => [] },
  editable: { type: Boolean, default: true },
})

const emit = defineEmits(['saved'])

const formRef = ref(null)
const pickerOpen = ref(false)

const state = reactive(createEmptyDraftShell())

/** 附件占位（与拆分后的各单 header 共享快照） */
function ensureHeaderAttachments() {
  if (!Array.isArray(state.header.attachments)) state.header.attachments = []
}

const warehouseMeta = computed(() =>
  MOCK_WAREHOUSES.find((w) => w.id === state.header.arrivalWarehouseId) ?? null,
)
const needMarketDefault = computed(() => warehouseMeta.value?.isFba === true)

const rules = {
  'header.arrivalWarehouseId': [{ required: true, message: '请选择默认目的仓', trigger: 'change' }],
  'header.arrivalMarketId': [
    {
      validator: (_r, v, cb) => {
        if (needMarketDefault.value && (v == null || v === '')) {
          cb(new Error('默认 FBA 仓需选择平台站点'))
        } else cb()
      },
      trigger: 'change',
    },
  ],
}

function resetState() {
  const shell = createEmptyDraftShell()
  Object.assign(state, shell)
  ensureHeaderAttachments()
}

function applyLoadedRecord(rec) {
  state.draftId = rec.draftId
  state.outerNo = rec.outerNo || ''
  state.status = rec.status || 'local_draft'
  state.createdAt = rec.createdAt
  state.updatedAt = rec.updatedAt
  state.header = {
    arrivalWarehouseId: rec.header?.arrivalWarehouseId ?? MOCK_WAREHOUSES[0]?.id ?? null,
    arrivalMarketId: rec.header?.arrivalMarketId ?? null,
    remark: rec.header?.remark ?? '',
    creatorAccountId: rec.header?.creatorAccountId ?? null,
    attachments: Array.isArray(rec.header?.attachments) ? [...rec.header.attachments] : [],
  }
  ensureHeaderAttachments()
  const h = state.header
  state.items = Array.isArray(rec.items)
    ? rec.items.map((r) => ({
        ...r,
        arrivalWarehouseId: r.arrivalWarehouseId ?? h.arrivalWarehouseId,
        arrivalMarketId: r.arrivalMarketId ?? h.arrivalMarketId,
      }))
    : []
}

function initFromOpen() {
  if (props.initialDraftId) {
    const d = getPurchasePlanDraftById(props.initialDraftId)
    if (d) {
      applyLoadedRecord(d)
      return
    }
  }
  resetState()
  const ids = props.prefillProductIds || []
  const byId = new Map(props.pickerSource.map((p) => [p.id, p]))
  const seen = new Set()
  for (const rawId of ids) {
    const p = byId.get(rawId)
    if (!p || !isListingEligibleForPurchasePlan(p)) continue
    if (seen.has(p.id)) continue
    const taken = getPurchasePlanDraftForListing(p.id)
    if (taken) {
      ElMessage.warning(`SKU ${p.sku} 已在草稿 ${taken.outerNo || taken.draftId} 中，已跳过`)
      continue
    }
    seen.add(p.id)
    state.items.push(buildDefaultLineFromProduct(p, state.header))
    if (state.items.length >= MAX_ITEMS) break
  }
}

watch(visible, (v) => {
  if (v) initFromOpen()
})

watch(needMarketDefault, (need) => {
  if (!need) state.header.arrivalMarketId = null
})

/** 保存前预览：按拆分键分组数量 */
const splitGroupsPreview = computed(() => {
  if (!state.items.length) return []
  const g = groupItemsByWarehouseMarketMsku(state.items)
  const out = []
  let i = 0
  for (const rows of g.values()) {
    i += 1
    const first = rows[0]
    const header = {
      arrivalWarehouseId: first.arrivalWarehouseId,
      arrivalMarketId: warehouseIsFba(first.arrivalWarehouseId) ? first.arrivalMarketId : null,
      remark: state.header.remark || '',
      creatorAccountId: state.header.creatorAccountId ?? null,
      attachments: state.header.attachments?.length ? [...state.header.attachments] : undefined,
    }
    const items = rows.map((r) => ({
      msku: r.msku,
      urgent: r.urgent ? 1 : 0,
      quantity: r.quantity,
      transferWarehouseId: r.transferWarehouseId || undefined,
      expectDeliveryDate: r.expectDeliveryDate,
      transportName: r.transportName,
      remark: r.remark || undefined,
    }))
    out.push({
      idx: i,
      lineCount: rows.length,
      preview: buildThirdPartyRequestPreview({
        outerNo: `(第${i}组，保存后分配 PL 单号)`,
        header,
        items,
      }),
    })
  }
  return out
})

function openPicker() {
  pickerOpen.value = true
}

function onAddProductsConfirm(products) {
  let add = 0
  for (const p of products || []) {
    if (state.items.length >= MAX_ITEMS) {
      ElMessage.warning(`最多 ${MAX_ITEMS} 行`)
      break
    }
    if (!p || !isListingEligibleForPurchasePlan(p)) continue
    if (state.items.some((r) => r.listingId === p.id)) continue
    const taken = getPurchasePlanDraftForListing(p.id)
    if (taken && taken.draftId !== state.draftId) {
      ElMessage.warning(`SKU ${p.sku} 已在草稿 ${taken.outerNo || taken.draftId} 中`)
      continue
    }
    state.items.push(buildDefaultLineFromProduct(p, state.header))
    add++
  }
  if (add) ElMessage.success(`已添加 ${add} 个产品`)
}

function removeRow(index) {
  state.items.splice(index, 1)
}

/** 将表头默认仓/站写入每一行 */
function applyDefaultWarehouseToAllRows() {
  const wh = state.header.arrivalWarehouseId
  const mk = state.header.arrivalMarketId
  for (const row of state.items) {
    row.arrivalWarehouseId = wh
    row.arrivalMarketId = warehouseIsFba(wh) ? mk : null
  }
  ElMessage.success('已将默认目的仓、平台站点应用到全部行')
}

/**
 * 批量应用：以「第一行非空」为准写入整列（FBA 站点列仅对 FBA 行生效）
 * @param {string} field
 */
function applyColumnAll(field) {
  if (!state.items.length) return
  const src = state.items.find((r) => {
    const v = r[field]
    if (v === '' || v == null) return false
    if (field === 'quantity' && Number(v) < 1) return false
    return true
  })
  if (!src) {
    ElMessage.warning('请先在某一行填写该字段')
    return
  }
  const val = src[field]
  for (const row of state.items) {
    if (field === 'arrivalMarketId' && !warehouseIsFba(row.arrivalWarehouseId)) {
      row.arrivalMarketId = null
      continue
    }
    row[field] = val
  }
  ElMessage.success('已批量应用到全部行')
}

function onAttachmentChange(uploadFile, uploadFiles) {
  ensureHeaderAttachments()
  state.header.attachments = (uploadFiles || []).map((f) => ({
    name: f.name,
    uid: f.uid,
    raw: undefined,
  }))
}

async function onSave() {
  if (!props.editable) {
    visible.value = false
    return
  }
  if (!state.items.length) {
    ElMessage.warning('请至少添加一行产品（勾选或从列表添加）')
    return
  }
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  ensureHeaderAttachments()
  for (const row of state.items) {
    if (row.arrivalWarehouseId == null) {
      ElMessage.warning('请为每行选择目的仓')
      return
    }
    if (warehouseIsFba(row.arrivalWarehouseId) && (row.arrivalMarketId == null || row.arrivalMarketId === '')) {
      ElMessage.warning('FBA 目的仓需为每行选择平台站点')
      return
    }
    if (!row.quantity || row.quantity < 1) {
      ElMessage.warning('每行计划量至少为 1')
      return
    }
    if (!row.expectDeliveryDate || !String(row.transportName || '').trim()) {
      ElMessage.warning('请补全每行的计划交期、物流方式')
      return
    }
  }

  const shared = {
    remark: state.header.remark || '',
    creatorAccountId: state.header.creatorAccountId ?? null,
    attachments: [...(state.header.attachments || [])],
  }
  const rows = state.items.map((r) => ({ ...r }))
  /** 仅编辑已持久化草稿时先删旧单（新建会话的 draftId 不在本地库中） */
  const editingId = props.initialDraftId && getPurchasePlanDraftById(props.initialDraftId)
    ? props.initialDraftId
    : null

  try {
    const saved = savePurchasePlansSplit({
      editingDraftId: editingId,
      sharedHeader: shared,
      rows,
    })
    ElMessage.success(`已保存 ${saved.length} 张本地采购计划草稿（按仓/站/MSKU 拆分，未调用三方接口）`)
    emit('saved', saved)
    visible.value = false
  } catch (err) {
    ElMessage.error(err?.message || '保存失败')
  }
}

function onDeleteDraft() {
  if (!state.draftId) {
    visible.value = false
    return
  }
  ElMessageBox.confirm('确认删除当前编辑的采购计划草稿？', '提示', { type: 'warning' })
    .then(() => {
      removePurchasePlanDraftById(state.draftId)
      ElMessage.success('已删除')
      emit('saved', null)
      visible.value = false
    })
    .catch(() => {})
}

function rowNeedsMarket(row) {
  return warehouseIsFba(row.arrivalWarehouseId)
}

function onRowWarehouseChange(row) {
  if (!warehouseIsFba(row.arrivalWarehouseId)) row.arrivalMarketId = null
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="创建采购计划草稿"
    width="96%"
    top="2vh"
    class="ppe-dialog ppe-dialog--wide"
    destroy-on-close
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="ppe-alert"
      title="保存时按「目的仓 + 平台站点 + MSKU」拆成多张采购计划，单号分别生成；下方备注与附件在各拆分单中相同。不上传服务器。"
    />

    <el-form
      ref="formRef"
      :model="state"
      :rules="rules"
      label-width="100px"
      size="small"
      class="ppe-form"
    >
      <el-form-item label="默认目的仓" prop="header.arrivalWarehouseId">
        <el-select
          v-model="state.header.arrivalWarehouseId"
          filterable
          placeholder="新行默认"
          style="width: 260px"
          :disabled="!editable"
        >
          <el-option
            v-for="w in MOCK_WAREHOUSES"
            :key="w.id"
            :label="w.label + (w.isFba ? '（FBA）' : '')"
            :value="w.id"
          />
        </el-select>
        <el-button
          v-if="editable && state.items.length"
          type="primary"
          link
          size="small"
          class="ppe-sync-wh"
          @click="applyDefaultWarehouseToAllRows"
        >
          应用到全部行
        </el-button>
      </el-form-item>
      <el-form-item
        v-if="needMarketDefault"
        label="默认站点"
        prop="header.arrivalMarketId"
      >
        <el-select
          v-model="state.header.arrivalMarketId"
          filterable
          placeholder="新行默认"
          style="width: 260px"
          :disabled="!editable"
        >
          <el-option v-for="m in MOCK_MARKETS" :key="m.id" :label="m.label" :value="m.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="state.header.remark"
          type="textarea"
          :rows="2"
          placeholder="拆分后的各采购计划共用此备注"
          style="max-width: 720px"
          :disabled="!editable"
        />
      </el-form-item>
      <el-form-item label="附件">
        <el-upload
          :auto-upload="false"
          :disabled="!editable"
          :on-change="onAttachmentChange"
          :limit="10"
          multiple
        >
          <el-button size="small" type="primary" plain>选择文件（占位，不上传）</el-button>
          <template #tip>
            <span class="ppe-upload-tip">拆分后的各单共享同一份附件列表；对接接口后可上传服务端。</span>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>

    <div class="ppe-table-wrap">
      <div class="ppe-table-toolbar">
        <span class="ppe-toolbar-title">明细（{{ state.items.length }} / {{ MAX_ITEMS }}）</span>
        <el-button
          v-if="editable"
          type="primary"
          plain
          size="small"
          :disabled="state.items.length >= MAX_ITEMS"
          @click="openPicker"
        >
          从列表添加
        </el-button>
      </div>
      <el-table :data="state.items" border size="small" max-height="480" class="ppe-table">
        <el-table-column type="index" label="#" width="44" fixed />
        <el-table-column prop="nameCn" label="品名" min-width="140" show-overflow-tooltip fixed />
        <el-table-column label="目的仓" width="130">
          <template #header>
            <div class="ppe-th">
              <span>目的仓</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('arrivalWarehouseId')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-select
              v-model="row.arrivalWarehouseId"
              size="small"
              filterable
              style="width: 118px"
              :disabled="!editable"
              @change="onRowWarehouseChange(row)"
            >
              <el-option
                v-for="w in MOCK_WAREHOUSES"
                :key="w.id"
                :label="w.label"
                :value="w.id"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="平台站点" width="120">
          <template #header>
            <div class="ppe-th">
              <span>站点</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('arrivalMarketId')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-select
              v-if="rowNeedsMarket(row)"
              v-model="row.arrivalMarketId"
              size="small"
              filterable
              placeholder="FBA必填"
              style="width: 108px"
              :disabled="!editable"
            >
              <el-option v-for="m in MOCK_MARKETS" :key="m.id" :label="m.label" :value="m.id" />
            </el-select>
            <span v-else class="ppe-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="sku" label="SKU" width="108" show-overflow-tooltip />
        <el-table-column prop="msku" label="MSKU" width="118" show-overflow-tooltip />
        <el-table-column label="计划量" width="118">
          <template #header>
            <div class="ppe-th">
              <span>计划量</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('quantity')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-input-number
              v-model="row.quantity"
              :min="1"
              :max="999999"
              :step="1"
              size="small"
              :controls="false"
              :disabled="!editable"
              class="ppe-inum"
            />
          </template>
        </el-table-column>
        <el-table-column label="加急" width="78" align="center">
          <template #header>
            <div class="ppe-th">
              <span>加急</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('urgent')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-switch
              v-model="row.urgent"
              :active-value="1"
              :inactive-value="0"
              size="small"
              :disabled="!editable"
            />
          </template>
        </el-table-column>
        <el-table-column label="计划交期" width="158">
          <template #header>
            <div class="ppe-th">
              <span>计划交期</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('expectDeliveryDate')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-date-picker
              v-model="row.expectDeliveryDate"
              type="date"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 138px"
              :disabled="!editable"
            />
          </template>
        </el-table-column>
        <el-table-column label="物流方式" min-width="110">
          <template #header>
            <div class="ppe-th">
              <span>物流</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('transportName')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-input v-model="row.transportName" size="small" :disabled="!editable" />
          </template>
        </el-table-column>
        <el-table-column label="中转仓" width="88">
          <template #header>
            <div class="ppe-th">
              <span>中转仓</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('transferWarehouseId')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-input v-model="row.transferWarehouseId" size="small" :disabled="!editable" />
          </template>
        </el-table-column>
        <el-table-column label="行备注" min-width="88">
          <template #header>
            <div class="ppe-th">
              <span>行备注</span>
              <el-button v-if="editable" type="primary" link size="small" @click="applyColumnAll('remark')">批量</el-button>
            </div>
          </template>
          <template #default="{ row }">
            <el-input v-model="row.remark" size="small" :disabled="!editable" />
          </template>
        </el-table-column>
        <el-table-column v-if="editable" label="操作" width="56" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" link size="small" @click="removeRow($index)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-collapse v-if="splitGroupsPreview.length" class="ppe-collapse">
      <el-collapse-item title="拆分预览（保存后每张单独立单号）" name="split">
        <div v-for="g in splitGroupsPreview" :key="g.idx" class="ppe-split-block">
          <div class="ppe-split-h">第 {{ g.idx }} 组 · {{ g.lineCount }} 行</div>
          <pre class="ppe-pre">{{ JSON.stringify(g.preview, null, 2) }}</pre>
        </div>
      </el-collapse-item>
    </el-collapse>

    <template #footer>
      <div class="ppe-footer">
        <el-button
          v-if="editable && (state.outerNo || props.initialDraftId)"
          type="danger"
          plain
          @click="onDeleteDraft"
        >
          删除当前草稿
        </el-button>
        <span class="ppe-spacer" />
        <el-button @click="visible = false">取消</el-button>
        <el-button v-if="editable" type="primary" @click="onSave">保存草稿</el-button>
        <el-button v-else type="primary" @click="visible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>

  <PurchasePlanAddProductDialog
    v-model="pickerOpen"
    :source-products="pickerSource"
    :exclude-listing-ids="state.items.map((r) => r.listingId)"
    :max-add="Math.max(0, MAX_ITEMS - state.items.length)"
    @confirm="onAddProductsConfirm"
  />
</template>

<style scoped>
.ppe-dialog--wide {
  max-width: 1480px;
  margin: 0 auto;
}
.ppe-alert {
  margin-bottom: 12px;
}
.ppe-form {
  margin-bottom: 8px;
}
.ppe-sync-wh {
  margin-left: 10px;
}
.ppe-upload-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
.ppe-muted {
  color: #c0c4cc;
  font-size: 12px;
}
.ppe-table-wrap {
  margin-top: 4px;
}
.ppe-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.ppe-toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.ppe-th {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  line-height: 1.2;
}
.ppe-inum {
  width: 100px;
}
.ppe-collapse {
  margin-top: 12px;
  border: none;
}
.ppe-split-block {
  margin-bottom: 12px;
}
.ppe-split-h {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 6px;
}
.ppe-pre {
  margin: 0;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 11px;
  max-height: 220px;
  overflow: auto;
}
.ppe-footer {
  display: flex;
  align-items: center;
  width: 100%;
}
.ppe-spacer {
  flex: 1;
}
.ppe-picker-hint {
  margin-bottom: 10px;
}
</style>
