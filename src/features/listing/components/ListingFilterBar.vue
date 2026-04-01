<script setup>
// 筛选区组件 — 上架跟踪列表的查询条件面板
// 通过 defineModel 双向绑定所有筛选值，父组件只需 v-model:xxx="xxx" 即可

const SHOPS   = ['US站','UK站','DE站','JP站','CA站','AU站']
const CATS    = ['个护','美妆','户外','家居','母婴','运动','数码','服饰','文具','食品','宠物','厨具']
const SCENES  = ['防晒','日妆','运动','收纳','护肤','健身','露营','通勤','居家','学习']
const SEASONS = ['夏季','春季','全季','冬季','秋季']
const BRANDS  = ['自研','代工','OEM','联名','私标']

const searchField    = defineModel('searchField',    { default: 'name' })
const searchKeyword  = defineModel('searchKeyword',  { default: '' })
const filterListing  = defineModel('filterListing',  { default: '' })
const filterDesign   = defineModel('filterDesign',   { default: '' })
const filterShop     = defineModel('filterShop',     { default: '' })
const filterBrand    = defineModel('filterBrand',    { default: '' })
const filterPType    = defineModel('filterPType',    { default: '' })
const filterCategory = defineModel('filterCategory', { default: '' })
const filterScene    = defineModel('filterScene',    { default: '' })
const filterSeason   = defineModel('filterSeason',   { default: '' })
const filterTimeField = defineModel('filterTimeField', { default: '' })
const filterDateRange = defineModel('filterDateRange', { default: () => [] })

const emit = defineEmits(['reset'])
</script>

<template>
  <div class="lfb-wrap">
    <!-- 第一行：联合搜索 + 下拉筛选 -->
    <div class="lfb-row">
      <el-input
        v-model="searchKeyword"
        placeholder="请输入关键词"
        clearable
        size="small"
        class="lfb-search"
      >
        <template #prepend>
          <el-select v-model="searchField" style="width:70px" size="small">
            <el-option label="品名"  value="name" />
            <el-option label="SKU"  value="sku" />
            <el-option label="MSKU" value="msku" />
            <el-option label="ASIN" value="asin" />
          </el-select>
        </template>
      </el-input>

      <el-select v-model="filterListing" placeholder="Listing状态" clearable size="small" class="lfb-sel">
        <el-option label="已上传" value="已上传" />
        <el-option label="未上传" value="未上传" />
      </el-select>

      <el-select v-model="filterDesign" placeholder="平面状态" clearable size="small" class="lfb-sel">
        <el-option label="完成平面设计" value="完成平面设计" />
        <el-option label="进行中"     value="进行中" />
        <el-option label="待启动"     value="待启动" />
      </el-select>

      <el-select v-model="filterShop" placeholder="站点/店铺" clearable size="small" class="lfb-sel">
        <el-option v-for="s in SHOPS" :key="s" :label="s" :value="s" />
      </el-select>

      <el-select v-model="filterBrand" placeholder="品牌" clearable size="small" class="lfb-sel">
        <el-option v-for="b in BRANDS" :key="b" :label="b" :value="b" />
      </el-select>

      <el-select v-model="filterPType" placeholder="产品类型" clearable size="small" class="lfb-sel">
        <el-option label="单品"  value="单品" />
        <el-option label="组合品" value="组合品" />
      </el-select>

      <el-select v-model="filterCategory" placeholder="品类" clearable size="small" class="lfb-sel">
        <el-option v-for="c in CATS" :key="c" :label="c" :value="c" />
      </el-select>

      <el-select v-model="filterScene" placeholder="场景" clearable size="small" class="lfb-sel">
        <el-option v-for="s in SCENES" :key="s" :label="s" :value="s" />
      </el-select>

      <el-select v-model="filterSeason" placeholder="季节" clearable size="small" class="lfb-sel">
        <el-option v-for="s in SEASONS" :key="s" :label="s" :value="s" />
      </el-select>
    </div>

    <!-- 第二行：时间类型 + 日期范围 + 操作 -->
    <div class="lfb-row lfb-row2">
      <el-select v-model="filterTimeField" placeholder="时间类型" clearable size="small" style="width:130px">
        <el-option label="运营分配时间" value="authTime" />
        <el-option label="建PL单时间"   value="planTime" />
        <el-option label="采购下单时间" value="poTime" />
        <el-option label="备货入库时间" value="inboundTime" />
        <el-option label="货件发出时间" value="sendTime" />
        <el-option label="FBA到仓时间"  value="inTransitTime" />
        <el-option label="开售时间"     value="launchTime" />
        <el-option label="Listing上传"  value="listingUploadTime" />
      </el-select>

      <el-date-picker
        v-model="filterDateRange"
        type="daterange"
        size="small"
        range-separator="~"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width:240px"
      />

      <el-button type="primary" size="small">查询</el-button>
      <el-button size="small" @click="emit('reset')">重置</el-button>
    </div>
  </div>
</template>

<style scoped>
.lfb-wrap {
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  padding: 10px 16px 8px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lfb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.lfb-row2 { padding-top: 2px; }
.lfb-search { width: 260px; flex-shrink: 0; }
.lfb-sel    { width: 110px; flex-shrink: 0; }
</style>
