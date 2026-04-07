/**
 * 服装新品开发 — 行数据默认字段（与业务初版字段表对齐）
 */
export const LAUNCH_SEASON_OPTIONS = [
  { value: 'SS', label: '春夏(SS)' },
  { value: 'AW', label: '秋冬(AW)' },
  { value: 'AL', label: '四季(AL)' },
]

export function launchSeasonLabel(v) {
  return LAUNCH_SEASON_OPTIONS.find((o) => o.value === v)?.label ?? v ?? '—'
}

/** 新建/归一化时合并的默认值 */
export function emptyNpdApparelFields() {
  return {
    audience: '',
    launchSeason: 'SS',
    fabricType: '',
    craftDict: '',
    designPoint: '',
    seasonalityTags: [],
    seasonalityAutoFetched: false,
    productLevel: '',
    productTags: [],
    staff: { dev: '', craft: '', pattern: '', ops: '' },
    targetCost: '',
    needFabricSourcing: false,
    firstMoq: '',
    firstStockColors: '',
    firstLogisticsType: '',
    isPatternStyle: false,
    patternDesign: '',
    patternCoeff: '',
    shareFolderUrl: '',
    competitorImages: [],
    competitorLinks: [],
    productKeyInfo: '',
    remark: '',
    /** 样版：主色卡勾选的颜色 zh 列表；空表示未限定（提交时用色卡全部颜色） */
    selectedFabricColorZh: [],
    /** 样版：尺码表勾选的尺码；空表示未限定 */
    selectedSizes: [],
    /** 样版：SKC 行（每色一行） */
    patternColorRows: [],
    /** 样版：附加引用色卡 id（面辅料） */
    auxFabricCardIds: [],
    /** 样版：图采款（与图案款 isPatternStyle 区分：图采=供采图业务标记） */
    isGraphicDesign: false,
    patternSheetName: '',
    /** 样衣 */
    sampleGarmentColor: '',
    sampleFieldwork: '',
    sampleUsages: [],
    sampleOuterLink: '',
    sampleGarmentRemark: '',
    /** 操作日志（本地演示） */
    auditLog: [],
  }
}

/** 旧数据补全新字段 */
export function mergeNpdApparelRow(raw) {
  const base = { ...emptyNpdApparelFields(), ...raw }
  if (!base.staff || typeof base.staff !== 'object') {
    base.staff = { dev: '', craft: '', pattern: '', ops: '' }
  } else {
    base.staff = {
      dev: base.staff.dev ?? '',
      craft: base.staff.craft ?? '',
      pattern: base.staff.pattern ?? '',
      ops: base.staff.ops ?? '',
    }
  }
  if (!Array.isArray(base.competitorImages)) base.competitorImages = []
  if (!Array.isArray(base.competitorLinks)) base.competitorLinks = []
  if (!Array.isArray(base.seasonalityTags)) base.seasonalityTags = []
  if (!Array.isArray(base.productTags)) base.productTags = []
  if (!Array.isArray(base.keywords)) base.keywords = []
  if (!Array.isArray(base.productAttrs)) base.productAttrs = []
  if (!Array.isArray(base.tags)) base.tags = []
  // 迁移旧单图/单链
  if (!base.competitorImages.length && raw?.refImageUrl) {
    base.competitorImages = [raw.refImageUrl]
  }
  if (!base.competitorLinks.length && raw?.refLink) {
    base.competitorLinks = [raw.refLink]
  }
  if (!base.audience && raw?.gender) base.audience = raw.gender

  if (!Array.isArray(base.selectedFabricColorZh)) base.selectedFabricColorZh = []
  if (!Array.isArray(base.selectedSizes)) base.selectedSizes = []
  if (!Array.isArray(base.patternColorRows)) base.patternColorRows = []
  if (!Array.isArray(base.auxFabricCardIds)) base.auxFabricCardIds = []
  if (!Array.isArray(base.sampleUsages)) base.sampleUsages = []
  if (!Array.isArray(base.auditLog)) base.auditLog = []

  return base
}
