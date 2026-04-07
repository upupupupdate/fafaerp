/**
 * 上架跟踪 — 采购计划草稿（本地，一张单据多条 SKU）
 * 预留给三方 ERP；当前仅 localStorage，不发起网络请求。
 */

import { resolveMainStatus } from '@/features/listing/listingDefs.js'

const STORAGE_V2 = 'fafa_listing_purchase_plans_v2'
const STORAGE_V1 = 'fafa_listing_purchase_plan_drafts_v1'

/** 目的仓（示例） */
export const MOCK_WAREHOUSES = [
  { id: 101, label: '美东 FBA 仓', isFba: true },
  { id: 102, label: '美西 FBA 仓', isFba: true },
  { id: 201, label: '国内中转仓', isFba: false },
]

export const MOCK_MARKETS = [
  { id: 1, label: '美国站' },
  { id: 2, label: '英国站' },
  { id: 3, label: '德国站' },
]

const MAX_ITEMS = 100

function genDraftId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_V2)
    if (!raw) return { drafts: {}, listingIndex: {} }
    const o = JSON.parse(raw)
    if (!o || typeof o !== 'object') return { drafts: {}, listingIndex: {} }
    return {
      drafts: typeof o.drafts === 'object' && o.drafts !== null ? o.drafts : {},
      listingIndex: typeof o.listingIndex === 'object' && o.listingIndex !== null ? o.listingIndex : {},
    }
  } catch {
    return { drafts: {}, listingIndex: {} }
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_V2, JSON.stringify(store))
}

function migrateV1IfNeeded() {
  try {
    const v1raw = localStorage.getItem(STORAGE_V1)
    if (!v1raw) return
    const store = readStore()
    if (Object.keys(store.drafts).length > 0) return
    const v1 = JSON.parse(v1raw)
    if (!v1 || typeof v1 !== 'object') return
    for (const [pid, rec] of Object.entries(v1)) {
      if (!rec || typeof rec !== 'object' || !rec.items?.length) continue
      const draftId = genDraftId()
      const items = rec.items.map((row, i) => ({
        listingId: Number(pid),
        msku: row.msku || '',
        sku: row.sku || '',
        nameCn: '',
        urgent: row.urgent ? 1 : 0,
        quantity: row.quantity ?? 1,
        transferWarehouseId: row.transferWarehouseId ?? '',
        expectDeliveryDate: row.expectDeliveryDate || '',
        transportName: row.transportName || '',
        remark: row.remark || '',
        arrivalWarehouseId: row.arrivalWarehouseId ?? rec.header?.arrivalWarehouseId ?? MOCK_WAREHOUSES[0]?.id,
        arrivalMarketId: row.arrivalMarketId ?? rec.header?.arrivalMarketId ?? null,
      }))
      store.drafts[draftId] = {
        draftId,
        outerNo: rec.outerNo || '',
        status: 'local_draft',
        createdAt: rec.createdAt || new Date().toISOString(),
        updatedAt: rec.updatedAt || new Date().toISOString(),
        header: { attachments: [], ...rec.header },
        items,
        apiPayloadPreview: rec.apiPayloadPreview,
      }
      store.listingIndex[String(pid)] = draftId
    }
    writeStore(store)
  } catch {
    /* ignore */
  }
}

migrateV1IfNeeded()

/**
 * 是否可加入采购计划：备货中 + 待建计划
 * @param {object} p 列表行 product
 */
export function isListingEligibleForPurchasePlan(p) {
  if (!p) return false
  return resolveMainStatus(p) === 'stocking' && p.subNode === 'plan_pending'
}

export function allocateOuterNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const key = `fafa_pl_seq_${ymd}`
  let n = 0
  try {
    n = parseInt(localStorage.getItem(key) || '0', 10) || 0
  } catch {
    n = 0
  }
  n += 1
  localStorage.setItem(key, String(n))
  return `PL${ymd}${String(n).padStart(4, '0')}`
}

/** @param {object} product 列表行 */
/**
 * @param {object} product 列表行
 * @param {{ arrivalWarehouseId: number|null, arrivalMarketId: number|null }} [headerDefaults] 表头默认仓/站
 */
export function buildDefaultLineFromProduct(product, headerDefaults = null) {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const expectDeliveryDate = d.toISOString().slice(0, 10)
  const hw = headerDefaults?.arrivalWarehouseId ?? MOCK_WAREHOUSES[0]?.id ?? null
  const mk = headerDefaults?.arrivalMarketId ?? MOCK_MARKETS[0]?.id ?? null
  return {
    listingId: product.id,
    msku: product.msku || '',
    sku: product.sku || '',
    nameCn: product.nameCn || '',
    urgent: 0,
    quantity: 1,
    transferWarehouseId: '',
    expectDeliveryDate,
    transportName: '[头程-海运快船]',
    remark: '',
    arrivalWarehouseId: hw,
    arrivalMarketId: mk,
  }
}

/** 是否 FBA 仓（用于校验站点必填） */
export function warehouseIsFba(warehouseId) {
  const w = MOCK_WAREHOUSES.find((x) => x.id === warehouseId)
  return w?.isFba === true
}

/**
 * 按目的仓 + 平台站点 + MSKU 分组（保存时拆成多张采购计划）
 * @param {object[]} rows
 * @returns {Map<string, object[]>} key -> 行列表
 */
export function groupItemsByWarehouseMarketMsku(rows) {
  const map = new Map()
  for (const row of rows) {
    const wh = row.arrivalWarehouseId
    const mk = row.arrivalMarketId
    const msku = String(row.msku ?? '').trim()
    const key = `${wh}|${mk}|${msku}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  }
  return map
}

/**
 * 一次保存：按分组生成多张本地草稿；共享备注/附件写入每组 header。
 * @param {object} opt
 * @param {string|null} opt.editingDraftId 编辑态时先删旧单再写入
 * @param {{ remark: string, creatorAccountId: number|null, attachments: object[] }} opt.sharedHeader
 * @param {object[]} opt.rows 明细行（含 listingId、行级 arrivalWarehouseId、arrivalMarketId、msku 等）
 * @returns {object[]} 已保存的记录列表
 */
export function savePurchasePlansSplit({ editingDraftId, sharedHeader, rows }) {
  if (!rows?.length) throw new Error('明细为空')
  if (editingDraftId) removePurchasePlanDraftById(editingDraftId)

  const groups = groupItemsByWarehouseMarketMsku(rows)
  const saved = []
  for (const groupRows of groups.values()) {
    const draftId = genDraftId()
    const outerNo = allocateOuterNo()
    const first = groupRows[0]
    const wh = first.arrivalWarehouseId
    const needM = warehouseIsFba(wh)
    const header = {
      arrivalWarehouseId: wh,
      arrivalMarketId: needM ? first.arrivalMarketId : null,
      remark: sharedHeader?.remark ?? '',
      creatorAccountId: sharedHeader?.creatorAccountId ?? null,
      attachments: Array.isArray(sharedHeader?.attachments) ? [...sharedHeader.attachments] : [],
    }
    const itemsForApi = groupRows.map((r) => ({
      msku: r.msku,
      urgent: r.urgent ? 1 : 0,
      quantity: r.quantity,
      transferWarehouseId: r.transferWarehouseId || undefined,
      expectDeliveryDate: r.expectDeliveryDate,
      transportName: r.transportName,
      remark: r.remark || undefined,
    }))
    const apiPayloadPreview = buildThirdPartyRequestPreview({
      outerNo,
      header,
      items: itemsForApi,
    })
    const itemsStored = groupRows.map((r) => ({ ...r }))
    const record = {
      draftId,
      outerNo,
      status: 'local_draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      header,
      items: itemsStored,
      apiPayloadPreview,
    }
    savePurchasePlanDraftRecord(record)
    saved.push(getPurchasePlanDraftById(draftId))
  }
  return saved
}

/**
 * @param {string} draftId
 * @returns {import('./purchasePlanDraft.js').PurchasePlanDraftRecordV2 | null}
 */
export function getPurchasePlanDraftById(draftId) {
  if (!draftId) return null
  migrateV1IfNeeded()
  const store = readStore()
  const rec = store.drafts[draftId]
  return rec && typeof rec === 'object' ? rec : null
}

/**
 * 某上架行是否已出现在某张本地草稿中
 * @param {number|string} listingProductId
 */
export function getPurchasePlanDraftForListing(listingProductId) {
  migrateV1IfNeeded()
  const id = String(listingProductId)
  const store = readStore()
  const draftId = store.listingIndex[id]
  if (!draftId) return null
  const rec = store.drafts[draftId]
  return rec && typeof rec === 'object' ? rec : null
}

/** 兼容旧方法名 */
export function getPurchasePlanDraft(listingProductId) {
  return getPurchasePlanDraftForListing(listingProductId)
}

function reindexListingIds(store, draftId, listingIds) {
  const sid = String(draftId)
  for (const [lid, did] of Object.entries(store.listingIndex)) {
    if (did === sid) delete store.listingIndex[lid]
  }
  for (const lid of listingIds) {
    store.listingIndex[String(lid)] = draftId
  }
}

/**
 * @param {import('./purchasePlanDraft.js').PurchasePlanDraftRecordV2} record
 */
/**
 * 保存前校验：同一上架行只能属于一张本地草稿
 * @returns {{ ok: true } | { ok: false, otherOuterNo: string, otherDraftId: string }}
 */
export function validateDraftListingConflict(draftId, listingIds) {
  migrateV1IfNeeded()
  const store = readStore()
  for (const lid of listingIds) {
    const s = String(lid)
    const ex = store.listingIndex[s]
    if (ex && ex !== draftId) {
      const o = store.drafts[ex]
      return {
        ok: false,
        otherDraftId: ex,
        otherOuterNo: o?.outerNo || ex,
      }
    }
  }
  return { ok: true }
}

export function savePurchasePlanDraftRecord(record) {
  if (!record?.draftId) throw new Error('draftId required')
  if (record.items?.length > MAX_ITEMS) {
    throw new Error(`明细最多 ${MAX_ITEMS} 行`)
  }
  const listingIds = (record.items || []).map((r) => r.listingId).filter((x) => x != null)
  const chk = validateDraftListingConflict(record.draftId, listingIds)
  if (!chk.ok) {
    throw new Error(
      `存在产品已在其他采购草稿中（${chk.otherOuterNo || chk.otherDraftId}），请先在该草稿中移除`,
    )
  }
  const store = readStore()
  store.drafts[record.draftId] = {
    ...record,
    updatedAt: new Date().toISOString(),
  }
  reindexListingIds(store, record.draftId, listingIds)
  writeStore(store)
}

/**
 * @param {string} draftId
 */
export function removePurchasePlanDraftById(draftId) {
  if (!draftId) return
  const store = readStore()
  delete store.drafts[draftId]
  for (const [lid, did] of Object.entries(store.listingIndex)) {
    if (did === draftId) delete store.listingIndex[lid]
  }
  writeStore(store)
}

/** 兼容旧 API：按单个 listingId 删（删除其所在整单） */
export function removePurchasePlanDraft(listingProductId) {
  const rec = getPurchasePlanDraftForListing(listingProductId)
  if (rec?.draftId) removePurchasePlanDraftById(rec.draftId)
}

export function createEmptyDraftShell() {
  const draftId = genDraftId()
  return {
    draftId,
    outerNo: '',
    status: 'local_draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    header: {
      arrivalWarehouseId: MOCK_WAREHOUSES[0]?.id ?? null,
      arrivalMarketId: MOCK_MARKETS[0]?.id ?? null,
      remark: '',
      creatorAccountId: null,
      /** 附件占位（多拆分单共享同一份快照） */
      attachments: [],
    },
    items: [],
  }
}

/**
 * 三方请求体：items 不含 listingId/nameCn
 * @param {object} param0
 */
export function buildThirdPartyRequestPreview({ outerNo, header, items }) {
  return {
    outerNo,
    arrivalWarehouseId: header.arrivalWarehouseId,
    arrivalMarketId: header.arrivalMarketId ?? undefined,
    remark: header.remark || undefined,
    creatorAccountId: header.creatorAccountId ?? undefined,
    attachments: header.attachments?.length ? header.attachments : undefined,
    items: items.map((row) => ({
      msku: row.msku,
      urgent: row.urgent,
      quantity: row.quantity,
      transferWarehouseId: row.transferWarehouseId || undefined,
      expectDeliveryDate: row.expectDeliveryDate,
      transportName: row.transportName,
      remark: row.remark || undefined,
    })),
  }
}

export { MAX_ITEMS }
