<script setup>
import { computed, ref, unref, watch } from 'vue'
import { useSceneDict } from '@/features/scene-dict/composables/useSceneDict.js'
import { YEAR_DEFS } from '@/features/scene-dict/constants.js'
import { calcHolidayDate } from '@/features/scene-dict/dateEngine.js'

const sd = useSceneDict()
const fileInput = ref(null)

const calendarSceneCount = computed(() =>
  unref(sd.calendarGroups).reduce((n, g) => n + g.items.length, 0),
)

const yearOptions = YEAR_DEFS

const visiblePageNums = computed(() => {
  const cur = sd.state.currentPage
  const total = unref(sd.totalPages)
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, cur, cur - 1, cur + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
})

watch(
  () => sd.state.selectedYear,
  () => {
    sd.saveState()
  },
)

function onTab(tab) {
  sd.state.activeTab = tab
}

function onCalFilter(f) {
  sd.state.calFilter = f
}
</script>

<template>
  <div class="scene-dict-page">
    <header class="erp-header">
      <div class="header-breadcrumb">
        <span>产品</span>
        <span class="bc-sep">/</span>
        <span class="bc-cur">场景管理</span>
      </div>
      <div class="header-right">
        <div class="year-select-wrap">
          <span class="year-select-icon">📅</span>
          <select v-model.number="sd.state.selectedYear" class="year-select">
            <option v-for="def in yearOptions" :key="def.year" :value="def.year">
              {{ def.year }}年 — {{ def.label }}
            </option>
          </select>
          <span
            v-if="sd.yearHintDef"
            class="year-select-hint"
            :class="sd.yearHintDef.hintCls"
          >{{ sd.yearHintDef.label }}</span>
        </div>
        <button type="button" class="erp-btn-ghost" title="智能节日引用" @click="sd.openPicker">
          🔗 引用节日节点
        </button>
        <span class="header-user">👤 管理员</span>
      </div>
    </header>

    <div class="metric-row">
      <div class="metric-card accent-blue">
        <div class="metric-icon">🎯</div>
        <div class="metric-body">
          <div class="metric-val">{{ sd.metrics.total }}</div>
          <div class="metric-label">场景总数</div>
        </div>
      </div>
      <div class="metric-card accent-red">
        <div class="metric-icon">🏆</div>
        <div class="metric-body">
          <div class="metric-val">{{ sd.metrics.slevel }}</div>
          <div class="metric-label">S级重点场景</div>
        </div>
      </div>
      <div class="metric-card accent-amber">
        <div class="metric-icon">⏰</div>
        <div class="metric-body">
          <div class="metric-val">{{ sd.metrics.pending }}</div>
          <div class="metric-label">60天内待启动开发</div>
        </div>
      </div>
      <div class="metric-card accent-green">
        <div class="metric-icon">🔨</div>
        <div class="metric-body">
          <div class="metric-val">{{ sd.metrics.indev }}</div>
          <div class="metric-label">当前进行中</div>
        </div>
      </div>
    </div>

    <div class="tab-nav">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: sd.state.activeTab === 'list' }"
        @click="onTab('list')"
      >
        📋 场景总览
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: sd.state.activeTab === 'calendar' }"
        @click="onTab('calendar')"
      >
        📅 开发日历
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: sd.state.activeTab === 'template' }"
        @click="onTab('template')"
      >
        ⚙️ 等级模板配置
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: sd.state.activeTab === 'rules' }"
        @click="onTab('rules')"
      >
        📖 节日规则库
      </button>
    </div>

    <!-- 场景总览 -->
    <div
      v-show="sd.state.activeTab === 'list'"
      id="panel-list"
      class="tab-panel erp-panel"
    >
      <div class="panel-body">
        <div class="query-panel">
          <div class="filter-bar">
            <div class="filter-item">
              <span class="filter-label">场景类型</span>
              <select v-model="sd.state.typeFilter" class="filter-select">
                <option value="all">全部</option>
                <option value="holiday">节日场景</option>
                <option value="static">物理场景</option>
              </select>
            </div>
            <div class="filter-item">
              <span class="filter-label">国家/地区</span>
              <select v-model="sd.state.countryFilter" class="filter-select">
                <option value="all">全部</option>
                <option value="US">美国</option>
                <option value="UK">英国</option>
                <option value="DE">德国</option>
                <option value="AU">澳大利亚</option>
                <option value="CA">加拿大</option>
                <option value="Global">全球</option>
              </select>
            </div>
            <div class="filter-item">
              <span class="filter-label">标签分组</span>
              <select v-model="sd.state.tagFilter" class="filter-select">
                <option value="all">全部</option>
                <option v-for="t in sd.tagFilterOptions" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="filter-item filter-item-search">
              <span class="filter-label">关键词</span>
              <div class="filter-search-wrap">
                <input
                  v-model="sd.state.keyword"
                  type="text"
                  class="filter-search-input"
                  placeholder="搜索场景名称 / 代码..."
                />
                <span class="filter-search-icon">🔍</span>
              </div>
            </div>
            <div class="filter-ops">
              <button type="button" class="filter-reset-btn" @click="sd.resetFilters">重置</button>
            </div>
          </div>
          <div class="action-bar">
            <div class="action-bar-left">
              <button type="button" class="erp-btn-primary" @click="sd.openSceneModal(null)">
                ＋ 新增场景
              </button>
              <button type="button" class="erp-btn-ghost" @click="sd.openImportModal">📥 导入</button>
              <button type="button" class="erp-btn-ghost" @click="sd.genTestData">生成测试数据</button>
              <div
                class="batch-inline"
                :class="{ hidden: sd.state.selectedRowIds.length === 0 }"
              >
                <span class="batch-divider" />
                <span class="batch-icon">✓</span>
                <span class="batch-count-text">已选 {{ sd.state.selectedRowIds.length }} 项</span>
                <button
                  type="button"
                  class="erp-btn-primary sm"
                  @click="sd.openTagModal(sd.state.selectedRowIds)"
                >
                  批量打标签
                </button>
                <button
                  type="button"
                  class="erp-btn-ghost sm"
                  @click="sd.state.selectedRowIds = []"
                >
                  取消选择
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="erp-table-wrap">
          <table class="erp-table">
            <thead>
              <tr>
                <th class="col-check">
                  <input
                    type="checkbox"
                    :checked="sd.pageAllSelected"
                    @change="sd.toggleSelectAllPage($event.target.checked)"
                  />
                </th>
                <th>场景名称</th>
                <th>类型</th>
                <th>国家</th>
                <th>等级</th>
                <th>季节 / 属性</th>
                <th>日期规则</th>
                <th>{{ sd.state.selectedYear }}年节日日期</th>
                <th>SKU计划</th>
                <th>标签</th>
                <th>启用</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sd.pageRows" :key="row.id" :data-id="row.id">
                <td class="cell-check col-check">
                  <input
                    type="checkbox"
                    :checked="sd.state.selectedRowIds.includes(row.id)"
                    @change="sd.toggleRowSelect(row.id, $event.target.checked)"
                  />
                </td>
                <td>
                  <div style="font-weight: 500">{{ row.nameCn }}</div>
                  <div style="font-size: 11px; color: #9ca3af">{{ row.nameEn }}</div>
                </td>
                <td>
                  <span
                    class="type-badge"
                    :class="row.type === 'holiday' ? 'badge-type-holiday' : 'badge-type-static'"
                  >{{ row.type === 'holiday' ? '🎉 节日场景' : '📦 物理场景' }}</span>
                </td>
                <td>
                  <div class="country-tags">
                    <span v-for="c in row.countries" :key="c" class="country-tag">{{
                      sd.COUNTRY_LABELS[c] || c
                    }}</span>
                  </div>
                </td>
                <td>
                  <template v-if="row.type === 'static'"><span class="muted" style="font-size: 11px">—</span></template>
                  <template v-else>
                    <span
                      v-if="sd.getLevelById(sd.state.levels, row.level)"
                      class="level-badge"
                      :style="{
                        background: sd.getLevelById(sd.state.levels, row.level).color,
                      }"
                    >{{ sd.getLevelById(sd.state.levels, row.level).name }}</span>
                    <span v-else class="muted">—</span>
                    <span
                      v-if="row.leadTimeOverride && (row.leadTimeOverride.devMonths != null || row.leadTimeOverride.purMonths != null || row.leadTimeOverride.wrmDays != null)"
                      class="override-badge"
                      title="已自定义提前量"
                    >⚙</span>
                  </template>
                </td>
                <td>
                  <template v-if="row.type === 'static'">
                    <span
                      class="season-attr-badge"
                      :class="'season-' + (row.seasonAttr || 'annual')"
                    >{{ sd.SEASON_ATTR_LABELS[row.seasonAttr] || row.seasonAttr }}</span>
                  </template>
                  <template v-else>
                    <span class="season-badge" :class="'season-' + row.seasonality">{{
                      sd.SEASONALITY_LABELS[row.seasonality] || row.seasonality
                    }}</span>
                  </template>
                </td>
                <td>
                  <template v-if="row.type === 'static'">
                    <span class="muted" style="font-size: 11px">常态开发{{ row.mainCategory ? ' · ' + row.mainCategory : '' }}</span>
                  </template>
                  <template v-else>
                    <span style="font-size: 11px; color: #374151">{{ sd.describeRule(row.dateRule) }}</span>
                  </template>
                </td>
                <td>
                  <template v-if="row.type === 'static'"><span class="muted">—</span></template>
                  <template v-else>
                    <span v-if="sd.rowHolidayDate(row)" style="font-size: 12.5px; font-weight: 500">{{
                      sd.formatDate(sd.rowHolidayDate(row))
                    }}</span>
                    <span v-else class="muted">—</span>
                  </template>
                </td>
                <td>
                  <template v-if="row.skuPlan">
                    <span style="font-weight: 500">{{ row.skuPlan }}</span
                    ><span class="muted" style="font-size: 11px"> SKU</span>
                  </template>
                  <span v-else class="muted">—</span>
                </td>
                <td>
                  <div class="tags-cell">
                    <span
                      v-for="t in (row.tags || []).slice(0, 3)"
                      :key="t"
                      class="tag-chip"
                      :style="{
                        background: sd.tagColor(t, sd.TAG_COLORS)[0],
                        color: sd.tagColor(t, sd.TAG_COLORS)[1],
                      }"
                    >{{ t }}<span class="tag-remove" @click="sd.removeTagFromRow(row, t)">×</span></span>
                    <span
                      v-if="(row.tags || []).length > 3"
                      class="tag-chip"
                      style="background: #f3f4f6; color: #6b7280"
                    >+{{ row.tags.length - 3 }}</span>
                    <span class="tag-chip tag-chip-clickable" @click="sd.openTagModal([row.id])">＋配置</span>
                  </div>
                </td>
                <td>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      :checked="row.enabled !== false"
                      @change="sd.setRowEnabled(row, $event.target.checked)"
                    />
                    <span class="toggle-thumb" />
                  </label>
                </td>
                <td>
                  <div class="action-btns">
                    <button type="button" class="action-btn action-btn-edit" @click="sd.openSceneModal(row.id)">
                      编辑
                    </button>
                    <button type="button" class="action-btn action-btn-del" @click="sd.deleteRow(row.id)">
                      删除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="sd.pageRows.length === 0">
                <td colspan="12" style="text-align: center; padding: 40px; color: #9ca3af">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="erp-pagination">
          <template v-if="sd.totalPages <= 1 && sd.totalFiltered <= sd.PAGE_SIZE">
            <span class="pg-info">共 {{ sd.totalFiltered }} 条</span>
          </template>
          <template v-else>
            <span class="pg-info">共 {{ sd.totalFiltered }} 条</span>
            <button
              type="button"
              class="pg-btn"
              :disabled="sd.state.currentPage <= 1"
              @click="sd.state.currentPage--"
            >
              ‹
            </button>
            <template v-for="(p, idx) in visiblePageNums" :key="'p-' + p">
              <span
                v-if="idx > 0 && p - visiblePageNums[idx - 1] > 1"
                class="pg-info"
              >…</span>
              <button
                type="button"
                class="pg-btn"
                :class="{ active: sd.state.currentPage === p }"
                @click="sd.state.currentPage = p"
              >
                {{ p }}
              </button>
            </template>
            <button
              type="button"
              class="pg-btn"
              :disabled="sd.state.currentPage >= sd.totalPages"
              @click="sd.state.currentPage++"
            >
              ›
            </button>
            <span class="pg-info">第 {{ sd.state.currentPage }}/{{ sd.totalPages }} 页</span>
          </template>
        </div>
      </div>
    </div>

    <!-- 开发日历 -->
    <div
      v-show="sd.state.activeTab === 'calendar'"
      id="panel-calendar"
      class="tab-panel erp-panel"
    >
      <div class="cal-header">
        <div class="cal-header-left">
          <h3>📅 {{ sd.state.selectedYear }}年 开发日历</h3>
          <span class="cal-subtitle">共 {{ calendarSceneCount }} 个场景，按开发启动时间排序</span>
        </div>
        <div class="cal-header-right">
          <span class="cal-filter-label">筛选：</span>
          <button
            type="button"
            class="cal-filter-btn"
            :class="{ active: sd.state.calFilter === 'all' }"
            @click="onCalFilter('all')"
          >
            全部
          </button>
          <button
            type="button"
            class="cal-filter-btn"
            :class="{ active: sd.state.calFilter === 'urgent' }"
            @click="onCalFilter('urgent')"
          >
            紧急/逾期
          </button>
        </div>
      </div>
      <div class="cal-body">
        <template v-if="!sd.calendarGroups.length">
          <div style="padding: 60px; text-align: center; color: #9ca3af">📭 暂无符合条件的节日场景</div>
        </template>
        <template v-else>
          <div v-for="grp in sd.calendarGroups" :key="grp.month" class="cal-month-group">
            <div class="cal-month-label">
              <span class="cal-month-text">{{ grp.label }}</span>
              <span class="cal-month-count">{{ grp.items.length }} 个场景</span>
            </div>
            <div class="cal-month-items">
              <div
                v-for="item in grp.items"
                :key="item.r.id + '-' + grp.month"
                class="cal-item"
                :class="{
                  'cal-item-urgent':
                    item.urgency.cls === 'devstart-overdue' ||
                    item.urgency.cls === 'devstart-urgent',
                }"
              >
                <div class="cal-item-left">
                  <div class="cal-item-name">
                    <span
                      v-if="sd.getLevelById(sd.state.levels, item.r.level)"
                      class="level-badge"
                      :style="{
                        background: sd.getLevelById(sd.state.levels, item.r.level).color,
                        fontSize: '11px',
                        padding: '2px 7px',
                      }"
                    >{{ sd.getLevelById(sd.state.levels, item.r.level).name }}</span>
                    <span class="cal-scene-cn">{{ item.r.nameCn }}</span>
                  </div>
                  <div class="cal-scene-en">{{ item.r.nameEn }}</div>
                  <div class="country-tags" style="margin-top: 4px">
                    <span v-for="c in item.r.countries" :key="c" class="country-tag">{{
                      sd.COUNTRY_LABELS[c] || c
                    }}</span>
                  </div>
                </div>
                <div class="cal-item-dates">
                  <div class="cal-date-col">
                    <div class="cal-date-label">📌 开发启动</div>
                    <div class="cal-date-val" :class="item.urgency.cls">{{
                      sd.formatDate(item.tl.devStart)
                    }}</div>
                  </div>
                  <div class="cal-date-col">
                    <div class="cal-date-label">✅ 采购下单</div>
                    <div class="cal-date-val">{{ sd.formatDate(item.tl.purchaseDeadline) }}</div>
                  </div>
                  <div class="cal-date-col">
                    <div class="cal-date-label">📣 预热启动</div>
                    <div class="cal-date-val">{{ sd.formatDate(item.tl.warmupDate) }}</div>
                  </div>
                  <div class="cal-date-col">
                    <div class="cal-date-label">🎉 节日日期</div>
                    <div class="cal-date-val" style="font-weight: 600; color: #1f2937">{{
                      sd.formatDate(item.hDate)
                    }}</div>
                  </div>
                  <div class="cal-date-col">
                    <div class="cal-date-label">📦 SKU计划</div>
                    <div class="cal-date-val">{{ item.r.skuPlan ? item.r.skuPlan + ' SKU' : '—' }}</div>
                  </div>
                </div>
                <div class="cal-item-right">
                  <button
                    type="button"
                    class="action-btn action-btn-edit"
                    @click="sd.openSceneModal(item.r.id)"
                  >
                    📋 详情
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 等级模板 -->
    <div
      v-show="sd.state.activeTab === 'template'"
      id="panel-template"
      class="tab-panel erp-panel"
    >
      <div class="tpl-header">
        <div>
          <h3>等级与节点模板管理</h3>
          <p class="muted">自定义等级名称、颜色和倒排提前量，修改后所有关联日期实时重算。</p>
        </div>
        <button type="button" class="erp-btn-primary" @click="sd.addLevel">＋ 新增等级</button>
      </div>
      <div class="erp-table-wrap">
        <table class="erp-table tpl-table">
          <thead>
            <tr>
              <th>等级名称</th>
              <th>颜色标识</th>
              <th>开发提前（月）</th>
              <th>采购提前（月）</th>
              <th>预热提前（天）</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lv in sd.state.levels" :key="lv.id">
              <td>
                <input v-model="lv.name" class="level-name-input" @change="sd.saveLevel(lv)" />
              </td>
              <td>
                <div class="color-cell">
                  <span class="color-swatch" :style="{ background: lv.color }" />
                  <input v-model="lv.color" type="color" class="color-picker" @change="sd.saveLevel(lv)" />
                </div>
              </td>
              <td>
                <input
                  v-model.number="lv.devMonths"
                  type="number"
                  class="level-lead-input"
                  min="0"
                  max="24"
                  @change="sd.saveLevel(lv)"
                />
              </td>
              <td>
                <input
                  v-model.number="lv.purMonths"
                  type="number"
                  class="level-lead-input"
                  min="0"
                  max="12"
                  @change="sd.saveLevel(lv)"
                />
              </td>
              <td>
                <input
                  v-model.number="lv.wrmDays"
                  type="number"
                  class="level-lead-input"
                  min="0"
                  max="90"
                  @change="sd.saveLevel(lv)"
                />
              </td>
              <td>
                <div class="level-actions">
                  <button type="button" class="save-level-btn" @click="sd.saveLevel(lv)">保存</button>
                  <button type="button" class="erp-btn-danger delete-level-btn" @click="sd.deleteLevel(lv.id)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="tpl-tip">
        📌 修改提前量后点击"保存"立即生效；侧边栏筛选、表单下拉和所有倒排日期自动同步。
      </div>
    </div>

    <!-- 节日规则库 -->
    <div
      v-show="sd.state.activeTab === 'rules'"
      id="panel-rules"
      class="tab-panel erp-panel"
    >
      <div class="rules-header">
        <h3>节日日期规则库</h3>
        <p class="muted">维护底层日期算法，系统据此自动渲染 2025-2027 年具体日期。</p>
      </div>
      <div class="erp-table-wrap">
        <table class="erp-table">
          <thead>
            <tr>
              <th>场景名称（中/英）</th>
              <th>国家</th>
              <th>日期模式</th>
              <th>规则描述</th>
              <th>2025年日期</th>
              <th>2026年日期</th>
              <th>2027年日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sd.rulesRows" :key="r.id">
              <td>
                <div style="font-weight: 500">{{ r.nameCn }}</div>
                <div style="font-size: 11px; color: #9ca3af">{{ r.nameEn }}</div>
              </td>
              <td>
                <div class="country-tags">
                  <span v-for="c in r.countries" :key="c" class="country-tag">{{
                    sd.COUNTRY_LABELS[c] || c
                  }}</span>
                </div>
              </td>
              <td>
                <span class="type-badge badge-type-holiday">{{
                  r.dateRule?.mode === 'fixed'
                    ? '固定日期'
                    : r.dateRule?.mode === 'relative'
                      ? '相对日期'
                      : '手动指定'
                }}</span>
              </td>
              <td class="rule-desc">{{ sd.describeRule(r.dateRule) }}</td>
              <td class="rule-date-cell">{{ sd.formatDate(calcHolidayDate(r.dateRule, 2025)) }}</td>
              <td class="rule-date-cell">{{ sd.formatDate(calcHolidayDate(r.dateRule, 2026)) }}</td>
              <td class="rule-date-cell">{{ sd.formatDate(calcHolidayDate(r.dateRule, 2027)) }}</td>
              <td>
                <button type="button" class="action-btn action-btn-edit" @click="sd.openSceneModal(r.id)">
                  编辑
                </button>
              </td>
            </tr>
            <tr v-if="sd.rulesRows.length === 0">
              <td colspan="8" style="text-align: center; padding: 40px; color: #9ca3af">暂无节日规则数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 场景表单弹窗 -->
    <div
      v-show="sd.sceneModalVisible"
      class="erp-modal-overlay"
      @click.self="sd.closeSceneModal"
    >
      <div class="erp-modal modal-lg" @click.stop>
        <div class="erp-modal-header">
          <h3>{{ sd.sceneForm.editingId != null ? '编辑场景' : '新增场景' }}</h3>
          <button type="button" class="modal-close-btn" @click="sd.closeSceneModal">×</button>
        </div>
        <div class="erp-modal-body">
          <section class="form-section">
            <h4 class="form-section-title">基本信息</h4>
            <div class="form-grid-2">
              <div class="form-field">
                <label>场景名称（中文）<span class="req">*</span></label>
                <input v-model="sd.sceneForm.nameCn" type="text" class="erp-input" />
              </div>
              <div class="form-field">
                <label>场景名称（英文）<span class="req">*</span></label>
                <input v-model="sd.sceneForm.nameEn" type="text" class="erp-input" />
              </div>
              <div class="form-field">
                <label>场景类型 <span class="req">*</span></label>
                <select v-model="sd.sceneForm.type" class="erp-select">
                  <option value="holiday">🎉 节日 / 节点场景</option>
                  <option value="static">📦 物理 / 生活场景</option>
                </select>
              </div>
              <div class="form-field">
                <label>SKU 计划数量</label>
                <input v-model.number="sd.sceneForm.skuPlan" type="number" min="0" class="erp-input" />
              </div>
            </div>
            <div class="form-field">
              <label>归属国家（可多选）<span class="req">*</span></label>
              <div class="checkbox-group">
                <label v-for="c in ['US','UK','DE','AU','CA','Global']" :key="c" class="checkbox-item">
                  <input v-model="sd.sceneForm.countries" type="checkbox" :value="c" />
                  {{ sd.COUNTRY_LABELS[c] || c }} {{ c }}
                </label>
              </div>
            </div>
          </section>

          <section v-show="sd.sceneForm.type === 'static'" class="form-section form-cond-section">
            <h4 class="form-section-title">物理场景属性 <span class="badge-type-static">📦 物理场景</span></h4>
            <div class="form-grid-2">
              <div class="form-field">
                <label>核心适用季节</label>
                <select v-model="sd.sceneForm.seasonAttr" class="erp-select">
                  <option value="annual">全年常青</option>
                  <option value="ss">春夏季（SS）</option>
                  <option value="fw">秋冬季（FW）</option>
                </select>
              </div>
              <div class="form-field">
                <label>主要关联类目</label>
                <input v-model="sd.sceneForm.mainCategory" type="text" class="erp-input" />
              </div>
            </div>
            <div class="static-scene-tip">💡 物理场景无需设置节日日期，列表中日期相关列显示"常态开发"。</div>
          </section>

          <section v-show="sd.sceneForm.type === 'holiday'" class="form-section form-cond-section">
            <h4 class="form-section-title">节日场景属性 <span class="badge-type-event">🎉 节日场景</span></h4>
            <div class="form-grid-2">
              <div class="form-field">
                <label>节日等级 <span class="req">*</span></label>
                <select v-model="sd.sceneForm.level" class="erp-select">
                  <option v-for="lv in sd.state.levels" :key="lv.id" :value="lv.id">{{ lv.name }}</option>
                </select>
              </div>
              <div class="form-field">
                <label>季节性属性</label>
                <select v-model="sd.sceneForm.seasonality" class="erp-select">
                  <option value="strong">强季节性</option>
                  <option value="medium">中季节性</option>
                  <option value="weak">弱季节性</option>
                  <option value="all_year">全年可用</option>
                </select>
              </div>
            </div>
            <div class="form-subsection">
              <p class="form-subsection-label">日期规则配置</p>
              <div class="radio-group" style="margin-bottom: 12px">
                <label class="radio-item">
                  <input v-model="sd.sceneForm.dateMode" type="radio" value="fixed" /> 固定日期
                </label>
                <label class="radio-item">
                  <input v-model="sd.sceneForm.dateMode" type="radio" value="relative" /> 相对日期
                </label>
                <label class="radio-item">
                  <input v-model="sd.sceneForm.dateMode" type="radio" value="manual" /> 手动指定
                </label>
              </div>
              <div v-show="sd.sceneForm.dateMode === 'fixed'" class="date-mode-panel">
                <div class="form-grid-2">
                  <div class="form-field">
                    <label>月份（1-12）</label>
                    <input v-model.number="sd.sceneForm.fixedMonth" type="number" min="1" max="12" class="erp-input" />
                  </div>
                  <div class="form-field">
                    <label>日（1-31）</label>
                    <input v-model.number="sd.sceneForm.fixedDay" type="number" min="1" max="31" class="erp-input" />
                  </div>
                </div>
              </div>
              <div v-show="sd.sceneForm.dateMode === 'relative'" class="date-mode-panel">
                <div class="form-grid-3">
                  <div class="form-field">
                    <label>第几个</label>
                    <select v-model.number="sd.sceneForm.relNth" class="erp-select">
                      <option :value="1">第1个</option>
                      <option :value="2">第2个</option>
                      <option :value="3">第3个</option>
                      <option :value="4">第4个</option>
                      <option :value="-1">最后1个</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>星期几</label>
                    <select v-model.number="sd.sceneForm.relWeekday" class="erp-select">
                      <option v-for="(d, i) in ['周日','周一','周二','周三','周四','周五','周六']" :key="i" :value="i">
                        {{ d }}
                      </option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>月份</label>
                    <input v-model.number="sd.sceneForm.relMonth" type="number" min="1" max="12" class="erp-input" />
                  </div>
                </div>
              </div>
              <div v-show="sd.sceneForm.dateMode === 'manual'" class="date-mode-panel">
                <div class="form-grid-3">
                  <div class="form-field">
                    <label>2025年日期</label>
                    <input v-model="sd.sceneForm.manual2025" type="date" class="erp-input" />
                  </div>
                  <div class="form-field">
                    <label>2026年日期</label>
                    <input v-model="sd.sceneForm.manual2026" type="date" class="erp-input" />
                  </div>
                  <div class="form-field">
                    <label>2027年日期</label>
                    <input v-model="sd.sceneForm.manual2027" type="date" class="erp-input" />
                  </div>
                </div>
              </div>
            </div>
            <div class="form-subsection">
              <p class="form-subsection-label">开发时间节点预览</p>
              <div v-if="sd.formTimelinePreview" class="timeline-preview-grid">
                <div
                  class="tl-preview-item"
                  :class="{ 'tl-overridden': sd.formTimelinePreview.override?.devMonths != null }"
                >
                  <div class="tl-label">📌 开发启动</div>
                  <div class="tl-date">{{ sd.formatDate(sd.formTimelinePreview.tl.devStart) }}</div>
                </div>
                <div
                  class="tl-preview-item"
                  :class="{ 'tl-overridden': sd.formTimelinePreview.override?.purMonths != null }"
                >
                  <div class="tl-label">🛒 采购下单</div>
                  <div class="tl-date">{{ sd.formatDate(sd.formTimelinePreview.tl.purchaseDeadline) }}</div>
                </div>
                <div
                  class="tl-preview-item"
                  :class="{ 'tl-overridden': sd.formTimelinePreview.override?.wrmDays != null }"
                >
                  <div class="tl-label">📣 预热启动</div>
                  <div class="tl-date">{{ sd.formatDate(sd.formTimelinePreview.tl.warmupDate) }}</div>
                </div>
                <div class="tl-preview-item">
                  <div class="tl-label">🎉 节日当日</div>
                  <div class="tl-date">{{ sd.formatDate(sd.formTimelinePreview.tl.holidayDate) }}</div>
                </div>
              </div>
              <div v-else class="muted" style="font-size: 12px">请先填写等级和日期规则</div>
            </div>
            <div class="form-subsection override-subsection">
              <p class="form-subsection-label override-toggle-label">
                <label class="override-chk-label">
                  <input v-model="sd.sceneForm.useOverride" type="checkbox" /> 自定义提前量
                </label>
              </p>
              <div v-show="sd.sceneForm.useOverride" class="form-grid-3">
                <div class="form-field">
                  <label>开发提前（月）</label>
                  <input v-model="sd.sceneForm.overrideDev" type="number" class="erp-input" />
                </div>
                <div class="form-field">
                  <label>采购提前（月）</label>
                  <input v-model="sd.sceneForm.overridePur" type="number" class="erp-input" />
                </div>
                <div class="form-field">
                  <label>预热提前（天）</label>
                  <input v-model="sd.sceneForm.overrideWrm" type="number" class="erp-input" />
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="erp-modal-footer">
          <button type="button" class="erp-btn-ghost" @click="sd.closeSceneModal">取消</button>
          <button type="button" class="erp-btn-primary" @click="sd.confirmSceneModal">确认保存</button>
        </div>
      </div>
    </div>

    <!-- 标签弹窗 -->
    <div v-show="sd.tagModalVisible" class="erp-modal-overlay" @click.self="sd.tagModalVisible = false">
      <div class="erp-modal" @click.stop>
        <div class="erp-modal-header">
          <h3>{{ sd.tagModalTitle }}</h3>
          <button type="button" class="modal-close-btn" @click="sd.tagModalVisible = false">×</button>
        </div>
        <div class="erp-modal-body">
          <div class="tag-section">
            <p class="tag-section-label">已选标签</p>
            <div class="tag-area selected-area">
              <span
                v-for="t in sd.tagPending"
                :key="t"
                class="tag-chip"
                :style="{
                  background: sd.tagColor(t, sd.TAG_COLORS)[0],
                  color: sd.tagColor(t, sd.TAG_COLORS)[1],
                }"
              >{{ t }}<span class="tag-remove" @click="sd.removeTag(t)">×</span></span>
            </div>
          </div>
          <div class="tag-section">
            <p class="tag-section-label">标签库</p>
            <div class="tag-area library-area">
              <span
                v-for="t in sd.allTagsLibrary.filter((x) => !sd.tagPending.includes(x))"
                :key="t"
                class="tag-chip"
                style="cursor: pointer"
                :style="{
                  background: sd.tagColor(t, sd.TAG_COLORS)[0],
                  color: sd.tagColor(t, sd.TAG_COLORS)[1],
                }"
                @click="sd.addTagFromLibrary(t)"
              >{{ t }}</span>
            </div>
          </div>
          <div class="tag-section">
            <p class="tag-section-label">创建新标签</p>
            <div class="new-tag-row">
              <input
                id="newTagInputEl"
                type="text"
                class="erp-input"
                placeholder="输入标签名称，回车添加"
                @keydown.enter="sd.addNewTagInput($event.target.value); $event.target.value = ''"
              />
              <button
                type="button"
                class="erp-btn-primary"
                @click="
                  (e) => {
                    const el = e.target.closest('.new-tag-row').querySelector('input')
                    sd.addNewTagInput(el.value)
                    el.value = ''
                  }
                "
              >
                添加
              </button>
            </div>
          </div>
        </div>
        <div class="erp-modal-footer">
          <button type="button" class="erp-btn-ghost" @click="sd.tagModalVisible = false">取消</button>
          <button type="button" class="erp-btn-primary" @click="sd.confirmTagModal">确认</button>
        </div>
      </div>
    </div>

    <!-- Holiday picker -->
    <div v-show="sd.pickerVisible" class="erp-modal-overlay" @click.self="sd.pickerVisible = false">
      <div class="erp-modal modal-lg" @click.stop>
        <div class="erp-modal-header">
          <div>
            <h3>🔗 引用节日节点</h3>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 2px">跨年份智能推荐</p>
          </div>
          <button type="button" class="modal-close-btn" @click="sd.pickerVisible = false">×</button>
        </div>
        <div class="erp-modal-body" style="padding: 0">
          <div class="picker-toolbar">
            <input v-model="sd.pickerSearch" type="text" class="erp-input" placeholder="🔍 搜索场景..." style="width: 220px" />
            <label class="picker-chk-label">
              <input v-model="sd.pickerShowExpired" type="checkbox" /> 显示已过期
            </label>
            <span class="picker-count">共 {{ sd.pickerSections.total }} 个节点</span>
          </div>
          <div class="picker-list">
            <template v-if="sd.pickerSections.recommended.length">
              <div class="picker-separator">✅ 推荐 — 当前最佳开发期 ({{ sd.pickerSections.recommended.length }})</div>
              <div
                v-for="item in sd.pickerSections.recommended"
                :key="'r-' + item.r.id + '-' + item.yr"
                class="picker-item picker-item-recommend"
                @click="sd.copyPickerText(`${item.r.nameCn} (${item.yr}年 · ${item.hDate})`)"
              >
                <div class="picker-left">
                  <div class="picker-name-row">
                    <span class="picker-cn">{{ item.r.nameCn }}</span>
                    <span class="picker-en">{{ item.r.nameEn }}</span>
                  </div>
                  <div class="picker-meta">
                    <span>开发启动 {{ sd.formatDate(item.tl.devStart) }}</span>
                  </div>
                </div>
                <div class="picker-right">
                  <div class="picker-holiday-date">{{ sd.formatDate(item.hDate) }}</div>
                </div>
              </div>
            </template>
            <template v-if="sd.pickerSections.upcoming.length">
              <div class="picker-separator">🕐 待开发 ({{ sd.pickerSections.upcoming.length }})</div>
              <div
                v-for="item in sd.pickerSections.upcoming"
                :key="'u-' + item.r.id + '-' + item.yr"
                class="picker-item"
                @click="sd.copyPickerText(`${item.r.nameCn} (${item.yr}年)`)"
              >
                <div class="picker-left">
                  <span class="picker-cn">{{ item.r.nameCn }}</span>
                </div>
                <div class="picker-right">{{ sd.formatDate(item.hDate) }}</div>
              </div>
            </template>
          </div>
        </div>
        <div class="erp-modal-footer">
          <button type="button" class="erp-btn-ghost" @click="sd.pickerVisible = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- Import -->
    <div v-show="sd.importVisible" class="erp-modal-overlay" @click.self="sd.importVisible = false">
      <div class="erp-modal modal-lg" @click.stop>
        <div class="erp-modal-header">
          <div>
            <h3>📥 批量导入场景</h3>
            <p style="font-size: 12px; color: #9ca3af">支持 .xlsx / .xls</p>
          </div>
          <button type="button" class="modal-close-btn" @click="sd.importVisible = false">×</button>
        </div>
        <div class="erp-modal-body" style="padding: 0">
          <div v-show="sd.importStep === 1" class="import-step">
            <div
              class="import-upload-zone"
              @click="fileInput?.click()"
              @dragover.prevent
              @drop.prevent="
                (e) => {
                  const f = e.dataTransfer.files[0]
                  if (f) sd.handleImportFile(f)
                }
              "
            >
              <div class="import-upload-icon">📂</div>
              <p class="import-upload-title">点击选择文件，或将文件拖拽至此处</p>
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                style="display: none"
                @change="sd.handleImportFile($event.target.files[0])"
              />
            </div>
            <div class="import-tpl-tip">💡 请先下载导入模板，按模板填写后再上传。</div>
          </div>
          <div v-show="sd.importStep === 2" class="import-step">
            <div class="import-preview-bar">
              <span class="import-stat-ok">✅ {{ sd.importResults.filter((r) => r.data).length }} 条可导入</span>
            </div>
            <div class="import-preview-table-wrap">
              <table class="erp-table">
                <thead>
                  <tr>
                    <th style="width: 40px">行</th>
                    <th>场景名称（中文）</th>
                    <th>场景名称（英文）</th>
                    <th>类型</th>
                    <th>国家</th>
                    <th>等级</th>
                    <th>校验结果</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in sd.importResults" :key="r.rowNum" :class="r.data ? 'import-row-ok' : 'import-row-err'">
                    <td>{{ r.rowNum }}</td>
                    <td>{{ r.nameCn }}</td>
                    <td>{{ r.nameEn }}</td>
                    <td>{{ r.typeName }}</td>
                    <td>{{ r.countryList?.join(', ') }}</td>
                    <td>{{ r.level }}</td>
                    <td>{{ r.data ? '✅ 通过' : r.errors[0] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="erp-modal-footer">
          <button type="button" class="erp-btn-ghost" @click="sd.downloadImportTemplate">⬇ 下载导入模板</button>
          <div style="flex: 1" />
          <button type="button" class="erp-btn-ghost" @click="sd.importVisible = false">取消</button>
          <button
            v-show="sd.importStep === 2"
            type="button"
            class="erp-btn-primary"
            @click="sd.confirmImport"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene-dict-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
