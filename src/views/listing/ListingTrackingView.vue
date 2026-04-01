<script setup>
import '@/features/listing/listingTableColumns.css'
import { computed, ref, watch } from 'vue'
import { daysBetween, getLogisticsConfig, getTransitionConfig } from '@/features/listing/useListingConfig.js'
import {
  SUB_NODES, STOCKING_SUB_NODES, STOCKING_PANELS, mainTabs,
  resolveMainStatus,
} from '@/features/listing/listingDefs.js'
import ListingFilterBar     from '@/features/listing/components/ListingFilterBar.vue'
import ListingNodeStatusBar from '@/features/listing/components/ListingNodeStatusBar.vue'
import ListingProductRow    from '@/features/listing/components/ListingProductRow.vue'

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
const DEVS    = ['张开发','李开发','王开发','赵开发','陈开发','刘开发']
const OPS     = ['李运营','王运营','陈运营','刘运营','林运营','吴运营']
const DES     = ['王平面','李平面','陈平面','黄平面','郑平面','刘平面']
const PURS    = ['赵采购','孙采购','冯采购','刘采购','周采购','陈采购']
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

/** mock：将 timeline[fromIdx..8] 日期整体后移，拉长某段区间以产生「环节曾超时」，便于「超时」筛选联调（接 API 后以真实时间为准） */
function _shiftTimelineNodesFrom(timeline, fromIdx, addDays) {
  for (let i = fromIdx; i <= 8; i++) {
    const n = timeline[i]
    if (!n?.time) continue
    if (i === 8) {
      n.time = _addDays(n.time.slice(0, 10), addDays)
    } else {
      const datePart = n.time.slice(0, 10)
      const rest = n.time.length > 10 ? n.time.slice(11) : '12:00:00'
      n.time = `${_addDays(datePart, addDays)} ${rest}`
    }
  }
}

function _buildTimeline(baseDate, upToIdx, id, ops, purchase) {
  const persons = [ops, ops, REVS[id%4], purchase, WHMGRS[id%4], purchase, AGENTS[id%4], WHMGRS[id%4], ops]
  return SUB_NODES.map(({ key }, idx) => {
    if (idx < upToIdx) {
      const d = _addDays(baseDate, idx * 2 + 1 + (id % 3))
      const h = 8 + (idx * 3 + id) % 10
      const m = (idx * 13 + id * 7) % 60
      const s = (idx * 7  + id * 3) % 60
      const time = idx === 8 ? d : _dt(d, h, m, s)
      const node = { key, done: true, time, person: persons[idx] }
      if (idx === 1) node.no = `PL2025${String(id).padStart(3,'0')}`
      if (idx === 3) node.no = `PO2025${String(id).padStart(3,'0')}`
      if (idx === 5) node.no = `FBA-CN-${String(id).padStart(3,'0')}`
      return node
    }
    if (idx === upToIdx) {
      const overdue = (id % 7 === 0 && idx < 8)
      return { key, done: false, overdue, ...(idx === 8 ? { estimatedTime: _addDays(baseDate, 50) } : {}) }
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
  const snIdx = subNodeKey ? SUB_NODES.findIndex(n => n.key === subNodeKey) : -1

  let timeline, readyTime = '', totalDays = null, listingStatus = '未上传'
  let listingUploadTime = '', designStatus = '待启动', designCompletedTime = ''

  if (mainStatus === 'pending') {
    timeline = SUB_NODES.map(({ key }) => ({ key, done: false }))
  } else if (mainStatus === 'stocking') {
    // upToIdx 最小取 1，确保"已分配"节点对所有备货发货产品均为绿色（有时间+人员）
    timeline = _buildTimeline(baseDate, Math.max(1, snIdx), id, ops, pur)
    designStatus  = snIdx >= 6 ? '完成平面设计' : snIdx >= 3 ? '进行中' : '待启动'
    listingStatus = snIdx >= 4 && id % 2 === 0 ? '已上传' : '未上传'
    listingUploadTime   = listingStatus === '已上传' ? _addDays(baseDate, 20) : ''
    designCompletedTime = snIdx >= 6 ? _addDays(baseDate, 12 + id % 6) : ''
  } else if (mainStatus === 'ready') {
    // 可开售：待入仓(index 7)节点已完成 + 完成平面设计
    timeline = _buildTimeline(baseDate, 8, id, ops, pur)
    timeline[8] = { key: 'launched', done: false, estimatedTime: _addDays(baseDate, 50) }
    designStatus        = '完成平面设计'
    designCompletedTime = _addDays(baseDate, 12 + id % 6)
    listingStatus       = '已上传'
    listingUploadTime   = _addDays(baseDate, 22)
    readyTime           = _addDays(baseDate, 48)
  } else {
    // listed: 全节点完成
    timeline = _buildTimeline(baseDate, 9, id, ops, pur)
    // mock：约 1/3 已开售单拉长某段区间，使 calcTransitionInfo 出现曾超时环节，【已开售】下也可用右上角「超时」筛出
    if (id % 3 === 1) {
      _shiftTimelineNodesFrom(timeline, 4, 6 + (id % 8))
    }
    designStatus        = '完成平面设计'
    designCompletedTime = _addDays(baseDate, 12 + id % 6)
    listingStatus       = '已上传'
    listingUploadTime   = _addDays(baseDate, 22)
    readyTime           = _addDays(baseDate, 48)
    totalDays           = 50 + (id % 15)
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
    staff: { dev, ops, design: des, purchase: pur },
    listingStatus,
    listingUploadTime,
    designStatus,
    designCompletedTime,
    authTime: baseDate,
    readyTime,
    totalDays,
    logistics: LOGS[id % LOGS.length],
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
  ...Array(10).fill('in_transit'),
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
const mainStatus    = ref('all')
const activeSubNode = ref(null)
const alertFilter   = ref(null) // null | 'overdue' | 'warning'
const currentPage   = ref(1)
const PAGE_SIZE     = 50

// ── 筛选状态 ──────────────────────────────────────────────────────────
const searchField     = ref('name')
const searchKeyword   = ref('')
const filterListing   = ref('')
const filterDesign    = ref('')
const filterShop      = ref('')
const filterBrand     = ref('')
const filterPType     = ref('')
const filterCategory  = ref('')
const filterScene     = ref('')
const filterSeason    = ref('')
const filterTimeField = ref('')
const filterDateRange = ref([])

watch(
  [searchKeyword, searchField, filterListing, filterDesign, filterShop, filterBrand,
   filterPType, filterCategory, filterScene, filterSeason, mainStatus, activeSubNode, alertFilter],
  () => { currentPage.value = 1 },
)

function doReset() {
  searchKeyword.value   = ''
  searchField.value     = 'name'
  filterListing.value   = ''
  filterDesign.value    = ''
  filterShop.value      = ''
  filterBrand.value     = ''
  filterPType.value     = ''
  filterCategory.value  = ''
  filterScene.value     = ''
  filterSeason.value    = ''
  filterTimeField.value = ''
  filterDateRange.value = []
  alertFilter.value     = null
}

// ── 公用筛选函数（复用在 filteredProducts 和 stockingBaseFiltered）──
function applyCommonFilters(list) {
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase()
    list = list.filter(p => {
      switch (searchField.value) {
        case 'sku':  return p.sku.toLowerCase().includes(kw)
        case 'msku': return p.msku.toLowerCase().includes(kw)
        case 'asin': return p.asin.toLowerCase().includes(kw)
        default:     return p.nameCn.toLowerCase().includes(kw)
      }
    })
  }
  if (filterListing.value)  list = list.filter(p => p.listingStatus === filterListing.value)
  if (filterDesign.value)   list = list.filter(p => p.designStatus  === filterDesign.value)
  if (filterShop.value)     list = list.filter(p => p.shop          === filterShop.value)
  if (filterBrand.value)    list = list.filter(p => p.brand         === filterBrand.value)
  if (filterPType.value)    list = list.filter(p => p.productType   === filterPType.value)
  if (filterCategory.value) list = list.filter(p => p.category      === filterCategory.value)
  if (filterScene.value)    list = list.filter(p => p.scene         === filterScene.value)
  if (filterSeason.value)   list = list.filter(p => p.season        === filterSeason.value)
  return list
}

// ── 侧边栏计数：使用 resolveMainStatus 保证流转后的计数准确 ──────────
const tabCounts = computed(() => {
  const base = allProducts.value
  return {
    all:      base.length,
    pending:  base.filter(p => resolveMainStatus(p) === 'pending').length,
    stocking: base.filter(p => resolveMainStatus(p) === 'stocking').length,
    ready:    base.filter(p => resolveMainStatus(p) === 'ready').length,
    listed:   base.filter(p => resolveMainStatus(p) === 'listed').length,
  }
})

// ── 备货发货子节点统计面板：基于当前筛选结果动态计算 ──────────────────
// 只应用普通筛选条件，不过滤 activeSubNode，让所有面板计数同步随查询变化
const stockingBaseFiltered = computed(() => {
  let list = allProducts.value.filter(p => resolveMainStatus(p) === 'stocking')
  return applyCommonFilters(list)
})

// 为统计面板附加 transitionInfos，用于计算 warning 状态数量
const stockingBaseEnriched = computed(() =>
  stockingBaseFiltered.value.map(p => ({
    ...p,
    transitionInfos: p.timeline.map((tl, idx) =>
      idx === 0 ? null : calcTransitionInfo(p.timeline[idx-1], tl, idx, p.logistics),
    ),
  }))
)

const dynamicNodeStats = computed(() => {
  const stats = {}

  // 7 个常规子节点
  for (const node of STOCKING_SUB_NODES) {
    const tlIdx  = SUB_NODES.findIndex(n => n.key === node.key)
    const inNode = stockingBaseEnriched.value.filter(p => p.subNode === node.key)
    stats[node.key] = {
      total:   inNode.length,
      warning: inNode.filter(p => p.transitionInfos[tlIdx]?.state === 'warning').length,
      overdue: inNode.filter(p =>
        p.transitionInfos[tlIdx]?.state === 'overdue' || p.timeline[tlIdx]?.overdue === true
      ).length,
    }
  }

  // 货件入仓派生面板：待入仓节点已完成但平面设计尚未完成
  const warehouseIn = stockingBaseEnriched.value.filter(
    p => p.timeline[7]?.done === true && p.designStatus !== '完成平面设计'
  )
  stats['warehouse_received'] = {
    total:   warehouseIn.length,
    warning: 0,
    overdue: 0,
  }

  return stats
})

// ── 列表数据：应用全部筛选（不含 alertFilter，alertFilter 在下一步处理）──
const filteredProducts = computed(() => {
  let list = allProducts.value

  // 主状态过滤（使用动态 resolveMainStatus）
  if (mainStatus.value !== 'all') {
    list = list.filter(p => resolveMainStatus(p) === mainStatus.value)
  }
  // 子节点过滤（仅在备货发货主状态下生效）
  if (mainStatus.value === 'stocking' && activeSubNode.value) {
    if (activeSubNode.value === 'warehouse_received') {
      // 派生面板：货件已入仓但平面设计未完成
      list = list.filter(p => p.timeline[7]?.done === true && p.designStatus !== '完成平面设计')
    } else {
      list = list.filter(p => p.subNode === activeSubNode.value)
    }
  }

  list = applyCommonFilters(list)

  return list.map(p => ({
    ...p,
    mainStatus: resolveMainStatus(p),
    transitionInfos: p.timeline.map((tl, idx) =>
      idx === 0 ? null : calcTransitionInfo(p.timeline[idx - 1], tl, idx, p.logistics),
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

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return alertedProducts.value.slice(start, start + PAGE_SIZE)
})

// ── 时效计算 ──────────────────────────────────────────────────────────
// actual：仅当目标节点已完成时表示「实际完成耗时」天数；未完成则为 null（界面展示 -/-）
// elapsedDays：用于未完成时的预警/超时判断（上一节点完成日 → 今日）
// overdueDays：仅 state===overdue 时，超出标准的天数（用于「超时X天」）
function calcTransitionInfo(prevTl, currTl, transIdx, logisticsName) {
  if (!prevTl?.done) return null
  let cfg = null
  if (transIdx === 7) cfg = getLogisticsConfig(logisticsName)
  if (!cfg)           cfg = getTransitionConfig(transIdx, logisticsName)
  if (!cfg)           return null

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

    <!-- 主体：左侧菜单 + 右侧内容 -->
    <div class="lt-body">

      <!-- 左侧主状态菜单 -->
      <aside class="lt-sidebar">
        <div class="lt-sidebar-title">上架状态</div>
        <div
          v-for="tab in mainTabs"
          :key="tab.key"
          class="lt-sidebar-item"
          :class="{ active: mainStatus === tab.key }"
          @click="mainStatus = tab.key; activeSubNode = null"
        >
          <span class="lt-sidebar-label">{{ tab.label }}</span>
          <span class="lt-sidebar-count" :class="{ 'count-zero': !tabCounts[tab.key] }">
            {{ tabCounts[tab.key] ?? 0 }}
          </span>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <div class="lt-content">

        <!-- 筛选区（子组件） -->
        <ListingFilterBar
          v-model:searchField="searchField"
          v-model:searchKeyword="searchKeyword"
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
          @reset="doReset"
        />

        <!-- 功能按钮区 -->
        <div class="lt-action-bar">
          <el-button type="primary" size="small">批量上架</el-button>
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
          v-if="mainStatus === 'stocking'"
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
              <div class="lt-col-auth">授权时间</div>
              <div class="lt-col-ready">可开售时间</div>
              <div class="lt-col-total">总用时</div>
              <div class="lt-col-logistics">物流</div>
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
  background: #f0f2f5;
}

/* ── 主体：左右布局 ── */
.lt-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
  overflow: hidden;
}

/* ── 左侧状态菜单 ── */
.lt-sidebar {
  width: 160px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8ecf0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.lt-sidebar-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 14px 16px 8px;
}
.lt-sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  border-left: 3px solid transparent;
  transition: all .15s;
}
.lt-sidebar-item:hover { background: #f5f7fa; }
.lt-sidebar-item.active {
  background: #e6f4ff;
  border-left-color: #1890ff;
  color: #1890ff;
  font-weight: 600;
}
.lt-sidebar-label { flex: 1; }
.lt-sidebar-count {
  font-size: 12px;
  background: #f0f2f5;
  color: #6b7280;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 22px;
  text-align: center;
}
.lt-sidebar-item.active .lt-sidebar-count { background: #bae0ff; color: #1890ff; }
.lt-sidebar-count.count-zero { opacity: .5; }

/* ── 右侧内容区 ── */
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
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
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
  margin-top: 10px;
}

/* 列宽见 listingTableColumns.css */

/* ── 列头 ── */
.lt-col-header .lt-col-action {
  align-items: center;
}
.lt-col-header {
  display: flex;
  align-items: center;
  background: #fafafa;
  border: 1px solid #e8ecf0;
  border-bottom: 2px solid #e0e4ea;
  border-radius: 6px 6px 0 0;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  position: sticky;
  top: 0;
  z-index: 10;
}

.lt-empty { padding: 40px 0; }

/* ── 固定分页（始终在列表底部可见） ── */
.lt-pagination {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 4px;
  border-top: 1px solid #e8ecf0;
  background: #fff;
}
</style>
