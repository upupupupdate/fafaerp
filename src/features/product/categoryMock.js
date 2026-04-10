/**
 * 品类管理 — Mock 数据（最多 5 级；业务字段仅末级）
 * 后续可替换为 API + 与 Amazon 映射任务写库
 */

/** Mock 添加时间（稳定可复现） */
function mockCreatedAt(seed) {
  const d = new Date(2024, 0, 1 + (seed % 320))
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(9 + (seed % 8))}:${pad((seed * 7) % 60)}:00`
}

let _id = 0
function nextId() {
  _id += 1
  return `cat-${String(_id).padStart(4, '0')}`
}

/** 新增节点时分配 id（需在 genCategoryMockFlat 之后调用以保持序号连续） */
export function allocateCategoryId() {
  return nextId()
}

/**
 * @typedef {object} CategoryFlatNode
 * @property {string} id
 * @property {string|null} parentId
 * @property {number} level 1-5
 * @property {string} code
 * @property {string} name
 * @property {string} description
 * @property {boolean} status
 * @property {number} sortOrder
 * @property {boolean} isLeaf
 * @property {number|null} graphicCoeff 平面设计折算系数
 * @property {number|null} photoCoeff 摄影折算系数
 * @property {{ label: string, amount: number }[]|null} costItems 费用明细（列表「查看」）
 * @property {null} [amazonTop3] 已废弃，TOP3 按站点在 siteMappings[].top3
 * @property {string} createdAt 添加时间 YYYY-MM-DD HH:mm:ss
 * @property {object[]|null} [siteMappings] 见下方 SiteMappingRow
 */

/** 列表与映射抽屉使用的站点代码（仅四站） */
export const AMAZON_SITE_CODES = ['US', 'CA', 'UK', 'DE']

/** 单元格内最多展示的站点 Tag 数量，其余收入「+N」 */
export const MAX_SITE_TAGS_IN_CELL = 4

const AMAZON_SITE_TLD = { US: 'com', CA: 'ca', UK: 'co.uk', DE: 'de' }

/**
 * 单站点下 TOP3 类目项
 * @typedef {object} SiteTop3Item
 * @property {number} rank
 * @property {string} browseNodeId
 * @property {string} path
 * @property {string} url
 * @property {'core'|'secondary'} mappingType
 * @property {number} listedSkuCount 品类上架到该类目下的 SKU 数量（该站点）
 * @property {number} listedProductTotal 该站点该类目下的品类产品数（按站点拆分后统计）
 * @property {number} shareRatioPct 占比（百分数 0–100，展示保留两位小数）
 */

/**
 * 末级品类 — 单站点映射（Mock / 对接 API 后同结构）
 * @typedef {object} SiteMappingRow
 * @property {string} site
 * @property {boolean} mapped
 * @property {string} amazonPath 与 top3[0].path 同步
 * @property {string} browseNodeId 与 top3[0].browseNodeId 同步
 * @property {SiteTop3Item[]} top3
 */

/**
 * 可编辑的空模板：固定 3 行，便于填写 NodeId、路径与各指标（Mock 未映射站点也用它合并数据）
 * @param {string} site
 * @returns {SiteTop3Item[]}
 */
export function createDefaultTop3Template(site) {
  const tld = AMAZON_SITE_TLD[site] || 'com'
  return [1, 2, 3].map((rank) => ({
    rank,
    browseNodeId: '',
    path: '',
    url: `https://www.amazon.${tld}/gp/browse.html?node=`,
    mappingType: rank === 1 ? 'core' : 'secondary',
    listedSkuCount: 0,
    listedProductTotal: 0,
    shareRatioPct: 0,
  }))
}

/**
 * 占比 = (上架 SKU 数 / 品类产品总数) × 100，保留两位小数；总数 ≤0 时无有效占比。
 * @param {number} listedSkuCount
 * @param {number} listedProductTotal
 * @returns {number|null}
 */
export function computeShareRatioPct(listedSkuCount, listedProductTotal) {
  const s = Number(listedSkuCount)
  const t = Number(listedProductTotal)
  if (!Number.isFinite(s) || !Number.isFinite(t) || t <= 0) return null
  return Math.round((s / t) * 10000) / 100
}

/**
 * @param {number} seed
 * @param {string} site
 * @returns {SiteTop3Item[]}
 */
export function buildTop3ForSite(seed, site) {
  const tld = AMAZON_SITE_TLD[site] || 'com'
  const bases = [
    { id: '157916', label: `Apparel · ${site}` },
    { id: '2939', label: `Clothing · ${site}` },
    { id: '14009', label: `Fashion · ${site}` },
  ]
  return bases.map((b, i) => {
    const browseNodeId = String(Number(b.id) + (seed % 50) + i * 11)
    const path = `#${browseNodeId} in ${b.label}`
    const listedSkuCount = 5 + ((seed + i * 17) % 42)
    const listedProductTotal = 2 + ((seed + i * 11) % 18)
    const shareRatioPct = computeShareRatioPct(listedSkuCount, listedProductTotal) ?? 0
    return {
      rank: i + 1,
      browseNodeId,
      path,
      url: `https://www.amazon.${tld}/gp/browse.html?node=${browseNodeId}`,
      mappingType: i === 0 ? 'core' : 'secondary',
      listedSkuCount,
      listedProductTotal,
      shareRatioPct,
    }
  })
}

/**
 * 生成某末级品类下的多站点映射 Mock
 * @param {number} seed
 * @returns {SiteMappingRow[]}
 */
export function buildSiteMappingsMock(seed) {
  return AMAZON_SITE_CODES.map((site, i) => {
    const mapped = ((seed + i * 7) % 11) > 2
    const top3 = mapped ? buildTop3ForSite(seed + i * 31, site) : []
    const t0 = top3[0]
    const browseNodeId = t0?.browseNodeId ?? ''
    const amazonPath = t0?.path ?? ''
    return {
      site,
      mapped,
      browseNodeId,
      amazonPath,
      top3,
    }
  })
}

/**
 * 将嵌套定义展开为扁平列表（内部递归）
 * @param {object[]} defs
 * @param {string|null} parentId
 * @param {number} level
 * @param {CategoryFlatNode[]} out
 */
function flattenDefs(defs, parentId, level, out) {
  defs.forEach((d, idx) => {
    const id = nextId()
    const isLeaf = !d.children?.length
    let siteMappings = null
    if (isLeaf) {
      siteMappings = buildSiteMappingsMock(out.length + idx)
    }
    const node = {
      id,
      parentId,
      level,
      code: d.code,
      name: d.name,
      description: d.description ?? '',
      createdAt: d.createdAt ?? mockCreatedAt(out.length + idx),
      status: d.status !== false,
      sortOrder: idx,
      isLeaf,
      graphicCoeff: isLeaf ? (d.graphicCoeff ?? 0.8) : null,
      photoCoeff: isLeaf ? (d.photoCoeff ?? 0.6) : null,
      costItems: isLeaf ? (d.costItems ?? [{ label: '平面', amount: 300 }, { label: '摄影', amount: 800 }]) : null,
      amazonTop3: null,
      siteMappings,
    }
    out.push(node)
    if (!isLeaf && d.children?.length) {
      flattenDefs(d.children, id, level + 1, out)
    }
  })
}

/** 树形定义（仅表达结构；末级自动生成 isLeaf） */
const TREE_DEFS = [
  {
    code: '3c',
    name: '3C数码',
    description: '消费电子大类',
    children: [
      {
        code: '3c_phone',
        name: '手机配件',
        children: [
          {
            code: '3c_phone_case',
            name: '保护壳',
            children: [
              {
                code: '3c_phone_case_tpu',
                name: 'TPU软壳',
                graphicCoeff: 0.8,
                photoCoeff: 0.5,
              },
              {
                code: '3c_phone_case_glass',
                name: '玻璃壳',
                graphicCoeff: 0.7,
                photoCoeff: 0.55,
              },
            ],
          },
          {
            code: '3c_phone_charger',
            name: '充电器',
            children: [
              {
                code: '3c_phone_charger_pd',
                name: 'PD快充',
                isLeaf: true,
                graphicCoeff: 0.6,
                photoCoeff: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'peishi',
    name: '配饰',
    description: '服饰配饰',
    children: [
      {
        code: 'peishi_zhuangshi',
        name: '家居装饰',
        children: [
          {
            code: 'peishi_wall',
            name: '墙饰',
            children: [
              {
                code: 'peishi_wall_clock',
                name: '挂钟',
                graphicCoeff: 0.9,
                photoCoeff: 0.4,
              },
            ],
          },
        ],
      },
      {
        code: 'peishi_bag',
        name: '包袋',
        children: [
          {
            code: 'peishi_bag_backpack',
            name: '双肩包',
            isLeaf: true,
            graphicCoeff: 0.85,
            photoCoeff: 0.65,
          },
        ],
      },
    ],
  },
  {
    code: 'home',
    name: '家居',
    children: [
      {
        code: 'home_kitchen',
        name: '厨房',
        children: [
          {
            code: 'home_kitchen_storage',
            name: '收纳',
            children: [
              {
                code: 'home_kitchen_storage_box',
                name: '密封盒',
                graphicCoeff: 0.75,
                photoCoeff: 0.7,
              },
              {
                code: 'home_kitchen_storage_jar',
                name: '玻璃罐',
                graphicCoeff: 0.72,
                photoCoeff: 0.68,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'toy',
    name: '玩具',
    description: '',
    children: [
      {
        code: 'toy_plush',
        name: '毛绒',
        isLeaf: true,
        graphicCoeff: 0.88,
        photoCoeff: 0.45,
        status: false,
      },
    ],
  },
]

/**
 * 生成扁平 Mock 列表（含多级父节点 + 末级业务字段）
 */
export function genCategoryMockFlat() {
  _id = 0
  const out = []
  flattenDefs(TREE_DEFS, null, 1, out)
  return out
}

/**
 * 扁平 → el-tree 嵌套 children（仅 isLeaf 或空 children 的节点无 children 键）
 */
export function buildTreeFromFlat(flat) {
  const map = new Map()
  for (const n of flat) {
    map.set(n.id, { ...n, children: [] })
  }
  const roots = []
  for (const n of flat) {
    const node = map.get(n.id)
    if (n.parentId == null) {
      roots.push(node)
    } else {
      const p = map.get(n.parentId)
      if (p) p.children.push(node)
    }
  }
  function pruneEmptyChildren(nodes) {
    for (const node of nodes) {
      if (node.children?.length) {
        pruneEmptyChildren(node.children)
      } else {
        delete node.children
      }
    }
  }
  function sortTree(nodes) {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    for (const n of nodes) {
      if (n.children?.length) sortTree(n.children)
    }
  }
  sortTree(roots)
  pruneEmptyChildren(roots)
  return roots
}

/** 从某节点向上找祖先链 [root, ..., self] */
export function getAncestorIds(flat, nodeId) {
  const byId = new Map(flat.map((n) => [n.id, n]))
  const chain = []
  let cur = byId.get(nodeId)
  while (cur) {
    chain.push(cur.id)
    cur = cur.parentId ? byId.get(cur.parentId) : null
  }
  return chain.reverse()
}

/** 展示用路径：根 / 子 / … / 自身 */
export function buildCategoryPathLabel(flat, nodeId) {
  const chain = getAncestorIds(flat, nodeId)
  return chain.map((id) => flat.find((n) => n.id === id)?.name).filter(Boolean).join(' / ')
}

/** 某 nodeId 子树下所有末级 id（选中末级时仅自身） */
export function getLeafIdsUnder(flat, nodeId) {
  if (nodeId == null) {
    return flat.filter((n) => n.isLeaf).map((n) => n.id)
  }
  const self = flat.find((n) => n.id === nodeId)
  if (self?.isLeaf) return [nodeId]

  const childrenOf = new Map()
  for (const n of flat) {
    const pid = n.parentId ?? '__root__'
    if (!childrenOf.has(pid)) childrenOf.set(pid, [])
    childrenOf.get(pid).push(n)
  }
  const out = []
  function walk(id) {
    const kids = childrenOf.get(id) ?? []
    for (const k of kids) {
      if (k.isLeaf) out.push(k.id)
      else walk(k.id)
    }
  }
  walk(nodeId)
  return out
}
