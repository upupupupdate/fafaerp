/**
 * 新品开发 — 样版信息：色卡颜色 / 尺码勾选与 SKC 行生成
 */

/** @param card 色卡对象或 null */
export function filterColorsBySelection(card, selectedZh) {
  if (!card?.colors?.length) return []
  if (!selectedZh?.length) return [...card.colors]
  const set = new Set(selectedZh)
  return card.colors.filter((c) => c && set.has(c.zh))
}

/** @param chart 尺码表或 null */
export function filterSizesBySelection(chart, selectedSizes) {
  if (!chart?.sizes?.length) return []
  if (!selectedSizes?.length) return [...chart.sizes]
  const set = new Set(selectedSizes)
  return chart.sizes.filter((s) => s && set.has(s))
}

/**
 * 快速生成 SKC 行（每行一色，尺码列为勾选快照）
 * @returns {Array<{ id: string, colorZh: string, colorCode: string, skcCode: string, colorDisplayName: string, imageUrl: string, sizesSnapshot: string[] }>}
 */
export function buildQuickPatternRows(formSlice, card, selectedZh, selectedSizes) {
  const colors = filterColorsBySelection(card, selectedZh)
  const sizes = selectedSizes?.length ? [...selectedSizes] : []
  if (!colors.length || !sizes.length) return []

  const base = String(formSlice.designNo || formSlice.spu || 'NEW').replace(/\s/g, '') || 'NEW'
  const title = (formSlice.nameCn || '新款').trim()

  return colors.map((col, idx) => {
    const codePart = String(col.code || col.zh || idx).replace(/\s/g, '')
    const skcCode = `${base}-${codePart}-SKC`.slice(0, 80)
    return {
      id: `pc_${formSlice.id || 'row'}_${idx}_${codePart}`,
      colorZh: col.zh,
      colorCode: col.code || '',
      skcCode,
      colorDisplayName: `${title} — ${col.zh}`,
      imageUrl: '',
      sizesSnapshot: [...sizes],
    }
  })
}

export function skuCountFromSelection(card, chart, selectedZh, selectedSizes) {
  const colors = filterColorsBySelection(card, selectedZh)
  const sizes = filterSizesBySelection(chart, selectedSizes)
  return colors.length * sizes.length
}
