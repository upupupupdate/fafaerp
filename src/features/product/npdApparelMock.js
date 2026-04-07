import { buildNpdApparelTimeline, attachNpdTransitionInfos } from '@/features/product/npdApparelTimeline.js'
import { emptyNpdApparelFields, mergeNpdApparelRow } from '@/features/product/npdApparelRowFields.js'

export const NPD_WORKFLOW_LABELS = {
  draft: '草稿箱',
  pending_review: '待审核',
  pending_style: '待开款',
  sampling: '样板中',
  completed: '已完成',
  rejected: '审核驳回',
  void: '已作废',
}

const PHASE_ROTATION = ['draft', 'pending_review', 'pending_style', 'sampling', 'completed']

const NAMES = [
  '针织开衫外套 春季薄款',
  '休闲卫衣 连帽印花',
  '运动速干短袖',
  '儿童针织毛衣',
  '梭织衬衫 商务通勤',
]
const CATS = ['毛衣/T恤', '卫衣', '裤装', '外套', '衬衫']
const BRANDS = ['RIKUIAOU', '自研', 'OEM', '联名']
const SEASONS = ['2024春夏', '2024秋冬', '2025春夏']
const MARKETS = ['US', 'EU', 'UK', 'JP']
const GENDERS = ['男装', '女装', '童装']
const ATTRS_POOL = [
  ['品牌专享', '小批量'],
  ['热卖', '新品'],
  ['品牌专享'],
  ['小批量', '限定'],
]

function nextNpdSeqFromRows(existingRows) {
  let max = 0
  for (const r of existingRows || []) {
    const m = typeof r?.id === 'string' ? /^npd_(\d+)$/.exec(r.id) : null
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

/**
 * 新增一条「草稿箱」开发单（本地）
 */
export function createDraftNpdRow(seq) {
  const id = `npd_${seq}`
  const workflowPhase = 'draft'
  const baseDate = new Date().toISOString().slice(0, 10)
  const timeline = buildNpdApparelTimeline(baseDate, workflowPhase, seq)
  const transitionInfos = attachNpdTransitionInfos(timeline)
  const y = String(new Date().getFullYear())

  return mergeNpdApparelRow({
    ...emptyNpdApparelFields(),
    id,
    designNo: '',
    fabricCardId: '',
    sizeChartId: '',
    shelfYear: y,
    launchSeason: 'SS',
    mainFabricExtra: '',
    accessories: '',
    patternName: '',
    sampleSize: 'M',
    sampleWeightGsm: 180,
    openDate: '',
    imageUrl: '',
    nameCn: '未命名新款',
    spu: '',
    tags: [],
    category: '',
    brand: '',
    season: '',
    forecastSales: '',
    market: '',
    scene: '',
    targetPrice: '',
    targetCost: '',
    materialCost: '',
    productionCost: '',
    leadTime: '',
    materialLeadTime: '',
    outsourceFactory: '',
    workshopNotes: '',
    craftNotes: '',
    revisionDate: '',
    packagingType: '',
    packagingMaterials: '',
    gender: '',
    devIdea: '',
    keywords: [],
    fitType: 'regular',
    fabricMeters: '',
    specNote: '',
    productAttrs: [],
    dueDate: '',
    refImageUrl: '',
    refLink: '',
    competitorImages: [],
    competitorLinks: [],
    productKeyInfo: '',
    remark: '',
    workflowPhase,
    workflowLabel: NPD_WORKFLOW_LABELS[workflowPhase],
    timeline,
    transitionInfos,
  })
}

export { nextNpdSeqFromRows }

/**
 * 演示用列表数据
 */
export function genNpdApparelMockList(count = 14) {
  const list = []
  for (let i = 0; i < count; i++) {
    const id = i + 1
    let workflowPhase = PHASE_ROTATION[i % PHASE_ROTATION.length]
    if (i === 12) workflowPhase = 'rejected'
    if (i === 13) workflowPhase = 'void'

    const baseDate = `2024-${String((i % 11) + 1).padStart(2, '0')}-${String((i * 3) % 27 + 1).padStart(2, '0')}`
    const timeline = buildNpdApparelTimeline(baseDate, workflowPhase, id)
    const transitionInfos = attachNpdTransitionInfos(timeline)

    const fitType = ['slim', 'regular', 'loose'][i % 3]
    const spu = `FM81DLC5L255501${String(1000 + id).slice(1)}`
    const designNo = `26SS01L2603${String(id).padStart(3, '0')}`
    const fabricCardId = i % 5 === 4 ? '' : 'fc_demo_1'
    const sizeChartId = i % 5 === 4 ? '' : 'sz_demo_1'
    const shelfYear = (SEASONS[i % SEASONS.length] || '').match(/\d{4}/)?.[0] || '2026'
    const launchSeason = ['SS', 'AW', 'AL'][i % 3]
    const audience = GENDERS[i % GENDERS.length]

    const row = mergeNpdApparelRow({
      id: `npd_${id}`,
      designNo,
      fabricCardId,
      sizeChartId,
      shelfYear,
      launchSeason,
      audience,
      fabricType: ['针织纬编', '梭织', '针织经编'][i % 3],
      craftDict: '车缝/包边',
      designPoint: ['基础款', '印花', '拼接'][i % 3],
      seasonalityTags: i % 2 === 0 ? ['春季', '休闲'] : [],
      seasonalityAutoFetched: false,
      productLevel: ['A', 'B', 'C'][i % 3],
      productTags: [['引流'], ['主力'], ['长尾']][i % 3],
      mainFabricExtra: i % 3 === 0 ? '主身：色卡大身布；罗纹同缸' : '',
      accessories: i % 4 === 0 ? '拉链、主唛、洗唛' : '',
      patternName: i % 7 === 0 ? '印花A' : '',
      sampleSize: 'M',
      sampleWeightGsm: 140 + (i % 5) * 10,
      openDate: '',
      imageUrl: '',
      nameCn: NAMES[i % NAMES.length] + (i >= NAMES.length ? ` #${Math.floor(i / NAMES.length) + 1}` : ''),
      spu,
      tags: [CATS[i % CATS.length].split('/')[0], GENDERS[i % 3], GENDERS[(i + 1) % 3]].filter((x, j, a) => a.indexOf(x) === j),
      category: CATS[i % CATS.length],
      brand: BRANDS[i % BRANDS.length],
      season: SEASONS[i % SEASONS.length],
      forecastSales: 500 + (i * 137) % 4000,
      market: MARKETS[i % MARKETS.length],
      scene: ['运动', '休闲', '通勤'][i % 3],
      targetPrice: 9 + (i % 5) * 2,
      targetCost: String(8 + (i % 5) * 2),
      materialCost: '',
      productionCost: '',
      leadTime: '',
      materialLeadTime: '',
      outsourceFactory: '',
      workshopNotes: '',
      craftNotes: '',
      revisionDate: '',
      packagingType: '',
      packagingMaterials: '',
      gender: audience,
      needFabricSourcing: i % 2 === 0,
      firstMoq: '300',
      firstStockColors: '黑/白',
      firstLogisticsType: '海运',
      isPatternStyle: i % 7 === 0,
      patternDesign: i % 7 === 0 ? '满版印花' : '',
      patternCoeff: i % 7 === 0 ? '1.2' : '',
      shareFolderUrl: '',
      staff: {
        dev: ['张开发', '李开发', '王开发'][i % 3],
        craft: ['钱工艺', '孙工艺'][i % 2],
        pattern: ['吴版师', '郑版师', '冯版师'][i % 3],
        ops: ['刘运营', '陈运营'][i % 2],
      },
      refImageUrl: '',
      refLink: i % 4 === 0 ? 'https://example.com/ref' : '',
      competitorImages: i % 4 === 0 ? ['https://example.com/c1.png'] : [],
      competitorLinks: i % 4 === 0 ? ['https://example.com/ref'] : [],
      devIdea: i % 3 === 0 ? '亲肤透气，春季主推款，注意领口罗纹工艺。' : '基础款跑量，控制成本。',
      productKeyInfo: '关键信息：克重与色牢度',
      remark: i % 3 === 0 ? '注意交期' : '',
      keywords: ['针织', '春季', '休闲'].slice(0, 1 + (i % 3)),
      fitType,
      fabricMeters: `${80 + (i * 11) % 120}`,
      specNote: i % 2 === 0 ? '柔软亲肤、色牢度≥4级' : '',
      productAttrs: ATTRS_POOL[i % ATTRS_POOL.length],
      dueDate: `2025-${String((i % 9) + 1).padStart(2, '0')}-${String((i * 2) % 26 + 1).padStart(2, '0')}`,
      workflowPhase,
      workflowLabel: NPD_WORKFLOW_LABELS[workflowPhase],
      timeline,
      transitionInfos,
    })
    list.push(row)
  }
  return list
}
