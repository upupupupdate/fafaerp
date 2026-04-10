<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { useCategoryStore } from '@/features/product/useCategoryStore.js'
import {
  buildCategoryPathLabel,
  MAX_SITE_TAGS_IN_CELL,
} from '@/features/product/categoryMock.js'
import CategoryLeafDialog from '@/views/product/CategoryLeafDialog.vue'
import CategorySiteTop3Table from '@/views/product/CategorySiteTop3Table.vue'

const store = useCategoryStore()

/** 表单里「无父级」用空串，提交时转为 null */
const PARENT_ROOT = ''

const treeRef = ref(null)
const treeFilterText = ref('')
const filterName = ref('')
const filterStatus = ref('')

const currentPage = ref(1)
const pageSize = ref(20)

watch(treeFilterText, (val) => {
  treeRef.value?.filter(val)
})

function filterTreeNode(value, data) {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase())
    || data.code.toLowerCase().includes(value.toLowerCase())
}

function onTreeNodeClick(data) {
  store.selectedTreeNodeId.value = data.id
  currentPage.value = 1
}

function clearTreeSelection() {
  store.selectedTreeNodeId.value = null
  treeRef.value?.setCurrentKey(null)
  currentPage.value = 1
}

const filteredLeaves = computed(() => {
  let rows = store.leavesInScope.value
  const n = filterName.value.trim().toLowerCase()
  if (n) {
    rows = rows.filter((r) =>
      (r.name || '').toLowerCase().includes(n)
      || (r.code || '').toLowerCase().includes(n)
      || (r.description || '').toLowerCase().includes(n),
    )
  }
  if (filterStatus.value === 'on') rows = rows.filter((r) => r.status)
  if (filterStatus.value === 'off') rows = rows.filter((r) => !r.status)
  rows = [...rows].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  )
  return rows
})

/** 站点 Tag 展示：前 N 个 + 其余进「+K」 */
function siteTagsSlice(row) {
  const list = row.siteMappings?.length ? row.siteMappings : []
  return {
    visible: list.slice(0, MAX_SITE_TAGS_IN_CELL),
    hidden: list.slice(MAX_SITE_TAGS_IN_CELL),
    all: list,
  }
}

const leafDialogVisible = ref(false)
const leafDialogCategoryId = ref('')
/** @type {import('vue').Ref<'basic'|'mapping'>} */
const leafDialogInitialMainTab = ref('basic')
const leafDialogInitialSite = ref('')

function openLeafDialog(row, opts = {}) {
  const main = opts.mainTab === 'mapping' ? 'mapping' : 'basic'
  leafDialogCategoryId.value = row.id
  leafDialogInitialMainTab.value = main
  leafDialogInitialSite.value = opts.site || ''
  leafDialogVisible.value = true
}

function openMappingDrawer(row, site = '') {
  openLeafDialog(row, { mainTab: 'mapping', site: site || '' })
}

const totalFiltered = computed(() => filteredLeaves.value.length)

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredLeaves.value.slice(start, start + pageSize.value)
})

watch([filterName, filterStatus, () => store.selectedTreeNodeId.value], () => {
  currentPage.value = 1
})

const addDialogVisible = ref(false)
const addFormRef = ref(null)
const addForm = ref({
  parentId: PARENT_ROOT,
  code: '',
  name: '',
  description: '',
})

const parentSelectOptions = computed(() => {
  const root = { value: PARENT_ROOT, label: '（一级品类 / 无父级）' }
  const candidates = store.flat.value.filter((n) => !n.isLeaf && n.level < 5)
  const opts = candidates.map((n) => ({
    value: n.id,
    label: buildCategoryPathLabel(store.flat.value, n.id),
  }))
  opts.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
  return [root, ...opts]
})

const newLevelPreview = computed(() => {
  const pid = addForm.value.parentId ?? PARENT_ROOT
  if (pid === PARENT_ROOT || pid === '') return 1
  const p = store.getById(pid)
  return p ? p.level + 1 : 1
})

const addRules = {
  code: [{ required: true, message: '请输入品类编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入品类名称', trigger: 'blur' }],
}

function openAddDialog() {
  let parentId = PARENT_ROOT
  const sel = store.selectedTreeNodeId.value
  if (sel) {
    const n = store.getById(sel)
    if (n && !n.isLeaf && n.level < 5) parentId = sel
  }
  addForm.value = {
    parentId,
    code: '',
    name: '',
    description: '',
  }
  addDialogVisible.value = true
  nextTick(() => addFormRef.value?.clearValidate?.())
}

async function submitAddCategory() {
  const form = addFormRef.value
  if (form) {
    try {
      await form.validate()
    } catch {
      return
    }
  }
  const pid = addForm.value.parentId ?? PARENT_ROOT
  const parentId = pid === PARENT_ROOT || pid === '' ? null : pid
  let level = 1
  if (parentId != null) {
    const p = store.getById(parentId)
    level = p ? p.level + 1 : 1
  }
  const asLeaf = level === 5
  const res = store.addCategory({
    parentId,
    code: addForm.value.code,
    name: addForm.value.name,
    description: addForm.value.description,
    asLeaf,
  })
  if (!res.ok) {
    ElMessage.error(res.message)
    return
  }
  ElMessage.success('已新增品类')
  addDialogVisible.value = false
  nextTick(() => {
    treeRef.value?.setCurrentKey(res.id)
    store.selectedTreeNodeId.value = res.id
  })
}

function onImportPerf() {
  ElMessage.info('导入品类绩效占比：对接后端后支持')
}

function onEdit(row) {
  openLeafDialog(row, { mainTab: 'basic' })
}

function onStatusChange(row, val) {
  store.patchLeaf(row.id, { status: val })
}

const tableIndexBase = computed(() => (currentPage.value - 1) * pageSize.value)

</script>

<template>
  <div class="category-mgmt">
    <header class="cm-header">
      <h1 class="cm-title">品类管理</h1>
    </header>

    <div class="cm-body">
      <aside class="cm-aside">
        <div class="cm-aside-head">
          <span class="cm-aside-title">所有品类</span>
          <el-button type="primary" link size="small" @click="clearTreeSelection">
            全部末级
          </el-button>
        </div>
        <el-input
          v-model="treeFilterText"
          placeholder="筛选树节点"
          clearable
          size="small"
          class="cm-tree-filter"
        />
        <el-tree
          ref="treeRef"
          class="cm-tree"
          :data="store.treeData"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          highlight-current
          default-expand-all
          :filter-node-method="filterTreeNode"
          @node-click="onTreeNodeClick"
        >
          <template #default="{ data }">
            <span class="cm-tree-row">
              <span class="cm-tree-name" :title="data.code">{{ data.name }}</span>
            </span>
          </template>
        </el-tree>
      </aside>

      <main class="cm-main">
        <div class="cm-toolbar">
          <div class="cm-filters">
            <el-input
              v-model="filterName"
              placeholder="品名 / 编码 / 描述"
              clearable
              style="width: 200px"
              size="default"
            />
            <el-select
              v-model="filterStatus"
              placeholder="状态"
              clearable
              style="width: 110px"
              size="default"
            >
              <el-option label="启用" value="on" />
              <el-option label="停用" value="off" />
            </el-select>
            <el-button type="primary" size="default">
              查询
            </el-button>
          </div>
          <div class="cm-actions">
            <el-button type="primary" @click="openAddDialog">
              添加品类
            </el-button>
            <el-button @click="onImportPerf">
              导入品类绩效占比
            </el-button>
          </div>
        </div>

        <div class="cm-table-wrap">
          <el-table
            :data="pagedRows"
            border
            stripe
            size="default"
            class="cm-table cm-table-main"
            empty-text="当前树下无末级数据或筛选结果为空"
          >
            <el-table-column type="selection" width="42" fixed />
            <el-table-column label="序号" width="52" fixed align="center">
              <template #default="{ $index }">
                {{ tableIndexBase + $index + 1 }}
              </template>
            </el-table-column>
            <el-table-column
              label="品类名称"
              prop="name"
              min-width="120"
              fixed
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span class="cm-cell-name">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="编码"
              prop="code"
              min-width="140"
              fixed
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span class="cm-cell-code">{{ row.code }}</span>
              </template>
            </el-table-column>
            <el-table-column label="描述" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="cm-desc-ellipsis">{{ row.description || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="72" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status"
                  @update:model-value="(v) => onStatusChange(row, v)"
                />
              </template>
            </el-table-column>
            <el-table-column min-width="288" align="left">
              <template #header>
                <span class="cm-col-head">
                  <span>亚马逊类目 TOP3 · 站点</span>
                  <el-tooltip placement="top" effect="dark">
                    <template #content>
                      <div class="cm-site-col-tip">
                        展示本末级品类在各亚马逊站点（US / CA / UK / DE）映射的 Browse Node 与 TOP3 类目；
                        含上架 SKU 数、品类产品总数、占比等。悬停站点标签可快速预览该站点映射表；
                        完整编辑请在「编辑」→「Amazon 映射」中进行。
                      </div>
                    </template>
                    <el-icon class="cm-help-icon" :size="15">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </template>
              <template #default="{ row }">
                <div v-if="siteTagsSlice(row).all.length" class="cm-site-tags">
                  <el-popover
                    v-for="m in siteTagsSlice(row).visible"
                    :key="m.site"
                    placement="top"
                    :width="1000"
                    trigger="hover"
                  >
                    <template #reference>
                      <el-tag
                        :type="m.mapped ? 'success' : 'info'"
                        size="small"
                        effect="plain"
                        class="cm-site-tag"
                        @click.stop="openMappingDrawer(row, m.site)"
                      >
                        {{ m.site }}
                      </el-tag>
                    </template>
                    <div class="cm-pop-table-wrap">
                      <div class="cm-pop-table-head">
                        站点 {{ m.site }}
                      </div>
                      <CategorySiteTop3Table
                        :mapped="m.mapped"
                        :rows="m.top3 || []"
                        :editable="false"
                      />
                    </div>
                  </el-popover>
                  <el-popover
                    v-if="siteTagsSlice(row).hidden.length"
                    placement="bottom"
                    :width="1000"
                    trigger="click"
                  >
                    <template #reference>
                      <el-tag type="info" size="small" effect="plain" class="cm-site-tag cm-site-more">
                        +{{ siteTagsSlice(row).hidden.length }}
                      </el-tag>
                    </template>
                    <div class="cm-site-pop-all">
                      <div
                        v-for="m in siteTagsSlice(row).hidden"
                        :key="m.site"
                        class="cm-site-pop-block"
                      >
                        <el-popover placement="left" :width="1000" trigger="hover">
                          <template #reference>
                            <div class="cm-site-pop-row">
                              <el-tag
                                :type="m.mapped ? 'success' : 'info'"
                                size="small"
                                effect="plain"
                                @click.stop="openMappingDrawer(row, m.site)"
                              >
                                {{ m.site }}
                              </el-tag>
                              <span class="cm-site-pop-meta">{{ m.mapped ? '已映射' : '未配置' }}</span>
                            </div>
                          </template>
                          <div class="cm-pop-table-wrap">
                            <div class="cm-pop-table-head">
                              站点 {{ m.site }}
                            </div>
                            <CategorySiteTop3Table
                              :mapped="m.mapped"
                              :rows="m.top3 || []"
                              :editable="false"
                            />
                          </div>
                        </el-popover>
                      </div>
                    </div>
                  </el-popover>
                </div>
                <span v-else class="cm-dash">—</span>
              </template>
            </el-table-column>
            <el-table-column label="添加时间" width="156" align="center">
              <template #default="{ row }">
                <span class="cm-time">{{ row.createdAt || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="平面设计折算系数" width="132" align="right" header-align="right">
              <template #default="{ row }">
                <span class="cm-num">{{ row.graphicCoeff ?? '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="摄影折算系数" width="112" align="right" header-align="right">
              <template #default="{ row }">
                <span class="cm-num">{{ row.photoCoeff ?? '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="primary" link @click="onEdit(row)">
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="cm-pagination">
          <span class="cm-total">共 {{ totalFiltered }} 条数据</span>
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="totalFiltered"
            :page-sizes="[10, 20, 50, 100]"
            layout="sizes, prev, pager, next"
            background
          />
        </div>
      </main>
    </div>

    <CategoryLeafDialog
      v-model="leafDialogVisible"
      :category-id="leafDialogCategoryId"
      :initial-main-tab="leafDialogInitialMainTab"
      :initial-site="leafDialogInitialSite"
    />

    <el-dialog
      v-model="addDialogVisible"
      title="新增品类"
      width="520px"
      destroy-on-close
      class="cm-add-dialog"
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        label-width="112px"
        size="default"
      >
        <el-form-item label="父级品类" prop="parentId">
          <el-select
            v-model="addForm.parentId"
            placeholder="选择父级（可选一级）"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="opt in parentSelectOptions"
              :key="opt.value || '__root__'"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <div class="cm-form-hint">
            最多 5 级；仅可在<strong>非末级</strong>节点下新增子类。当前将落在第 <strong>{{ newLevelPreview }}</strong> 级；<strong>第 5 级自动为末级</strong>（可维护系数与 Amazon 映射），第 1～4 级为中间分类。
          </div>
        </el-form-item>
        <el-form-item label="品类编码" prop="code">
          <el-input v-model="addForm.code" placeholder="同级唯一编码" clearable maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="品类名称" prop="name">
          <el-input v-model="addForm.name" placeholder="显示名称" clearable maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="addForm.description"
            type="textarea"
            placeholder="选填"
            :rows="2"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddCategory">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.category-mgmt {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 16px 20px 20px;
  box-sizing: border-box;
  background: #f5f7fa;
}
.cm-header {
  flex-shrink: 0;
  margin-bottom: 14px;
}
.cm-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.cm-col-head {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  vertical-align: middle;
}
.cm-help-icon {
  cursor: help;
  color: #909399;
  flex-shrink: 0;
}
.cm-help-icon:hover {
  color: #409eff;
}
.cm-site-col-tip {
  max-width: 320px;
  line-height: 1.5;
  font-size: 13px;
}
.cm-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
  align-items: stretch;
}
.cm-aside {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 12px;
  min-height: 0;
}
.cm-aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.cm-aside-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.cm-tree-filter {
  margin-bottom: 8px;
}
.cm-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-size: 13px;
}
.cm-tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding-right: 2px;
  box-sizing: border-box;
}
.cm-tree-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #303133;
}
.cm-tree :deep(.el-tree-node__content) {
  height: auto;
  min-height: 28px;
  padding-top: 2px;
  padding-bottom: 2px;
}
.cm-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 12px 16px 16px;
  min-height: 0;
}
.cm-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.cm-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.cm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cm-table-wrap {
  flex: 1;
  min-height: 200px;
  overflow: auto;
}
.cm-table {
  width: 100%;
}
.cm-table-main :deep(.el-table__header th) {
  font-size: 12px;
  color: #606266;
  font-weight: 600;
}
.cm-cell-name {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}
.cm-cell-code {
  font-size: 12px;
  color: #606266;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
}
.cm-desc-ellipsis {
  color: #606266;
  font-size: 13px;
}
.cm-pop-table-wrap {
  min-width: 0;
  max-width: 100%;
}
.cm-pop-table-head {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.cm-site-pop-block {
  margin-bottom: 8px;
}
.cm-site-pop-block:last-child {
  margin-bottom: 0;
}
.cm-time {
  font-size: 12px;
  color: #606266;
  font-variant-numeric: tabular-nums;
}
.cm-num {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.cm-dash {
  color: #c0c4cc;
}
.cm-site-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  line-height: 1.35;
}
.cm-site-tag {
  cursor: pointer;
}
.cm-site-more {
  cursor: default;
}
.cm-site-pop-all {
  font-size: 12px;
}
.cm-site-pop-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.cm-site-pop-row:last-child {
  margin-bottom: 0;
}
.cm-site-pop-meta {
  color: #909399;
}
.cm-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
}
.cm-total {
  font-size: 13px;
  color: #606266;
  margin-right: auto;
}
.cm-form-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.45;
  margin-top: 6px;
}
.cm-form-hint.inline {
  margin-top: 0;
  margin-left: 8px;
  flex: 1;
  min-width: 0;
}
</style>
