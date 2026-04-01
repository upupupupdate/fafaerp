export const STORAGE_KEY = 'sceneDict_v5'
export const PAGE_SIZE = 20

export const SEASONALITY_LABELS = {
  strong: '强季节性',
  medium: '中季节性',
  weak: '弱季节性',
  all_year: '全年可用',
}
export const SEASON_ATTR_LABELS = {
  annual: '全年常青',
  ss: '春夏 SS',
  fw: '秋冬 FW',
}
export const COUNTRY_LABELS = {
  US: '🇺🇸',
  UK: '🇬🇧',
  DE: '🇩🇪',
  AU: '🇦🇺',
  CA: '🇨🇦',
  Global: '🌏',
}
export const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
export const MONTH_NAMES_CN = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]

export const DEFAULT_LEVELS = [
  { id: 'S', name: 'S级大促', color: '#ef4444', devMonths: 6, purMonths: 3, wrmDays: 30 },
  { id: 'A', name: 'A级重点', color: '#f59e0b', devMonths: 5, purMonths: 2, wrmDays: 21 },
  { id: 'B', name: 'B级常规', color: '#3b82f6', devMonths: 4, purMonths: 2, wrmDays: 14 },
  { id: 'C', name: 'C级长尾', color: '#6b7280', devMonths: 3, purMonths: 1, wrmDays: 7 },
]

export const STATUS_CONFIG = {
  pending: { label: '未开始', cls: 'status-pending' },
  dev: { label: '开发中', cls: 'status-dev' },
  purchase: { label: '待下单', cls: 'status-purchase' },
  warmup: { label: '预热中', cls: 'status-warmup' },
  over: { label: '已过季', cls: 'status-over' },
  steady: { label: '常态开发', cls: 'status-steady' },
}

export const TAG_COLORS = [
  ['#dbeafe', '#1d4ed8'],
  ['#dcfce7', '#166534'],
  ['#fef9c3', '#92400e'],
  ['#ffe4e6', '#9f1239'],
  ['#ede9fe', '#5b21b6'],
  ['#f0fdf4', '#14532d'],
  ['#fff7ed', '#9a3412'],
  ['#f1f5f9', '#334155'],
]

export const YEAR_DEFS = [
  { year: 2024, label: '历史归档', hintCls: 'hint-history' },
  { year: 2025, label: '当前执行', hintCls: 'hint-current' },
  { year: 2026, label: '重点开发', hintCls: 'hint-planning' },
  { year: 2027, label: '预研规划', hintCls: 'hint-research' },
  { year: 2028, label: '远期预研', hintCls: 'hint-research' },
]
