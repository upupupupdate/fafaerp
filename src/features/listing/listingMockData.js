/**
 * 上架跟踪 / 开售商品 — 共享 Mock 数据（单例列表，多页共用）
 */
import { ref } from 'vue'
import { LISTING_STAFF_OPTIONS, SUB_NODES } from '@/features/listing/listingDefs.js'
import { useCategoryStore } from '@/features/product/useCategoryStore.js'

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
const CATS = ['个护', '美妆', '户外', '家居', '母婴', '运动', '数码', '服饰', '文具', '食品', '宠物', '厨具']
const SCENES = ['防晒', '日妆', '运动', '收纳', '护肤', '健身', '露营', '通勤', '居家', '学习']
const SEASONS = ['夏季', '春季', '全季', '冬季', '秋季']
const BRANDS = ['自研', '代工', 'OEM', '联名', '私标']
const SHOPS = ['US站', 'UK站', 'DE站', 'JP站', 'CA站', 'AU站']
const LOGS = ['海运', '空运', '快递', '铁路']
const PTYPES = ['单品', '单品', '单品', '组合品']
const SO = LISTING_STAFF_OPTIONS
const DEVS = SO.dev
const OPS = SO.ops
const DES = SO.design
const PURS = SO.purchase
const PHOTOS = SO.photo
const REVS = ['审核员A', '审核员B', '审核员C', '审核员D']
const WHMGRS = ['仓管张', '仓管李', '仓管王', '仓管赵']
const AGENTS = ['货代陈', '货代孙', '货代周', '货代钱']

function _todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function _addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/** 将备货时间轴上「已完成」节点压到最近若干天，便于演示多数为非超时；与 calcTransitionInfo 一致 */
function _snapStockingTimelineRecent(timeline, upToIdx, id) {
  const today = _todayStr()
  for (let i = 0; i < upToIdx && i < timeline.length; i++) {
    const tl = timeline[i]
    if (!tl?.done) continue
    const daysBack = (upToIdx - i) * 2 + 1 + (id % 2)
    const d = _addDays(today, -daysBack)
    const h = 8 + (i * 3 + id) % 10
    const m = (i * 13 + id * 7) % 60
    const s = (i * 7 + id * 3) % 60
    tl.time = i === 9 ? d : _dt(d, h, m, s)
    if (i === 1 && !tl.no) tl.no = `PL2025${String(id).padStart(3, '0')}`
    if (i === 3 && !tl.no) tl.no = `PO2025${String(id).padStart(3, '0')}`
    if (i === 5 && !tl.no) tl.no = `FBA-CN-${String(id).padStart(3, '0')}`
  }
}

function _listBadges(mainStatus, subNodeKey, id) {
  const b = []
  if (mainStatus !== 'stocking') {
    if (mainStatus === 'ready') return ['可开售', '待上架']
    if (mainStatus === 'listed') return ['已开售', '在售']
    return ['待分配']
  }
  const sub = subNodeKey || ''
  if (sub === 'plan_review') b.push('待审节点')
  if (['po_inbound', 'shipment_build'].includes(sub)) b.push('备货中')
  if (['shipment_send', 'in_transit'].includes(sub)) {
    b.push('已发货')
    b.push('物流中')
  }
  if (sub === 'plan_pending') b.push('待建计划')
  if (!b.length) b.push('进行中')
  return b.slice(0, 3)
}
function _dt(date, h, m, s) {
  return `${date} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function _shiftTimelineNodesFrom(timeline, fromIdx, addDays) {
  for (let i = fromIdx; i <= 9; i++) {
    const n = timeline[i]
    if (!n?.time) continue
    if (i === 9) {
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
    AGENTS[id % 4],
    AGENTS[id % 4],
    WHMGRS[id % 4],
    ops,
  ]
  return SUB_NODES.map(({ key }, idx) => {
    if (idx < upToIdx) {
      const d = _addDays(baseDate, idx * 2 + 1 + (id % 3))
      const h = 8 + (idx * 3 + id) % 10
      const m = (idx * 13 + id * 7) % 60
      const s = (idx * 7 + id * 3) % 60
      const time = idx === 9 ? d : _dt(d, h, m, s)
      const node = { key, done: true, time, person: persons[idx] }
      if (idx === 1) node.no = `PL2025${String(id).padStart(3, '0')}`
      if (idx === 3) node.no = `PO2025${String(id).padStart(3, '0')}`
      if (idx === 5) node.no = `FBA-CN-${String(id).padStart(3, '0')}`
      return node
    }
    if (idx === upToIdx) {
      const overdue = id % 7 === 0 && idx < 9
      return { key, done: false, overdue, ...(idx === 9 ? { estimatedTime: _addDays(baseDate, 50) } : {}) }
    }
    return { key, done: false }
  })
}

function _makeProd(id, mainStatus, subNodeKey, baseDate, leaf = null) {
  const nm = NAMES[(id - 1) % NAMES.length]
  const sfx = id > NAMES.length ? ` Pro ${Math.floor((id - 1) / NAMES.length) + 1}` : ''
  const dev = DEVS[id % DEVS.length]
  const ops = OPS[id % OPS.length]
  const des = DES[id % DES.length]
  const pur = PURS[id % PURS.length]
  const photo = PHOTOS[id % PHOTOS.length]
  const snIdx = subNodeKey ? SUB_NODES.findIndex((n) => n.key === subNodeKey) : -1

  let timeline
  let readyTime = ''
  let listingStatus = '未上传'
  let listingUploadTime = ''
  let designStatus = '待平面设计'
  let designCompletedTime = ''

  if (mainStatus === 'pending') {
    timeline = SUB_NODES.map(({ key }) => ({ key, done: false }))
  } else if (mainStatus === 'stocking') {
    timeline = _buildTimeline(baseDate, Math.max(1, snIdx), id, ops, pur)
    designStatus = snIdx >= 6 ? '完成平面设计' : '待平面设计'
    listingStatus = snIdx >= 4 && id % 2 === 0 ? '已上传' : '未上传'
    listingUploadTime = listingStatus === '已上传' ? _addDays(baseDate, 20) : ''
    designCompletedTime = snIdx >= 6 ? _addDays(baseDate, 12 + (id % 6)) : ''
  } else if (mainStatus === 'ready') {
    timeline = _buildTimeline(baseDate, 8, id, ops, pur)
    timeline[9] = { key: 'launched', done: false, estimatedTime: _addDays(baseDate, 50) }
    designStatus = '完成平面设计'
    designCompletedTime = _addDays(baseDate, 12 + (id % 6))
    listingStatus = '已上传'
    listingUploadTime = _addDays(baseDate, 22)
    readyTime = _addDays(baseDate, 48)
  } else {
    timeline = _buildTimeline(baseDate, 10, id, ops, pur)
    if (id % 3 === 1) {
      _shiftTimelineNodesFrom(timeline, 4, 6 + (id % 8))
    }
    designStatus = '完成平面设计'
    designCompletedTime = _addDays(baseDate, 12 + (id % 6))
    listingStatus = '已上传'
    listingUploadTime = _addDays(baseDate, 22)
    readyTime = _addDays(baseDate, 48)
  }

  const skuNum = String((id * 12345) % 899999 + 100000)
  const sh = SHOPS[id % SHOPS.length]
  const destCode = sh.slice(0, 2).toUpperCase()
  const tagDesign = id % 3 === 0 ? '非设计款' : '设计款'
  /** 列表视图：成品 / 组合品（与 productType 一致） */
  const tagProductForm = PTYPES[id % PTYPES.length] === '组合品' ? '组合品' : '成品'
  const materials = ['PVC材质', 'ABS材质', '硅胶', '不锈钢', '棉麻', '塑料']
  const materialShort = materials[id % materials.length]
  const listDisplayBadges = _listBadges(mainStatus, subNodeKey, id)

  return {
    id,
    imageUrl: '',
    /** 列表视图缩略图（演示） */
    listThumbUrl: `https://picsum.photos/seed/fafa-list-${id}/80/80`,
    nameCn: nm + sfx,
    sku: `SK${skuNum}`,
    msku: `SK${skuNum}-${sh.slice(0, 2)}-${String((id % 99) + 1).padStart(2, '0')}`,
    asin: `B0${String(Math.abs((id * 98765321) % 1000000000))
      .padStart(9, '0')
      .slice(0, 9)}`,
    mainStatus,
    subNode: subNodeKey,
    category: leaf?.name ?? CATS[id % CATS.length],
    categoryId: leaf?.id ?? '',
    scene: SCENES[id % SCENES.length],
    season: SEASONS[id % SEASONS.length],
    brand: BRANDS[id % BRANDS.length],
    shop: sh,
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
    shipCountry: '中国内地',
    destWarehouse: ['美东 FBA 仓', '美西 FBA 仓', '国内中转仓', '海外仓'][id % 4],
    /** 采购交期（天），缺省推算预计入库时用 */
    purchaseLeadTimeDays: 10 + (id % 15),
    jiujiaEstPurchaseInboundAt: _dt(_addDays(baseDate, 16 + (id % 5)), 10, 0, 0),
    jiujiaEstWarehouseArrivalAt: _dt(_addDays(baseDate, 32 + (id % 7)), 14, 30, 0),
    firstLegSlaSource: 'jijia',
    proposalNo: `YXF${String(2603160000 + id)}`,
    transferOrderNo: id % 4 === 0 ? `DB${String(8800000 + id)}` : '',
    firstLegTrackingNo: id % 3 === 0 ? `TC${String(6600000 + id)}` : '',
    /** 列表视图扩展：标签、货件摘要、PLT、制单等（演示） */
    tagDesign,
    tagProductForm,
    materialShort,
    listDisplayBadges,
    shipmentDisplayCode: `JYN-${String(2131000 + id)}-${String(id).padStart(3, '0')}`,
    destMarketCode: destCode,
    channelLogisticsLine: `OnceMoc${destCode}_FBA`,
    pltTotal: 12 + (id % 48),
    pltPrice: (128 + (id % 50) * 7).toFixed(2),
    boxTime: mainStatus === 'stocking' && snIdx >= 5 ? _dt(_addDays(baseDate, 18 + (id % 5)), 11, 20, 0) : '',
    submissionTime: mainStatus === 'stocking' && snIdx >= 2 ? _dt(_addDays(baseDate, 5 + (id % 4)), 15, 0, 0) : '',
    startReportTime: _dt(baseDate, 10, 21, 48),
    videoListingStatus: listingStatus === '已上传' ? '已上架' : '未上传',
    productionOrderNo: `ZZ${String(9900000 + id)}`,
    timeline,
  }
}

const _stockingSNs = [
  ...Array(14).fill('plan_pending'),
  ...Array(7).fill('plan_review'),
  ...Array(7).fill('po_pending'),
  ...Array(8).fill('po_inbound'),
  ...Array(9).fill('shipment_build'),
  ...Array(7).fill('shipment_send'),
  ...Array(8).fill('in_transit'),
]

function genMockProducts() {
  const catStore = useCategoryStore()
  const leaves = catStore.flat.value.filter((n) => n.isLeaf)
  const pickLeaf = (seed) => (leaves.length ? leaves[Math.abs(seed) % leaves.length] : null)

  const list = []
  for (let i = 1; i <= 10; i++) {
    list.push(_makeProd(i, 'pending', null, `2025-03-${String(i).padStart(2, '0')}`, pickLeaf(i)))
  }
  for (let i = 0; i < 60; i++) {
    const id = 11 + i
    const month = String((Math.floor(i / 6) % 12) + 1).padStart(2, '0')
    const day = String((i * 2) % 28 + 1).padStart(2, '0')
    /** 约 1/4 使用 2024 长账期（易呈现超时）；其余将时间轴压到近端，便于与「超时」筛选区分 */
    const stale = i % 4 === 0
    const baseDate = stale ? `2024-${month}-${day}` : _addDays(_todayStr(), -(14 + (i % 20)))
    const p = _makeProd(id, 'stocking', _stockingSNs[i], baseDate, pickLeaf(id))
    if (!stale) {
      const snIdx = SUB_NODES.findIndex((n) => n.key === _stockingSNs[i])
      _snapStockingTimelineRecent(p.timeline, Math.max(1, snIdx), id)
    }
    list.push(p)
  }
  for (let i = 71; i <= 85; i++) {
    const month = String((i % 12) + 1).padStart(2, '0')
    const day = String((i * 2) % 28 + 1).padStart(2, '0')
    list.push(_makeProd(i, 'ready', null, `2024-${month}-${day}`, pickLeaf(i)))
  }
  for (let i = 86; i <= 100; i++) {
    const month = String((i % 6) + 1).padStart(2, '0')
    const day = String((i * 2) % 28 + 1).padStart(2, '0')
    list.push(_makeProd(i, 'listed', null, `2024-${month}-${day}`, pickLeaf(i)))
  }

  const overdueDemo = [
    { id: 101, sub: 'plan_pending', title: '【演示】超时未完成·待建计划' },
    { id: 102, sub: 'plan_review', title: '【演示】超时未完成·计划待审' },
    { id: 103, sub: 'po_pending', title: '【演示】超时未完成·待采购下单' },
  ]
  for (const d of overdueDemo) {
    const p = _makeProd(d.id, 'stocking', d.sub, '2022-01-08', pickLeaf(d.id))
    p.nameCn = `${d.title} · ${p.nameCn}`
    list.push(p)
  }

  // 边栏「货件入仓」：时间轴已到「待入仓」完成，但平面仍为待平面 → 主状态备货中，不可开售
  const whInboundIds = [200, 201, 202]
  for (const wid of whInboundIds) {
    const p = _makeProd(wid, 'stocking', 'ready_to_sell', '2024-08-10', pickLeaf(wid))
    p.nameCn = `【演示·货件入仓】已到仓待平面 · ${p.nameCn}`
    p.designStatus = '待平面设计'
    p.designCompletedTime = ''
    list.push(p)
  }

  return list
}

/** 全量上架 Mock（上架跟踪 + 开售商品共用） */
export const allListingProducts = ref(genMockProducts())
