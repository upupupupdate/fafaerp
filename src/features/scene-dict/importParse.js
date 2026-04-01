/** 自 scene-dict-page/app.js parseImportRow 迁移 */
export function parseImportRow(row, rowNum, levels) {
  const g = (i) => String(row[i] ?? '').trim()
  const gi = (i) => parseInt(g(i), 10)

  const nameCn = g(0)
  const nameEn = g(1)
  const typeName = g(2)
  const countries = g(3)
  const level = g(4)
  const seasonality = g(5)
  const seasonAttr = g(6)
  const mainCat = g(7)
  const dateMode = g(8)
  const fixedMon = g(9)
  const fixedDay = g(10)
  const relNth = g(11)
  const relWd = g(12)
  const relMon = g(13)
  const m2025 = g(14)
  const m2026 = g(15)
  const m2027 = g(16)
  const skuPlan = g(17)
  const tags = g(18)

  const errors = []

  if (!nameCn) errors.push('场景名称（中文）不能为空')
  if (!nameEn) errors.push('场景名称（英文）不能为空')

  const type = typeName.includes('节日') ? 'holiday' : typeName.includes('物理') ? 'static' : null
  if (!type) errors.push(`场景类型"${typeName || '空'}"无效，请填"节日场景"或"物理场景"`)

  const VALID_COUNTRIES = ['US', 'UK', 'DE', 'AU', 'CA', 'Global']
  const countryList = countries
    ? countries
        .split(/[,，\s]+/)
        .map((c) => c.trim())
        .filter(Boolean)
    : []
  if (!countryList.length) errors.push('归属国家不能为空')
  countryList.forEach((c) => {
    if (!VALID_COUNTRIES.includes(c))
      errors.push(`国家代码"${c}"无效（有效值：US UK DE AU CA Global）`)
  })

  let dateRule = null
  if (type === 'holiday') {
    if (!level) errors.push('节日场景需要填写节日等级')

    const mode = dateMode.includes('固定')
      ? 'fixed'
      : dateMode.includes('相对')
        ? 'relative'
        : dateMode.includes('手动')
          ? 'manual'
          : null
    if (!mode) {
      errors.push(`日期模式"${dateMode || '空'}"无效（填"固定日期"/"相对日期"/"手动指定"）`)
    } else if (mode === 'fixed') {
      const m = gi(9)
      const d = gi(10)
      if (!m || m < 1 || m > 12) errors.push('固定-月份无效（填1-12）')
      else if (!d || d < 1 || d > 31) errors.push('固定-日无效（填1-31）')
      else dateRule = { mode: 'fixed', month: m, day: d }
    } else if (mode === 'relative') {
      const nth = parseInt(relNth, 10)
      const wd = parseInt(relWd, 10)
      const mon = parseInt(relMon, 10)
      if (Number.isNaN(nth) || nth === 0 || nth < -1 || nth > 4)
        errors.push('相对-第几个无效（填1/2/3/4/-1）')
      else if (Number.isNaN(wd) || wd < 0 || wd > 6)
        errors.push('相对-星期几无效（填0-6，0=周日）')
      else if (Number.isNaN(mon) || mon < 1 || mon > 12) errors.push('相对-月份无效（填1-12）')
      else dateRule = { mode: 'relative', nth, weekday: wd, month: mon }
    } else if (mode === 'manual') {
      const datesObj = {}
      ;[
        [2025, m2025],
        [2026, m2026],
        [2027, m2027],
      ].forEach(([yr, v]) => {
        if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) datesObj[yr] = v
      })
      if (!Object.keys(datesObj).length)
        errors.push('手动指定：至少填一年的有效日期（格式 YYYY-MM-DD）')
      else dateRule = { mode: 'manual', dates: datesObj }
    }
  }

  let levelId = ''
  if (type === 'holiday' && level) {
    const match = levels.find((l) => l.name === level || l.id === level)
    levelId = match ? match.id : level
    if (!match) errors.push(`等级"${level}"未找到，请与"等级模板配置"中的名称完全一致`)
  }

  const SEASON_MAP = {
    强季节性: 'strong',
    中季节性: 'medium',
    弱季节性: 'weak',
    全年可用: 'all_year',
  }
  const SEASON_ATTR_MP = {
    全年常青: 'annual',
    春夏季: 'ss',
    秋冬季: 'fw',
  }
  const tagList = tags ? tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : []

  const data =
    errors.length
      ? null
      : {
          id: 0,
          nameCn,
          nameEn,
          type: type || 'static',
          countries: countryList,
          level: levelId,
          seasonality: SEASON_MAP[seasonality] || 'medium',
          seasonAttr: SEASON_ATTR_MP[seasonAttr] || 'annual',
          mainCategory: mainCat || '',
          dateRule: dateRule || null,
          skuPlan: parseInt(skuPlan, 10) || 0,
          tags: tagList,
          enabled: true,
        }

  return {
    rowNum,
    nameCn: nameCn || '(空)',
    nameEn: nameEn || '(空)',
    typeName: typeName || '(空)',
    countryList,
    level,
    errors,
    data,
  }
}
