<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'saved'])

// ── 表单默认值工厂 ────────────────────────────────────────────────────
const defaultForm = () => ({
  // 媒体
  images:         [],
  mainImageIndex: 0,
  // 身份标识
  productName:    '',
  skuCode:        '',
  productType:    'NORMAL',
  barcode:        '',
  // 属性配置
  status:         'ACTIVE',
  categoryName:   '',
  brandName:      '',
  developer:      'current',
  owners:         [],
  viewers:        [],
  sourceUrl1688:  '',
  // 详细规格
  model:          '',
  unit:           '',
  material:       '',
  tags:           [],
})

const form        = reactive(defaultForm())
const formRef     = ref(null)
const fileInputRef = ref(null)
const imageUrlDraft = ref('')
const hoveredThumb  = ref(null)

// ── 图片管理 ──────────────────────────────────────────────────────────
const mainImageUrl = computed(() => form.images[form.mainImageIndex]?.url || '')

function addImageByUrl() {
  const url = imageUrlDraft.value.trim()
  if (!url) return
  if (!/^https?:\/\//i.test(url)) {
    ElMessage.warning('请输入以 http:// 或 https:// 开头的链接')
    return
  }
  form.images.push({ url, name: url.split('/').pop().split('?')[0] || 'image' })
  if (form.images.length === 1) form.mainImageIndex = 0
  imageUrlDraft.value = ''
}

function triggerFileUpload() { fileInputRef.value?.click() }

function onFileChange(e) {
  for (const f of Array.from(e.target.files || [])) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      form.images.push({ url: ev.target.result, name: f.name })
      if (form.images.length === 1) form.mainImageIndex = 0
    }
    reader.readAsDataURL(f)
  }
  e.target.value = ''
}

function setMainImage(index) { form.mainImageIndex = index }

function removeImage(index) {
  form.images.splice(index, 1)
  if (form.mainImageIndex >= form.images.length)
    form.mainImageIndex = Math.max(0, form.images.length - 1)
}

// ── SKU 自动生成 ──────────────────────────────────────────────────────
function generateSku() {
  const cat = (form.categoryName || 'PRD')
    .replace(/[\u4e00-\u9fa5\s]/g, '').toUpperCase().slice(0, 3) || 'PRD'
  const year   = String(new Date().getFullYear()).slice(-2)
  const serial = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  form.skuCode = `${cat}${year}${serial}`
}

// ── Bundle 子单品 ─────────────────────────────────────────────────────
const bundleItems = ref([{ skuCode: '', skuName: '', quantity: 1 }])

function addBundleItem() { bundleItems.value.push({ skuCode: '', skuName: '', quantity: 1 }) }
function removeBundleItem(i) {
  bundleItems.value.splice(i, 1)
  if (!bundleItems.value.length) addBundleItem()
}

// ── 远程搜索（Mock） ───────────────────────────────────────────────────
const CATEGORY_LIST = ['服装', '鞋靴', '箱包', '宠物用品', '家居', '户外运动', '厨房用品', '数码配件', '玩具', '美妆个护']
const BRAND_LIST    = ['Runhit', 'EasyWear', 'TrailBlaze', 'HappyPaw', 'BakeJoy', '素白', '声澈', 'ModerHome']

const categoryOptions = ref([...CATEGORY_LIST])
const brandOptions    = ref([...BRAND_LIST])
const catLoading      = ref(false)
const brandLoading    = ref(false)

function searchCategories(q) {
  catLoading.value = true
  setTimeout(() => {
    categoryOptions.value = q ? CATEGORY_LIST.filter((c) => c.includes(q)) : [...CATEGORY_LIST]
    catLoading.value = false
  }, 200)
}
function searchBrands(q) {
  brandLoading.value = true
  setTimeout(() => {
    brandOptions.value = q
      ? BRAND_LIST.filter((b) => b.toLowerCase().includes(q.toLowerCase()))
      : [...BRAND_LIST]
    brandLoading.value = false
  }, 200)
}

// ── 静态配置 ──────────────────────────────────────────────────────────
const STAFF_OPTIONS = [
  { value: 'current', label: '当前用户（我）' },
  { value: 'u_zhang', label: '张晓明' },
  { value: 'u_li',    label: '李华'   },
  { value: 'u_wang',  label: '王芳'   },
  { value: 'u_zhao',  label: '赵磊'   },
  { value: 'u_chen',  label: '陈静'   },
]
const TAG_OPTIONS    = ['亚马逊FBA', '旺季重点', '新品上市', '促销候选', '高毛利', '爆款', '明星产品', '清仓处理']
const STATUS_OPTIONS = [
  { value: 'ACTIVE',    label: '在售', color: '#16a34a' },
  { value: 'CLEARANCE', label: '清仓', color: '#b45309' },
  { value: 'STOPPED',   label: '停售', color: '#6b7280' },
]

// ── 校验规则 ──────────────────────────────────────────────────────────
const rules = {
  productName: [{ required: true, message: '品名为必填项', trigger: 'blur' }],
  skuCode: [
    { required: true, message: 'SKU 编码为必填项', trigger: 'blur' },
    {
      validator: (_, v, cb) => {
        if (!v) return cb()
        if (/[\u4e00-\u9fa5]/.test(v)) return cb(new Error('SKU 编码不允许含中文字符'))
        if (!/^[a-zA-Z0-9_\-\.#]+$/.test(v))
          return cb(new Error('只允许字母、数字及 _ - . # 字符'))
        cb()
      },
      trigger: 'blur',
    },
  ],
  status: [{ required: true, message: '状态为必填项', trigger: 'change' }],
}

// ── 沿用老品 ─────────────────────────────────────────────────────────
const copyDialogVisible = ref(false)
const copySkuInput      = ref('')

function doCopyFrom() {
  if (!copySkuInput.value.trim()) { ElMessage.warning('请输入老品 SKU'); return }
  // Mock 填充：实际项目应调接口按 SKU 查询返回老品数据
  Object.assign(form, {
    productName:  '(沿用) 复古棉质圆领 T 恤',
    categoryName: '服装',
    brandName:    'EasyWear',
    developer:    'current',
    status:       'ACTIVE',
    model:        'EW-TEE-V2',
    unit:         'PCS',
    material:     '100% 棉',
    tags:         ['亚马逊FBA', '爆款'],
  })
  copyDialogVisible.value = false
  copySkuInput.value      = ''
  ElMessage.success('已沿用老品信息，图片与 SKU 编码需重新填写')
}

// ── 提交逻辑 ──────────────────────────────────────────────────────────
const saving = ref(false)

async function doSave() {
  await formRef.value.validate()
  saving.value = true
  await new Promise((r) => setTimeout(r, 300))
  const payload = {
    ...form,
    mainImageUrl: mainImageUrl.value,
    bundleItems:  form.productType === 'BUNDLE'
      ? bundleItems.value.filter((r) => r.skuCode?.trim())
      : [],
  }
  emit('saved', payload)
  saving.value = false
  return payload
}

async function saveAndContinue() {
  try {
    await doSave()
    ElMessage.success('保存成功，表单已重置，可继续录入')
    Object.assign(form, defaultForm())
    bundleItems.value = [{ skuCode: '', skuName: '', quantity: 1 }]
    imageUrlDraft.value = ''
    await nextTick()
    formRef.value?.clearValidate()
  } catch { /* 校验失败已由 el-form 提示 */ }
}

async function saveAndCreate() {
  try {
    await doSave()
    ElMessage.success('单品创建成功')
    emit('update:modelValue', false)
    Object.assign(form, defaultForm())
    bundleItems.value = [{ skuCode: '', skuName: '', quantity: 1 }]
  } catch { /* 校验失败已由 el-form 提示 */ }
}

function handleClose() { emit('update:modelValue', false) }
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    width="900px"
    :before-close="handleClose"
    class="sku-create-dialog"
    destroy-on-close
    align-center
  >
    <!-- ── 标题栏 ── -->
    <template #header>
      <div class="sdlg-header">
        <span class="sdlg-title">添加单个商品</span>
        <el-button size="small" plain @click="copyDialogVisible = true">
          📋 沿用老品
        </el-button>
      </div>
    </template>

    <!-- ── 表单主体 ── -->
    <div class="sdlg-body">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="small"
        class="sdlg-form"
      >

        <!-- ════ 媒体区域 ════ -->
        <div class="media-section">
          <!-- 主图大预览 -->
          <div class="main-preview">
            <img v-if="mainImageUrl" :src="mainImageUrl" alt="主图" class="main-img" />
            <div v-else class="main-placeholder">
              <span class="placeholder-icon">🖼️</span>
              <span class="placeholder-text">主图</span>
            </div>
          </div>

          <!-- 右侧：缩略图条 + 上传控件 -->
          <div class="media-controls">
            <!-- 缩略图条 -->
            <div class="thumb-strip">
              <div
                v-for="(img, i) in form.images"
                :key="i"
                class="thumb-item"
                :class="{ 'is-main': i === form.mainImageIndex }"
                @mouseenter="hoveredThumb = i"
                @mouseleave="hoveredThumb = null"
              >
                <img :src="img.url" :alt="img.name" />
                <!-- 悬浮操作层 -->
                <div v-show="hoveredThumb === i" class="thumb-overlay">
                  <span class="thumb-action" @click.stop="setMainImage(i)">设主图</span>
                  <span class="thumb-action danger" @click.stop="removeImage(i)">✕</span>
                </div>
                <!-- 主图角标 -->
                <div v-if="i === form.mainImageIndex" class="thumb-badge">主</div>
              </div>

              <!-- 添加占位格 -->
              <div class="thumb-add" @click="triggerFileUpload">
                <Plus style="width:14px;height:14px;color:#9ca3af" />
                <span>上传</span>
              </div>
            </div>

            <!-- URL 输入行 -->
            <div class="url-row">
              <el-input
                v-model="imageUrlDraft"
                placeholder="粘贴图片 URL 快速添加..."
                clearable
                @keyup.enter="addImageByUrl"
              />
              <el-button plain type="primary" @click="addImageByUrl">添加链接</el-button>
            </div>

            <div class="media-tip">
              图片建议 1:1 白底；悬浮缩略图可设为主图或删除
            </div>
          </div>
        </div>

        <!-- 隐藏文件输入 -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          style="display:none"
          @change="onFileChange"
        />

        <!-- ════ 身份标识 ════ -->
        <div class="section-divider">
          <span class="section-divider-label">身份标识</span>
        </div>

        <el-row :gutter="20">
          <!-- 品名 -->
          <el-col :span="12">
            <el-form-item label="品名" prop="productName">
              <el-input v-model="form.productName" placeholder="产品内部识别名称（必填）" clearable />
            </el-form-item>
          </el-col>

          <!-- SKU 编码 -->
          <el-col :span="12">
            <el-form-item label="SKU 编码" prop="skuCode">
              <div class="input-addon">
                <el-input
                  v-model="form.skuCode"
                  placeholder="字母/数字/_ - . #（必填）"
                  clearable
                  style="flex:1"
                />
                <el-button type="primary" plain @click="generateSku">自动生成</el-button>
              </div>
              <div class="field-hint">只允许 A-Z a-z 0-9 _ - . # ，不可含中文</div>
            </el-form-item>
          </el-col>

          <!-- 产品类型 -->
          <el-col :span="12">
            <el-form-item label="产品类型" prop="productType">
              <el-select v-model="form.productType" style="width:100%">
                <el-option value="NORMAL" label="普通产品" />
                <el-option value="BUNDLE" label="组合产品" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 识别码 -->
          <el-col :span="12">
            <el-form-item label="识别码（69码 / ISBN / IMEI）">
              <el-input v-model="form.barcode" placeholder="选填" clearable />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 组合产品：子单品列表（条件展示） -->
        <transition name="bundle-fade">
          <div v-if="form.productType === 'BUNDLE'" class="bundle-panel">
            <div class="bundle-panel-head">
              <span class="bundle-panel-title">📦 包含子单品</span>
              <el-button size="small" @click="addBundleItem">+ 添加子单品</el-button>
            </div>
            <el-table :data="bundleItems" border size="small" class="bundle-table">
              <el-table-column label="子 SKU 编码" min-width="160">
                <template #default="{ row }">
                  <el-input v-model="row.skuCode" size="small" placeholder="必填" />
                </template>
              </el-table-column>
              <el-table-column label="子品名" min-width="140">
                <template #default="{ row }">
                  <el-input v-model="row.skuName" size="small" placeholder="选填" />
                </template>
              </el-table-column>
              <el-table-column label="数量" width="120">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.quantity"
                    :min="1"
                    :max="999"
                    size="small"
                    controls-position="right"
                    style="width:100%"
                  />
                </template>
              </el-table-column>
              <el-table-column width="48" align="center">
                <template #default="{ $index }">
                  <el-button type="danger" link size="small" @click="removeBundleItem($index)">✕</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </transition>

        <!-- ════ 属性配置 ════ -->
        <div class="section-divider">
          <span class="section-divider-label">属性配置</span>
        </div>

        <el-row :gutter="20">
          <!-- 状态 -->
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width:100%">
                <el-option
                  v-for="o in STATUS_OPTIONS"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                >
                  <span class="status-option">
                    <span class="status-dot" :style="{ background: o.color }" />
                    {{ o.label }}
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 分类 -->
          <el-col :span="8">
            <el-form-item label="产品分类">
              <el-select
                v-model="form.categoryName"
                filterable
                remote
                :remote-method="searchCategories"
                :loading="catLoading"
                allow-create
                placeholder="搜索或输入"
                style="width:100%"
              >
                <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 品牌 -->
          <el-col :span="8">
            <el-form-item label="品牌">
              <el-select
                v-model="form.brandName"
                filterable
                remote
                :remote-method="searchBrands"
                :loading="brandLoading"
                allow-create
                placeholder="搜索或输入"
                style="width:100%"
              >
                <el-option v-for="b in brandOptions" :key="b" :label="b" :value="b" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 开发人员 -->
          <el-col :span="8">
            <el-form-item label="开发人员">
              <el-select v-model="form.developer" style="width:100%">
                <el-option v-for="s in STAFF_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 产品负责人（多选） -->
          <el-col :span="8">
            <el-form-item label="产品负责人">
              <el-select
                v-model="form.owners"
                multiple
                collapse-tags
                :collapse-tags-tooltip="true"
                placeholder="多选"
                style="width:100%"
              >
                <el-option v-for="s in STAFF_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 查看人（多选） -->
          <el-col :span="8">
            <el-form-item label="查看人">
              <el-select
                v-model="form.viewers"
                multiple
                collapse-tags
                :collapse-tags-tooltip="true"
                placeholder="多选"
                style="width:100%"
              >
                <el-option v-for="s in STAFF_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 1688 采购来源 -->
          <el-col :span="24">
            <el-form-item label="1688 采购来源链接">
              <el-input
                v-model="form.sourceUrl1688"
                placeholder="https://detail.1688.com/..."
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ════ 详细规格 ════ -->
        <div class="section-divider">
          <span class="section-divider-label">详细规格</span>
        </div>

        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="型号">
              <el-input v-model="form.model" placeholder="如 EW-V2" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="单位">
              <el-input v-model="form.unit" placeholder="PCS / 套 / 包" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材质">
              <el-input v-model="form.material" placeholder="如 100% 棉 / ABS 塑料" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="产品标签">
              <el-select
                v-model="form.tags"
                multiple
                filterable
                allow-create
                collapse-tags
                :collapse-tags-tooltip="true"
                placeholder="选择已有标签或直接输入自定义标签"
                style="width:100%"
              >
                <el-option v-for="t in TAG_OPTIONS" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

      </el-form>
    </div>

    <!-- ── 底部固定操作栏 ── -->
    <template #footer>
      <div class="sdlg-footer">
        <el-button @click="handleClose">取消</el-button>
        <div class="sdlg-footer-actions">
          <el-button :loading="saving" @click="saveAndContinue">
            保存并继续添加
          </el-button>
          <el-button type="primary" :loading="saving" @click="saveAndCreate">
            保存并创建
          </el-button>
        </div>
      </div>
    </template>

    <!-- ── 沿用老品对话框 ── -->
    <el-dialog
      v-model="copyDialogVisible"
      title="沿用老品"
      width="400px"
      append-to-body
      align-center
    >
      <p class="copy-tip">
        输入已有产品的 SKU 编码，系统将自动填充该产品的属性信息。<br />
        <span style="color:#ef4444">图片与 SKU 编码需重新填写。</span>
      </p>
      <el-input
        v-model="copySkuInput"
        placeholder="输入老品 SKU 编码，如 EW2501001"
        clearable
        @keyup.enter="doCopyFrom"
      />
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doCopyFrom">确认沿用</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<style scoped>
/* ── 对话框整体 ── */
:deep(.el-dialog) {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .15);
}
:deep(.el-dialog__header) {
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf0;
  margin-bottom: 0;
}
:deep(.el-dialog__body) {
  padding: 0;
}
:deep(.el-dialog__footer) {
  padding: 12px 24px;
  border-top: 1px solid #e8ecf0;
}

/* ── 标题栏 ── */
.sdlg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sdlg-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

/* ── 表单主体（可滚动） ── */
.sdlg-body {
  max-height: 72vh;
  overflow-y: auto;
  padding: 20px 28px 8px;
  scrollbar-gutter: stable;
}
.sdlg-form :deep(.el-form-item__label) {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  line-height: 1.4;
  padding-bottom: 4px;
}
.sdlg-form :deep(.el-form-item) { margin-bottom: 14px; }

/* ── 媒体区域 ── */
.media-section {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding: 16px;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  margin-bottom: 8px;
}

/* 主图预览 */
.main-preview {
  width: 148px;
  height: 148px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
  background: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.main-img { width: 100%; height: 100%; object-fit: contain; }
.main-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.placeholder-icon { font-size: 28px; opacity: .35; }
.placeholder-text { font-size: 12px; color: #9ca3af; }

/* 右侧控件区 */
.media-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 缩略图条 */
.thumb-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.thumb-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 1.5px solid #e8ecf0;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}
.thumb-item.is-main { border-color: #3b82f6; }
.thumb-item img { width: 100%; height: 100%; object-fit: cover; }

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .52);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.thumb-action {
  font-size: 11px;
  color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(255,255,255,.15);
  cursor: pointer;
  white-space: nowrap;
  transition: background .1s;
}
.thumb-action:hover { background: rgba(255,255,255,.3); }
.thumb-action.danger:hover { background: rgba(239,68,68,.7); }

.thumb-badge {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: #3b82f6;
  padding: 1px 4px;
  border-radius: 3px;
  line-height: 1.4;
}

.thumb-add {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 1.5px dashed #d1d5db;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  color: #9ca3af;
  font-size: 11px;
  flex-shrink: 0;
  transition: border-color .15s, color .15s;
}
.thumb-add:hover { border-color: #3b82f6; color: #3b82f6; }

.url-row { display: flex; gap: 8px; align-items: center; }
.url-row .el-input { flex: 1; }
.media-tip { font-size: 11.5px; color: #9ca3af; line-height: 1.4; }

/* ── 自定义分隔标题（替代 el-divider 以保持视觉一致） ── */
.section-divider {
  display: flex;
  align-items: center;
  margin: 16px 0 12px;
  gap: 10px;
}
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e8ecf0;
}
.section-divider-label {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 3px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

/* ── 带按钮的输入框 ── */
.input-addon {
  display: flex;
  gap: 6px;
  align-items: center;
}
.field-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 3px;
  line-height: 1.3;
}

/* ── 状态选项内联样式 ── */
.status-option {
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── 组合产品子单品面板 ── */
.bundle-panel {
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fafbff;
  margin: -4px 0 12px;
}
.bundle-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.bundle-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.bundle-table :deep(.el-table__cell) { border-right: none !important; }
.bundle-table :deep(.el-table td.el-table__cell) { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
.bundle-table :deep(.el-table th.el-table__cell) {
  background: #f5f7fa !important;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 8px;
  border-bottom: 1px solid #e8ecf0 !important;
}

/* 组合产品面板展开动画 */
.bundle-fade-enter-active,
.bundle-fade-leave-active { transition: all .2s ease; }
.bundle-fade-enter-from,
.bundle-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── 底部操作栏 ── */
.sdlg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sdlg-footer-actions {
  display: flex;
  gap: 10px;
}

/* ── 沿用老品提示文字 ── */
.copy-tip {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 14px;
  line-height: 1.7;
}
</style>
