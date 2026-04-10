# 变更日志

## 2026-03-31

- 新增 `docs/prd/inventory-alert.md`：按 `.cursor/rules/requirement-doc.mdc` 编写「上架跟踪（边栏）」产品需求文档（路由、字段 ID、`localStorage` 键与代码一致，含功能/非功能/技术规格/验收标准）。
- 新增 `.cursor/rules/ui-design-generator.mdc`：UI 设计/实现规则（Vue 3 + Element Plus ERP 模式、信息架构、组件选型、输出格式与约束）。
- 新增 `docs/prd/上架跟踪-边栏-prd.md`：指向 `inventory-alert.md` 的中文文件名别名。
- 新增 `output/listing-tracking-sidebar/`：`index.html` + `prototype.css` + README，按 PRD 与 ui-design-generator 规则生成的上架跟踪（边栏）静态可交互原型；`output/README.md` 为目录说明。
- 重写 `output/listing-tracking-sidebar/index.html`：改为**纯 HTML/CSS/JS 单文件、无外链**，避免 CDN 失败导致表格空白；删除 `prototype.css`；补充多标签、列显示设置、明细三行+展开、分页 20/50/100/200 与跳转；更新 `output/listing-tracking-sidebar/README.md`。
- `ListingTrackingSidebarView.vue`：搜索字段 `searchField` 默认由「品名」改为 **SKU**（含视图快照回退与重置）；`output/listing-tracking-sidebar/index.html` 同步默认 SKU。
- 新增 `listingFlatSla.js`：按时效配置「全链路」中 `cm_graphic_total` / `cm_listing_upload` 标准天计算平面 / Listing 超期（起点后改为运营分配日，见下条）；`ListingTrackingSidebarView` 超时统计/筛选含此项；`ListingProductRow` / `ListingRegularTable` 展示「超时N天」标签；`ListingConfigView` 补充说明文案。
- `ListingRegularTable`：列表模式增加「超时摘要」列（节点 / 平面 / Listing 标签），任一类超时行 `lrt-dense-row--overdue` 浅红底 + 左侧色条；`ListingProductRow` 进度卡片同步 `lpr-block--overdue` 左侧强调。
