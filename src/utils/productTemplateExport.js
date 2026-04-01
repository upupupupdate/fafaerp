import * as XLSX from 'xlsx'

/**
 * 下载产品信息 Excel 模板（仅表头 + 示例行，供线下填写；当前系统不解析导入）
 */
export function downloadProductTemplateXlsx() {
  const headers = [
    'SPU编码',
    '中文名',
    '英文名',
    '产品类型',
    '分类',
    '品牌',
    'SPU状态',
    '备注',
    'SKU编码',
    'SKU名称',
    '型号',
    '单位',
    '采购成本',
    '变体JSON',
    '组合子SKU编码',
    '组合数量',
  ]
  const example = [
    'SPU-001',
    '示例商品',
    'Demo Product',
    'FINISHED',
    '服装',
    '品牌A',
    'ACTIVE',
    '备注可选',
    'SKU-001',
    '黑色 M',
    'M2024',
    'PCS',
    '12.5',
    '{"color":"黑","size":"M"}',
    '',
    '',
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '产品模板')
  XLSX.writeFile(wb, 'fafa-product-template.xlsx')
}
