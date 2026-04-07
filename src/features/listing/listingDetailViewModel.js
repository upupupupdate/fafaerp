/**
 * 上架跟踪 — 详情抽屉展示用视图模型（占位取值，后续对接接口/关联页）
 */
import { resolveListStatusLabel, resolveMainStatus } from '@/features/listing/listingDefs.js'

const MAIN_STATUS_TEXT = {
  pending: '待分配',
  stocking: '备货发货',
  ready: '可开售',
  listed: '已开售',
}

/** 空值统一为「--」展示 */
export function disp(v) {
  if (v === null || v === undefined) return '--'
  if (typeof v === 'string' && v.trim() === '') return '--'
  return String(v)
}

const TAG_PRESETS = [
  { label: '设计款', elType: 'danger' },
  { label: '综合类', elType: 'warning' },
  { label: '成品', elType: 'success' },
  { label: '强季节性', elType: 'primary' },
  { label: '4级波动', elType: 'info' },
]

/**
 * @param {object|null} product 列表行产品
 * @returns {object|null}
 */
export function buildListingDetailViewModel(product) {
  if (!product) return null
  const m = resolveMainStatus(product)
  const mainStatusText = MAIN_STATUS_TEXT[m] ?? '—'
  const nodeText = resolveListStatusLabel(product)

  const refImageThumbs = product.imageUrl
    ? [{ url: product.imageUrl }, {}, {}, {}, {}]
    : [{}, {}, {}, {}, {}]

  return {
    mainStatusText,
    statusHeadline: m === 'pending' ? mainStatusText : nodeText || mainStatusText,
    statusSub: m !== 'pending' && nodeText ? `${mainStatusText} · ${nodeText}` : null,

    /** 品名旁彩虹标签（占位，后续可由接口/规则生成） */
    productTags: TAG_PRESETS,

    // ── 产品信息 ──
    imageUrl: product.imageUrl,
    productName: product.nameCn,
    productTitle: product.nameCn,
    sku: product.sku,
    msku: product.msku,
    asin: product.asin,
    brand: product.brand ?? '',
    ops: product.staff?.ops ?? '',
    shop: product.shop ?? '',
    market: '',
    crowd: '',
    material: '',
    craft: '',
    dev: product.staff?.dev ?? '',
    authTime: product.authTime ?? '',

    // ── 参考信息 ──
    coreKeywords: '',
    textElements: '',
    devIdea: '',
    variantPlan: '',
    remarkEarlyLate: '',
    /** 参考图缩略（占位槽位） */
    refImageThumbs,
    /** 参考图下方蓝色小字链接 */
    refImageLinks: [
      { text: '打开参考图文件夹', href: '#' },
      { text: '竞品 ASIN 对比', href: '#' },
    ],

    // ── 采购信息 ──
    isPurchased: '',
    purchaseOwner: '',
    firstMoq: '',
    refCost: '',
    planDelivery: '',
    /** 采购周期（天） */
    purchaseLeadTime: '',
    unitWeightG: '',
    packageSizeCm: '',

    // ── 文件信息-图案 ──
    patternDesigner: '',
    designStorageUrl: '',
    patternTaskEnd: '',

    // ── 文件信息-平面 ──
    graphicDesigner: product.staff?.design ?? '',
    shelfImageUrl: '',
    discountFactor: '',
    graphicTaskEnd: '',

    // ── 文件信息-摄影 ──
    photoStaff: product.staff?.photo ?? '',
    archiveUrl: '',
    photoTaskEnd: '',

    // ── 操作日志（mock） ──
    operationLogs: [
      { time: '2026-03-15 10:22:01', operator: '系统', content: '创建上架跟踪记录', source: '上架跟踪' },
      { time: '2026-03-16 09:00:00', operator: product.staff?.ops || '--', content: '更新节点状态', source: '积加' },
    ],
  }
}
