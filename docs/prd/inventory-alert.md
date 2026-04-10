# 上架跟踪（边栏）产品需求文档（PRD）

> **文档与代码对应**：本文档字段名、状态键、`localStorage` 键名与前端实现保持一致，便于联调与验收。  
> **路由**：`/listing/tracking-sidebar` · **路由名称**：`ListingTrackingSidebar` · **页面组件**：`src/views/listing/ListingTrackingSidebarView.vue`

---

## 1. 项目概述

### 1.1 背景

在亚马逊 ERP「上架」模块中，需在标准「上架跟踪」页之外，提供**带左侧主状态边栏**的跟踪视图：用户可先按生命周期大阶段（全部 / 待分配 / 进行中 / 可开售 / 已开售）收窄范围，再叠加筛选条件、节点条与列表，完成日常跟进、预警排查与批量操作入口的演示与后续对接。

### 1.2 目标

- 支持按 **`sidebarPhase`**（边栏主状态）快速切换数据子集，并与顶部筛选、节点状态条、分页列表联动。
- 在「进行中」阶段展示 **8 张备货子面板**（含独立业务键 **`warehouse_inbound`**「货件入仓」），展示各节点数量及预警/超时统计。
- 提供与主跟踪页一致的 **筛选维度**、**系统视图**（另存为 / 更新 / 默认 / 删除）、**预警/超时**快捷过滤、**进度 / 列表**两种展示模式。
- 时效判定与 **时效配置**（`getTransitionConfig`）一致，品类键为 **`categoryId` 优先，否则 `category`**。

### 1.3 目标用户

- 运营、开发跟进、采购等需按阶段与节点查看上架 SKU、处理预警与发起采购计划的角色（当前为前端 Mock 全量数据演示，后端对接后用户群不变）。

---

## 2. 功能需求

### 2.1 核心功能列表

| 序号 | 功能 | 说明 |
|------|------|------|
| F1 | 左侧主状态边栏 | 五档：`all` / `pending` / `stocking` / `ready` / `listed`，展示各档数量；可收起/展开 |
| F2 | 查询筛选区 | `ListingFilterBar` 聚合搜索、维度筛选、时间范围、节点多选、排序等；可整体收起 |
| F3 | 系统视图 | 筛选快照持久化：另存为、更新当前、设默认、删除；下拉应用 |
| F4 | 进行中节点条 | 仅 `sidebarPhase === 'stocking'` 时展示 8 张面板及动态统计 |
| F5 | 列表区 | `progress`：时间轴行视图；`regular`：紧凑表格；分页 **50** 条/页 |
| F6 | 预警 / 超时 | 基于 `transitionInfos` 叠加过滤；超时含历史环节曾超时（见代码注释） |
| F7 | 行勾选与表头全选 | 跨页保留勾选；**筛选结果集合变化**时清空勾选 |
| F8 | 产品详情 | `ListingDetailDrawer`，可在同筛选结果集中切换 |
| F9 | 创建采购计划 | `PurchasePlanEditorDialog`；勾选需含「待建计划」 eligible 行或空开从列表选 |
| F10 | 占位按钮 | 「批量维护上架信息」「AI 文案生成」「导出」—— 交互占位，业务后续对接 |

---

### 2.2 边栏主状态（与代码一致）

**状态变量**：`sidebarPhase`（`ref<string>`）

| 取值 | 界面文案 | 含义（`resolveMainStatus`） |
|------|----------|------------------------------|
| `all` | 全部 | 不过滤主状态 |
| `pending` | 待分配 | `mainStatus === 'pending'` |
| `stocking` | 进行中 | `mainStatus === 'stocking'` |
| `ready` | 可开售 | `mainStatus === 'ready'` |
| `listed` | 已开售 | `mainStatus === 'listed'` |

**侧边数量**：`sidebarCounts`，在 **仅应用公共筛选**（`applyCommonFilters`）后的集合上按主状态计数，**不因**当前 `sidebarPhase` 或状态条再次缩小（与代码 `statsBaseFiltered` 一致）。

**切换行为**：`watch(sidebarPhase)` 时 **`filterStatusKeys` 清空**，避免阶段与节点筛选冲突。

---

### 2.3 节点筛选选项（随 `sidebarPhase` 变化）

**计算属性**：`sidebarStatusFilterOptions`

| `sidebarPhase` | 选项来源 | 说明 |
|----------------|----------|------|
| `all` | `STATUS_FILTER_OPTIONS`（即 `STOCKING_PANELS`） | 含待分配、各备货节点、可开售、已开售等 |
| `stocking` | `SIDEBAR_IN_PROGRESS_PANELS` | 8 项，见下表 |
| `pending` | `[{ key: 'pending', label: '待分配' }]` | 单选语义下的唯一项 |
| `ready` | `[{ key: 'ready_to_sell', label: '可开售' }]` | |
| `listed` | `[{ key: 'listed_sale', label: '已开售' }]` | |

**「进行中」8 张面板键（`SIDEBAR_IN_PROGRESS_PANELS`）**：

| key | label |
|-----|--------|
| `plan_pending` | 待建计划 |
| `plan_review` | 计划待审 |
| `po_pending` | 待采购下单 |
| `po_inbound` | 待采购入库 |
| `shipment_build` | 待建货件 |
| `shipment_send` | 货件待发 |
| `in_transit` | 待入仓 |
| `warehouse_inbound` | 货件入仓 |

**列表过滤逻辑**：

- `sidebarPhase === 'stocking'` 时，`filterStatusKeys` 使用 **`matchSidebarInProgressPanelKey`**（含 `warehouse_inbound` / `in_transit` 特殊规则）。
- 其他阶段使用 **`matchStatusPanelKey`** 与 `filterStatusKeys` 做 OR 匹配。

---

### 2.4 筛选与搜索字段（前端状态，与组件绑定名一致）

下列均为页面级 `ref`，与 `ListingFilterBar` 的 `v-model` 对应；详细校验以组件内为准。

| 字段 ID | 类型 | 说明 |
|---------|------|------|
| `searchField` | `string` | 搜索字段：`'name'` \| `'sku'` \| `'msku'` \| `'asin'` |
| `searchKeyword` | `string` | 关键词；支持多值分隔 `换行/逗号/分号` |
| `searchBatchExact` | `boolean` | `true`：批量精准（每段与当前字段**全等**，OR）；`false`：模糊 + 英文引号包裹为全等 |
| `filterListing` | `string` | Listing 状态 |
| `filterDesign` | `string` | 平面状态 |
| `filterShop` | `string[]` | 店铺多选 |
| `filterBrand` | `string[]` | 品牌 |
| `filterPType` | `string[]` | 产品类型 |
| `filterCategory` | `string[]` | 品类 |
| `filterScene` | `string[]` | 场景 |
| `filterSeason` | `string[]` | 季节 |
| `filterTimeField` | `string` | 时间字段 key（见下） |
| `filterDateRange` | `[start, end]` | 与 `filterTimeField` 组合为闭区间日期筛选 |
| `filterStatusKeys` | `string[]` | 节点/状态多选；与 `activeSubNode` 单选互斥封装 |
| `listSort` | `string` | `''` \| `'auth_asc'` \| `'auth_desc'`（开发授权时间） |
| `filterAuthMode` | `string` | 授权方式占位：`''` \| `'manual'` \| `'system'` |
| `filterStaffOps` / `filterStaffDev` / `filterStaffDesign` / `filterStaffPhoto` / `filterStaffPurchase` | `string[]` | 各角色人员，选项池见 `LISTING_STAFF_OPTIONS` |
| `filterNeedShoot` / `filterNeedSample` / `filterHasParentPlan` | `boolean \| null` | 三态：`null` 不限 |
| `filterTimeout` | `boolean \| null` | `true`：仅含任一连线 `transitionInfos` 超时；`false`：不含超时 |
| `alertFilter` | `null \| 'overdue' \| 'warning'` | 在已过滤列表上再筛预警或超时 |

**时间字段 `filterTimeField` 取值与数据源（`timeFieldValue`）**：

| 值 | 数据来源摘要 |
|----|----------------|
| `authTime` | `product.authTime` |
| `planTime` | `timeline[1].time` |
| `poTime` | `timeline[3].time` |
| `inboundTime` | `timeline[4].time` |
| `sendTime` | `timeline[7].time` |
| `inTransitTime` | `timeline[8].time` |
| `launchTime` | `timeline[9].time` |
| `listingUploadTime` | `product.listingUploadTime` |

---

### 2.5 时效与 transitionInfos

- **计算函数**：`calcTransitionInfo(prevTl, currTl, transIdx, _logisticsName, _firstLegCtx, category)`  
- **配置来源**：`getTransitionConfig(transIdx, category)`，`category` 传 **`p.categoryId || p.category`**（与代码一致）。  
- **状态**：`transitionInfos[i].state` 为 `'pending' \| 'active' \| 'warning' \| 'overdue' \| 'done'` 等（以实际返回为准）；**预警/超时按钮**统计基于当前筛选结果集中是否存在任一 `state === 'warning'` / `'overdue'`。

---

### 2.6 系统视图快照 `buildSnapshot()` / `applySnapshot()`

持久化键：**`listing_tracking_sidebar_views`**（`listingTrackingSidebarViewsStorage.js`），JSON 结构：

```json
{
  "views": [
    {
      "id": "v_<时间戳>",
      "name": "最多20字",
      "snapshot": { }
    }
  ],
  "defaultId": "v_xxx或null"
}
```

**`snapshot` 包含字段**（与代码一致）：  
`sidebarPhase`, `filterStatusKeys`, `searchField`, `searchKeyword`, `searchBatchExact`, `filterListing`, `filterDesign`, `filterShop`, `filterBrand`, `filterPType`, `filterCategory`, `filterScene`, `filterSeason`, `filterTimeField`, `filterDateRange`, `alertFilter`, `listSort`, `filterAuthMode`, 各 `filterStaff*`, `filterNeedShoot`, `filterNeedSample`, `filterHasParentPlan`, `filterTimeout`。

**进入页**：若存在 `defaultViewId` 且视图存在，则 `onMounted` 自动 **`applySnapshot`** 并选中该视图。

---

### 2.7 列表与分页

| 项 | 值 |
|----|-----|
| `PAGE_SIZE` | `50`（常量） |
| `currentPage` | 与筛选联动变化时重置为 `1`（见 `watch` 依赖列表） |
| `listDisplayMode` | `'progress'` \| `'regular'`；本地键 **`listing_tracking_sidebar_display_mode`**，存 `'regular'` 或非 regular |

---

### 2.8 用户流程（摘要）

1. 用户进入「上架跟踪（边栏）」→ 可选收起左侧边栏或收起查询区。  
2. 选择边栏 **`sidebarPhase`** → 可选 **`filterStatusKeys`** / **`ListingNodeStatusBar`**（进行中）→ 使用筛选栏或 **系统视图** 恢复条件。  
3. 查看 **预警 / 超时** 数量，可点击仅看预警或仅看超时。  
4. 在 **进度** 或 **列表** 模式下浏览 **`paginatedProducts`**，勾选行，打开 **详情** 或 **创建采购计划**（eligible SKU）。  
5. 翻页时勾选 **`selectedIds`** 跨页保留；**筛选结果 id 集合变化**时自动清空勾选。

---

## 3. 非功能需求

| 类别 | 要求 |
|------|------|
| 性能 | 当前为 Mock 全量内存过滤；上线后建议服务端分页与索引，列表单页 **50** 条为前端默认。 |
| 安全 | 视图与折叠状态存 **localStorage**，不含敏感鉴权；正式环境需结合登录态与后端权限。 |
| 可用性 | 边栏、查询区可收起；超时按钮 `title` 说明统计口径；筛选条件以 **Tag** 展示并可单条移除或清除全部。 |
| 兼容 | 与「上架跟踪」主站共用 `listingDefs`、`useListingConfig`、Mock 数据结构，避免字段漂移。 |

---

## 4. 技术规格

| 层级 | 说明 |
|------|------|
| 前端框架 | **Vue 3**（`<script setup>`），**Element Plus** 组件（`el-button`、`el-pagination`、`el-dialog`、`el-checkbox` 等）。 |
| 页面与模块 | `ListingTrackingSidebarView.vue`；依赖 `ListingFilterBar`、`ListingNodeStatusBar`、`ListingProductRow`、`ListingRegularTable`、`ListingDetailDrawer`、`PurchasePlanEditorDialog`。 |
| 数据与配置 | `allListingProducts`（`listingMockData.js`）；时效 **`getTransitionConfig`**（`useListingConfig.js`）。 |
| 后端（规划） | 对接时 API 建议 **Java 25**（与团队规范一致）提供分页列表、筛选与视图服务端存储；本文档前端字段名可作为接口契约参考。 |

---

## 5. 验收标准

| 编号 | 测试点 | 预期 |
|------|--------|------|
| AC1 | 访问 `/listing/tracking-sidebar` | 面包屑为「上架 / 上架跟踪（边栏）」，主区域为边栏 + 内容区 |
| AC2 | 切换 `sidebarPhase` 五档 | 列表数据随 `resolveMainStatus` 过滤；`stocking` 时显示 8 张节点条 |
| AC3 | `filterStatusKeys` 多选 + 边栏阶段 | `stocking` 走 `matchSidebarInProgressPanelKey`，其余走 `matchStatusPanelKey` |
| AC4 | 预警/超时按钮 | 数量与当前 `filteredProducts` 上 `transitionInfos` 一致；再次点击取消过滤 |
| AC5 | 系统视图 | 另存为 ≤20 字；默认视图下次进入自动应用；更新/删除生效 |
| AC6 | 分页 | 每页 50 条；`total` 为 `alertedProducts.length` |
| AC7 | 勾选 | 换页保留；改变筛选导致结果集变化时勾选清空 |
| AC8 | 收起状态 | `listing_tracking_sidebar_collapsed`、`listing_tracking_sidebar_query_collapsed` 刷新后保持 |
| AC9 | 创建采购计划 | 仅 `isListingEligibleForPurchasePlan` 为 true 的勾选被带入；否则提示 |

---

## 6. 附录：localStorage 键一览

| 键 | 用途 |
|----|------|
| `listing_tracking_sidebar_collapsed` | `'1'` 边栏收起，`'0'` 展开 |
| `listing_tracking_sidebar_query_collapsed` | `'1'` 查询区收起 |
| `listing_tracking_sidebar_display_mode` | `'regular'` 为列表模式，否则进度模式 |
| `listing_tracking_sidebar_views` | 系统视图 JSON（`loadListingSidebarViews` / `saveListingSidebarViews`） |

---

*文档版本：与仓库 `ListingTrackingSidebarView.vue` 行为同步维护。*
