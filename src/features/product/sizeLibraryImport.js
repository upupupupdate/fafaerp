/**
 * 尺码库 XLSX 导入：窄表（每行 = 尺码表 × 规格 × 单尺码测量值）
 */
import * as XLSX from 'xlsx'

/** 与模板、解析共用的列名（勿改顺序以外的业务含义） */
export const SIZE_IMPORT_HEADERS = [
  '尺码表名称',
  '尺码标准',
  '人群',
  '版型',
  '品类',
  '默认打印尺码',
  '规格名称',
  '测量方法',
  '公差',
  '尺码',
  '测量值',
]

const FIT_SET = new Set(['紧身', '合身', '宽松'])
const STANDARD_SET = new Set(['US', 'EU', 'CN'])

function normalizeFit(v) {
  const s = String(v ?? '').trim()
  return FIT_SET.has(s) ? s : '合身'
}

function parseMeasure(val) {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(String(val).trim().replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/** 下载空模板 + 示例行 + 填写说明 Sheet */
export function downloadSizeLibraryTemplate() {
  const headers = [...SIZE_IMPORT_HEADERS]
  const exampleRows = [
    ['夏季男士常规T恤', 'US', '男士', '合身', '短袖上衣', 'L', '衣长', '领后中', '±1', 'S', 63],
    ['夏季男士常规T恤', 'US', '男士', '合身', '短袖上衣', 'L', '衣长', '领后中', '±1', 'M', 65],
    ['夏季男士常规T恤', 'US', '男士', '合身', '短袖上衣', 'L', '衣长', '领后中', '±1', 'L', 67],
    ['夏季男士常规T恤', 'US', '男士', '合身', '短袖上衣', 'L', '胸围', '平铺', '±2', 'S', 100],
    ['夏季男士常规T恤', 'US', '男士', '合身', '短袖上衣', 'L', '胸围', '平铺', '±2', 'M', 104],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows])
  ws['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }]

  const readme = [
    ['尺码库导入模板 · 填写说明'],
    [],
    ['一、格式说明'],
    ['1. 请勿修改「尺码明细」工作表第一行的表头列名。'],
    ['2. 每一行表示：一张尺码表下，一条量体规格在某个「尺码」上的测量值。'],
    ['3. 同一「尺码表名称」的多行会自动合并为一张表；出现过的「尺码」列会去重并保留首次出现顺序。'],
    ['4. 「版型」仅允许：紧身、合身、宽松；「尺码标准」建议：US、EU、CN。'],
    ['5. 可在一个文件中维护多张尺码表：用不同「尺码表名称」区分即可。'],
    [],
    ['二、必填列'],
    ['尺码表名称、规格名称、尺码、测量值 为必填；其余建议填写以便列表展示一致。'],
  ]
  const wsReadme = XLSX.utils.aoa_to_sheet(readme)
  wsReadme['!cols'] = [{ wch: 72 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '尺码明细')
  XLSX.utils.book_append_sheet(wb, wsReadme, '填写说明')
  XLSX.writeFile(wb, '尺码库导入模板.xlsx')
}

/**
 * @param {ArrayBuffer} buf
 * @returns {{ charts: object[], errors: string[], warnings: string[] }}
 */
export function parseSizeLibraryXlsx(buf) {
  const errors = []
  const warnings = []
  let wb
  try {
    wb = XLSX.read(buf, { type: 'array', raw: false })
  } catch (e) {
    return { charts: [], errors: [`无法解析文件：${e?.message || e}`], warnings: [] }
  }

  const sheetName = wb.SheetNames.includes('尺码明细') ? '尺码明细' : wb.SheetNames[0]
  if (!sheetName) {
    return { charts: [], errors: ['工作簿中没有工作表'], warnings: [] }
  }
  const ws = wb.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
  if (!data?.length) {
    return { charts: [], errors: ['工作表为空'], warnings: [] }
  }

  const headerRow = data[0].map(c => String(c).trim())
  const col = {}
  for (const h of SIZE_IMPORT_HEADERS) {
    const idx = headerRow.indexOf(h)
    if (idx === -1) {
      errors.push(`缺少表头列「${h}」，请使用下载的模板勿改列名`)
      return { charts: [], errors, warnings }
    }
    col[h] = idx
  }

  /** @type {Map<string, { meta: object, sizeOrder: string[], specMap: Map<string, { name: string, method: string, tolerance: string, values: Record<string, number> }> }>} */
  const groups = new Map()

  for (let r = 1; r < data.length; r++) {
    const row = data[r]
    if (!row || !row.length) continue
    const name = String(row[col['尺码表名称']] ?? '').trim()
    if (!name) continue

    const specName = String(row[col['规格名称']] ?? '').trim()
    const sizeCode = String(row[col['尺码']] ?? '').trim()
    if (!specName || !sizeCode) {
      warnings.push(`第 ${r + 1} 行：规格名称或尺码为空，已跳过`)
      continue
    }

    const mv = parseMeasure(row[col['测量值']])
    if (Number.isNaN(mv)) {
      errors.push(`第 ${r + 1} 行：测量值无效（${row[col['测量值']]}）`)
      continue
    }

    if (!groups.has(name)) {
      groups.set(name, {
        meta: {
          standard: String(row[col['尺码标准']] ?? 'US').trim() || 'US',
          audience: String(row[col['人群']] ?? '').trim(),
          fit: normalizeFit(row[col['版型']]),
          category: String(row[col['品类']] ?? '').trim(),
          defaultPrintSize: String(row[col['默认打印尺码']] ?? '').trim(),
        },
        sizeOrder: [],
        specMap: new Map(),
      })
    }
    const g = groups.get(name)

    const std = String(row[col['尺码标准']] ?? '').trim()
    if (std && STANDARD_SET.has(std) && g.meta.standard && g.meta.standard !== std) {
      warnings.push(`尺码表「${name}」：尺码标准与首行不一致，已以首行为准`)
    }
    const fit = normalizeFit(row[col['版型']])
    if (g.meta.fit && fit !== g.meta.fit && r > 1) {
      warnings.push(`尺码表「${name}」：版型与首行不一致，已以首行为准`)
    }

    if (!g.sizeOrder.includes(sizeCode)) g.sizeOrder.push(sizeCode)

    const method = String(row[col['测量方法']] ?? '').trim()
    const tol = String(row[col['公差']] ?? '').trim()
    const sk = `${specName}\t${method}\t${tol}`
    if (!g.specMap.has(sk)) {
      g.specMap.set(sk, { name: specName, method, tolerance: tol, values: {} })
    }
    g.specMap.get(sk).values[sizeCode] = mv
  }

  if (groups.size === 0) {
    errors.push('没有有效数据行（请检查尺码表名称、规格名称、尺码、测量值）')
    return { charts: [], errors, warnings }
  }

  const charts = []
  for (const [chartName, g] of groups) {
    const sizes = g.sizeOrder
    if (!sizes.length) {
      errors.push(`尺码表「${chartName}」：未解析到任何尺码`)
      continue
    }
    let defaultPrint = g.meta.defaultPrintSize
    if (!defaultPrint || !sizes.includes(defaultPrint)) {
      defaultPrint = sizes[Math.min(2, sizes.length - 1)]
      warnings.push(`尺码表「${chartName}」：默认打印尺码不在尺码列中，已设为「${defaultPrint}」`)
    }

    const specs = []
    for (const sp of g.specMap.values()) {
      const values = {}
      for (const s of sizes) {
        if (sp.values[s] !== undefined) values[s] = sp.values[s]
      }
      if (Object.keys(values).length === 0) continue
      specs.push({
        name: sp.name,
        method: sp.method,
        tolerance: sp.tolerance,
        values,
      })
    }
    if (!specs.length) {
      errors.push(`尺码表「${chartName}」：没有有效规格数据`)
      continue
    }

    const standard = STANDARD_SET.has(g.meta.standard) ? g.meta.standard : 'US'
    if (g.meta.standard && !STANDARD_SET.has(g.meta.standard)) {
      warnings.push(`尺码表「${chartName}」：尺码标准「${g.meta.standard}」非 US/EU/CN，已用 US`)
    }

    charts.push({
      name: chartName,
      standard,
      audience: g.meta.audience,
      fit: g.meta.fit,
      category: g.meta.category,
      sizes,
      defaultPrintSize: defaultPrint,
      specs,
    })
  }

  return { charts, errors, warnings }
}
