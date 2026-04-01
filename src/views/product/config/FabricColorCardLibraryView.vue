<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFabricColorCardStore, fabricCardDisplayName } from '@/features/product/useFabricColorCardStore.js'

const { list, add, update, remove } = useFabricColorCardStore()

const keyword = ref('')
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return list.value
  return list.value.filter(c => fabricCardDisplayName(c).toLowerCase().includes(k))
})

const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({
  fabricName: '',
  model: '',
  composition: '',
  width: '',
  weightGsm: '',
  meters: '',
  colors: [{ zh: '', en: '', code: '' }],
})

function openAdd() {
  editingId.value = null
  form.value = {
    fabricName: '',
    model: '',
    composition: '',
    width: '',
    weightGsm: '',
    meters: '',
    colors: [{ zh: '', en: '', code: '' }],
  }
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = {
    fabricName: row.fabricName,
    model: row.model,
    composition: row.composition,
    width: row.width,
    weightGsm: row.weightGsm,
    meters: row.meters ?? row.yarnCount ?? '',
    colors: row.colors?.length ? JSON.parse(JSON.stringify(row.colors)) : [{ zh: '', en: '', code: '' }],
  }
  dialogVisible.value = true
}

function addColorRow() {
  form.value.colors.push({ zh: '', en: '', code: '' })
}

function removeColorRow(i) {
  if (form.value.colors.length <= 1) return
  form.value.colors.splice(i, 1)
}

function saveForm() {
  if (!form.value.fabricName?.trim()) {
    ElMessage.warning('请填写面料名')
    return
  }
  const colors = form.value.colors.filter(c => c.zh?.trim() || c.code?.trim())
  if (!colors.length) {
    ElMessage.warning('请至少维护一行颜色')
    return
  }
  const payload = {
    fabricName: form.value.fabricName.trim(),
    model: form.value.model?.trim() ?? '',
    composition: form.value.composition?.trim() ?? '',
    width: form.value.width?.trim() ?? '',
    weightGsm: form.value.weightGsm?.trim() ?? '',
    meters: form.value.meters?.trim() ?? '',
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
  ElMessageBox.confirm(`确认删除该面料色卡？`, '提示', { type: 'warning' })
    .then(() => {
      remove(row.id)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function placeholderImport() {
  ElMessage.info('导入模板与解析逻辑可后续对接；当前请使用「添加」维护')
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
        <span class="tip">配置保存在本地浏览器，新品开发「样板信息」将引用此处数据</span>
      </div>
    </header>

    <div class="fc-body">
      <div class="fc-toolbar">
        <el-input v-model="keyword" placeholder="搜索色卡名称/面料关键词" clearable style="width: 280px" />
        <el-button type="primary" @click="openAdd">添加</el-button>
        <el-button @click="placeholderImport">导入</el-button>
      </div>

      <el-table :data="filtered" border stripe row-key="id">
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-table :data="row.colors" border size="small" class="inner-table">
              <el-table-column prop="zh" label="颜色名称（中）" min-width="120" />
              <el-table-column prop="en" label="颜色名称（英）" min-width="120" />
              <el-table-column prop="code" label="属性编码" width="100" />
            </el-table>
          </template>
        </el-table-column>
        <el-table-column label="面料色卡名称" min-width="320">
          <template #default="{ row }">{{ fabricCardDisplayName(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="delRow(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑面料色卡' : '新增面料色卡'"
      width="720px"
      destroy-on-close
    >
      <el-form label-width="100px">
        <div class="form-section-title">面料基础信息</div>
        <el-form-item label="面料名" required>
          <el-input v-model="form.fabricName" placeholder="必填" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="面料型号"><el-input v-model="form.model" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="成分"><el-input v-model="form.composition" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="幅宽"><el-input v-model="form.width" placeholder="如 150cm" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="克重"><el-input v-model="form.weightGsm" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="米数"><el-input v-model="form.meters" placeholder="如单卷米数" /></el-form-item></el-col>
        </el-row>

        <div class="form-section-title">颜色明细</div>
        <div v-for="(col, i) in form.colors" :key="i" class="color-row">
          <el-input v-model="col.zh" placeholder="中文" style="width: 140px" />
          <el-input v-model="col.en" placeholder="英文" style="width: 140px" />
          <el-input v-model="col.code" placeholder="编码" style="width: 100px" />
          <el-button v-if="form.colors.length > 1" link type="danger" @click="removeColorRow(i)">删</el-button>
        </div>
        <el-button size="small" @click="addColorRow">+ 添加颜色</el-button>
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
}
.inner-table {
  margin: 4px 0 8px 24px;
  max-width: 640px;
}
.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 8px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}
.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
