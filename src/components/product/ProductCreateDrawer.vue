<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submit'])

// ── 表单默认值工厂 ────────────────────────────────────────────────────
const defaultForm = () => ({
  // 媒体
  mainImage: '', sceneImage: '', videoUrl: '',
  // 基础信息
  skuCode: '', spuCode: '', productName: '', styleName: '',
  level: 'A', productType: 'FINISHED', status: 'ACTIVE',
  category: '', brand: '',
  // 规格变体
  colors: [], sizes: [],
  // 开发定位
  valueType: '功能型', patentTag: '外购设计', positioning: '主力',
  year: String(new Date().getFullYear()),
  launchDate: new Date().toISOString().split('T')[0],
  remark: '',
})

const form = reactive(defaultForm())

// ── 颜色 / 尺寸可选项 ─────────────────────────────────────────────────
const COLOR_OPTIONS = ['黑', '白', '米', '灰', '深蓝', '浅蓝', '红', '绿', '橙', '粉', '紫', '卡其']
const SIZE_OPTIONS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '均码']
// 颜色 → 英文后缀映射，用于自动生成 SKU 后缀
const COLOR_CODE = {
  '黑': 'BK', '白': 'WH', '米': 'BE', '灰': 'GR',
  '深蓝': 'NV', '浅蓝': 'LB', '红': 'RD', '绿': 'GN',
  '橙': 'OR', '粉': 'PK', '紫': 'PU', '卡其': 'KH',
}

function toggleColor(c) {
  const i = form.colors.indexOf(c)
  i >= 0 ? form.colors.splice(i, 1) : form.colors.push(c)
}
function toggleSize(s) {
  const i = form.sizes.indexOf(s)
  i >= 0 ? form.sizes.splice(i, 1) : form.sizes.push(s)
}

// ── 变体矩阵（颜色 × 尺寸 自动联动） ────────────────────────────────
const variantMatrix = computed(() => {
  if (!form.colors.length && !form.sizes.length) return []
  const colors = form.colors.length ? form.colors : ['']
  const sizes  = form.sizes.length  ? form.sizes  : ['']
  const rows = []
  for (const color of colors) {
    for (const size of sizes) {
      const suffix = [
        color ? (COLOR_CODE[color] ?? color.slice(0, 2).toUpperCase()) : '',
        size  || '',
      ].filter(Boolean).join('-')
      rows.push({
        id: `${color}-${size}`,
        color, size,
        name: [color, size].filter(Boolean).join(' / '),
        skuSuffix: suffix,
        image: '', price: '', stockStatus: 'normal',
      })
    }
  }
  return rows
})

// ── 自动生成 SKU 编码 ─────────────────────────────────────────────────
function generateSku() {
  const catCode = form.category
    ? form.category.replace(/[\u4e00-\u9fa5]/g, '').toUpperCase().slice(0, 3) || 'PRD'
    : 'PRD'
  const year   = String(new Date().getFullYear()).slice(-2)
  const serial = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  form.skuCode = `${catCode}${year}${serial}`
}

// ── 沿用老品 ─────────────────────────────────────────────────────────
const copyDialogVisible  = ref(false)
const copyFromSkuInput   = ref('')

function doCopyFrom() {
  if (!copyFromSkuInput.value.trim()) {
    ElMessage.warning('请输入老品 SKU 编码')
    return
  }
  // Mock 填充：实际应调接口拉取历史产品数据
  Object.assign(form, {
    productName: '(沿用) 示例产品名称',
    styleName:   '示例款名',
    level:        'B',
    productType:  'FINISHED',
    category:     '服装',
    brand:        'EasyWear',
    colors:       ['黑', '白'],
    sizes:        ['M', 'L'],
    valueType:    '功能型',
    patentTag:    '外购设计',
    positioning:  '主力',
  })
  copyDialogVisible.value = false
  copyFromSkuInput.value  = ''
  ElMessage.success('已沿用老品信息（图片需重新上传）')
}

// ── 侧边锚定导航 ──────────────────────────────────────────────────────
const sections = [
  { id: 'sec-media',    label: '媒体资料', icon: '📷' },
  { id: 'sec-basic',    label: '基本信息', icon: '📋' },
  { id: 'sec-variant',  label: '规格变体', icon: '🎨' },
  { id: 'sec-business', label: '开发定位', icon: '🎯' },
]
const activeAnchor  = ref('sec-media')
const formBodyRef   = ref(null)

function scrollTo(id) {
  activeAnchor.value = id
  formBodyRef.value
    ?.querySelector(`#${id}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 滚动时同步高亮当前锚点
function onBodyScroll(e) {
  const container = e.currentTarget
  const scrollTop = container.scrollTop
  for (let i = sections.length - 1; i >= 0; i--) {
    const dom = container.querySelector(`#${sections[i].id}`)
    if (dom && dom.offsetTop - 40 <= scrollTop) {
      activeAnchor.value = sections[i].id
      return
    }
  }
  activeAnchor.value = sections[0].id
}

// ── 静态配置 ──────────────────────────────────────────────────────────
const levelOptions = ['S', 'A', 'B', 'C', 'D', 'E', 'X']
const productTypeOptions = [
  { value: 'FINISHED',      label: '成品'   },
  { value: 'SEMI_FINISHED', label: '半成品' },
  { value: 'PACKAGING',     label: '包材'   },
  { value: 'BUNDLE',        label: '组合品' },
]
const stockStatusOptions = [
  { value: 'normal', label: '正常' },
  { value: 'low',    label: '低库存' },
  { value: 'out',    label: '缺货'   },
]
const categoryPresets = ['服装', '鞋靴', '箱包', '宠物', '家居', '户外', '厨房', '数码', '玩具', '美妆']
const brandPresets    = ['Runhit', 'EasyWear', 'TrailBlaze', 'HappyPaw', 'BakeJoy', '素白', '声澈']

// ── 表单校验 & 提交 ────────────────────────────────────────────────────
const submitting = ref(false)

function validate() {
  if (!form.skuCode?.trim())       { ElMessage.warning('SKU 编码为必填项');    return false }
  if (!form.productName?.trim())   { ElMessage.warning('品名为必填项');        return false }
  if (!form.category?.trim())      { ElMessage.warning('品类为必填项');        return false }
  return true
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 300)) // 模拟网络请求
  emit('submit', { ...form, variants: variantMatrix.value })
  emit('update:modelValue', false)
  ElMessage.success('产品创建成功')
  submitting.value = false
  Object.assign(form, defaultForm())
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    direction="rtl"
    size="800px"
    :before-close="handleClose"
    class="product-create-drawer"
    destroy-on-close
  >
    <!-- ── 抽屉头部 ── -->
    <template #header>
      <div class="drawer-header">
        <span class="drawer-title">新增产品档案</span>
        <el-button size="small" plain @click="copyDialogVisible = true">
          📋 沿用老品
        </el-button>
      </div>
    </template>

    <!-- ── 抽屉主体：左锚 + 右表单 ── -->
    <div class="drawer-body">

      <!-- 左侧锚点导航（侧边固定） -->
      <nav class="form-anchor">
        <div class="anchor-title">内容导航</div>
        <div
          v-for="sec in sections"
          :key="sec.id"
          class="anchor-item"
          :class="{ 'is-active': activeAnchor === sec.id }"
          @click="scrollTo(sec.id)"
        >
          <span class="anchor-icon">{{ sec.icon }}</span>
          <span class="anchor-label">{{ sec.label }}</span>
        </div>
      </nav>

      <!-- 右侧滚动表单 -->
      <div ref="formBodyRef" class="form-body" @scroll="onBodyScroll">

        <!-- ════ ① 媒体资料 ════ -->
        <section id="sec-media" class="form-section">
          <div class="section-head">
            <span class="section-icon">📷</span>
            <span class="section-title">媒体资料</span>
            <span class="section-tip">支持直接粘贴图片 URL，第一张自动设为主图</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="media-item">
                <div class="media-label">白底主图</div>
                <el-input
                  v-model="form.mainImage"
                  placeholder="https://..."
                  size="small"
                  clearable
                />
                <div class="media-preview" :class="{ 'has-img': form.mainImage }">
                  <img v-if="form.mainImage" :src="form.mainImage" alt="主图" />
                  <span v-else class="preview-placeholder">🖼️ 主图</span>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="media-item">
                <div class="media-label">场景图</div>
                <el-input
                  v-model="form.sceneImage"
                  placeholder="https://..."
                  size="small"
                  clearable
                />
                <div class="media-preview" :class="{ 'has-img': form.sceneImage }">
                  <img v-if="form.sceneImage" :src="form.sceneImage" alt="场景图" />
                  <span v-else class="preview-placeholder">🌅 场景图</span>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="media-item">
                <div class="media-label">15s 视频链接</div>
                <el-input
                  v-model="form.videoUrl"
                  placeholder="https://..."
                  size="small"
                  clearable
                />
                <div class="media-preview">
                  <span v-if="form.videoUrl" class="preview-placeholder" style="color:#1890ff">🎬 已填写</span>
                  <span v-else class="preview-placeholder">🎬 视频链接</span>
                </div>
              </div>
            </el-col>
          </el-row>
        </section>

        <!-- ════ ② 基本信息 ════ -->
        <section id="sec-basic" class="form-section">
          <div class="section-head">
            <span class="section-icon">📋</span>
            <span class="section-title">基本信息</span>
          </div>

          <el-row :gutter="14">
            <!-- SKU 编码 -->
            <el-col :span="12">
              <div class="field-item">
                <div class="field-label required">SKU 编码</div>
                <div class="field-with-btn">
                  <el-input v-model="form.skuCode" placeholder="输入或点击自动生成" size="small" clearable />
                  <el-button size="small" type="primary" plain @click="generateSku">自动生成</el-button>
                </div>
              </div>
            </el-col>
            <!-- SPU 编码 -->
            <el-col :span="12">
              <div class="field-item">
                <div class="field-label">SPU 编码</div>
                <el-input v-model="form.spuCode" placeholder="所属款式编码" size="small" clearable />
              </div>
            </el-col>
          </el-row>

          <el-row :gutter="14" style="margin-top:12px">
            <el-col :span="12">
              <div class="field-item">
                <div class="field-label required">品名</div>
                <el-input v-model="form.productName" placeholder="产品名称（必填）" size="small" clearable />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="field-item">
                <div class="field-label">款名</div>
                <el-input v-model="form.styleName" placeholder="款式名称" size="small" clearable />
              </div>
            </el-col>
          </el-row>

          <el-row :gutter="14" style="margin-top:12px">
            <el-col :span="10">
              <div class="field-item">
                <div class="field-label required">品类</div>
                <el-select
                  v-model="form.category"
                  filterable
                  allow-create
                  placeholder="搜索或输入品类"
                  size="small"
                  style="width:100%"
                >
                  <el-option v-for="c in categoryPresets" :key="c" :label="c" :value="c" />
                </el-select>
              </div>
            </el-col>
            <el-col :span="10">
              <div class="field-item">
                <div class="field-label">品牌</div>
                <el-select
                  v-model="form.brand"
                  filterable
                  allow-create
                  placeholder="搜索或输入品牌"
                  size="small"
                  style="width:100%"
                >
                  <el-option v-for="b in brandPresets" :key="b" :label="b" :value="b" />
                </el-select>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="field-item">
                <div class="field-label">产品级别</div>
                <el-select v-model="form.level" size="small" style="width:100%">
                  <el-option v-for="l in levelOptions" :key="l" :label="l" :value="l" />
                </el-select>
              </div>
            </el-col>
          </el-row>

          <el-row :gutter="14" style="margin-top:12px">
            <el-col :span="10">
              <div class="field-item">
                <div class="field-label">产品类型</div>
                <el-select v-model="form.productType" size="small" style="width:100%">
                  <el-option v-for="o in productTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </div>
            </el-col>
          </el-row>
        </section>

        <!-- ════ ③ 规格变体 ════ -->
        <section id="sec-variant" class="form-section">
          <div class="section-head">
            <span class="section-icon">🎨</span>
            <span class="section-title">规格变体</span>
            <span class="section-tip">勾选颜色和尺寸后，下方自动生成变体矩阵</span>
          </div>

          <!-- 颜色多选 -->
          <div class="variant-group">
            <div class="variant-group-label">颜色（多选）</div>
            <div class="tag-selector">
              <span
                v-for="c in COLOR_OPTIONS"
                :key="c"
                class="sel-tag"
                :class="{ 'is-selected': form.colors.includes(c) }"
                @click="toggleColor(c)"
              >{{ c }}</span>
            </div>
          </div>

          <!-- 尺寸多选 -->
          <div class="variant-group" style="margin-top:12px">
            <div class="variant-group-label">尺寸（多选）</div>
            <div class="tag-selector">
              <span
                v-for="s in SIZE_OPTIONS"
                :key="s"
                class="sel-tag"
                :class="{ 'is-selected': form.sizes.includes(s) }"
                @click="toggleSize(s)"
              >{{ s }}</span>
            </div>
          </div>

          <!-- 变体矩阵表格（自动联动） -->
          <div v-if="variantMatrix.length" class="matrix-wrap">
            <div class="matrix-head">
              <span class="matrix-title">变体矩阵</span>
              <el-tag size="small" type="info">共 {{ variantMatrix.length }} 个规格</el-tag>
            </div>
            <el-table :data="variantMatrix" size="small" border class="matrix-table">
              <!-- 预览图 -->
              <el-table-column label="预览图" width="72" align="center">
                <template #default="{ row }">
                  <div class="matrix-thumb">
                    <img v-if="row.image" :src="row.image" alt="" />
                    <span v-else class="matrix-thumb-add">+</span>
                  </div>
                </template>
              </el-table-column>
              <!-- 变体名称 -->
              <el-table-column label="变体名称" min-width="120">
                <template #default="{ row }">
                  <span class="matrix-name">{{ row.name }}</span>
                </template>
              </el-table-column>
              <!-- SKU 后缀（可编辑） -->
              <el-table-column label="SKU 后缀" width="110">
                <template #default="{ row }">
                  <el-input v-model="row.skuSuffix" size="small" placeholder="如 BK-M" />
                </template>
              </el-table-column>
              <!-- 参考价格（批量录入） -->
              <el-table-column label="参考价格" width="120">
                <template #default="{ row }">
                  <el-input v-model="row.price" size="small" placeholder="¥ 0.00" />
                </template>
              </el-table-column>
              <!-- 库存状态 -->
              <el-table-column label="库存状态" width="110">
                <template #default="{ row }">
                  <el-select v-model="row.stockStatus" size="small" style="width:100%">
                    <el-option v-for="o in stockStatusOptions" :key="o.value" :label="o.label" :value="o.value" />
                  </el-select>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-empty
            v-else
            description="请选择颜色或尺寸，下方将自动生成变体矩阵"
            :image-size="64"
            style="padding: 20px 0"
          />
        </section>

        <!-- ════ ④ 开发定位 ════ -->
        <section id="sec-business" class="form-section">
          <div class="section-head">
            <span class="section-icon">🎯</span>
            <span class="section-title">开发定位</span>
          </div>

          <div class="radio-row">
            <div class="radio-item">
              <div class="field-label">价值属性</div>
              <el-radio-group v-model="form.valueType" size="small">
                <el-radio-button value="功能型">功能型</el-radio-button>
                <el-radio-button value="情绪型">情绪型</el-radio-button>
                <el-radio-button value="性价比型">性价比型</el-radio-button>
              </el-radio-group>
            </div>
            <div class="radio-item">
              <div class="field-label">专利标签</div>
              <el-radio-group v-model="form.patentTag" size="small">
                <el-radio-button value="自研设计">自研设计</el-radio-button>
                <el-radio-button value="外购设计">外购设计</el-radio-button>
                <el-radio-button value="现货">现货</el-radio-button>
              </el-radio-group>
            </div>
          </div>

          <div class="radio-row" style="margin-top:12px">
            <div class="radio-item">
              <div class="field-label">产品定位</div>
              <el-radio-group v-model="form.positioning" size="small">
                <el-radio-button value="引流">引流</el-radio-button>
                <el-radio-button value="主力">主力</el-radio-button>
                <el-radio-button value="长尾">长尾</el-radio-button>
              </el-radio-group>
            </div>
            <div class="radio-item">
              <div class="field-label">年份 / 上架日期</div>
              <div style="display:flex;gap:8px;align-items:center">
                <el-select v-model="form.year" size="small" style="width:88px">
                  <el-option v-for="y in ['2023','2024','2025','2026','2027']" :key="y" :label="y" :value="y" />
                </el-select>
                <el-date-picker
                  v-model="form.launchDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  size="small"
                  style="width:140px"
                  placeholder="上架日期"
                />
              </div>
            </div>
          </div>

          <div class="field-item" style="margin-top:14px">
            <div class="field-label">备注</div>
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="3"
              placeholder="产品开发备注、特殊说明..."
              size="small"
            />
          </div>
        </section>

        <!-- 底部占位，防止内容被 footer 遮住 -->
        <div style="height:80px" />
      </div>
    </div>

    <!-- ── 抽屉底部操作栏 ── -->
    <template #footer>
      <div class="drawer-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          保存并创建
        </el-button>
      </div>
    </template>

    <!-- ── 沿用老品对话框 ── -->
    <el-dialog
      v-model="copyDialogVisible"
      title="沿用老品"
      width="380px"
      append-to-body
    >
      <p style="font-size:13px;color:#6b7280;margin-bottom:12px">
        输入已有产品的 SKU 编码，系统将自动填充该产品的属性信息（图片需重新上传）。
      </p>
      <el-input
        v-model="copyFromSkuInput"
        placeholder="输入老品 SKU 编码，如 EW-TEE-001"
        clearable
        @keyup.enter="doCopyFrom"
      />
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doCopyFrom">确认沿用</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<style scoped>
/* ── 抽屉整体 ── */
:deep(.el-drawer__header) {
  padding: 14px 20px;
  border-bottom: 1px solid #e8ecf0;
  margin-bottom: 0;
}
:deep(.el-drawer__body) {
  padding: 0;
  overflow: hidden;
}
:deep(.el-drawer__footer) {
  padding: 12px 20px;
  border-top: 1px solid #e8ecf0;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* ── 主体：左锚 + 右表单 ── */
.drawer-body {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* 左侧锚点导航 */
.form-anchor {
  width: 120px;
  flex-shrink: 0;
  padding: 20px 0 20px 16px;
  background: #f9fafb;
  border-right: 1px solid #e8ecf0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.anchor-title {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 8px;
  padding-left: 4px;
}
.anchor-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  transition: all .15s;
  border-left: 3px solid transparent;
}
.anchor-item:hover {
  background: #f0f4ff;
  color: #374151;
}
.anchor-item.is-active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
  border-left-color: #3b82f6;
}
.anchor-icon { font-size: 14px; }
.anchor-label { font-size: 12.5px; }

/* 右侧滚动表单 */
.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
  scrollbar-gutter: stable;
}

/* ── 表单区块 ── */
.form-section {
  padding: 20px 0 8px;
  border-bottom: 1px dashed #e8ecf0;
}
.form-section:last-of-type { border-bottom: none; }

.section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}
.section-icon { font-size: 16px; }
.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}
.section-tip {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 4px;
}

/* ── 媒体区 ── */
.media-item { display: flex; flex-direction: column; gap: 6px; }
.media-label { font-size: 12px; color: #6b7280; font-weight: 500; }
.media-preview {
  height: 100px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  overflow: hidden;
  margin-top: 4px;
}
.media-preview.has-img { border-style: solid; border-color: #e8ecf0; background: #fff; }
.media-preview img { width: 100%; height: 100%; object-fit: contain; }
.preview-placeholder { font-size: 13px; color: #9ca3af; }

/* ── 基本信息字段 ── */
.field-item { display: flex; flex-direction: column; gap: 4px; }
.field-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}
.field-label.required::before {
  content: '* ';
  color: #ef4444;
}
.field-with-btn {
  display: flex;
  gap: 6px;
}
.field-with-btn .el-input { flex: 1; }

/* ── 变体选择标签 ── */
.variant-group {}
.variant-group-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  margin-bottom: 8px;
}
.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sel-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12.5px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  cursor: pointer;
  user-select: none;
  transition: all .15s;
}
.sel-tag:hover { border-color: #3b82f6; color: #1d4ed8; }
.sel-tag.is-selected {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

/* ── 变体矩阵 ── */
.matrix-wrap { margin-top: 16px; }
.matrix-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.matrix-title { font-size: 13px; font-weight: 600; color: #374151; }
.matrix-table :deep(.el-table__cell) { border-right: none !important; }
.matrix-table :deep(.el-table td.el-table__cell) { border-bottom: 1px solid #f0f0f0; padding: 6px 8px; }
.matrix-table :deep(.el-table th.el-table__cell) {
  background: #f5f7fa !important;
  border-bottom: 1px solid #e8ecf0 !important;
  font-weight: 600; font-size: 12px; padding: 7px 8px;
}
.matrix-thumb {
  width: 40px; height: 40px;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.matrix-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 3px; }
.matrix-thumb-add { font-size: 18px; color: #9ca3af; line-height: 1; }
.matrix-name { font-size: 13px; color: #1f2937; font-weight: 500; }

/* ── 开发定位 Radio ── */
.radio-row {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}
.radio-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
