<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSizeLibraryStore } from '@/features/product/useSizeLibraryStore.js'

const { list, add, update, remove } = useSizeLibraryStore()

const keyword = ref('')
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return list.value
  return list.value.filter(
    c =>
      (c.name || '').toLowerCase().includes(k) ||
      (c.category || '').toLowerCase().includes(k),
  )
})

const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({
  name: '',
  standard: 'US',
  audience: '',
  fit: '常规',
  category: '',
  sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  defaultPrintSize: 'L',
  specs: [{ name: '', method: '', tolerance: '', values: {} }],
})

function ensureSpecValues() {
  const sz = form.value.sizes
  for (const sp of form.value.specs) {
    if (!sp.values) sp.values = {}
    for (const s of sz) {
      if (sp.values[s] === undefined) sp.values[s] = ''
    }
    for (const k of Object.keys(sp.values)) {
      if (!sz.includes(k)) delete sp.values[k]
    }
  }
}

function openAdd() {
  editingId.value = null
  form.value = {
    name: '',
    standard: 'US',
    audience: '',
    fit: '常规',
    category: '',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    defaultPrintSize: 'L',
    specs: [{ name: '衣长', method: '领后中', tolerance: '±1', values: {} }],
  }
  ensureSpecValues()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = JSON.parse(JSON.stringify(row))
  if (!form.value.specs?.length) {
    form.value.specs = [{ name: '', method: '', tolerance: '', values: {} }]
  }
  ensureSpecValues()
  dialogVisible.value = true
}

function addSpecRow() {
  const row = { name: '', method: '', tolerance: '', values: {} }
  for (const s of form.value.sizes) {
    row.values[s] = ''
  }
  form.value.specs.push(row)
}

function removeSpecRow(i) {
  if (form.value.specs.length <= 1) return
  form.value.specs.splice(i, 1)
}

function onSizesChange() {
  ensureSpecValues()
}

function saveForm() {
  if (!form.value.name?.trim()) {
    ElMessage.warning('请填写尺码表名称')
    return
  }
  if (!form.value.sizes?.length) {
    ElMessage.warning('请至少包含一个尺码')
    return
  }
  const payload = {
    name: form.value.name.trim(),
    standard: form.value.standard,
    audience: form.value.audience?.trim() ?? '',
    fit: form.value.fit,
    category: form.value.category?.trim() ?? '',
    sizes: [...form.value.sizes],
    defaultPrintSize: form.value.defaultPrintSize,
    specs: form.value.specs
      .filter(s => s.name?.trim())
      .map(s => ({
        name: s.name.trim(),
        method: s.method?.trim() ?? '',
        tolerance: s.tolerance?.trim() ?? '',
        values: { ...s.values },
      })),
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
  ElMessageBox.confirm(`确认删除尺码表「${row.name}」？`, '提示', { type: 'warning' })
    .then(() => {
      remove(row.id)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function sizeInfoText(row) {
  return (row.sizes || []).join(', ')
}

function placeholderImport() {
  ElMessage.info('导入可后续对接；当前请使用「添加」维护')
}
</script>

<template>
  <div class="sz-page">
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>产品</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">尺码库</span>
      </div>
      <div class="header-right">
        <span class="tip">配置保存在本地；新品开发「样板信息」将引用尺码列</span>
      </div>
    </header>

    <div class="sz-body">
      <div class="sz-toolbar">
        <el-input v-model="keyword" placeholder="搜索尺码表名称/品类" clearable style="width: 280px" />
        <el-button type="primary" @click="openAdd">添加</el-button>
        <el-button @click="placeholderImport">导入</el-button>
      </div>

      <el-table :data="filtered" border stripe>
        <el-table-column prop="name" label="尺码表名称" min-width="180" />
        <el-table-column prop="standard" label="尺码标准" width="88" />
        <el-table-column prop="audience" label="人群" width="88" />
        <el-table-column prop="fit" label="版型" width="88" />
        <el-table-column prop="category" label="品类" width="120" />
        <el-table-column label="尺码信息" min-width="220">
          <template #default="{ row }">{{ sizeInfoText(row) }}</template>
        </el-table-column>
        <el-table-column prop="defaultPrintSize" label="默认打印尺码" width="120" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="delRow(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑尺码表' : '新增尺码表'" width="960px" top="4vh" destroy-on-close>
      <el-form label-width="110px">
        <div class="form-section-title">尺码信息</div>
        <el-form-item label="尺码表名称" required>
          <el-input v-model="form.name" placeholder="如 夏季男士常规T恤" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="人群">
              <el-input v-model="form.audience" placeholder="如 男士" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="品类">
              <el-input v-model="form.category" placeholder="如 短袖上衣" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="尺码标准">
              <el-select v-model="form.standard" style="width: 100%">
                <el-option label="US" value="US" />
                <el-option label="EU" value="EU" />
                <el-option label="CN" value="CN" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="版型">
          <el-radio-group v-model="form.fit">
            <el-radio value="常规">常规</el-radio>
            <el-radio value="偏胖">偏胖</el-radio>
            <el-radio value="合身">合身</el-radio>
            <el-radio value="修身">修身</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="尺码列">
          <el-select
            v-model="form.sizes"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入尺码，可多选"
            style="width: 100%"
            @change="onSizesChange"
          />
        </el-form-item>
        <el-form-item label="默认打印尺码">
          <el-select v-model="form.defaultPrintSize" placeholder="选择" style="width: 160px">
            <el-option v-for="s in form.sizes" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>

        <div class="form-section-title">尺码明细</div>
        <div class="spec-scroll">
          <table class="spec-table">
            <thead>
              <tr>
                <th>量体规格</th>
                <th>测量方法</th>
                <th v-for="s in form.sizes" :key="s">{{ s }}</th>
                <th>公差</th>
                <th width="56">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sp, i) in form.specs" :key="i">
                <td><el-input v-model="sp.name" size="small" placeholder="如 衣长" /></td>
                <td><el-input v-model="sp.method" size="small" placeholder="如 领后中" /></td>
                <td v-for="s in form.sizes" :key="s">
                  <el-input v-model="sp.values[s]" size="small" placeholder="—" />
                </td>
                <td><el-input v-model="sp.tolerance" size="small" placeholder="±1" /></td>
                <td>
                  <el-button v-if="form.specs.length > 1" link type="danger" size="small" @click="removeSpecRow(i)">删</el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <el-button size="small" @click="addSpecRow">+ 添加规格</el-button>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sz-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}
.sz-body {
  padding: 16px 20px 24px;
  flex: 1;
}
.sz-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.tip {
  font-size: 12px;
  color: #9ca3af;
}
.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 4px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}
.spec-scroll {
  overflow-x: auto;
  margin-bottom: 10px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.spec-table {
  border-collapse: collapse;
  font-size: 12px;
  min-width: 100%;
}
.spec-table th,
.spec-table td {
  border: 1px solid #ebeef5;
  padding: 4px 6px;
  vertical-align: middle;
}
.spec-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}
</style>
