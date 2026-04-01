/** 颜色 × 尺码 笛卡尔积（预览用，不落库） */
export function cartesianColorSize(colors, sizes) {
  const c = colors.filter(Boolean)
  const s = sizes.filter(Boolean)
  if (!c.length || !s.length) return []
  const rows = []
  for (const color of c) {
    for (const size of s) {
      rows.push({ color, size, rowKey: `${color}::${size}` })
    }
  }
  return rows
}
