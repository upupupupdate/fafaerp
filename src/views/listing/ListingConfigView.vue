<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useListingConfig } from '@/features/listing/useListingConfig.js'

const { transitions, logistics, DEFAULT_TRANSITIONS, DEFAULT_LOGISTICS } = useListingConfig()

// ── 物流方式：新增/编辑弹窗 ───────────────────────────────────────────
const logisticsDialogVisible = ref(false)
const logisticsForm = ref({ id: null, name: '', standard: 30, warning: 5, remark: '' })
const logisticsFormRef = ref(null)

const logisticsRules = {
  name:     [{ required: true, message: '请输入物流方式名称', trigger: 'blur' }],
  standard: [{ required: true, message: '请输入标准时效天数', trigger: 'blur' }],
  warning:  [{ required: true, message: '请输入预警提前天数', trigger: 'blur' }],
}

function openAddLogistics() {
  logisticsForm.value = { id: null, name: '', standard: 30, warning: 5, remark: '' }
  logisticsDialogVisible.value = true
}

function openEditLogistics(row) {
  logisticsForm.value = { ...row }
  logisticsDialogVisible.value = true
}

function saveLogistics() {
  logisticsFormRef.value?.validate(valid => {
    if (!valid) return
    if (logisticsForm.value.id) {
      const idx = logistics.value.findIndex(l => l.id === logisticsForm.value.id)
      if (idx !== -1) logistics.value[idx] = { ...logisticsForm.value }
    } else {
      const newId = Date.now()
      logistics.value.push({ ...logisticsForm.value, id: newId })
    }
    logisticsDialogVisible.value = false
    ElMessage.success('保存成功')
  })
}

function deleteLogistics(row) {
  ElMessageBox.confirm(`确认删除物流方式「${row.name}」？`, '提示', { type: 'warning' })
    .then(() => {
      logistics.value = logistics.value.filter(l => l.id !== row.id)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

// ── 恢复默认配置 ──────────────────────────────────────────────────────
function resetTransitions() {
  ElMessageBox.confirm('恢复默认节点时效配置？当前修改将丢失。', '提示', { type: 'warning' })
    .then(() => {
      transitions.value = JSON.parse(JSON.stringify(DEFAULT_TRANSITIONS))
      ElMessage.success('已恢复默认配置')
    })
    .catch(() => {})
}

function resetLogistics() {
  ElMessageBox.confirm('恢复默认物流方式配置？当前修改将丢失。', '提示', { type: 'warning' })
    .then(() => {
      logistics.value = JSON.parse(JSON.stringify(DEFAULT_LOGISTICS))
      ElMessage.success('已恢复默认配置')
    })
    .catch(() => {})
}

// ── 预警天数合法性提示 ────────────────────────────────────────────────
function warnTip(row) {
  if (row.warning >= row.standard) return '⚠ 预警天数应小于标准天数'
  return ''
}
</script>

<template>
  <div class="lc-page">

    <!-- ── 页头 ── -->
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>上架</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">时效配置</span>
      </div>
      <div class="header-right">
        <span class="lc-tip">所有配置实时生效，自动保存到本地</span>
      </div>
    </header>

    <div class="lc-body">

      <!-- ═══════════════════════════════════════════
           区域 1：节点间标准时效配置
      ═══════════════════════════════════════════ -->
      <div class="lc-section">
        <div class="lc-section-header">
          <div class="lc-section-title">
            <span class="lc-section-icon">⏱</span>
            节点间标准时效配置
          </div>
          <div class="lc-section-actions">
            <el-button size="small" @click="resetTransitions">恢复默认</el-button>
          </div>
        </div>
        <div class="lc-section-desc">
          配置各流程节点之间的标准完成时效。进度条将根据此配置实时计算并展示实际用时 vs 要求用时，超出标准时效的 SKU 将被自动标记。
        </div>

        <el-table
          :data="transitions"
          border
          size="small"
          class="lc-table"
        >
          <el-table-column label="#" width="44" align="center">
            <template #default="{ $index }">
              <span class="lc-idx">{{ $index + 1 }}</span>
            </template>
          </el-table-column>

          <el-table-column label="时效名称" width="148">
            <template #default="{ row }">
              <span class="lc-metric-name">{{ row.label }}</span>
            </template>
          </el-table-column>

          <el-table-column label="计算公式" min-width="280">
            <template #default="{ row }">
              <span class="lc-formula">{{ row.desc }}</span>
            </template>
          </el-table-column>

          <el-table-column label="标准时效（天）" width="150" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.standard"
                :min="1"
                :max="365"
                size="small"
                controls-position="right"
                style="width: 110px"
              />
            </template>
          </el-table-column>

          <el-table-column label="预警提前（天）" width="150" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.warning"
                :min="0"
                :max="row.standard - 1"
                size="small"
                controls-position="right"
                style="width: 110px"
              />
            </template>
          </el-table-column>

          <el-table-column label="预警说明" min-width="200">
            <template #default="{ row }">
              <span v-if="warnTip(row)" class="lc-warn-tip">{{ warnTip(row) }}</span>
              <span v-else class="lc-ok-tip">
                剩余 ≤ {{ row.warning }} 天时显示橙色预警；超过 {{ row.standard }} 天显示红色超时
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- ═══════════════════════════════════════════
           区域 2：物流方式头程时效配置
      ═══════════════════════════════════════════ -->
      <div class="lc-section">
        <div class="lc-section-header">
          <div class="lc-section-title">
            <span class="lc-section-icon">🚢</span>
            头程物流时效配置
          </div>
          <div class="lc-section-actions">
            <el-button size="small" type="primary" @click="openAddLogistics">+ 新增物流方式</el-button>
            <el-button size="small" @click="resetLogistics">恢复默认</el-button>
          </div>
        </div>
        <div class="lc-section-desc">
          不同物流方式对应不同的头程时效（货件待发 → 待入仓）。产品行将根据其所选物流方式匹配对应的标准时效进行预警判断。
        </div>

        <el-table
          :data="logistics"
          border
          size="small"
          class="lc-table"
        >
          <el-table-column label="物流方式" width="140">
            <template #default="{ row }">
              <span class="lc-metric-name">{{ row.name }}</span>
            </template>
          </el-table-column>

          <el-table-column label="标准头程时效（天）" width="170" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.standard"
                :min="1"
                :max="180"
                size="small"
                controls-position="right"
                style="width: 120px"
              />
            </template>
          </el-table-column>

          <el-table-column label="预警提前（天）" width="150" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.warning"
                :min="0"
                :max="row.standard - 1"
                size="small"
                controls-position="right"
                style="width: 110px"
              />
            </template>
          </el-table-column>

          <el-table-column label="备注" min-width="160">
            <template #default="{ row }">
              <el-input
                v-model="row.remark"
                size="small"
                placeholder="选填"
                clearable
              />
            </template>
          </el-table-column>

          <el-table-column label="预警规则" min-width="200">
            <template #default="{ row }">
              <span class="lc-ok-tip">
                剩余 ≤ {{ row.warning }} 天预警；超过 {{ row.standard }} 天超时
              </span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="openEditLogistics(row)">编辑</el-button>
              <el-button size="small" type="danger" link @click="deleteLogistics(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- ═══════════════════════════════════════════
           区域 3：时效指标说明（参考，不可编辑）
      ═══════════════════════════════════════════ -->
      <div class="lc-section">
        <div class="lc-section-header">
          <div class="lc-section-title">
            <span class="lc-section-icon">📊</span>
            全链路时效指标说明（参考）
          </div>
        </div>
        <div class="lc-section-desc">
          以下为全链路各时效指标的计算逻辑，用于时效分析报表展示，无需单独配置。
        </div>

        <el-table
          :data="[
            { name: '平面设计总用时',    formula: '【平面设计完成】- 【运营分配】时间' },
            { name: 'Listing上传总用时', formula: '【上传Listing】- 【运营分配】时间' },
            { name: 'Listing&采购下单',  formula: '【上传Listing】- 【采购下单】时间' },
            { name: 'Listing&备货入库',  formula: '【上传Listing】- 【备货入库】时间' },
            { name: '完成平面设计&备货入库', formula: '【完成平面设计】- 【备货入库】时间' },
            { name: '完成平面设计&建货件',  formula: '【完成平面设计】- 【备货入库】时间' },
            { name: '开售响应',          formula: '【开售】- 【可开售时间（货件到FBA仓与平面设计完成取较晚者）】' },
            { name: '全链路时效',        formula: '【开售】- 【开发授权】时间' },
          ]"
          border
          size="small"
          class="lc-table"
        >
          <el-table-column label="指标名称" width="200">
            <template #default="{ row }">
              <span class="lc-metric-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="计算公式" min-width="380">
            <template #default="{ row }">
              <span class="lc-formula">{{ row.formula }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

    </div>

    <!-- ── 新增/编辑物流方式弹窗 ── -->
    <el-dialog
      v-model="logisticsDialogVisible"
      :title="logisticsForm.id ? '编辑物流方式' : '新增物流方式'"
      width="440px"
      destroy-on-close
    >
      <el-form
        ref="logisticsFormRef"
        :model="logisticsForm"
        :rules="logisticsRules"
        label-width="130px"
        size="small"
      >
        <el-form-item label="物流方式名称" prop="name">
          <el-input v-model="logisticsForm.name" placeholder="如：海运、空运" />
        </el-form-item>
        <el-form-item label="标准时效（天）" prop="standard">
          <el-input-number
            v-model="logisticsForm.standard"
            :min="1"
            :max="180"
            controls-position="right"
            style="width: 160px"
          />
        </el-form-item>
        <el-form-item label="预警提前（天）" prop="warning">
          <el-input-number
            v-model="logisticsForm.warning"
            :min="0"
            :max="logisticsForm.standard - 1"
            controls-position="right"
            style="width: 160px"
          />
          <span class="lc-form-hint">剩余天数 ≤ 此值时出现橙色预警</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="logisticsForm.remark" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="logisticsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLogistics">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.lc-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #f0f2f5;
}

.lc-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lc-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.lc-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.lc-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.lc-section-icon { font-size: 16px; }
.lc-section-actions { display: flex; gap: 8px; }

.lc-section-desc {
  font-size: 12px;
  color: #9ca3af;
  padding: 6px 18px 10px;
  line-height: 1.6;
}

.lc-table { margin: 0; }

.lc-idx { font-size: 12px; color: #9ca3af; }
.lc-metric-name { font-weight: 600; font-size: 13px; color: #111827; }
.lc-formula { font-size: 12px; color: #6b7280; line-height: 1.6; }
.lc-warn-tip { font-size: 12px; color: #ef4444; }
.lc-ok-tip { font-size: 12px; color: #9ca3af; line-height: 1.5; }

.lc-form-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 8px;
}

.lc-tip {
  font-size: 12px;
  color: #9ca3af;
}
</style>
