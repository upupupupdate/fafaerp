# 上架跟踪（边栏）UI 原型（已重写）

依据 **`docs/prd/inventory-alert.md`**（别名 **`docs/prd/上架跟踪-边栏-prd.md`**）与 **`.cursor/rules/ui-design-generator.mdc`**（扁平化、蓝色、响应式、多标签、列设置、明细展开、分页条数可选）。

## 与旧版区别（为何不可用已修复）

- **旧版**依赖 Vue / Element Plus **CDN**，离线或 `file://` 下脚本失败会导致**表格不渲染**，只剩占位文案。  
- **当前 `index.html` 为纯 HTML + 内联 CSS + 原生 JS**，**无任何外链**，双击本地打开即可看到**完整表格与分页**。

## 文件

| 文件 | 说明 |
|------|------|
| `index.html` | **唯一页面**：ERP 壳、多标签条、面包屑、主状态边栏（五档 + 收起）、筛选区（可收起）、系统视图行、工具条、进行中 **8 张节点卡**、**列表/进度**切换、预警/超时、**列显示设置**弹窗、表格内 **3 条明细 + 展开全部**、分页 **20/50/100/200** + 跳转 |
| `README.md` | 本说明 |

## 如何打开

直接双击 **`index.html`**（推荐）或通过本地静态服务访问同一目录。

## PRD 字段对应（摘要）

- `sidebarPhase`、`SIDEBAR_IN_PROGRESS_PANELS` 八键、`listDisplayMode`、`alertFilter`、`PAGE_SIZE` 可选、`filterStatusKeys`（节点卡即筛选子节点演示）。

正式实现仍以 **`src/views/listing/ListingTrackingSidebarView.vue`** 为准。
