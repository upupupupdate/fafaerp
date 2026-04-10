<script setup>
import '@/features/listing/listingTableColumns.css'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { ArrowDown, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { calcTransitionInfo } from '@/features/listing/listingTransitionSla.js'
import {
  LISTED_SALE_PANELS,
  SUB_NODES,
  STOCKING_FLOW_NODES,
  matchStatusPanelKey,
  resolveMainStatus,
} from '@/features/listing/listingDefs.js'
import { allListingProducts } from '@/features/listing/listingMockData.js'
import { loadListingLaunchedViews, saveListingLaunchedViews } from '@/features/listing/listingLaunchedViewsStorage.js'
import ListingFilterBar     from '@/features/listing/components/ListingFilterBar.vue'
import ListingNodeStatusBar from '@/features/listing/components/ListingNodeStatusBar.vue'
import ListingProductRow    from '@/features/listing/components/ListingProductRow.vue'
import ListingRegularTable  from '@/features/listing/components/ListingRegularTable.vue'
import ListingDetailDrawer  from '@/features/listing/components/ListingDetailDrawer.vue'
import PurchasePlanEditorDialog from '@/features/listing/components/PurchasePlanEditorDialog.vue'
import { isListingEligibleForPurchasePlan } from '@/features/listing/purchasePlanDraft.js'

const allProducts = allListingProducts

/** 开售商品：仅主状态为已开售 */
const launchedProductPool = computed(() =>
  allProducts.value.filter((p) => resolveMainStatus(p) === 'listed'),
)

// ── 页面状态 ──────────────────────────────────────────────────────────
const alertFilter = ref(null) // null | 'overdue' | 'warning'
const currentPage   = ref(1)
const PAGE_SIZE     = 50

// ── 筛选状态 ──────────────────────────────────────────────────────────
const searchField = ref('name')
const searchKeyword = ref('')
/** true：批量精准（多值与当前字段全等，OR）；false：模糊 + 引号全等 */
const searchBatchExact = ref(false)
const filterListing   = ref('')
const filterDesign    = ref('')
const filterShop      = ref([])
const filterBrand     = ref([])
const filterPType     = ref([])
const filterCategory  = ref([])
const filterScene     = ref([])
const filterSeason    = ref([])
const filterTimeField = ref('')
const filterDateRange = ref([])
/** 与面板多选一致：空表示不按状态条筛 */
const filterStatusKeys = ref([])
/** 列表排序：'' | auth_asc | auth_desc */
const listSort = ref('')
/** 授权方式筛选（占位，后续可对接字段） */
const filterAuthMode = ref('')
/** 更多筛选：人员 */
const filterStaffOps = ref([])
const filterStaffDev = ref([])
const filterStaffDesign = ref([])
const filterStaffPhoto = ref([])
const filterStaffPurchase = ref([])
/** 更多筛选：三态布尔 null=不限 */
const filterNeedShoot = ref(null)
const filterNeedSample = ref(null)
const filterHasParentPlan = ref(null)
/** null=不限 true=仅超时 false=仅非超时（与 transitionInfos 一致） */
const filterTimeout = ref(null)

const LIST_DISPLAY_LS = 'listing_launched_display_mode'
const listDisplayMode = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem(LIST_DISPLAY_LS) === 'regular'
    ? 'regular'
    : 'progress',
)

watch(listDisplayMode, (v) => {
  try {
    localStorage.setItem(LIST_DISPLAY_LS, v === 'regular' ? 'regular' : 'progress')
  } catch {
    /* ignore */
  }
})

const activeSubNode = computed({
  get: () => (filterStatusKeys.value.length === 1 ? filterStatusKeys.value[0] : null),
  set: v => {
    if (v == null || v === '') filterStatusKeys.value = []
    else filterStatusKeys.value = [v]
  },
})

// ── 系统视图（localStorage）────────────────────────────────────────────
const _viewsLoaded = loadListingLaunchedViews()
const savedViews = ref(_viewsLoaded.views)
const defaultViewId = ref(_viewsLoaded.defaultId)
const activeViewId = ref(null)
const viewSaveName = ref('')
const viewSaveDialog = ref(false)

watch(
  [searchKeyword, searchField, searchBatchExact, filterListing, filterDesign, filterShop, filterBrand,
   filterPType, filterCategory, filterScene, filterSeason, filterStatusKeys, alertFilter,
   filterTimeField, filterDateRange, listSort, filterAuthMode,
   filterStaffOps, filterStaffDev, filterStaffDesign, filterStaffPhoto, filterStaffPurchase,
   filterNeedShoot, filterNeedSample, filterHasParentPlan, filterTimeout],
  () => { currentPage.value = 1 },
)

/** 系统视图快照：旧版为单选字符串，现统一为多选数组 */
function normStrArr(v) {
  if (Array.isArray(v)) return v.filter(x => x != null && String(x).trim() !== '')
  if (v == null || v === '') return []
  return [String(v)]
}

function fieldValue(p, field) {
  switch (field) {
    case 'name': return p.nameCn ?? ''
    case 'sku': return p.sku ?? ''
    case 'msku': return p.msku ?? ''
    case 'asin': return p.asin ?? ''
    default: return p.nameCn ?? ''
  }
}

/** 多值分隔；批量精准：每段与当前字段全等（OR）；否则模糊 + 引号全等 */
function applySearchTokens(list) {
  const raw = searchKeyword.value.trim()
  if (!raw) return list
  const tokens = raw.split(/[\n,，;；]+/).map(t => t.trim()).filter(Boolean)
  return list.filter(p => {
    const fv = String(fieldValue(p, searchField.value))
    return tokens.some(tok => {
      if (searchBatchExact.value) {
        return fv.toLowerCase() === tok.toLowerCase()
      }
      const m = /^"(.+)"$/.exec(tok)
      if (m) return fv === m[1]
      return fv.toLowerCase().includes(tok.toLowerCase())
    })
  })
}

function timeFieldValue(p, field) {
  if (!field) return ''
  const t = p.timeline
  switch (field) {
    case 'authTime': return (p.authTime || '').slice(0, 10)
    case 'planTime': return (t?.[1]?.time || '').slice(0, 10)
    case 'poTime': return (t?.[3]?.time || '').slice(0, 10)
    case 'inboundTime': return (t?.[4]?.time || '').slice(0, 10)
    case 'sendTime': return (t?.[7]?.time || '').slice(0, 10)
    case 'inTransitTime': return (t?.[8]?.time || '').slice(0, 10)
    case 'launchTime': return (t?.[9]?.time || '').slice(0, 10)
    case 'listingUploadTime': return (p.listingUploadTime || '').slice(0, 10)
    default: return ''
  }
}

function applyTimeRange(list) {
  const field = filterTimeField.value
  const range = filterDateRange.value
  if (!field || !range || range.length !== 2) return list
  const [a, b] = range
  const start = a instanceof Date ? a.toISOString().slice(0, 10) : String(a).slice(0, 10)
  const end = b instanceof Date ? b.toISOString().slice(0, 10) : String(b).slice(0, 10)
  return list.filter(p => {
    const d = timeFieldValue(p, field)
    if (!d) return false
    return d >= start && d <= end
  })
}

function applyCommonFilters(list) {
  list = applySearchTokens(list)
  list = applyTimeRange(list)
  if (filterListing.value) list = list.filter(p => p.listingStatus === filterListing.value)
  if (filterDesign.value) list = list.filter(p => p.designStatus === filterDesign.value)
  if (filterShop.value.length) list = list.filter(p => filterShop.value.includes(p.shop))
  if (filterBrand.value.length) list = list.filter(p => filterBrand.value.includes(p.brand))
  if (filterPType.value.length) list = list.filter(p => filterPType.value.includes(p.productType))
  if (filterCategory.value.length) list = list.filter(p => filterCategory.value.includes(p.category))
  if (filterScene.value.length) list = list.filter(p => filterScene.value.includes(p.scene))
  if (filterSeason.value.length) list = list.filter(p => filterSeason.value.includes(p.season))
  if (filterStaffOps.value.length) list = list.filter(p => filterStaffOps.value.includes(p.staff?.ops))
  if (filterStaffDev.value.length) list = list.filter(p => filterStaffDev.value.includes(p.staff?.dev))
  if (filterStaffDesign.value.length) list = list.filter(p => filterStaffDesign.value.includes(p.staff?.design))
  if (filterStaffPhoto.value.length) list = list.filter(p => filterStaffPhoto.value.includes(p.staff?.photo))
  if (filterStaffPurchase.value.length) list = list.filter(p => filterStaffPurchase.value.includes(p.staff?.purchase))
  if (filterNeedShoot.value === true) list = list.filter(p => p.needShoot === true)
  if (filterNeedShoot.value === false) list = list.filter(p => p.needShoot === false)
  if (filterNeedSample.value === true) list = list.filter(p => p.needSample === true)
  if (filterNeedSample.value === false) list = list.filter(p => p.needSample === false)
  if (filterHasParentPlan.value === true) list = list.filter(p => p.hasParentPlan === true)
  if (filterHasParentPlan.value === false) list = list.filter(p => p.hasParentPlan === false)
  return list
}

function buildSnapshot() {
  return {
    filterStatusKeys: [...filterStatusKeys.value],
    searchField: searchField.value,
    searchKeyword: searchKeyword.value,
    searchBatchExact: searchBatchExact.value,
    filterListing: filterListing.value,
    filterDesign: filterDesign.value,
    filterShop: [...filterShop.value],
    filterBrand: [...filterBrand.value],
    filterPType: [...filterPType.value],
    filterCategory: [...filterCategory.value],
    filterScene: [...filterScene.value],
    filterSeason: [...filterSeason.value],
    filterTimeField: filterTimeField.value,
    filterDateRange: filterDateRange.value?.length === 2 ? [...filterDateRange.value] : [],
    alertFilter: alertFilter.value,
    listSort: listSort.value,
    filterAuthMode: filterAuthMode.value,
    filterStaffOps: [...filterStaffOps.value],
    filterStaffDev: [...filterStaffDev.value],
    filterStaffDesign: [...filterStaffDesign.value],
    filterStaffPhoto: [...filterStaffPhoto.value],
    filterStaffPurchase: [...filterStaffPurchase.value],
    filterNeedShoot: filterNeedShoot.value,
    filterNeedSample: filterNeedSample.value,
    filterHasParentPlan: filterHasParentPlan.value,
    filterTimeout: filterTimeout.value,
  }
}

function applySnapshot(s) {
  if (!s) return
  filterStatusKeys.value = Array.isArray(s.filterStatusKeys) ? [...s.filterStatusKeys] : []
  searchField.value = s.searchField ?? 'name'
  searchKeyword.value = s.searchKeyword ?? ''
  searchBatchExact.value = !!s.searchBatchExact
  filterListing.value = s.filterListing ?? ''
  filterDesign.value = s.filterDesign ?? ''
  filterShop.value = normStrArr(s.filterShop)
  filterBrand.value = normStrArr(s.filterBrand)
  filterPType.value = normStrArr(s.filterPType)
  filterCategory.value = normStrArr(s.filterCategory)
  filterScene.value = normStrArr(s.filterScene)
  filterSeason.value = normStrArr(s.filterSeason)
  filterTimeField.value = s.filterTimeField ?? ''
  filterDateRange.value = s.filterDateRange?.length === 2 ? [...s.filterDateRange] : []
  alertFilter.value = s.alertFilter ?? null
  listSort.value = s.listSort ?? ''
  filterAuthMode.value = s.filterAuthMode ?? ''
  filterStaffOps.value = normStrArr(s.filterStaffOps)
  filterStaffDev.value = normStrArr(s.filterStaffDev)
  filterStaffDesign.value = normStrArr(s.filterStaffDesign)
  filterStaffPhoto.value = normStrArr(s.filterStaffPhoto)
  filterStaffPurchase.value = normStrArr(s.filterStaffPurchase)
  filterNeedShoot.value = s.filterNeedShoot === true || s.filterNeedShoot === false ? s.filterNeedShoot : null
  filterNeedSample.value = s.filterNeedSample === true || s.filterNeedSample === false ? s.filterNeedSample : null
  filterHasParentPlan.value =
    s.filterHasParentPlan === true || s.filterHasParentPlan === false ? s.filterHasParentPlan : null
  filterTimeout.value =
    s.filterTimeout === true || s.filterTimeout === false ? s.filterTimeout : null
}

function persistViews() {
  saveListingLaunchedViews(savedViews.value, defaultViewId.value)
}

function onSaveView() {
  const name = viewSaveName.value.trim().slice(0, 20)
  if (!name) {
    ElMessage.warning('请输入视图名称')
    return
  }
  const id = `v_${Date.now()}`
  savedViews.value = [...savedViews.value, { id, name, snapshot: buildSnapshot() }]
  if (savedViews.value.length === 1) defaultViewId.value = id
  persistViews()
  activeViewId.value = id
  viewSaveDialog.value = false
  viewSaveName.value = ''
  ElMessage.success('已保存视图')
}

function onApplyView(id) {
  const v = savedViews.value.find(x => x.id === id)
  if (v?.snapshot) applySnapshot(v.snapshot)
  activeViewId.value = id
}

function onSetDefaultView(id) {
  if (!id) return
  defaultViewId.value = id
  persistViews()
  ElMessage.success('已设为默认视图')
}

function onDeleteView(id) {
  if (!id) return
  ElMessageBox.confirm('确认删除该视图？', '提示', { type: 'warning' })
    .then(() => {
      savedViews.value = savedViews.value.filter(x => x.id !== id)
      if (defaultViewId.value === id) defaultViewId.value = savedViews.value[0]?.id ?? null
      if (activeViewId.value === id) activeViewId.value = null
      persistViews()
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function onViewMenuCommand(cmd) {
  if (cmd === 'save-as') viewSaveDialog.value = true
  else if (cmd === 'update') onUpdateCurrentView()
  else if (cmd === 'default') onSetDefaultView(activeViewId.value)
  else if (cmd === 'delete') onDeleteView(activeViewId.value)
}

function onUpdateCurrentView() {
  const id = activeViewId.value
  const v = savedViews.value.find(x => x.id === id)
  if (!v) return
  v.snapshot = buildSnapshot()
  persistViews()
  ElMessage.success('已更新当前视图')
}

function doReset() {
  searchKeyword.value = ''
  searchField.value = 'name'
  searchBatchExact.value = false
  filterListing.value = ''
  filterDesign.value = ''
  filterShop.value = []
  filterBrand.value = []
  filterPType.value = []
  filterCategory.value = []
  filterScene.value = []
  filterSeason.value = []
  filterTimeField.value = ''
  filterDateRange.value = []
  filterStatusKeys.value = []
  alertFilter.value = null
  listSort.value = ''
  filterAuthMode.value = ''
  filterStaffOps.value = []
  filterStaffDev.value = []
  filterStaffDesign.value = []
  filterStaffPhoto.value = []
  filterStaffPurchase.value = []
  filterNeedShoot.value = null
  filterNeedSample.value = null
  filterHasParentPlan.value = null
  filterTimeout.value = null
  activeViewId.value = null
}

// ── 统计面板用：仅应用公共/时间/搜索，不按侧栏主状态与状态条筛 ─────────
const statsBaseFiltered = computed(() => applyCommonFilters([...launchedProductPool.value]))

const statsBaseEnriched = computed(() =>
  statsBaseFiltered.value.map(p => ({
    ...p,
    mainStatus: resolveMainStatus(p),
    transitionInfos: p.timeline.map((tl, idx) =>
      idx === 0
        ? null
        : calcTransitionInfo(p.timeline[idx - 1], tl, idx, p.logistics, {
            shipCountry: p.shipCountry,
            destWarehouse: p.destWarehouse,
          }, p.categoryId || p.category, p),
    ),
  })),
)

const dynamicNodeStats = computed(() => {
  const stats = {}
  const base = statsBaseEnriched.value
  for (const pan of LISTED_SALE_PANELS) {
    const key = pan.key
    const inNode = base.filter(p => matchStatusPanelKey(p, key))
    const tlIdx = SUB_NODES.findIndex(n => n.key === key)
    if (tlIdx >= 0 && STOCKING_FLOW_NODES.some(n => n.key === key)) {
      stats[key] = {
        total: inNode.length,
        warning: inNode.filter(p => p.transitionInfos[tlIdx]?.state === 'warning').length,
        overdue: inNode.filter(
          p => p.transitionInfos[tlIdx]?.state === 'overdue' || p.timeline[tlIdx]?.overdue === true,
        ).length,
      }
    } else {
      stats[key] = {
        total: inNode.length,
        warning: inNode.filter(p => p.transitionInfos.some(t => t?.state === 'warning')).length,
        overdue: inNode.filter(p => p.transitionInfos.some(t => t?.state === 'overdue')).length,
      }
    }
  }
  return stats
})

const filteredProducts = computed(() => {
  let list = launchedProductPool.value

  if (filterStatusKeys.value.length) {
    list = list.filter(p => filterStatusKeys.value.some(k => matchStatusPanelKey(p, k)))
  }

  list = applyCommonFilters(list)

  let mapped = list.map(p => ({
    ...p,
    mainStatus: resolveMainStatus(p),
    transitionInfos: p.timeline.map((tl, idx) =>
      idx === 0
        ? null
        : calcTransitionInfo(p.timeline[idx - 1], tl, idx, p.logistics, {
            shipCountry: p.shipCountry,
            destWarehouse: p.destWarehouse,
          }, p.categoryId || p.category, p),
    ),
  }))

  if (filterTimeout.value === true) {
    mapped = mapped.filter(p => p.transitionInfos.some(t => t?.state === 'overdue'))
  } else if (filterTimeout.value === false) {
    mapped = mapped.filter(p => !p.transitionInfos.some(t => t?.state === 'overdue'))
  }

  return mapped
})

// 超时/预警：含「当前进行中已超时」与「已结束但环节曾超时」（已开售同样统计，与右上角「超时」筛选一致）
const overdueCount = computed(() =>
  filteredProducts.value.filter(p => p.transitionInfos.some(t => t?.state === 'overdue')).length
)
const warningCount = computed(() =>
  filteredProducts.value.filter(p => p.transitionInfos.some(t => t?.state === 'warning')).length
)

// alertFilter 叠加层：在 filteredProducts 基础上二次过滤
const alertedProducts = computed(() => {
  if (!alertFilter.value) return filteredProducts.value
  if (alertFilter.value === 'overdue') {
    return filteredProducts.value.filter(p => p.transitionInfos.some(t => t?.state === 'overdue'))
  }
  if (alertFilter.value === 'warning') {
    return filteredProducts.value.filter(p => p.transitionInfos.some(t => t?.state === 'warning'))
  }
  return filteredProducts.value
})

const sortedAlertedProducts = computed(() => {
  const arr = [...alertedProducts.value]
  const sort = listSort.value
  if (sort === 'auth_asc') {
    arr.sort((a, b) => String(a.authTime || '').localeCompare(String(b.authTime || '')))
  } else if (sort === 'auth_desc') {
    arr.sort((a, b) => String(b.authTime || '').localeCompare(String(a.authTime || '')))
  }
  return arr
})

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sortedAlertedProducts.value.slice(start, start + PAGE_SIZE)
})

/** 勾选 id（跨页保留）；筛选结果集合变化时清空（市面常见：条件一变重选） */
const selectedIds = shallowRef(new Set())

function toggleProductSelect(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

/** 当前筛选结果（与分页排序一致的全集）内选中数量，用于表头全选三态 */
const selectionInFilter = computed(() => {
  const list = sortedAlertedProducts.value
  const ids = list.map(p => p.id)
  const set = selectedIds.value
  let c = 0
  for (const id of ids) {
    if (set.has(id)) c++
  }
  const total = ids.length
  return {
    total,
    selected: c,
    allSelected: total > 0 && c === total,
    someSelected: c > 0 && c < total,
  }
})

const headerSelectAll = computed(() => selectionInFilter.value.allSelected)
const headerSelectIndeterminate = computed(() => selectionInFilter.value.someSelected)

function onHeaderSelectAll(checked) {
  const ids = sortedAlertedProducts.value.map(p => p.id)
  const s = new Set(selectedIds.value)
  if (checked) {
    ids.forEach(id => s.add(id))
  } else {
    ids.forEach(id => s.delete(id))
  }
  selectedIds.value = s
}

/** 筛选结果 id 集合变化（不含仅排序变化）时清空勾选 */
watch(
  () => [...sortedAlertedProducts.value.map(p => p.id)].sort((a, b) => a - b).join(','),
  (sig, prev) => {
    if (prev !== undefined && sig !== prev) {
      selectedIds.value = new Set()
    }
  },
)

/** Listing 详情抽屉 */
const listingDetailOpen = ref(false)
const listingDetailProduct = ref(null)
function openListingDetail(product) {
  listingDetailProduct.value = product
  listingDetailOpen.value = true
}

/** 列表页：创建采购计划（勾选带入 / 空选后从列表添加） */
const purchasePlanEditorOpen = ref(false)
const purchasePrefillIds = ref([])

function openPurchasePlanFromToolbar() {
  const ids = [...selectedIds.value]
  const eligible = new Set(
    alertedProducts.value.filter(isListingEligibleForPurchasePlan).map((p) => p.id),
  )
  if (ids.length) {
    const ok = ids.filter((id) => eligible.has(id))
    if (!ok.length) {
      ElMessage.warning('当前勾选中没有「待建计划」产品，请重新勾选，或留空后打开从列表添加')
      return
    }
    if (ok.length < ids.length) {
      ElMessage.info(`已忽略 ${ids.length - ok.length} 条非待建计划，将带入 ${ok.length} 条`)
    }
    purchasePrefillIds.value = ok
  } else {
    purchasePrefillIds.value = []
  }
  purchasePlanEditorOpen.value = true
}

const SEARCH_FIELD_LABEL = { name: '品名', sku: 'SKU', msku: 'MSKU', asin: 'ASIN' }

const filterTags = computed(() => {
  const tags = []
  if (searchKeyword.value.trim()) {
    const fl = SEARCH_FIELD_LABEL[searchField.value] || '品名'
    const kw = searchKeyword.value
    const preview = kw.length > 28 ? `${kw.slice(0, 28)}…` : kw
    tags.push({
      id: 'search',
      label: `${fl}${searchBatchExact.value ? '（批量精准）' : ''}: ${preview}`,
    })
  }
  for (const k of filterStatusKeys.value) {
    const opt = LISTED_SALE_PANELS.find(o => o.key === k)
    tags.push({ id: `status:${k}`, label: `节点: ${opt?.label ?? k}` })
  }
  if (filterListing.value) tags.push({ id: 'listing', label: `Listing: ${filterListing.value}` })
  if (filterDesign.value) tags.push({ id: 'design', label: `平面: ${filterDesign.value}` })
  if (filterShop.value.length) tags.push({ id: 'shop', label: `店铺: ${filterShop.value.join('、')}` })
  if (filterBrand.value.length) tags.push({ id: 'brand', label: `品牌: ${filterBrand.value.join('、')}` })
  if (filterPType.value.length) tags.push({ id: 'ptype', label: `类型: ${filterPType.value.join('、')}` })
  if (filterCategory.value.length) tags.push({ id: 'category', label: `品类: ${filterCategory.value.join('、')}` })
  if (filterScene.value.length) tags.push({ id: 'scene', label: `场景: ${filterScene.value.join('、')}` })
  if (filterSeason.value.length) tags.push({ id: 'season', label: `季节: ${filterSeason.value.join('、')}` })
  if (filterTimeField.value && filterDateRange.value?.length === 2) {
    tags.push({ id: 'time', label: '时间范围已选' })
  }
  if (listSort.value) {
    const map = { auth_asc: '开发授权时间升序', auth_desc: '开发授权时间降序' }
    tags.push({ id: 'sort', label: `排序: ${map[listSort.value]}` })
  }
  if (filterAuthMode.value) {
    const map = { manual: '人工', system: '系统' }
    tags.push({ id: 'auth', label: `授权方式: ${map[filterAuthMode.value]}` })
  }
  if (alertFilter.value === 'warning') {
    tags.push({ id: 'alert', label: '仅看：预警' })
  } else if (alertFilter.value === 'overdue') {
    tags.push({ id: 'alert', label: '仅看：超时' })
  }
  if (filterStaffOps.value.length) tags.push({ id: 'stops', label: `运营: ${filterStaffOps.value.join('、')}` })
  if (filterStaffDev.value.length) tags.push({ id: 'stdev', label: `开发: ${filterStaffDev.value.join('、')}` })
  if (filterStaffDesign.value.length) tags.push({ id: 'stdesign', label: `平面人员: ${filterStaffDesign.value.join('、')}` })
  if (filterStaffPhoto.value.length) tags.push({ id: 'stphoto', label: `摄影: ${filterStaffPhoto.value.join('、')}` })
  if (filterStaffPurchase.value.length) tags.push({ id: 'stpur', label: `采购: ${filterStaffPurchase.value.join('、')}` })
  if (filterNeedShoot.value === true) tags.push({ id: 'needShoot', label: '需要拍摄: 是' })
  if (filterNeedShoot.value === false) tags.push({ id: 'needShoot', label: '需要拍摄: 否' })
  if (filterNeedSample.value === true) tags.push({ id: 'needSample', label: '需要样品: 是' })
  if (filterNeedSample.value === false) tags.push({ id: 'needSample', label: '需要样品: 否' })
  if (filterHasParentPlan.value === true) tags.push({ id: 'hasParent', label: '存在父体规划: 是' })
  if (filterHasParentPlan.value === false) tags.push({ id: 'hasParent', label: '存在父体规划: 否' })
  if (filterTimeout.value === true) tags.push({ id: 'timeout', label: '超时: 是' })
  if (filterTimeout.value === false) tags.push({ id: 'timeout', label: '超时: 否' })
  return tags
})

function removeFilterTag(id) {
  if (id === 'search') {
    searchKeyword.value = ''
    searchBatchExact.value = false
    return
  }
  if (id.startsWith('status:')) {
    const k = id.slice(7)
    filterStatusKeys.value = filterStatusKeys.value.filter(x => x !== k)
    return
  }
  if (id === 'listing') { filterListing.value = ''; return }
  if (id === 'design') { filterDesign.value = ''; return }
  if (id === 'shop') { filterShop.value = []; return }
  if (id === 'brand') { filterBrand.value = []; return }
  if (id === 'ptype') { filterPType.value = []; return }
  if (id === 'category') { filterCategory.value = []; return }
  if (id === 'scene') { filterScene.value = []; return }
  if (id === 'season') { filterSeason.value = []; return }
  if (id === 'time') {
    filterTimeField.value = ''
    filterDateRange.value = []
    return
  }
  if (id === 'sort') { listSort.value = ''; return }
  if (id === 'auth') { filterAuthMode.value = ''; return }
  if (id === 'alert') {
    alertFilter.value = null
    return
  }
  if (id === 'stops') { filterStaffOps.value = []; return }
  if (id === 'stdev') { filterStaffDev.value = []; return }
  if (id === 'stdesign') { filterStaffDesign.value = []; return }
  if (id === 'stphoto') { filterStaffPhoto.value = []; return }
  if (id === 'stpur') { filterStaffPurchase.value = []; return }
  if (id === 'needShoot') { filterNeedShoot.value = null; return }
  if (id === 'needSample') { filterNeedSample.value = null; return }
  if (id === 'hasParent') { filterHasParentPlan.value = null; return }
  if (id === 'timeout') { filterTimeout.value = null; return }
}

onMounted(() => {
  if (defaultViewId.value && savedViews.value.length) {
    const v = savedViews.value.find(x => x.id === defaultViewId.value)
    if (v?.snapshot) {
      applySnapshot(v.snapshot)
      activeViewId.value = defaultViewId.value
    }
  }
})
</script>

<template>
  <div class="lt-page">

    <!-- 顶部面包屑 -->
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>上架</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">开售商品</span>
      </div>
    </header>

    <!-- 主体：列表全宽 -->
    <div class="lt-body">
      <div class="lt-content">

        <ListingFilterBar
          :status-filter-options="LISTED_SALE_PANELS"
          v-model:searchField="searchField"
          v-model:searchKeyword="searchKeyword"
          v-model:searchBatchExact="searchBatchExact"
          v-model:filterListing="filterListing"
          v-model:filterDesign="filterDesign"
          v-model:filterShop="filterShop"
          v-model:filterBrand="filterBrand"
          v-model:filterPType="filterPType"
          v-model:filterCategory="filterCategory"
          v-model:filterScene="filterScene"
          v-model:filterSeason="filterSeason"
          v-model:filterTimeField="filterTimeField"
          v-model:filterDateRange="filterDateRange"
          v-model:filterStatusKeys="filterStatusKeys"
          v-model:listSort="listSort"
          v-model:filterAuthMode="filterAuthMode"
          v-model:filterStaffOps="filterStaffOps"
          v-model:filterStaffDev="filterStaffDev"
          v-model:filterStaffDesign="filterStaffDesign"
          v-model:filterStaffPhoto="filterStaffPhoto"
          v-model:filterStaffPurchase="filterStaffPurchase"
          v-model:filterNeedShoot="filterNeedShoot"
          v-model:filterNeedSample="filterNeedSample"
          v-model:filterHasParentPlan="filterHasParentPlan"
          v-model:filterTimeout="filterTimeout"
          @reset="doReset"
        >
          <template #footer>
            <div class="lt-filter-footer">
              <div class="lt-view-strip">
                <el-icon class="lt-view-eye" :size="16"><View /></el-icon>
                <span class="lt-view-title">系统视图</span>
                <el-select
                  v-model="activeViewId"
                  clearable
                  filterable
                  placeholder="选择已保存的查询视图"
                  size="small"
                  class="lt-view-select"
                  @change="onApplyView"
                >
                  <el-option
                    v-for="v in savedViews"
                    :key="v.id"
                    :label="(defaultViewId === v.id ? '【默认】' : '') + v.name"
                    :value="v.id"
                  />
                </el-select>
                <el-dropdown trigger="click" @command="onViewMenuCommand">
                  <el-button size="small" type="default">
                    视图管理
                    <el-icon class="lt-view-caret"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="save-as">另存为视图</el-dropdown-item>
                      <el-dropdown-item command="update" :disabled="!activeViewId">更新当前视图</el-dropdown-item>
                      <el-dropdown-item command="default" :disabled="!activeViewId">设为默认</el-dropdown-item>
                      <el-dropdown-item command="delete" divided :disabled="!activeViewId">删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <div v-if="filterTags.length" class="lt-tags-wrap">
                <el-tag
                  v-for="t in filterTags"
                  :key="t.id"
                  closable
                  type="primary"
                  size="small"
                  @close="removeFilterTag(t.id)"
                >
                  {{ t.label }}
                </el-tag>
                <el-button type="primary" link size="small" @click="doReset">清除全部</el-button>
              </div>
            </div>
          </template>
        </ListingFilterBar>

        <el-dialog v-model="viewSaveDialog" title="另存为视图" width="400px" destroy-on-close>
          <el-input v-model="viewSaveName" maxlength="20" show-word-limit placeholder="视图名称（最多20字）" />
          <template #footer>
            <el-button @click="viewSaveDialog = false">取消</el-button>
            <el-button type="primary" @click="onSaveView">保存</el-button>
          </template>
        </el-dialog>

        <!-- 功能按钮区：进度/列表与预警/超时同一行 -->
        <div class="lt-action-bar">
          <el-button type="primary" size="small">批量维护上架信息</el-button>
          <el-button type="primary" plain size="small" @click="openPurchasePlanFromToolbar">
            创建采购计划
          </el-button>
          <el-button size="small">AI文案生成</el-button>
          <el-button size="small">导出</el-button>
          <div class="lt-action-spacer" />
          <div class="lt-action-display-group">
            <el-radio-group v-model="listDisplayMode" size="small" class="lt-action-mode-switch">
              <el-radio-button value="progress">进度</el-radio-button>
              <el-radio-button value="regular">列表</el-radio-button>
            </el-radio-group>
          </div>
          <el-button
            size="small"
            :type="alertFilter === 'warning' ? 'warning' : ''"
            :plain="alertFilter !== 'warning'"
            @click="alertFilter = alertFilter === 'warning' ? null : 'warning'"
          >
            预警
            <b :style="{ color: alertFilter === 'warning' ? '' : '#d97706' }">
              {{ warningCount }}
            </b> 件
          </el-button>
          <el-button
            size="small"
            :type="alertFilter === 'overdue' ? 'danger' : ''"
            :plain="alertFilter !== 'overdue'"
            title="含当前环节超时与已结束流程中曾超时的环节（已开售同样适用）"
            @click="alertFilter = alertFilter === 'overdue' ? null : 'overdue'"
          >
            超时
            <b :style="{ color: alertFilter === 'overdue' ? '' : '#ef4444' }">
              {{ overdueCount }}
            </b> 件
          </el-button>
        </div>

        <!-- 备货发货子节点统计面板（筛选联动） -->
        <ListingNodeStatusBar
          :nodes="LISTED_SALE_PANELS"
          :stats="dynamicNodeStats"
          v-model:active="activeSubNode"
        />

        <!-- 列表区域：上方可滚动列表 + 下方固定分页 -->
        <div class="lt-list-wrap">
          <!-- 可滚动区域（列头 sticky + 数据行） -->
          <div v-show="listDisplayMode === 'progress'" class="lt-scroll-area">

            <!-- 列头（与 ListingProductRow 列宽保持一致） -->
            <div class="lt-col-header">
              <div class="lt-col-check lt-col-check--head">
                <el-checkbox
                  :model-value="headerSelectAll"
                  :indeterminate="headerSelectIndeterminate"
                  @change="onHeaderSelectAll"
                />
              </div>
              <div class="lt-col-img">图片</div>
              <div class="lt-col-info">产品信息</div>
              <div class="lt-col-status">状态&节点</div>
              <div class="lt-col-cat">品类</div>
              <div class="lt-col-scene">场景</div>
              <div class="lt-col-season">季节性</div>
              <div class="lt-col-brand">品牌</div>
              <div class="lt-col-shop">店铺</div>
              <div class="lt-col-staff">参与人员</div>
              <div class="lt-col-listing">Listing状态</div>
              <div class="lt-col-time">Listing上传时间</div>
              <div class="lt-col-design">平面状态</div>
              <div class="lt-col-design-time">平面完成时间</div>
              <div class="lt-col-auth">开发授权时间</div>
              <div class="lt-col-total">总用时</div>
              <div class="lt-col-logistics">物流方式</div>
              <div class="lt-col-action">操作</div>
            </div>

            <!-- 空状态 -->
            <div v-if="paginatedProducts.length === 0" class="lt-empty">
              <el-empty description="暂无数据" />
            </div>

            <!-- 产品行（子组件） -->
            <ListingProductRow
              v-for="product in paginatedProducts"
              :key="product.id"
              :product="product"
              :selected="selectedIds.has(product.id)"
              @toggle-select="toggleProductSelect(product.id)"
              @detail="openListingDetail"
            />
          </div>

          <div v-show="listDisplayMode === 'regular'" class="lt-scroll-area lt-scroll-area--regular">
            <ListingRegularTable
              :products="paginatedProducts"
              :selected-ids="selectedIds"
              @toggle-select="toggleProductSelect"
              @detail="openListingDetail"
            />
          </div>

          <!-- 固定分页：始终显示在列表区域底部 -->
          <div class="lt-pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="PAGE_SIZE"
              :total="alertedProducts.length"
              layout="total, prev, pager, next, jumper"
              background
              small
            />
          </div>
        </div>
      </div>
    </div>

    <ListingDetailDrawer
      v-model="listingDetailOpen"
      :product="listingDetailProduct"
      :picker-products="alertedProducts"
    />

    <PurchasePlanEditorDialog
      v-model="purchasePlanEditorOpen"
      :initial-draft-id="null"
      :prefill-product-ids="purchasePrefillIds"
      :picker-source="alertedProducts"
      :editable="true"
    />
  </div>
</template>

<style scoped>
/* ── 页面根容器 ── */
.lt-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #f5f7fa;
}

/* ── 主体 ── */
.lt-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ── 筛选条第 3 行：系统视图 + 已选标签 ── */
.lt-filter-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  width: 100%;
}
.lt-view-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.lt-view-eye {
  color: #409eff;
  flex-shrink: 0;
}
.lt-view-title {
  font-size: 13px;
  color: #374151;
  font-weight: 600;
  margin-right: 4px;
}
.lt-view-select {
  width: 220px;
}
.lt-view-caret {
  margin-left: 4px;
  vertical-align: middle;
}
.lt-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 200px;
}

/* ── 内容区 ── */
.lt-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

/* ── 功能按钮区 ── */
.lt-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  flex-shrink: 0;
}
.lt-action-spacer { flex: 1; min-width: 8px; }
.lt-action-display-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.lt-action-mode-switch {
  flex-shrink: 0;
}
.lt-total-text { font-size: 12px; color: #6b7280; white-space: nowrap; }
.lt-total-text b { color: #1890ff; }

/* ── 列表区域：flex 列，上部滚动，下部固定分页 ── */
.lt-list-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 16px 0;
}
.lt-scroll-area--regular {
  padding-top: 0;
}

/* 可滚动数据区 */
.lt-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  margin-top: 5px;
}

/* 列宽见 listingTableColumns.css */

/* ── 列头 ── */
.lt-col-header .lt-col-action {
  align-items: center;
}
.lt-col-header .lt-col-check--head {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.lt-col-header {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px 8px 0 0;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.lt-empty { padding: 40px 0; }

/* ── 固定分页（始终在列表底部可见） ── */
.lt-pagination {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 6px 4px 8px;
  background: transparent;
}
</style>
