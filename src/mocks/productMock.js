/**
 * 产品列表假数据（与后端 DTO 字段对齐，供无后台时调样式）
 */

const T0 = '2024-06-01T10:00:00.000Z'
const T1 = '2025-03-15T08:30:00.000Z'

/** 列表缩略图占位，避免离线演示时裂图 */
export const DEMO_PLACEHOLDER_IMAGE = 'https://via.placeholder.com/60x60'

function spuRow(id, code, nameCn, nameEn, productType, status, cat, brand, skuCount, createdAt, updatedAt) {
  return {
    id,
    spuCode: code,
    nameCn,
    nameEn: nameEn ?? '',
    productType,
    status,
    categoryName: cat,
    brandName: brand,
    skuCount,
    createdAt,
    updatedAt,
    imageUrl: DEMO_PLACEHOLDER_IMAGE,
  }
}

function skuRow(
  skuId,
  skuCode,
  skuName,
  variantJson,
  model,
  unit,
  purchaseCost,
  spuId,
  spuCode,
  spuNameCn,
  categoryName,
  brandName,
  productType,
  status,
  active,
  spuCreatedAt
) {
  return {
    skuId,
    skuCode,
    skuName,
    variantJson,
    model,
    unit,
    purchaseCost,
    spuId,
    spuCode,
    spuNameCn,
    categoryName,
    brandName,
    productType,
    status,
    active,
    spuCreatedAt,
    imageUrl: DEMO_PLACEHOLDER_IMAGE,
  }
}

/** 原始树形分组 [{ spu, skus }] */
const RAW_TREE_GROUPS = [
  {
    spu: spuRow(1, 'MOCK-RUN-01', 'Runhit 示例紧身长袖', 'Runhit LS', 'FINISHED', 'ACTIVE', '运动/紧身衣', 'Runhit', 4, T0, T1),
    skus: [
      skuRow(101, 'MOCK-RUN-01-TR-XS', '番茄红 XS', '{"color":"番茄红","size":"XS"}', 'RH-LS', 'PCS', 56.5, 1, 'MOCK-RUN-01', 'Runhit 示例紧身长袖', '运动/紧身衣', 'Runhit', 'FINISHED', 'ACTIVE', true, T0),
      skuRow(102, 'MOCK-RUN-01-BK-M', '黑色 M', '{"color":"黑","size":"M"}', 'RH-LS', 'PCS', 56.5, 1, 'MOCK-RUN-01', 'Runhit 示例紧身长袖', '运动/紧身衣', 'Runhit', 'FINISHED', 'ACTIVE', true, T0),
      skuRow(103, 'MOCK-RUN-01-NV-L', '藏青 L', '{"color":"藏青","size":"L"}', 'RH-LS', 'PCS', 58.0, 1, 'MOCK-RUN-01', 'Runhit 示例紧身长袖', '运动/紧身衣', 'Runhit', 'FINISHED', 'ACTIVE', true, T0),
      skuRow(104, 'MOCK-RUN-01-IG-XL', '铁灰 XL', '{"color":"铁灰","size":"XL"}', 'RH-LS', 'PCS', 58.0, 1, 'MOCK-RUN-01', 'Runhit 示例紧身长袖', '运动/紧身衣', 'Runhit', 'FINISHED', 'ACTIVE', false, T0),
    ],
  },
  {
    spu: spuRow(2, 'MOCK-CUP-02', '陶瓷马克杯 简约款', 'Mug', 'FINISHED', 'ACTIVE', '家居', '素白', 2, T0, T1),
    skus: [
      skuRow(201, 'MOCK-CUP-02-W', '哑光白', '{"color":"白"}', 'MG-02', 'PCS', 42, 2, 'MOCK-CUP-02', '陶瓷马克杯 简约款', '家居', '素白', 'FINISHED', 'ACTIVE', true, T0),
      skuRow(202, 'MOCK-CUP-02-G', '鼠尾草绿', '{"color":"绿"}', 'MG-02', 'PCS', 45, 2, 'MOCK-CUP-02', '陶瓷马克杯 简约款', '家居', '素白', 'FINISHED', 'ACTIVE', true, T0),
    ],
  },
  {
    spu: spuRow(3, 'MOCK-PACK-A4', '瓦楞纸箱 A4 加强', '', 'PACKAGING', 'ACTIVE', '包材', '包材通', 2, T0, T1),
    skus: [
      skuRow(301, 'MOCK-PACK-A4-3', '三层', '{"layer":3}', 'BOX-A4', 'PCS', 1.9, 3, 'MOCK-PACK-A4', '瓦楞纸箱 A4 加强', '包材', '包材通', 'PACKAGING', 'ACTIVE', true, T0),
      skuRow(302, 'MOCK-PACK-A4-5', '五层', '{"layer":5}', 'BOX-A4', 'PCS', 2.6, 3, 'MOCK-PACK-A4', '瓦楞纸箱 A4 加强', '包材', '包材通', 'PACKAGING', 'ACTIVE', true, T0),
    ],
  },
  {
    spu: spuRow(4, 'MOCK-SEMI-ZIP', '3号拉链布带（半成品）', '', 'SEMI_FINISHED', 'ACTIVE', '辅料', '织带厂', 3, T0, T1),
    skus: [
      skuRow(401, 'MOCK-SEMI-ZIP-BK', '黑色', '{"gauge":"3"}', 'ZIP-3', '米', 4.5, 4, 'MOCK-SEMI-ZIP', '3号拉链布带（半成品）', '辅料', '织带厂', 'SEMI_FINISHED', 'ACTIVE', true, T0),
      skuRow(402, 'MOCK-SEMI-ZIP-NV', '藏青', '{"gauge":"3"}', 'ZIP-3', '米', 4.5, 4, 'MOCK-SEMI-ZIP', '3号拉链布带（半成品）', '辅料', '织带厂', 'SEMI_FINISHED', 'ACTIVE', true, T0),
      skuRow(403, 'MOCK-SEMI-ZIP-GR', '中灰', '{"gauge":"3"}', 'ZIP-3', '米', 4.4, 4, 'MOCK-SEMI-ZIP', '3号拉链布带（半成品）', '辅料', '织带厂', 'SEMI_FINISHED', 'ACTIVE', true, T0),
    ],
  },
  {
    spu: spuRow(5, 'MOCK-BUNDLE-X', '示例组合礼盒（假数据）', 'Bundle', 'BUNDLE', 'ACTIVE', '礼盒', '示例', 1, T0, T1),
    skus: [
      skuRow(501, 'MOCK-BUNDLE-X-001', '组合对外 SKU', '{}', 'BD-X', '套', 199, 5, 'MOCK-BUNDLE-X', '示例组合礼盒（假数据）', '礼盒', '示例', 'BUNDLE', 'ACTIVE', true, T0),
    ],
  },
  {
    spu: spuRow(6, 'MOCK-TWS', '降噪耳机 展示款', 'TWS Pro', 'FINISHED', 'CLEARANCE', '数码/音频', '声澈', 2, T0, T1),
    skus: [
      skuRow(601, 'MOCK-TWS-BK', '曜石黑', '{"color":"黑"}', 'TWS-P', '副', 799, 6, 'MOCK-TWS', '降噪耳机 展示款', '数码/音频', '声澈', 'FINISHED', 'CLEARANCE', true, T0),
      skuRow(602, 'MOCK-TWS-WH', '珍珠白', '{"color":"白"}', 'TWS-P', '副', 799, 6, 'MOCK-TWS', '降噪耳机 展示款', '数码/音频', '声澈', 'FINISHED', 'CLEARANCE', true, T0),
    ],
  },
  {
    spu: spuRow(7, 'MOCK-OLD', '已停售旧款（样式用）', '', 'FINISHED', 'STOPPED', '服装', '旧牌', 1, T0, T1),
    skus: [
      skuRow(701, 'MOCK-OLD-01', '灰色 M', '{"size":"M"}', 'OLD', 'PCS', 0, 7, 'MOCK-OLD', '已停售旧款（样式用）', '服装', '旧牌', 'FINISHED', 'STOPPED', true, T0),
    ],
  },
]

function contains(hay, needle) {
  if (!needle) return true
  const h = String(hay ?? '').toLowerCase()
  const n = String(needle).toLowerCase().trim()
  return !n || h.includes(n)
}

function dayStart(isoDate) {
  if (!isoDate) return null
  const d = new Date(isoDate + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function dayEndExclusive(isoDate) {
  if (!isoDate) return null
  const d = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

function spuMatchesKeyword(spu, kw) {
  if (!kw) return true
  return (
    contains(spu.spuCode, kw) ||
    contains(spu.nameCn, kw) ||
    contains(spu.nameEn, kw) ||
    contains(spu.categoryName, kw) ||
    contains(spu.brandName, kw)
  )
}

function skuMatchesKeyword(sku, kw) {
  if (!kw) return true
  return (
    contains(sku.skuCode, kw) ||
    contains(sku.skuName, kw) ||
    contains(sku.model, kw) ||
    contains(sku.variantJson, kw) ||
    spuMatchesKeyword(
      {
        spuCode: sku.spuCode,
        nameCn: sku.spuNameCn,
        nameEn: '',
        categoryName: sku.categoryName,
        brandName: sku.brandName,
      },
      kw
    )
  )
}

function spuMatchesFilters(spu, f) {
  if (f.productType && spu.productType !== f.productType) return false
  if (f.spuStatus && spu.status !== f.spuStatus) return false
  if (f.categoryName && !contains(spu.categoryName, f.categoryName)) return false
  if (f.brandName && !contains(spu.brandName, f.brandName)) return false
  const t = new Date(spu.createdAt).getTime()
  const from = dayStart(f.createdFrom)
  const toEx = dayEndExclusive(f.createdTo)
  if (from != null && t < from) return false
  if (toEx != null && t >= toEx) return false
  return true
}

function skuMatchesActive(sku, skuActive) {
  if (skuActive === undefined || skuActive === null) return true
  return Boolean(sku.active) === Boolean(skuActive)
}

/**
 * @param {'spu'|'sku'} view
 * @param {Record<string, unknown>} filters
 */
export function getMockProductList(view, filters = {}) {
  const kw = filters.keyword ? String(filters.keyword) : ''
  const nested = Boolean(filters.nested)

  if (view === 'sku') {
    const flat = []
    for (const g of RAW_TREE_GROUPS) {
      for (const s of g.skus) {
        if (!spuMatchesFilters(g.spu, filters)) continue
        if (!skuMatchesKeyword(s, kw)) continue
        if (!skuMatchesActive(s, filters.skuActive)) continue
        flat.push(s)
      }
    }
    return flat
  }

  if (nested) {
    const out = []
    for (const g of RAW_TREE_GROUPS) {
      const spu = g.spu
      if (!spuMatchesFilters(spu, filters)) continue
      const spuHit = spuMatchesKeyword(spu, kw)
      let skus = g.skus.filter((s) => skuMatchesActive(s, filters.skuActive))
      if (kw) {
        if (spuHit) {
          /* keep all skus (subject to active) */
        } else {
          skus = skus.filter((s) => skuMatchesKeyword(s, kw))
        }
      }
      if (skus.length === 0) continue
      const summary = { ...spu, skuCount: skus.length }
      out.push({ spu: summary, skus })
    }
    return out
  }

  /* 扁平 SPU（无 nested） */
  return RAW_TREE_GROUPS.filter((g) => {
    if (!spuMatchesFilters(g.spu, filters)) return false
    if (!kw) return true
    return spuMatchesKeyword(g.spu, kw) || g.skus.some((s) => skuMatchesKeyword(s, kw))
  }).map((g) => ({ ...g.spu, skuCount: g.skus.length }))
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export async function mockFetchProductList(view, filters) {
  await delay(180)
  return getMockProductList(view, filters)
}

export async function mockCreateProduct(payload) {
  await delay(220)
  const id = 90000 + Math.floor(Math.random() * 1000)
  return {
    id,
    spuCode: payload.spuCode,
    nameCn: payload.nameCn,
    nameEn: payload.nameEn ?? '',
    productType: payload.productType,
    status: payload.status ?? 'ACTIVE',
    categoryName: payload.categoryName ?? '',
    brandName: payload.brandName ?? '',
    remark: payload.remark ?? '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    skus: (payload.skus || []).map((s, i) => ({
      id: id * 100 + i,
      skuCode: s.skuCode,
      skuName: s.skuName ?? '',
      variantJson: s.variantJson ?? '',
      model: s.model ?? '',
      unit: s.unit ?? '',
      purchaseCost: s.purchaseCost ?? null,
      sortOrder: i,
      active: true,
    })),
    bundleLines: payload.bundleLines || [],
  }
}

export async function mockFetchProductDetail(id) {
  await delay(150)
  const g = RAW_TREE_GROUPS.find((x) => x.spu.id === Number(id))
  if (!g) {
    return {
      id: Number(id),
      spuCode: 'MOCK',
      nameCn: '假数据详情',
      nameEn: '',
      productType: 'FINISHED',
      status: 'ACTIVE',
      categoryName: '',
      brandName: '',
      remark: '',
      createdAt: T0,
      updatedAt: T1,
      skus: [],
      bundleLines: [],
    }
  }
  return {
    ...g.spu,
    remark: '',
    skus: g.skus.map((s, i) => ({
      id: s.skuId,
      skuCode: s.skuCode,
      skuName: s.skuName,
      variantJson: s.variantJson,
      model: s.model,
      unit: s.unit,
      purchaseCost: s.purchaseCost,
      sortOrder: i,
      active: s.active,
    })),
    bundleLines: [],
  }
}
