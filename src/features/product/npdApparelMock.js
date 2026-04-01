import { buildNpdApparelTimeline, attachNpdTransitionInfos } from '@/features/product/npdApparelTimeline.js'

export const NPD_WORKFLOW_LABELS = {
  draft: '草稿中',
  pending_review: '待审核',
  pending_style: '待开款',
  sampling: '样板中',
  completed: '已完成',
  rejected: '审核驳回',
  void: '已作废',
}

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

function _phaseFromProgress(upToIdx, i) {
  if (upToIdx <= 0) return 'draft'
  if (upToIdx === 1) return 'pending_review'
  if (upToIdx <= 4) return 'sampling'
  if (upToIdx === 5) return 'pending_style'
  if (upToIdx <= 7) return i % 2 === 0 ? 'sampling' : 'pending_style'
  return 'completed'
}

/**
 * 演示用列表数据；对接 API 后可删除
 */
export function genNpdApparelMockList(count = 14) {
  const list = []
  for (let i = 0; i < count; i++) {
    const id = i + 1
    const upToIdx = i % 9
    const baseDate = `2024-${String((i % 11) + 1).padStart(2, '0')}-${String((i * 3) % 27 + 1).padStart(2, '0')}`
    const timeline = buildNpdApparelTimeline(baseDate, upToIdx, id)
    const transitionInfos = attachNpdTransitionInfos(timeline)

    let workflowPhase = _phaseFromProgress(upToIdx, i)
    if (i === 12) workflowPhase = 'rejected'
    if (i === 13) workflowPhase = 'void'

    const fitType = ['slim', 'regular', 'loose'][i % 3]
    const spu = `FM81DLC5L255501${String(1000 + id).slice(1)}`

    list.push({
      id: `npd_${id}`,
      imageUrl: '',
      nameCn: NAMES[i % NAMES.length] + (i >= NAMES.length ? ` #${Math.floor(i / NAMES.length) + 1}` : ''),
      spu,
      tags: [CATS[i % CATS.length].split('/')[0], GENDERS[i % 3], GENDERS[(i + 1) % 3]].filter((x, j, a) => a.indexOf(x) === j),
      category: CATS[i % CATS.length],
      brand: BRANDS[i % BRANDS.length],
      season: SEASONS[i % SEASONS.length],
      forecastSales: 500 + (i * 137) % 4000,
      market: MARKETS[i % MARKETS.length],
      gender: GENDERS[i % GENDERS.length],
      staff: {
        dev: ['张开发', '李开发', '王开发'][i % 3],
        craft: ['钱工艺', '孙工艺'][i % 2],
        pattern: ['吴版师', '郑版师', '冯版师'][i % 3],
      },
      refImageUrl: '',
      refLink: i % 4 === 0 ? 'https://example.com/ref' : '',
      devIdea: i % 3 === 0 ? '亲肤透气，春季主推款，注意领口罗纹工艺。' : '基础款跑量，控制成本。',
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
  }
  return list
}
