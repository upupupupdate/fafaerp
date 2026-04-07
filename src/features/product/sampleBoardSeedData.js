/**
 * 样板管理 / 新品开发联动演示数据
 * — 两条「已提交开款、处于样板中」的开发单，与样板管理列表一一对应
 */
import { buildNpdApparelTimeline, attachNpdTransitionInfos } from '@/features/product/npdApparelTimeline.js'
import { mergeNpdApparelRow } from '@/features/product/npdApparelRowFields.js'
import { NPD_WORKFLOW_LABELS } from '@/features/product/npdApparelMock.js'

const SEED_DEFS = [
  {
    id: 'npd_seed_sm_1',
    seq: 901,
    nameCn: '【演示】休闲卫衣·样板管理中',
    designNo: '26SS01L260391',
    spu: 'FM81DLC5L255501991',
    brand: '自研',
    market: 'US',
    category: '卫衣',
    scene: '休闲',
    audience: '男装',
    gender: '男装',
    openDate: '2026-03-08',
    mainFabricExtra: '主身：色卡大身布；罗纹同缸',
    sampleWeightGsm: 280,
  },
  {
    id: 'npd_seed_sm_2',
    seq: 902,
    nameCn: '【演示】运动速干短袖·打样中',
    designNo: '26SS01L260392',
    spu: 'FM81DLC5L255501992',
    brand: 'RIKUIAOU',
    market: 'EU',
    category: '毛衣/T恤',
    scene: '运动',
    audience: '女装',
    gender: '女装',
    openDate: '2026-03-10',
    mainFabricExtra: '',
    sampleWeightGsm: 150,
  },
]

/**
 * 新品开发列表：若本地无此 id，则插入（与样板种子同源）
 */
export function getSeedNpdRowsForSampleBoard() {
  const baseDate = '2026-02-10'
  const workflowPhase = 'sampling'

  return SEED_DEFS.map((d) => {
    const timeline = buildNpdApparelTimeline(baseDate, workflowPhase, d.seq)
    const transitionInfos = attachNpdTransitionInfos(timeline)
    return mergeNpdApparelRow({
      ...d,
      fabricCardId: 'fc_demo_1',
      sizeChartId: 'sz_demo_1',
      shelfYear: '2026',
      launchSeason: 'SS',
      season: '2025春夏',
      fitType: 'regular',
      imageUrl: '',
      staff: { dev: '张开发', craft: '钱工艺', pattern: '吴版师', ops: '刘运营' },
      patternName: '',
      sampleSize: 'M',
      accessories: '',
      craftDict: '车缝/包边',
      designPoint: '基础款',
      fabricType: '针织纬编',
      devIdea: '演示：已从新品开发提交开款进入样板管理。',
      productKeyInfo: '',
      remark: '',
      selectedFabricColorZh: ['白色', '灰色', '藏青'],
      selectedSizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
      workflowPhase,
      workflowLabel: NPD_WORKFLOW_LABELS[workflowPhase],
      timeline,
      transitionInfos,
    })
  })
}
