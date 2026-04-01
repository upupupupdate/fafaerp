import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import {
  COUNTRY_LABELS,
  DEFAULT_LEVELS,
  MONTH_NAMES_CN,
  PAGE_SIZE,
  SEASON_ATTR_LABELS,
  SEASONALITY_LABELS,
  STATUS_CONFIG,
  STORAGE_KEY,
  TAG_COLORS,
  YEAR_DEFS,
} from '../constants.js'
import {
  calcCurrentStatus,
  calcHolidayDate,
  calcTimeline,
  calcUrgency,
  describeRule,
  escHtml,
  formatDate,
  getLevelById,
  tagColor,
} from '../dateEngine.js'
import { parseImportRow } from '../importParse.js'
import { generateMockRows } from '../mockData.js'

function defaultState() {
  return {
    rows: [],
    tagLibrary: [],
    levels: DEFAULT_LEVELS.map((l) => ({ ...l })),
    selectedYear: 2026,
    activeTab: 'list',
    currentPage: 1,
    keyword: '',
    countryFilter: 'all',
    typeFilter: 'all',
    tagFilter: 'all',
    selectedRowIds: [],
    calFilter: 'all',
  }
}

function getSmartDefaultYear() {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.getFullYear()
}

export function useSceneDict() {
  const state = reactive(defaultState())

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      Object.assign(state, { ...defaultState(), ...saved, activeTab: 'list', selectedRowIds: [] })
      if (!state.levels?.length) state.levels = DEFAULT_LEVELS.map((l) => ({ ...l }))
      state.rows.forEach((r) => {
        if (!Array.isArray(r.tags)) r.tags = []
        if (!r.countries?.length) r.countries = ['US']
      })
      if (!Array.isArray(state.tagLibrary)) state.tagLibrary = []
    }
  } catch {
    Object.assign(state, defaultState())
  }

  if (!state.rows.length) state.rows = generateMockRows()
  state.selectedYear = getSmartDefaultYear()

  function saveState() {
    const { activeTab, selectedRowIds, ...toSave } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }

  const yearHintDef = computed(() => YEAR_DEFS.find((d) => d.year === state.selectedYear) || null)

  const filteredRows = computed(() =>
    state.rows.filter((r) => {
      const kw = state.keyword.toLowerCase()
      if (kw && !r.nameCn.toLowerCase().includes(kw) && !r.nameEn.toLowerCase().includes(kw))
        return false
      if (state.countryFilter !== 'all' && !r.countries.includes(state.countryFilter)) return false
      if (state.typeFilter !== 'all' && r.type !== state.typeFilter) return false
      if (state.tagFilter !== 'all' && !(r.tags || []).includes(state.tagFilter)) return false
      return true
    }),
  )

  const totalFiltered = computed(() => filteredRows.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / PAGE_SIZE)))

  const pageRows = computed(() => {
    const start = (state.currentPage - 1) * PAGE_SIZE
    return filteredRows.value.slice(start, start + PAGE_SIZE)
  })

  watch(totalFiltered, (n) => {
    const maxPage = Math.max(1, Math.ceil(n / PAGE_SIZE))
    if (state.currentPage > maxPage) state.currentPage = maxPage
  })

  const tagFilterOptions = computed(() => {
    const all = [...new Set(state.rows.flatMap((r) => r.tags || []))]
    return all
  })

  const metrics = computed(() => {
    const holiday = state.rows.filter((r) => r.type === 'holiday')
    const sLevel = holiday.filter((r) => r.level === 'S')
    const today = new Date()
    const pending = holiday.filter((r) => {
      const hDate = calcHolidayDate(r.dateRule, state.selectedYear)
      const tl = calcTimeline(hDate, r.level, state.levels, r.leadTimeOverride)
      if (!tl) return false
      const dev = new Date(tl.devStart)
      return dev > today && (dev - today) / 86400000 <= 60
    })
    const inDev = holiday.filter((r) => {
      const hDate = calcHolidayDate(r.dateRule, state.selectedYear)
      const tl = calcTimeline(hDate, r.level, state.levels, r.leadTimeOverride)
      if (!tl) return false
      const s = calcCurrentStatus(tl)
      return s === 'dev' || s === 'purchase'
    })
    return {
      total: state.rows.length,
      slevel: sLevel.length,
      pending: pending.length,
      indev: inDev.length,
    }
  })

  /** 修复：calcTimeline 第三个参数应为 levels 数组 */
  function timelineForRow(r) {
    const hDate =
      r.type === 'holiday' ? calcHolidayDate(r.dateRule, state.selectedYear) : null
    return calcTimeline(hDate, r.level, state.levels, r.leadTimeOverride)
  }

  function rowHolidayDate(r) {
    if (r.type !== 'holiday') return null
    return calcHolidayDate(r.dateRule, state.selectedYear)
  }

  const calendarGroups = computed(() => {
    const year = state.selectedYear
    let items = state.rows
      .filter((r) => r.type === 'holiday')
      .map((r) => {
        const hDate = calcHolidayDate(r.dateRule, year)
        const tl = calcTimeline(hDate, r.level, state.levels, r.leadTimeOverride)
        if (!tl) return null
        const urgency = calcUrgency(tl.devStart)
        return { r, hDate, tl, urgency }
      })
      .filter(Boolean)

    if (state.calFilter === 'urgent') {
      items = items.filter(
        (x) =>
          x.urgency.cls === 'devstart-overdue' || x.urgency.cls === 'devstart-urgent',
      )
    }
    items.sort((a, b) => a.tl.devStart.localeCompare(b.tl.devStart))

    const groups = {}
    items.forEach((x) => {
      const mon = new Date(x.tl.devStart).getMonth()
      if (!groups[mon]) groups[mon] = []
      groups[mon].push(x)
    })
    return Object.keys(groups)
      .sort((a, b) => Number(a) - Number(b))
      .map((mon) => ({
        month: Number(mon),
        label: `${year}年 ${MONTH_NAMES_CN[mon]} 开发启动`,
        items: groups[mon],
      }))
  })

  const rulesRows = computed(() =>
    state.rows.filter((r) => r.type === 'holiday' && r.dateRule),
  )

  /* ── Holiday picker ── */
  const pickerSearch = ref('')
  const pickerShowExpired = ref(false)

  const pickerSections = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const kw = pickerSearch.value.trim().toLowerCase()
    const showExp = pickerShowExpired.value
    const years = [today.getFullYear(), today.getFullYear() + 1, today.getFullYear() + 2]

    const allInstances = []
    state.rows
      .filter((r) => r.type === 'holiday')
      .forEach((r) => {
        years.forEach((yr) => {
          const hDate = calcHolidayDate(r.dateRule, yr)
          if (!hDate) return
          const holD = new Date(hDate)
          const tl = calcTimeline(hDate, r.level, state.levels, r.leadTimeOverride)
          if (!tl) return
          const devD = new Date(tl.devStart)
          const holD2 = new Date(tl.holidayDate)
          const status = calcCurrentStatus(tl)
          const isPast = holD2 < today
          const daysToHol = Math.round((holD2 - today) / 86400000)
          const daysToDevStart = Math.round((devD - today) / 86400000)
          const isRecommend = status === 'dev' || status === 'purchase'
          const isInsuff = daysToHol > 0 && daysToHol <= 30 && status === 'pending'
          const isSoon = daysToDevStart > 0 && daysToDevStart <= 30
          allInstances.push({
            r,
            yr,
            hDate,
            tl,
            status,
            isPast,
            daysToHol,
            daysToDevStart,
            isRecommend,
            isInsuff,
            isSoon,
          })
        })
      })

    let filtered = allInstances.filter((x) => {
      if (!showExp && x.isPast) return false
      if (
        kw &&
        !x.r.nameCn.toLowerCase().includes(kw) &&
        !x.r.nameEn.toLowerCase().includes(kw)
      )
        return false
      return true
    })

    filtered.sort((a, b) => {
      if (a.isRecommend !== b.isRecommend) return a.isRecommend ? -1 : 1
      return new Date(a.hDate) - new Date(b.hDate)
    })

    const recommended = filtered.filter((x) => x.isRecommend)
    const upcoming = filtered.filter((x) => !x.isRecommend && !x.isPast)
    const expired = filtered.filter((x) => x.isPast)
    return { recommended, upcoming, expired, total: filtered.length }
  })

  /* ── Scene modal form ── */
  const sceneModalVisible = ref(false)
  const sceneForm = reactive({
    editingId: null,
    nameCn: '',
    nameEn: '',
    type: 'holiday',
    skuPlan: 0,
    countries: ['US'],
    seasonAttr: 'annual',
    mainCategory: '',
    level: '',
    seasonality: 'strong',
    dateMode: 'fixed',
    fixedMonth: 12,
    fixedDay: 25,
    relNth: 2,
    relWeekday: 0,
    relMonth: 5,
    manual2025: '',
    manual2026: '',
    manual2027: '',
    useOverride: false,
    overrideDev: '',
    overridePur: '',
    overrideWrm: '',
  })

  function readDateRule() {
    const mode = sceneForm.dateMode || 'fixed'
    if (mode === 'fixed')
      return {
        mode: 'fixed',
        month: parseInt(sceneForm.fixedMonth, 10) || 12,
        day: parseInt(sceneForm.fixedDay, 10) || 25,
      }
    if (mode === 'relative')
      return {
        mode: 'relative',
        nth: parseInt(sceneForm.relNth, 10) || 1,
        weekday: parseInt(sceneForm.relWeekday, 10) || 0,
        month: parseInt(sceneForm.relMonth, 10) || 5,
      }
    if (mode === 'manual')
      return {
        mode: 'manual',
        dates: {
          2025: sceneForm.manual2025,
          2026: sceneForm.manual2026,
          2027: sceneForm.manual2027,
        },
      }
    return null
  }

  function readOverride() {
    if (!sceneForm.useOverride) return null
    const dev = parseInt(sceneForm.overrideDev, 10)
    const pur = parseInt(sceneForm.overridePur, 10)
    const wrm = parseInt(sceneForm.overrideWrm, 10)
    const obj = {
      devMonths: Number.isNaN(dev) ? null : dev,
      purMonths: Number.isNaN(pur) ? null : pur,
      wrmDays: Number.isNaN(wrm) ? null : wrm,
    }
    if (obj.devMonths == null && obj.purMonths == null && obj.wrmDays == null) return null
    return obj
  }

  const formTimelinePreview = computed(() => {
    if (sceneForm.type !== 'holiday') return null
    const rule = readDateRule()
    const hDate = calcHolidayDate(rule, state.selectedYear)
    const override = readOverride()
    const tl = calcTimeline(hDate, sceneForm.level, state.levels, override)
    if (!tl) return null
    const lv = getLevelById(state.levels, sceneForm.level)
    return { tl, override, lv }
  })

  function openSceneModal(id) {
    sceneForm.editingId = id
    if (id != null) {
      const r = state.rows.find((x) => x.id === id)
      if (!r) return
      sceneForm.nameCn = r.nameCn || ''
      sceneForm.nameEn = r.nameEn || ''
      sceneForm.type = r.type || 'holiday'
      sceneForm.skuPlan = r.skuPlan || 0
      sceneForm.countries = [...(r.countries || ['US'])]
      if (r.type === 'static') {
        sceneForm.seasonAttr = r.seasonAttr || 'annual'
        sceneForm.mainCategory = r.mainCategory || ''
      } else {
        sceneForm.level = r.level || state.levels[0]?.id || ''
        sceneForm.seasonality = r.seasonality || 'strong'
        const rule = r.dateRule || { mode: 'fixed', month: 12, day: 25 }
        sceneForm.dateMode = rule.mode
        if (rule.mode === 'fixed') {
          sceneForm.fixedMonth = rule.month
          sceneForm.fixedDay = rule.day
        }
        if (rule.mode === 'relative') {
          sceneForm.relNth = rule.nth
          sceneForm.relWeekday = rule.weekday
          sceneForm.relMonth = rule.month
        }
        if (rule.mode === 'manual') {
          sceneForm.manual2025 = rule.dates?.[2025] || ''
          sceneForm.manual2026 = rule.dates?.[2026] || ''
          sceneForm.manual2027 = rule.dates?.[2027] || ''
        }
        const ov = r.leadTimeOverride
        const hasOverride = ov && (ov.devMonths != null || ov.purMonths != null || ov.wrmDays != null)
        sceneForm.useOverride = !!hasOverride
        sceneForm.overrideDev = ov?.devMonths ?? ''
        sceneForm.overridePur = ov?.purMonths ?? ''
        sceneForm.overrideWrm = ov?.wrmDays ?? ''
      }
    } else {
      Object.assign(sceneForm, {
        editingId: null,
        nameCn: '',
        nameEn: '',
        type: 'holiday',
        skuPlan: 0,
        countries: ['US'],
        seasonAttr: 'annual',
        mainCategory: '',
        level: state.levels[0]?.id || '',
        seasonality: 'strong',
        dateMode: 'fixed',
        fixedMonth: 12,
        fixedDay: 25,
        useOverride: false,
        overrideDev: '',
        overridePur: '',
        overrideWrm: '',
      })
    }
    sceneModalVisible.value = true
  }

  function closeSceneModal() {
    sceneModalVisible.value = false
  }

  async function confirmSceneModal() {
    const nameCn = sceneForm.nameCn.trim()
    const nameEn = sceneForm.nameEn.trim()
    if (!nameCn || !nameEn) {
      ElMessage.warning('请填写场景名称（中文和英文均必填）')
      return
    }
    if (!sceneForm.countries?.length) {
      ElMessage.warning('请至少选择一个国家')
      return
    }

    let extra = {}
    if (sceneForm.type === 'static') {
      extra = {
        seasonAttr: sceneForm.seasonAttr,
        mainCategory: sceneForm.mainCategory.trim(),
        level: null,
        seasonality: 'all_year',
        dateRule: null,
        leadTimeOverride: null,
      }
    } else {
      extra = {
        level: sceneForm.level,
        seasonality: sceneForm.seasonality,
        dateRule: readDateRule(),
        seasonAttr: null,
        mainCategory: null,
        leadTimeOverride: readOverride(),
      }
    }
    const skuPlan = parseInt(String(sceneForm.skuPlan), 10) || 0

    if (sceneForm.editingId != null) {
      const idx = state.rows.findIndex((r) => r.id === sceneForm.editingId)
      if (idx >= 0) {
        state.rows[idx] = {
          ...state.rows[idx],
          nameCn,
          nameEn,
          type: sceneForm.type,
          countries: [...sceneForm.countries],
          skuPlan,
          ...extra,
        }
      }
    } else {
      const nextId = state.rows.length ? Math.max(...state.rows.map((r) => r.id)) + 1 : 1
      state.rows.push({
        id: nextId,
        nameCn,
        nameEn,
        type: sceneForm.type,
        countries: [...sceneForm.countries],
        skuPlan,
        tags: [],
        enabled: true,
        ...extra,
      })
    }
    saveState()
    closeSceneModal()
  }

  async function deleteRow(id) {
    try {
      await ElMessageBox.confirm('确认删除此场景？', '提示', { type: 'warning' })
      state.rows = state.rows.filter((r) => r.id !== id)
      state.selectedRowIds = state.selectedRowIds.filter((x) => x !== id)
      saveState()
    } catch {
      /* cancel */
    }
  }

  function toggleRowSelect(id, checked) {
    if (checked) {
      if (!state.selectedRowIds.includes(id)) state.selectedRowIds.push(id)
    } else {
      state.selectedRowIds = state.selectedRowIds.filter((x) => x !== id)
    }
  }

  function toggleSelectAllPage(checked) {
    if (checked) {
      pageRows.value.forEach((r) => {
        if (!state.selectedRowIds.includes(r.id)) state.selectedRowIds.push(r.id)
      })
    } else {
      const ids = new Set(pageRows.value.map((r) => r.id))
      state.selectedRowIds = state.selectedRowIds.filter((id) => !ids.has(id))
    }
  }

  const pageAllSelected = computed(
    () =>
      pageRows.value.length > 0 &&
      pageRows.value.every((r) => state.selectedRowIds.includes(r.id)),
  )

  const pageIndeterminate = computed(() => {
    const n = pageRows.value.filter((r) => state.selectedRowIds.includes(r.id)).length
    return n > 0 && n < pageRows.value.length
  })

  function resetFilters() {
    state.keyword = ''
    state.countryFilter = 'all'
    state.typeFilter = 'all'
    state.tagFilter = 'all'
    state.currentPage = 1
  }

  function genTestData() {
    state.rows = generateMockRows()
    saveState()
    ElMessage.success('已重新生成测试数据')
  }

  /* ── Tag modal ── */
  const tagModalVisible = ref(false)
  const tagModalTitle = ref('')
  const tagModalBatch = ref(false)
  const tagPending = ref([])
  const tagTargetIds = ref([])

  function openTagModal(ids) {
    tagTargetIds.value = [...ids]
    tagModalBatch.value = ids.length > 1
    const first = state.rows.find((r) => r.id === ids[0])
    tagModalTitle.value = tagModalBatch.value
      ? `批量配置标签（${ids.length} 个场景）`
      : `配置标签 — ${first?.nameCn || ''}`
    tagPending.value = tagModalBatch.value ? [] : [...(first?.tags || [])]
    tagModalVisible.value = true
  }

  function confirmTagModal() {
    const isBatch = tagTargetIds.value.length > 1
    tagTargetIds.value.forEach((id) => {
      const r = state.rows.find((x) => x.id === id)
      if (!r) return
      if (isBatch) {
        tagPending.value.forEach((t) => {
          if (!r.tags.includes(t)) r.tags.push(t)
        })
      } else {
        r.tags = [...tagPending.value]
      }
    })
    state.selectedRowIds = []
    saveState()
    tagModalVisible.value = false
  }

  const allTagsLibrary = computed(() => {
    const s = new Set([...state.tagLibrary, ...state.rows.flatMap((r) => r.tags || [])])
    return [...s]
  })

  function addTagFromLibrary(t) {
    if (!tagPending.value.includes(t)) tagPending.value.push(t)
  }

  function removeTag(t) {
    tagPending.value = tagPending.value.filter((x) => x !== t)
  }

  function addNewTagInput(val) {
    const v = val.trim()
    if (!v) return
    if (!state.tagLibrary.includes(v)) state.tagLibrary.push(v)
    if (!tagPending.value.includes(v)) tagPending.value.push(v)
  }

  /* ── Holiday picker ── */
  const pickerVisible = ref(false)

  function openPicker() {
    pickerSearch.value = ''
    pickerShowExpired.value = false
    pickerVisible.value = true
  }

  async function copyPickerText(text) {
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制')
    } catch {
      ElMessage.error('复制失败')
    }
  }

  /* ── Import ── */
  const importVisible = ref(false)
  const importStep = ref(1)
  const importResults = ref([])

  function openImportModal() {
    importStep.value = 1
    importResults.value = []
    importVisible.value = true
  }

  function handleImportFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
        const dataRows = all.slice(2).filter((r) => r.some((c) => String(c).trim() !== ''))
        if (!dataRows.length) {
          ElMessage.warning('未找到有效数据行')
          return
        }
        importResults.value = dataRows.map((row, i) => parseImportRow(row, i + 3, state.levels))
        importStep.value = 2
      } catch (err) {
        ElMessage.error(`文件解析失败：${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function confirmImport() {
    const validRows = importResults.value.filter((r) => r.data).map((r) => r.data)
    if (!validRows.length) return
    const maxId = state.rows.reduce((m, r) => Math.max(m, r.id || 0), 0)
    validRows.forEach((row, i) => {
      row.id = maxId + i + 1
    })
    state.rows.push(...validRows)
    validRows.forEach((r) => {
      ;(r.tags || []).forEach((t) => {
        if (!state.tagLibrary.includes(t)) state.tagLibrary.push(t)
      })
    })
    saveState()
    importVisible.value = false
    ElMessage.success(`成功导入 ${validRows.length} 条场景数据`)
  }

  function downloadImportTemplate() {
    const levelNames = state.levels.map((l) => l.name).join(' / ')
    const lv0 = state.levels[0]?.name || 'S级大促'
    const lv1 = state.levels[1]?.name || 'A级节点'
    const lv2 = state.levels[2]?.name || 'B级促销'

    const headers = [
      '场景名称（中文）*',
      '场景名称（英文）*',
      '场景类型*',
      '归属国家*',
      '节日等级',
      '季节性属性',
      '核心适用季节',
      '主要关联类目',
      '日期模式',
      '固定-月份',
      '固定-日',
      '相对-第几个',
      '相对-星期几',
      '相对-月份',
      '手动-2025年日期',
      '手动-2026年日期',
      '手动-2027年日期',
      'SKU计划数量',
      '标签(逗号分隔)',
    ]

    const hints = [
      '如：美国母亲节（必填）',
      "如：Mother's Day US（必填）",
      '节日场景 / 物理场景（必填）',
      'US,UK,DE,AU,CA,Global（多个用英文逗号，必填）',
      `${levelNames}（节日场景必填）`,
      '强季节性/中季节性/弱季节性/全年可用',
      '全年常青/春夏季/秋冬季（物理场景填）',
      '如：家居装饰（物理场景填）',
      '固定日期/相对日期/手动指定（节日场景必填）',
      '1-12（固定日期时填）',
      '1-31（固定日期时填）',
      '1/2/3/4/-1=最后（相对日期时填）',
      '0=周日…6=周六（相对日期时填）',
      '1-12（相对日期时填）',
      'YYYY-MM-DD（手动指定时填）',
      'YYYY-MM-DD（手动指定时填）',
      'YYYY-MM-DD（手动指定时填）',
      '数字（选填）',
      '多个标签用英文逗号分隔（选填）',
    ]

    const samples = [
      [
        '美国母亲节',
        "Mother's Day (US)",
        '节日场景',
        'US',
        lv1,
        '强季节性',
        '',
        '',
        '相对日期',
        '',
        '',
        2,
        0,
        5,
        '',
        '',
        '',
        50,
        '礼品,女性',
      ],
      [
        '圣诞节',
        'Christmas',
        '节日场景',
        'US,UK,DE',
        lv0,
        '强季节性',
        '',
        '',
        '固定日期',
        12,
        25,
        '',
        '',
        '',
        '',
        '',
        '',
        200,
        '节日,礼品',
      ],
      [
        '开斋节',
        'Eid al-Fitr',
        '节日场景',
        'Global',
        lv2,
        '强季节性',
        '',
        '',
        '手动指定',
        '',
        '',
        '',
        '',
        '',
        '2025-03-31',
        '2026-03-20',
        '2027-03-10',
        80,
        '',
      ],
      [
        '黑色星期五',
        'Black Friday',
        '节日场景',
        'US,UK,DE,CA',
        lv0,
        '强季节性',
        '',
        '',
        '相对日期',
        '',
        '',
        4,
        5,
        11,
        '',
        '',
        '',
        200,
        '爆款场景,年度重点',
      ],
      [
        '户外徒步',
        'Outdoor Hiking',
        '物理场景',
        'US,CA',
        '',
        '',
        '春夏季',
        '户外运动,徒步装备',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        30,
        '常青,户外',
      ],
      [
        '宠物用品',
        'Pet Supplies',
        '物理场景',
        'US,UK,DE,CA',
        '',
        '',
        '全年常青',
        '宠物玩具,宠物服饰',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        60,
        '长尾可卖',
      ],
    ]

    const wsData = [headers, hints, ...samples]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [20, 24, 12, 26, 18, 14, 12, 18, 12, 10, 8, 12, 14, 10, 16, 16, 16, 12, 22].map(
      (w) => ({ wch: w }),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '场景数据')
    XLSX.writeFile(wb, '场景数据导入模板.xlsx')
  }

  /* ── Levels ── */
  function addLevel() {
    const newId = `LV_${Date.now()}`
    state.levels.push({
      id: newId,
      name: '新等级',
      color: '#6366f1',
      devMonths: 4,
      purMonths: 2,
      wrmDays: 14,
    })
    saveState()
  }

  function saveLevel(lv) {
    saveState()
    ElMessage.success('已保存')
  }

  async function deleteLevel(id) {
    const usedBy = state.rows.filter((r) => r.level === id)
    if (usedBy.length) {
      ElMessage.warning(`该等级被 ${usedBy.length} 个场景使用，无法删除`)
      return
    }
    try {
      await ElMessageBox.confirm('确认删除该等级？', '提示', { type: 'warning' })
      state.levels = state.levels.filter((l) => l.id !== id)
      saveState()
    } catch {
      /* cancel */
    }
  }

  function setRowEnabled(row, enabled) {
    row.enabled = enabled
    saveState()
  }

  function removeTagFromRow(row, tag) {
    row.tags = (row.tags || []).filter((t) => t !== tag)
    saveState()
  }

  watch(
    () => [state.keyword, state.countryFilter, state.typeFilter, state.tagFilter],
    () => {
      state.currentPage = 1
    },
  )

  /**
   * 使用 reactive 包装返回值，使模板中 `sd.xxx` 能自动解包嵌套的 ref/computed。
   * 若返回普通对象，则 `sd.tagFilterOptions` 等仍是 Ref 实例，v-for 会遍历其内部结构并触发
   * “Converting circular structure to JSON” 与白屏。
   */
  return reactive({
    state,
    PAGE_SIZE,
    saveState,
    COUNTRY_LABELS,
    SEASONALITY_LABELS,
    SEASON_ATTR_LABELS,
    STATUS_CONFIG,
    TAG_COLORS,
    escHtml,
    formatDate,
    describeRule,
    getLevelById,
    tagColor,
    yearHintDef,
    filteredRows,
    totalFiltered,
    totalPages,
    pageRows,
    tagFilterOptions,
    metrics,
    timelineForRow,
    rowHolidayDate,
    calendarGroups,
    rulesRows,
    pickerSearch,
    pickerShowExpired,
    pickerSections,
    sceneModalVisible,
    sceneForm,
    formTimelinePreview,
    openSceneModal,
    closeSceneModal,
    confirmSceneModal,
    deleteRow,
    toggleRowSelect,
    toggleSelectAllPage,
    pageAllSelected,
    pageIndeterminate,
    resetFilters,
    genTestData,
    tagModalVisible,
    tagModalTitle,
    tagModalBatch,
    tagPending,
    openTagModal,
    confirmTagModal,
    allTagsLibrary,
    addTagFromLibrary,
    removeTag,
    addNewTagInput,
    pickerVisible,
    openPicker,
    copyPickerText,
    importVisible,
    importStep,
    importResults,
    openImportModal,
    handleImportFile,
    confirmImport,
    downloadImportTemplate,
    addLevel,
    saveLevel,
    deleteLevel,
    setRowEnabled,
    removeTagFromRow,
  })
}
