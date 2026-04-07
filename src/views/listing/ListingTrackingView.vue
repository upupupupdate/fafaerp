<script setup>
import '@/features/listing/listingTableColumns.css'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { ArrowDown, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  daysBetween,
  getLogisticsConfig,
  getTransitionConfig,
  lookupFirstLegInboundRule,
} from '@/features/listing/useListingConfig.js'
import {
  LISTING_STAFF_OPTIONS,
  STATUS_FILTER_OPTIONS,
  SUB_NODES,
  STOCKING_FLOW_NODES,
  STOCKING_PANELS,
  matchStatusPanelKey,
  resolveMainStatus,
} from '@/features/listing/listingDefs.js'
import { loadListingViews, saveListingViews } from '@/features/listing/listingViewsStorage.js'
import ListingFilterBar     from '@/features/listing/components/ListingFilterBar.vue'
import ListingNodeStatusBar from '@/features/listing/components/ListingNodeStatusBar.vue'
import ListingProductRow    from '@/features/listing/components/ListingProductRow.vue'
import ListingDetailDrawer  from '@/features/listing/components/ListingDetailDrawer.vue'
import PurchasePlanEditorDialog from '@/features/listing/components/PurchasePlanEditorDialog.vue'
import { isListingEligibleForPurchasePlan } from '@/features/listing/purchasePlanDraft.js'

// ── Mock 数据常量 ──────────────────────────────────────────────────────
const NAMES = [
  '个护防晒4合1套装 防晒喷雾+面乳+棒+粉饼 4pcs',
  '美妆组合 春季限定口红套装 3pcs',
  '户外保温水壶 500ml 双层不锈钢',
  '家居收纳套装 可折叠储物箱 3件套',
  '母婴洗护套装 温和无刺激 洗发沐浴二合一',
  '运动手套 防滑耐磨 健身哑铃专用',
  '数码65W快充头 USB-C多口 折叠便携',
  '速干运动T恤 男女通用 防臭抗菌',
  '高颜值文具套装 笔记本+中性笔+便利贴',
  '每日坚果混合装 独立包装 30天份',
  '天然大豆蜡香薰蜡烛礼盒 6种香型',
  '天然橡胶瑜伽垫 防滑加厚 6mm',
  '防蓝光护目镜 无度数 电脑专用',
  '声波电动牙刷 5档调节 配4刷头',
  '3D立体睡眠眼罩 遮光透气 真丝材质',
  '玻尿酸保湿精华 多重补水 30ml',
  '超轻三折晴雨伞 防晒防紫外线',
  '电动逗猫棒 自动旋转 宠物玩具',
  '大容量陶瓷咖啡杯 保温带盖 480ml',
  '硅藻土浴室吸水垫 速干防滑 40x60cm',
]
const CATS    = ['个护','美妆','户外','家居','母婴','运动','数码','服饰','文具','食品','宠物','厨具']
const SCENES  = ['防晒','日妆','运动','收纳','护肤','健身','露营','通勤','居家','学习']
const SEASONS = ['夏季','春季','全季','冬季','秋季']
const BRANDS  = ['自研','代工','OEM','联名','私标']
const SHOPS   = ['US站','UK站','DE站','JP站','CA站','AU站']
const LOGS    = ['海运','空运','快递','铁路']
const PTYPES  = ['单品','单品','单品','组合品']
const SO = LISTING_STAFF_OPTIONS
const DEVS    = SO.dev
const OPS     = SO.ops
const DES     = SO.design
const PURS    = SO.purchase
const PHOTOS  = SO.photo
const REVS    = ['审核员A','审核员B','审核员C','审核员D']
const WHMGRS  = ['仓管张','仓管李','仓管王','仓管赵']
const AGENTS  = ['货代陈','货代孙','货代周','货代钱']

function _addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function _dt(date, h, m, s) {
  return `${date} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/** mock：将 timeline[fromIdx..10] 日期整体后移 */
function _shiftTimelineNodesFrom(timeline, fromIdx, addDays) {
  for (let i = fromIdx; i <= 10; i++) {
    const n = timeline[i]
    if (!n?.time) continue
    if (i === 10) {
      n.time = _addDays(n.time.slice(0, 10), addDays)
    } else {
      const datePart = n.time.slice(0, 10)
      const rest = n.time.length > 10 ? n.time.slice(11) : '12:00:00'
      n.time = `${_addDays(datePart, addDays)} ${rest}`
    }
  }
}

function _buildTimeline(baseDate, upToIdx, id, ops, purchase) {
  const persons = [
    ops,
    ops,
    REVS[id % 4],
    purchase,
    WHMGRS[id % 4],
    purchase,
    AGENTS[id % 4],
    WHMGRS[id % 4],
    WHMGRS[id % 4],
    ops,
    ops,
  ]
  return SUB_NODES.map(({ key }, idx) => {
    if (idx < upToIdx) {
      const d = _addDays(baseDate, idx * 2 + 1 + (id % 3))
      const h = 8 + (idx * 3 + id) % 10
      const m = (idx * 13 + id * 7) % 60
      const s = (idx * 7 + id * 3) % 60
      const time = idx === 10 ? d : _dt(d, h, m, s)
      const node = { key, done: true, time, person: persons[idx] }
      if (idx === 1) node.no = `PL2025${String(id).padStart(3, '0')}`
      if (idx === 3) node.no = `PO2025${String(id).padStart(3, '0')}`
      if (idx === 5) node.no = `FBA-CN-${String(id).padStart(3, '0')}`
      return node
    }
    if (idx === upToIdx) {
      const overdue = id % 7 === 0 && idx < 10
      return { key, done: false, overdue, ...(idx === 10 ? { estimatedTime: _addDays(baseDate, 50) } : {}) }
    }
    return { key, done: false }
  })
}

function _makeProd(id, mainStatus, subNodeKey, baseDate) {
  const nm  = NAMES[(id-1) % NAMES.length]
  const sfx = id > NAMES.length ? ` Pro ${Math.floor((id-1)/NAMES.length)+1}` : ''
  const dev = DEVS[id % DEVS.length]
  const ops = OPS[id % OPS.length]
  const des = DES[id % DES.length]
  const pur = PURS[id % PURS.length]
  const photo = PHOTOS[id % PHOTOS.length]
  const snIdx = subNodeKey ? SUB_NODES.findIndex(n => n.key === subNodeKey) : -1

  let timeline, readyTime = '', listingStatus = '未上传'
  let listingUploadTime = '', designStatus = '待平面设计', designCompletedTime = ''

  if (mainStatus === 'pending') {
    timeline = SUB_NODES.map(({ key }) => ({ key, done: false }))
  } else if (mainStatus === 'stocking') {
    timeline = _buildTimeline(baseDate, Math.max(1, snIdx), id, ops, pur)
    designStatus = snIdx >= 6 ? '完成平面设计' : '待平面设计'
    listingStatus = snIdx >= 4 && id % 2 === 0 ? '已上传' : '未上传'
    listingUploadTime = listingStatus === '已上传' ? _addDays(baseDate, 20) : ''
    designCompletedTime = snIdx >= 6 ? _addDays(baseDate, 12 + id % 6) : ''
  } else if (mainStatus === 'ready') {
    timeline = _buildTimeline(baseDate, 9, id, ops, pur)
    timeline[10] = { key: 'launched', done: false, estimatedTime: _addDays(baseDate, 50) }
    designStatus = '完成平面设计'
    designCompletedTime = _addDays(baseDate, 12 + id % 6)
    listingStatus = '已上传'
    listingUploadTime = _addDays(baseDate, 22)
    readyTime = _addDays(baseDate, 48)
  } else {
    timeline = _buildTimeline(baseDate, 11, id, ops, pur)
    // mock：约 1/3 已开售单拉长某段区间，使 calcTransitionInfo 出现曾超时环节，【已开售】下也可用右上角「超时」筛出
    if (id % 3 === 1) {
      _shiftTimelineNodesFrom(timeline, 4, 6 + (id % 8))
    }
    designStatus = '完成平面设计'
    designCompletedTime = _addDays(baseDate, 12 + id % 6)
    listingStatus       = '已上传'
    listingUploadTime   = _addDays(baseDate, 22)
    readyTime           = _addDays(baseDate, 48)
  }

  const skuNum = String((id * 12345) % 899999 + 100000)
  const sh     = SHOPS[id % SHOPS.length]
  return {
    id,
    imageUrl: '',
    nameCn: nm + sfx,
    sku:  `SK${skuNum}`,
    msku: `SK${skuNum}-${sh.slice(0,2)}-${String(id % 99+1).padStart(2,'0')}`,
    asin: `B0${String(Math.abs((id*98765321) % 1000000000)).padStart(9,'0').slice(0,9)}`,
    mainStatus,
    subNode: subNodeKey,
    category: CATS[id % CATS.length],
    scene:    SCENES[id % SCENES.length],
    season:   SEASONS[id % SEASONS.length],
    brand:    BRANDS[id % BRANDS.length],
    shop:     sh,
    productType: PTYPES[id % PTYPES.length],
    staff: { dev, ops, design: des, purchase: pur, photo },
    needShoot: id % 3 !== 1,
    needSample: id % 4 < 2,
    hasParentPlan: id % 5 === 0,
    listingStatus,
    listingUploadTime,
    designStatus,
    designCompletedTime,
    authTime: baseDate,
    readyTime,
    logistics: LOGS[id % LOGS.length],
    /** 头程入仓规则匹配：待入仓 → 货件入仓 */
    shipCountry: '中国内地',
    destWarehouse: ['美东 FBA 仓', '美西 FBA 仓', '国内中转仓', '海外仓'][id % 4],
    timeline,
  }
}

// 备货发货 60 条的子节点分布（不含已分配和开售，符合业务流转）
const _stockingSNs = [
  ...Array(14).fill('plan_pending'), // 原 7 条 assigned + 7 条 plan_pending 合并：已分配后等待建计划
  ...Array(7).fill('plan_review'),
  ...Array(7).fill('po_pending'),
  ...Array(8).fill('po_inbound'),
  ...Array(7).fill('shipment_build'),
  ...Array(7).fill('shipment_send'),
  ...Array(7).fill('in_transit'),
  ...Array(3).fill('warehouse_received'),
]

function genMockProducts() {
  const list = []
  for (let i = 1;  i <= 10;  i++) list.push(_makeProd(i, 'pending',  null, `2025-03-${String(i).padStart(2,'0')}`))
  for (let i = 0;  i < 60;   i++) {
    const id    = 11 + i
    const month = String(Math.floor(i / 6) % 12 + 1).padStart(2,'0')
    const day   = String((i * 2) % 28 + 1).padStart(2,'0')
    list.push(_makeProd(id, 'stocking', _stockingSNs[i], `2024-${month}-${day}`))
  }
  for (let i = 71; i <= 85; i++) {
    const month = String((i % 12) + 1).padStart(2,'0')
    const day   = String((i * 2) % 28 + 1).padStart(2,'0')
    list.push(_makeProd(i, 'ready', null, `2024-${month}-${day}`))
  }
  for (let i = 86; i <= 100; i++) {
    const month = String((i % 6) + 1).padStart(2,'0')
    const day   = String((i * 2) % 28 + 1).padStart(2,'0')
    list.push(_makeProd(i, 'listed', null, `2024-${month}-${day}`))
  }

  // 演示：上一环节已完成（较早时间）→ 当前环节未完成，入边区间必为 overdue，圆点红脉冲 + 轴线时效文案
  const overdueDemo = [
    { id: 101, sub: 'plan_pending', title: '【演示】超时未完成·待建计划' },
    { id: 102, sub: 'plan_review', title: '【演示】超时未完成·计划待审' },
    { id: 103, sub: 'po_pending', title: '【演示】超时未完成·待采购下单' },
  ]
  for (const d of overdueDemo) {
    const p = _makeProd(d.id, 'stocking', d.sub, '2022-01-08')
    p.nameCn = `${d.title} · ${p.nameCn}`
    list.push(p)
  }

  return list
}

const allProducts = ref(genMockProducts())

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

const activeSubNode = computed({
  get: () => (filterStatusKeys.value.length === 1 ? filterStatusKeys.value[0] : null),
  set: v => {
    if (v == null || v === '') filterStatusKeys.value = []
    else filterStatusKeys.value = [v]
  },
})

// ── 系统视图（localStorage）────────────────────────────────────────────
const _viewsLoaded = loadListingViews()
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
   filterNeedShoot, filterNeedSample, filterHasParentPlan],
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
    case 'sendTime': return (t?.[6]?.time || '').slice(0, 10)
    case 'inTransitTime': return (t?.[7]?.time || '').slice(0, 10)
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
}

function persistViews() {
  saveListingViews(savedViews.value, defaultViewId.value)
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
  activeViewId.value = null
}

// ── 统计面板用：仅应用公共/时间/搜索，不按侧栏主状态与状态条筛 ─────────
const statsBaseFiltered = computed(() => applyCommonFilters([...allProducts.value]))

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
          }),
    ),
  })),
)

const dynamicNodeStats = computed(() => {
  const stats = {}
  const base = statsBaseEnriched.value
  for (const pan of STOCKING_PANELS) {
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
  let list = allProducts.value

  if (filterStatusKeys.value.length) {
    list = list.filter(p => filterStatusKeys.value.some(k => matchStatusPanelKey(p, k)))
  }

  list = applyCommonFilters(list)

  return list.map(p => ({
    ...p,
    mainStatus: resolveMainStatus(p),
    transitionInfos: p.timeline.map((tl, idx) =>
      idx === 0
        ? null
        : calcTransitionInfo(p.timeline[idx - 1], tl, idx, p.logistics, {
            shipCountry: p.shipCountry,
            destWarehouse: p.destWarehouse,
          }),
    ),
  }))
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
    const opt = STATUS_FILTER_OPTIONS.find(o => o.key === k)
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
}

// ── 时效计算 ──────────────────────────────────────────────────────────
// actual：仅当目标节点已完成时表示「实际完成耗时」天数；未完成则为 null（界面展示 -/-）
// elapsedDays：用于未完成时的预警/超时判断（上一节点完成日 → 今日）
// overdueDays：仅 state===overdue 时，超出标准的天数（用于「超时X天」）
function calcTransitionInfo(prevTl, currTl, transIdx, logisticsName, firstLegCtx) {
  if (!prevTl?.done) return null
  let cfg = null
  // 待入仓 → 货件入仓（进入节点 warehouse_received）：优先 物流+国家+目的仓 规则表
  if (transIdx === 8) {
    cfg = lookupFirstLegInboundRule({
      logisticsName,
      shipCountry: firstLegCtx?.shipCountry,
      destWarehouse: firstLegCtx?.destWarehouse,
    })
  }
  if (!cfg && transIdx === 7) cfg = getLogisticsConfig(logisticsName)
  if (!cfg) cfg = getTransitionConfig(transIdx, logisticsName)
  if (!cfg) return null

  const { standard, warning } = cfg
  const startTime = prevTl.time?.slice(0, 10)
  const endTime   = currTl.done ? currTl.time?.slice(0, 10) : null
  const now       = new Date().toISOString().split('T')[0]

  const elapsedDays = daysBetween(startTime, currTl.done ? endTime : now)
  if (elapsedDays === null) return null

  /** @type {number|null} */
  let actual = null
  if (currTl.done && endTime) {
    const d = daysBetween(startTime, endTime)
    if (d !== null) actual = d
  }

  let state = 'pending'
  let overdueDays = 0

  if (currTl.done) {
    if (actual === null) return null
    state = actual > standard ? 'overdue' : 'done'
    if (state === 'overdue') overdueDays = actual - standard
  } else {
    const remaining = standard - elapsedDays
    if (remaining < 0) {
      state = 'overdue'
      overdueDays = elapsedDays - standard
    } else if (remaining <= warning) {
      state = 'warning'
    } else {
      state = 'active'
    }
  }

  return { standard, state, actual, overdueDays: state === 'overdue' ? overdueDays : 0 }
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
        <span class="bc-cur">上架跟踪</span>
      </div>
    </header>

    <!-- 主体：列表全宽 -->
    <div class="lt-body">
      <div class="lt-content">

        <ListingFilterBar
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

        <!-- 功能按钮区 -->
        <div class="lt-action-bar">
          <el-button type="primary" size="small">批量上架</el-button>
          <el-button type="primary" plain size="small" @click="openPurchasePlanFromToolbar">
            创建采购计划
          </el-button>
          <el-button size="small">AI文案生成</el-button>
          <el-button size="small">导出</el-button>
          <div class="lt-action-spacer" />
          <!-- 右侧警报快捷按钮，点击切换过滤，再次点击取消 -->
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

        <!-- 备货发货子节点统计面板（含货件入仓，筛选联动，仅在备货发货主状态下显示） -->
        <ListingNodeStatusBar
          :nodes="STOCKING_PANELS"
          :stats="dynamicNodeStats"
          v-model:active="activeSubNode"
        />

        <!-- 列表区域：上方可滚动列表 + 下方固定分页 -->
        <div class="lt-list-wrap">

          <!-- 可滚动区域（列头 sticky + 数据行） -->
          <div class="lt-scroll-area">

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
.lt-action-spacer { flex: 1; }
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
