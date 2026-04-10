/**
 * 品类主数据 — 前端单例（当前 Mock；后续对接 API）
 */
import { ref, computed } from 'vue'
import {
  genCategoryMockFlat,
  buildTreeFromFlat,
  getLeafIdsUnder,
  allocateCategoryId,
  buildSiteMappingsMock,
} from '@/features/product/categoryMock.js'

let _singleton = null

export function useCategoryStore() {
  if (_singleton) return _singleton

  const flat = ref(genCategoryMockFlat())

  const treeData = computed(() => buildTreeFromFlat(flat.value))

  /** 树当前选中节点 id；null 表示「全部末级」 */
  const selectedTreeNodeId = ref(null)

  const leafIdsInScope = computed(() =>
    getLeafIdsUnder(flat.value, selectedTreeNodeId.value),
  )

  const leavesInScope = computed(() => {
    const set = new Set(leafIdsInScope.value)
    return flat.value.filter((n) => n.isLeaf && set.has(n.id))
  })

  function getById(id) {
    return flat.value.find((n) => n.id === id) ?? null
  }

  /** 占位：后续对接保存接口 */
  function patchLeaf(id, partial) {
    const i = flat.value.findIndex((n) => n.id === id)
    if (i === -1) return false
    const next = [...flat.value]
    next[i] = { ...next[i], ...partial }
    flat.value = next
    return true
  }

  /**
   * 新增品类（最多 5 级；末级下不可再挂子节点）
   * @param {{ parentId: string|null, code: string, name: string, description?: string, asLeaf?: boolean }} payload
   * @returns {{ ok: true, id: string } | { ok: false, message: string }}
   */
  function addCategory(payload) {
    const codeNorm = String(payload.code ?? '').trim()
    const nameNorm = String(payload.name ?? '').trim()
    if (!codeNorm || !nameNorm) {
      return { ok: false, message: '请填写品类编码与名称' }
    }
    const dup = flat.value.some((n) => n.code === codeNorm)
    if (dup) return { ok: false, message: '编码已存在，请更换' }

    const parentId = payload.parentId ?? null
    let level = 1
    if (parentId != null) {
      const parent = getById(parentId)
      if (!parent) return { ok: false, message: '父级品类不存在' }
      if (parent.isLeaf) {
        return { ok: false, message: '不能在末级品类下新增，请选择上级分类或先调整树结构' }
      }
      if (parent.level >= 5) return { ok: false, message: '已达最大层级（5 级）' }
      level = parent.level + 1
    }
    if (level > 5) return { ok: false, message: '最多支持 5 级品类' }

    let asLeaf = payload.asLeaf !== false
    if (level === 5) asLeaf = true

    const siblings = flat.value.filter((n) => n.parentId === parentId)
    const sortOrder = siblings.length
      ? Math.max(...siblings.map((s) => s.sortOrder ?? 0)) + 1
      : 0

    const id = allocateCategoryId()
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    const sm = asLeaf ? buildSiteMappingsMock(flat.value.length) : null

    const node = {
      id,
      parentId,
      level,
      code: codeNorm,
      name: nameNorm,
      description: String(payload.description ?? '').trim(),
      createdAt,
      status: true,
      sortOrder,
      isLeaf: asLeaf,
      graphicCoeff: asLeaf ? 0.8 : null,
      photoCoeff: asLeaf ? 0.6 : null,
      costItems: asLeaf
        ? [{ label: '平面', amount: 300 }, { label: '摄影', amount: 800 }]
        : null,
      amazonTop3: null,
      siteMappings: sm,
    }

    flat.value = [...flat.value, node]
    return { ok: true, id }
  }

  /**
   * 编辑品类（不改父级、不改是否末级；末级可改系数与载体）
   * @param {string} id
   * @param {{ code: string, name: string, description?: string, status?: boolean, graphicCoeff?: number, photoCoeff?: number }} payload
   * @returns {{ ok: true } | { ok: false, message: string }}
   */
  function updateCategory(id, payload) {
    const cur = getById(id)
    if (!cur) return { ok: false, message: '记录不存在' }

    const codeNorm = String(payload.code ?? '').trim()
    const nameNorm = String(payload.name ?? '').trim()
    if (!codeNorm || !nameNorm) {
      return { ok: false, message: '请填写品类编码与名称' }
    }
    if (flat.value.some((n) => n.code === codeNorm && n.id !== id)) {
      return { ok: false, message: '编码已存在，请更换' }
    }

    const partial = {
      code: codeNorm,
      name: nameNorm,
      description: String(payload.description ?? '').trim(),
    }
    if (payload.status !== undefined) partial.status = !!payload.status

    if (cur.isLeaf) {
      const g = Number(payload.graphicCoeff)
      const p = Number(payload.photoCoeff)
      if (!Number.isFinite(g) || g < 0) {
        return { ok: false, message: '平面设计系数须为非负数字' }
      }
      if (!Number.isFinite(p) || p < 0) {
        return { ok: false, message: '摄影折算系数须为非负数字' }
      }
      partial.graphicCoeff = g
      partial.photoCoeff = p
    }

    patchLeaf(id, partial)
    return { ok: true }
  }

  /**
   * 保存末级品类多站点映射
   * @param {string} id
   * @param {object[]} siteMappings
   */
  function saveSiteMappings(id, siteMappings) {
    const cur = getById(id)
    if (!cur?.isLeaf) return { ok: false, message: '仅末级品类可维护站点映射' }
    if (!Array.isArray(siteMappings)) return { ok: false, message: '映射数据无效' }
    patchLeaf(id, { siteMappings })
    return { ok: true }
  }

  _singleton = {
    flat,
    treeData,
    selectedTreeNodeId,
    leafIdsInScope,
    leavesInScope,
    getById,
    patchLeaf,
    addCategory,
    updateCategory,
    saveSiteMappings,
  }
  return _singleton
}
