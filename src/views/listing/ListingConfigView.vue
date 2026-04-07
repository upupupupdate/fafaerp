<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import { useListingConfig } from '@/features/listing/useListingConfig.js'

const {
  transitions,
  firstLegInboundRules,
  DEFAULT_TRANSITIONS,
  DEFAULT_FIRST_LEG_RULES,
} = useListingConfig()

const firstLegFileRef = ref(null)

function genFirstLegId() {
  return `fl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function addFirstLegRow() {
  firstLegInboundRules.value.push({
    id: genFirstLegId(),
    logisticsName: '',
    shipCountry: '',
    destWarehouse: '',
    standard: 30,
    warning: 5,
    remark: '',
  })
}

function deleteFirstLegRow(row) {
  firstLegInboundRules.value = firstLegInboundRules.value.filter((r) => r.id !== row.id)
}

function resetFirstLegInbound() {
  ElMessageBox.confirm('恢复默认头程物流时效配置？当前规则与导入数据将丢失。', '提示', { type: 'warning' })
    .then(() => {
      firstLegInboundRules.value = JSON.parse(JSON.stringify(DEFAULT_FIRST_LEG_RULES))
      ElMessage.success('已恢复默认')
    })
    .catch(() => {})
}

function downloadFirstLegTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['物流方式', '发货国家', '目的仓', '时效（天）', '预警（天）', '备注'],
    ['海运', '', '', 45, 7, '国家与目的仓留空=仅物流段'],
    ['海运', '中国内地', '美东 FBA 仓', 30, 5, ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '头程物流时效')
  XLSX.writeFile(wb, '头程物流时效配置模板.xlsx')
}

function normHeaderKey(k) {
  return String(k ?? '')
    .replace(/\s/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
}

function parseFirstLegRow(raw) {
  const keys = Object.keys(raw)
  const get = (...cands) => {
    for (const c of cands) {
      for (const k of keys) {
        if (normHeaderKey(k) === normHeaderKey(c) || k === c) {
          const v = raw[k]
          if (v != null && String(v).trim() !== '') return v
        }
      }
    }
    return ''
  }
  const logisticsName = String(get('物流方式', '物流')).trim()
  const shipCountry = String(get('发货国家', '国家')).trim()
  const destWarehouse = String(get('目的仓', '仓库', '目的仓库')).trim()
  const remark = String(get('备注', '说明')).trim()
  let standard = Number(get('时效（天）', '时效(天)', '标准时效', '时效', '标准头程时效（天）'))
  let warning = Number(get('预警（天）', '预警(天)', '预警', '预警提前（天）'))
  if (!logisticsName) return { error: '物流方式必填' }
  const hasC = !!shipCountry
  const hasW = !!destWarehouse
  if (hasC !== hasW) return { error: '发货国家与目的仓须同时填写或同时留空' }
  if (!Number.isFinite(standard) || standard < 1) return { error: '时效须为≥1的整数' }
  if (!Number.isFinite(warning) || warning < 0) warning = Math.min(5, standard - 1)
  if (warning >= standard) warning = standard - 1
  return {
    rule: {
      id: genFirstLegId(),
      logisticsName,
      shipCountry,
      destWarehouse,
      standard: Math.floor(standard),
      warning: Math.floor(warning),
      remark,
    },
  }
}

function onFirstLegImport(e) {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = new Uint8Array(reader.result)
      const wb = XLSX.read(data, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      if (!rows.length) {
        ElMessage.warning('文件无数据行')
        return
      }
      const merged = new Map()
      const errors = []
      rows.forEach((raw, i) => {
        const rowNum = i + 2
        if (!raw || !Object.values(raw).some((v) => String(v ?? '').trim() !== '')) return
        const parsed = parseFirstLegRow(raw)
        if (parsed.error) {
          errors.push(`第${rowNum}行：${parsed.error}`)
          return
        }
        const r = parsed.rule
        const key = `${r.logisticsName}\t${r.shipCountry}\t${r.destWarehouse}`
        merged.set(key, r)
      })
      if (errors.length) {
        ElMessage.error(errors.slice(0, 5).join('；') + (errors.length > 5 ? `…共${errors.length}条` : ''))
        return
      }
      if (!merged.size) {
        ElMessage.warning('没有有效规则行')
        return
      }
      const incoming = [...merged.values()]
      const byKey = new Map(
        firstLegInboundRules.value.map((r) => [`${r.logisticsName}\t${r.shipCountry}\t${r.destWarehouse}`, r]),
      )
      for (const r of incoming) {
        byKey.set(`${r.logisticsName}\t${r.shipCountry}\t${r.destWarehouse}`, r)
      }
      firstLegInboundRules.value = [...byKey.values()]
      ElMessage.success(`已导入/合并 ${incoming.length} 条头程配置`)
    } catch (err) {
      console.error(err)
      ElMessage.error('解析失败，请检查文件格式')
    }
  }
  reader.readAsArrayBuffer(file)
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
           区域 2：头程物流时效（统一：两段连线共用一张表）
      ═══════════════════════════════════════════ -->
      <div class="lc-section">
        <div class="lc-section-header">
          <div class="lc-section-title">
            <span class="lc-section-icon">🚢</span>
            头程物流时效配置
          </div>
          <div class="lc-section-actions">
            <el-button size="small" type="primary" @click="addFirstLegRow">+ 新增</el-button>
            <el-button size="small" @click="downloadFirstLegTemplate">下载模板</el-button>
            <el-button size="small" @click="firstLegFileRef?.click()">批量导入</el-button>
            <input
              ref="firstLegFileRef"
              type="file"
              accept=".xlsx,.xls,.csv"
              class="lc-file-input"
              @change="onFirstLegImport"
            >
            <el-button size="small" @click="resetFirstLegInbound">恢复默认</el-button>
          </div>
        </div>
        <div class="lc-section-desc">
          <b>同一表格</b>维护两段头程：<br>
          • <b>发货国家、目的仓均留空</b>：作用于时间轴 <b>货件待发 → 待入仓</b>，仅按产品「物流方式」匹配。<br>
          • <b>三者均填写</b>（物流方式 + 发货国家 + 目的仓）：作用于 <b>待入仓 → 货件入仓（FBA 已接收）</b>；无匹配时回退「节点间标准时效」中的 FBA 货件入仓默认值。<br>
          支持下载模板、批量导入；产品行字段需与规则文案一致。
        </div>

        <el-table
          :data="firstLegInboundRules"
          border
          size="small"
          class="lc-table"
          empty-text="暂无配置，可新增或批量导入"
        >
          <el-table-column label="物流方式" min-width="110">
            <template #default="{ row }">
              <el-input v-model="row.logisticsName" size="small" placeholder="与产品一致" />
            </template>
          </el-table-column>
          <el-table-column label="发货国家" min-width="108">
            <template #default="{ row }">
              <el-input v-model="row.shipCountry" size="small" placeholder="留空=仅物流段" />
            </template>
          </el-table-column>
          <el-table-column label="目的仓" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.destWarehouse" size="small" placeholder="留空=仅物流段" />
            </template>
          </el-table-column>
          <el-table-column label="标准时效（天）" width="132" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.standard"
                :min="1"
                :max="365"
                size="small"
                controls-position="right"
                style="width: 118px"
              />
            </template>
          </el-table-column>
          <el-table-column label="预警提前（天）" width="132" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.warning"
                :min="0"
                :max="Math.max(0, row.standard - 1)"
                size="small"
                controls-position="right"
                style="width: 110px"
              />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.remark" size="small" placeholder="选填" clearable />
            </template>
          </el-table-column>
          <el-table-column label="预警规则" min-width="168">
            <template #default="{ row }">
              <span class="lc-ok-tip">
                剩余 ≤ {{ row.warning }} 天预警；超过 {{ row.standard }} 天超时
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="72" align="center" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="danger" link @click="deleteFirstLegRow(row)">删除</el-button>
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

.lc-file-input {
  display: none;
}

.lc-tip {
  font-size: 12px;
  color: #9ca3af;
}
</style>
