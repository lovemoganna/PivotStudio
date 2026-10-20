import { Type, Hash, Calendar, ToggleLeft } from 'lucide-react';

export const FIELD_TYPES = {
  text: {
    label: '文本',
    icon: Type,
    color: 'text-[#948400] bg-[#E6DB74]/20 border-[#E6DB74]/45 dark:text-[#E6DB74] dark:bg-[#E6DB74]/15 dark:border-[#E6DB74]/35',
  },
  number: {
    label: '数字',
    icon: Hash,
    color: 'text-[#6B38FB] bg-[#AE81FF]/15 border-[#AE81FF]/40 dark:text-[#AE81FF] dark:bg-[#AE81FF]/15 dark:border-[#AE81FF]/35',
  },
  date: {
    label: '日期',
    icon: Calendar,
    color: 'text-[#0088A3] bg-[#66D9EF]/15 border-[#66D9EF]/40 dark:text-[#66D9EF] dark:bg-[#66D9EF]/15 dark:border-[#66D9EF]/35',
  },
  boolean: {
    label: '布尔值',
    icon: ToggleLeft,
    color: 'text-[#C86400] bg-[#FD971F]/15 border-[#FD971F]/40 dark:text-[#FD971F] dark:bg-[#FD971F]/15 dark:border-[#FD971F]/35',
  },
};

export const AGG_METHODS = [
  { value: 'sum', label: '求和 (SUM)', short: '求和' },
  { value: 'count', label: '计数 (COUNT)', short: '计数' },
  { value: 'avg', label: '平均值 (AVG)', short: '均值' },
  { value: 'median', label: '中位数 (MEDIAN)', short: '中位' },
  { value: 'stddev', label: '标准差 (STDDEV)', short: '标差' },
  { value: 'max', label: '最大值 (MAX)', short: '最大' },
  { value: 'min', label: '最小值 (MIN)', short: '最小' },
  { value: 'count_distinct', label: '去重计数 (DISTINCT)', short: '去重' },
];

export const SHOW_AS_MODES = [
  { value: 'normal', label: '普通值 (Normal)' },
  { value: 'pct_grand', label: '占总计百分比 (% of Grand)' },
  { value: 'pct_row', label: '占行总计百分比 (% of Row)' },
  { value: 'pct_col', label: '占列总计百分比 (% of Col)' },
  { value: 'prev_diff', label: '环比绝对差 (较上一行)' },
  { value: 'pct_prev_diff', label: '环比变动率 (% Growth / MoM)' },
  { value: 'running_total', label: '时序累计求和 (Running Total)' },
];

export const DATE_GRANULARITIES = [
  { value: 'raw', label: '原始日期 (Raw)' },
  { value: 'year', label: '按年 (Year)' },
  { value: 'quarter', label: '按季度 (Quarter)' },
  { value: 'month', label: '按月 (Month)' },
  { value: 'week', label: '按周 (Week)' },
  { value: 'day', label: '按日 (Day)' },
  { value: 'hour', label: '按小时 (Hour)' },
  { value: 'minute', label: '按分钟 (Minute)' },
  { value: 'day_of_week', label: '按星期几 (Day of Week)' },
];

export const CHART_COLORS = ['#F92672', '#A6E22E', '#66D9EF', '#FD971F', '#AE81FF', '#E6DB74', '#FF6188', '#78DCE8'];

export const VISUAL_CHART_TYPES = [
  { value: 'heatmap', label: '矩阵热力图 (Heatmap)', short: '热力图', category: 'heatmap' },
  { value: 'bar', label: '分组柱状图 (Bar)', short: '柱状', category: 'bar' },
  { value: 'horizontal_bar', label: '横向条形图 (Horizontal)', short: '条形', category: 'bar' },
  { value: 'stacked_bar', label: '堆叠柱状图 (Stacked)', short: '堆叠柱', category: 'bar' },
  { value: 'pct_stacked_bar', label: '百分比堆叠柱 (100% Bar)', short: '100%柱', category: 'bar' },
  { value: 'line', label: '趋势折线图 (Line)', short: '折线', category: 'line' },
  { value: 'area', label: '标准面积图 (Area)', short: '面积', category: 'area' },
  { value: 'stacked_area', label: '堆叠面积图 (Stacked Area)', short: '堆叠面', category: 'area' },
  { value: 'pct_area', label: '百分比面积图 (100% Area)', short: '100%面', category: 'area' },
  { value: 'combo', label: '双轴柱线组合图 (Dual-Axis)', short: '双轴', category: 'combo' },
  { value: 'pie', label: '经典饼图 (Pie)', short: '饼图', category: 'pie' },
  { value: 'donut', label: '中心聚焦圆环图 (Donut)', short: '圆环', category: 'pie' },
  { value: 'waterfall', label: '增减桥接瀑布图 (Waterfall)', short: '瀑布', category: 'waterfall' },
  { value: 'funnel', label: '对称锥形漏斗图 (Funnel)', short: '漏斗', category: 'funnel' },
  { value: 'scatter', label: 'OLS回归散点图 (Scatter)', short: '散点', category: 'scatter' },
  { value: 'histogram', label: 'Sturges分布直方图 (Histogram)', short: '直方', category: 'histogram' },
];

export const KEYNOTE_STORYBOARD_SHOTS = [
  {
    id: 'shot_1',
    number: '01',
    title: '全景大区经营概览',
    subtitle: '一镜一意：聚焦五大销售大区销售额与销量双指标全局对比',
    cameraNote: 'Wide Establishing Shot · 96 BPM Effortless Flow',
    viewMode: 'split',
    chartType: 'bar',
    pivotOverride: {
      rows: [{ id: 'r_k1', field: '销售大区', sort: 'desc', dateGranularity: 'raw', excludedValues: [] }],
      columns: [],
      values: [
        { id: 'v_1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
        { id: 'v_2', field: '销量', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
      ],
    },
  },
  {
    id: 'shot_2',
    number: '02',
    title: '大区×品类交叉透视矩阵',
    subtitle: '销售大区 × 商品类别 × 年度三级交叉透视，呈现百分比堆叠结构占比',
    cameraNote: 'Matrix Cross-Tab Focus · Structural Proportion',
    viewMode: 'split',
    chartType: 'pct_stacked_bar',
    pivotOverride: {
      rows: [
        { id: 'r_k1', field: '销售大区', sort: 'none', dateGranularity: 'raw', excludedValues: [] },
        { id: 'r_k2', field: '商品类别', sort: 'none', dateGranularity: 'raw', excludedValues: [] },
      ],
      columns: [{ id: 'c_k1', field: '订单日期', sort: 'asc', dateGranularity: 'year', excludedValues: [] }],
      values: [
        { id: 'v_1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
      ],
    },
  },
  {
    id: 'shot_3',
    number: '03',
    title: '季度时序双轴共振',
    subtitle: '左轴绑定销售额 (¥)，右轴绑定订单销量 (件)，揭示各季度增长斜率',
    cameraNote: 'Temporal Dual-Axis Tracking · Revenue vs Volume',
    viewMode: 'split',
    chartType: 'combo',
    pivotOverride: {
      rows: [{ id: 'r_k3', field: '订单日期', sort: 'asc', dateGranularity: 'quarter', excludedValues: [] }],
      columns: [],
      values: [
        { id: 'v_1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
        { id: 'v_2', field: '销量', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
      ],
    },
  },
  {
    id: 'shot_4',
    number: '04',
    title: '热销商品贡献瀑布流',
    subtitle: '清晰拆解重点商品对总营收的正向拉动与累计终点',
    cameraNote: 'Incremental Bridge Breakdown · Waterfall',
    viewMode: 'split',
    chartType: 'waterfall',
    pivotOverride: {
      rows: [{ id: 'r_k4', field: '商品名称', sort: 'desc', dateGranularity: 'raw', excludedValues: [] }],
      columns: [],
      values: [
        { id: 'v_1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
      ],
    },
  },
  {
    id: 'shot_5',
    number: '05',
    title: '城市营收利润散点回归',
    subtitle: '城市销售额与毛利润 OLS 拟合趋势线与残差异常点自动识别',
    cameraNote: 'Outlier Detection & OLS Regression · Scatter',
    viewMode: 'split',
    chartType: 'scatter',
    pivotOverride: {
      rows: [{ id: 'r_k5', field: '城市', sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
      columns: [],
      values: [
        { id: 'v_1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
        { id: 'v_2', field: '毛利润', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
      ],
    },
  },
];

export const RETAIL_SALES_ROWS = [
  // 华东
  { 订单日期: '2024-01-15', 销售大区: '华东', 城市: '上海', 销售渠道: '线上旗舰店', 商品类别: '智能数码', 商品名称: '降噪耳机 Pro', 客户类型: 'VIP黄金会员', 销售额: 35800, 销量: 20, 成本: 21480, 毛利润: 14320, 是否促销: true },
  { 订单日期: '2024-02-20', 销售大区: '华东', 城市: '上海', 销售渠道: '企业集采', 商品类别: '办公外设', 商品名称: '4K高清显示器', 客户类型: '企业客户', 销售额: 76000, 销量: 25, 成本: 49400, 毛利润: 26600, 是否促销: false },
  { 订单日期: '2024-04-10', 销售大区: '华东', 城市: '杭州', 销售渠道: '抖音电商', 商品类别: '智能数码', 商品名称: '极光便携投影', 客户类型: '普通会员', 销售额: 48600, 销量: 18, 成本: 31590, 毛利润: 17010, 是否促销: true },
  { 订单日期: '2024-05-18', 销售大区: '华东', 城市: '杭州', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '智能扫地机 X9', 客户类型: 'VIP黄金会员', 销售额: 68900, 销量: 23, 成本: 41340, 毛利润: 27560, 是否促销: false },
  { 订单日期: '2024-08-22', 销售大区: '华东', 城市: '南京', 销售渠道: '线上旗舰店', 商品类别: '办公外设', 商品名称: '机械键盘 RGB', 客户类型: '普通会员', 销售额: 29800, 销量: 35, 成本: 16390, 毛利润: 13410, 是否促销: true },
  { 订单日期: '2024-11-11', 销售大区: '华东', 城市: '上海', 销售渠道: '线上旗舰店', 商品类别: '潮流服饰', 商品名称: '纯棉连帽卫衣', 客户类型: '普通会员', 销售额: 42000, 销量: 84, 成本: 21000, 毛利润: 21000, 是否促销: true },
  { 订单日期: '2025-01-16', 销售大区: '华东', 城市: '上海', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '意式咖啡机', 客户类型: 'VIP黄金会员', 销售额: 56000, 销量: 16, 成本: 33600, 毛利润: 22400, 是否促销: false },
  { 订单日期: '2025-03-08', 销售大区: '华东', 城市: '杭州', 销售渠道: '抖音电商', 商品类别: '休闲食品', 商品名称: '冻干咖啡礼盒', 客户类型: '普通会员', 销售额: 31200, 销量: 120, 成本: 15600, 毛利润: 15600, 是否促销: true },

  // 华南
  { 订单日期: '2024-01-28', 销售大区: '华南', 城市: '深圳', 销售渠道: '线上旗舰店', 商品类别: '智能数码', 商品名称: '降噪耳机 Pro', 客户类型: 'VIP黄金会员', 销售额: 53700, 销量: 30, 成本: 32220, 毛利润: 21480, 是否促销: true },
  { 订单日期: '2024-03-15', 销售大区: '华南', 城市: '广州', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '智能扫地机 X9', 客户类型: '普通会员', 销售额: 59900, 销量: 20, 成本: 35940, 毛利润: 23960, 是否促销: false },
  { 订单日期: '2024-06-18', 销售大区: '华南', 城市: '深圳', 销售渠道: '企业集采', 商品类别: '办公外设', 商品名称: '4K高清显示器', 客户类型: '企业客户', 销售额: 91200, 销量: 30, 成本: 59280, 毛利润: 31920, 是否促销: true },
  { 订单日期: '2024-09-20', 销售大区: '华南', 城市: '广州', 销售渠道: '抖音电商', 商品类别: '智能数码', 商品名称: '极光便携投影', 客户类型: '普通会员', 销售额: 43200, 销量: 16, 成本: 28080, 毛利润: 15120, 是否促销: false },
  { 订单日期: '2024-11-25', 销售大区: '华南', 城市: '深圳', 销售渠道: '线上旗舰店', 商品类别: '办公外设', 商品名称: '机械键盘 RGB', 客户类型: 'VIP黄金会员', 销售额: 38400, 销量: 45, 成本: 21120, 毛利润: 17280, 是否促销: true },
  { 订单日期: '2025-02-14', 销售大区: '华南', 城市: '广州', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '意式咖啡机', 客户类型: 'VIP黄金会员', 销售额: 63000, 销量: 18, 成本: 37800, 毛利润: 25200, 是否促销: true },
  { 订单日期: '2025-04-20', 销售大区: '华南', 城市: '深圳', 销售渠道: '企业集采', 商品类别: '休闲食品', 商品名称: '冻干咖啡礼盒', 客户类型: '企业客户', 销售额: 28600, 销量: 110, 成本: 14300, 毛利润: 14300, 是否促销: false },

  // 华北
  { 订单日期: '2024-02-12', 销售大区: '华北', 城市: '北京', 销售渠道: '企业集采', 商品类别: '办公外设', 商品名称: '4K高清显示器', 客户类型: '企业客户', 销售额: 85000, 销量: 28, 成本: 55250, 毛利润: 29750, 是否促销: false },
  { 订单日期: '2024-04-26', 销售大区: '华北', 城市: '北京', 销售渠道: '线上旗舰店', 商品类别: '智能数码', 商品名称: '降噪耳机 Pro', 客户类型: 'VIP黄金会员', 销售额: 44750, 销量: 25, 成本: 26850, 毛利润: 17900, 是否促销: true },
  { 订单日期: '2024-07-15', 销售大区: '华北', 城市: '天津', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '智能扫地机 X9', 客户类型: '普通会员', 销售额: 47900, 销量: 16, 成本: 28740, 毛利润: 19160, 是否促销: false },
  { 订单日期: '2024-10-18', 销售大区: '华北', 城市: '北京', 销售渠道: '抖音电商', 商品类别: '潮流服饰', 商品名称: '纯棉连帽卫衣', 客户类型: '普通会员', 销售额: 36000, 销量: 72, 成本: 18000, 毛利润: 18000, 是否促销: true },
  { 订单日期: '2024-12-05', 销售大区: '华北', 城市: '青岛', 销售渠道: '线上旗舰店', 商品类别: '办公外设', 商品名称: '机械键盘 RGB', 客户类型: '普通会员', 销售额: 32000, 销量: 38, 成本: 17600, 毛利润: 14400, 是否促销: false },
  { 订单日期: '2025-01-22', 销售大区: '华北', 城市: '北京', 销售渠道: '企业集采', 商品类别: '智能家居', 商品名称: '意式咖啡机', 客户类型: '企业客户', 销售额: 70000, 销量: 20, 成本: 42000, 毛利润: 28000, 是否促销: false },
  { 订单日期: '2025-05-10', 销售大区: '华北', 城市: '北京', 销售渠道: '线上旗舰店', 商品类别: '智能数码', 商品名称: '极光便携投影', 客户类型: 'VIP黄金会员', 销售额: 51300, 销量: 19, 成本: 33345, 毛利润: 17955, 是否促销: true },

  // 西南
  { 订单日期: '2024-03-10', 销售大区: '西南', 城市: '成都', 销售渠道: '线上旗舰店', 商品类别: '智能数码', 商品名称: '降噪耳机 Pro', 客户类型: '普通会员', 销售额: 39380, 销量: 22, 成本: 23628, 毛利润: 15752, 是否促销: true },
  { 订单日期: '2024-05-25', 销售大区: '西南', 城市: '重庆', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '智能扫地机 X9', 客户类型: 'VIP黄金会员', 销售额: 53900, 销量: 18, 成本: 32340, 毛利润: 21560, 是否促销: false },
  { 订单日期: '2024-08-14', 销售大区: '西南', 城市: '成都', 销售渠道: '抖音电商', 商品类别: '休闲食品', 商品名称: '冻干咖啡礼盒', 客户类型: '普通会员', 销售额: 26000, 销量: 100, 成本: 13000, 毛利润: 13000, 是否促销: true },
  { 订单日期: '2024-11-20', 销售大区: '西南', 城市: '成都', 销售渠道: '企业集采', 商品类别: '办公外设', 商品名称: '4K高清显示器', 客户类型: '企业客户', 销售额: 60800, 销量: 20, 成本: 39520, 毛利润: 21280, 是否促销: false },
  { 订单日期: '2025-02-18', 销售大区: '西南', 城市: '重庆', 销售渠道: '线上旗舰店', 商品类别: '办公外设', 商品名称: '机械键盘 RGB', 客户类型: '普通会员', 销售额: 28800, 销量: 34, 成本: 15840, 毛利润: 12960, 是否促销: true },
  { 订单日期: '2025-04-15', 销售大区: '西南', 城市: '成都', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '意式咖啡机', 客户类型: 'VIP黄金会员', 销售额: 49000, 销量: 14, 成本: 29400, 毛利润: 19600, 是否促销: false },

  // 华中
  { 订单日期: '2024-03-28', 销售大区: '华中', 城市: '武汉', 销售渠道: '企业集采', 商品类别: '办公外设', 商品名称: '4K高清显示器', 客户类型: '企业客户', 销售额: 66880, 销量: 22, 成本: 43472, 毛利润: 23408, 是否促销: false },
  { 订单日期: '2024-06-12', 销售大区: '华中', 城市: '武汉', 销售渠道: '线上旗舰店', 商品类别: '智能数码', 商品名称: '降噪耳机 Pro', 客户类型: 'VIP黄金会员', 销售额: 37600, 销量: 21, 成本: 22560, 毛利润: 15040, 是否促销: true },
  { 订单日期: '2024-09-08', 销售大区: '华中', 城市: '长沙', 销售渠道: '抖音电商', 商品类别: '潮流服饰', 商品名称: '纯棉连帽卫衣', 客户类型: '普通会员', 销售额: 31500, 销量: 63, 成本: 15750, 毛利润: 15750, 是否促销: true },
  { 订单日期: '2024-12-18', 销售大区: '华中', 城市: '武汉', 销售渠道: '线下自营店', 商品类别: '智能家居', 商品名称: '智能扫地机 X9', 客户类型: '普通会员', 销售额: 50900, 销量: 17, 成本: 30540, 毛利润: 20360, 是否促销: false },
  { 订单日期: '2025-03-22', 销售大区: '华中', 城市: '长沙', 销售渠道: '线上旗舰店', 商品类别: '智能家居', 商品名称: '意式咖啡机', 客户类型: 'VIP黄金会员', 销售额: 45500, 销量: 13, 成本: 27300, 毛利润: 18200, 是否促销: true },
];

export const RETAIL_TEST_DATASET = {
  id: 'ds_retail_sales_test',
  name: '📊 全渠道零售经营测试集 (Excel定制版 33行)',
  fields: [
    { name: '订单日期', type: 'date' },
    { name: '销售大区', type: 'text' },
    { name: '城市', type: 'text' },
    { name: '销售渠道', type: 'text' },
    { name: '商品类别', type: 'text' },
    { name: '商品名称', type: 'text' },
    { name: '客户类型', type: 'text' },
    { name: '销售额', type: 'number' },
    { name: '销量', type: 'number' },
    { name: '成本', type: 'number' },
    { name: '毛利润', type: 'number' },
    { name: '是否促销', type: 'boolean' },
  ],
  rows: RETAIL_SALES_ROWS,
};

export const DEFAULT_DATASET = null;

/**
 * 根据任意数据集的元数据规范动态构建默认的透视表配置
 * 自动识别文本字段（行维度）、日期字段（列维度/时序）与数值度量（值聚合）
 * 包含：主键/高基数智能避让、无数值列自适应注入 COUNT(*) 频数、比率类字段默认均值 (AVG)
 */
export function buildDefaultPivotConfig(dataset) {
  if (!dataset || !dataset.fields || dataset.fields.length === 0) {
    return {
      filters: [],
      rows: [],
      columns: [],
      values: [],
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: '', direction: 'none' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: false,
    };
  }

  // 1. 分类识别维度与度量（优先尊重用户的 role 标注）
  const dimensionFields = dataset.fields.filter(
    (f) => f.role === 'dimension' || (!f.role && f.type !== 'number')
  );
  const measureFields = dataset.fields.filter(
    (f) => f.role === 'measure' || (!f.role && f.type === 'number')
  );

  const dateFields = dimensionFields.filter((f) => f.type === 'date');
  const textFields = dimensionFields.filter((f) => f.type !== 'date');

  // 2. 避免将纯 ID/唯一键作为默认首选行维度
  const isKeyName = (name) => /(^id$|_id$|uuid|guid|no$|编号|代码|工号|序号)/i.test(name);
  const sortedTextFields = [...textFields].sort((a, b) => {
    const aIsKey = isKeyName(a.name) ? 1 : 0;
    const bIsKey = isKeyName(b.name) ? 1 : 0;
    return aIsKey - bIsKey;
  });

  const rows = [];
  if (sortedTextFields[0]) {
    rows.push({
      id: `r_init_1`,
      field: sortedTextFields[0].name,
      sort: 'none',
      dateGranularity: 'raw',
      excludedValues: [],
    });
  }
  if (sortedTextFields[1]) {
    rows.push({
      id: `r_init_2`,
      field: sortedTextFields[1].name,
      sort: 'none',
      dateGranularity: 'raw',
      excludedValues: [],
    });
  }

  const columns = [];
  if (dateFields[0]) {
    columns.push({
      id: `c_init_1`,
      field: dateFields[0].name,
      sort: 'asc',
      dateGranularity: 'year',
      excludedValues: [],
    });
  }

  const values = [];
  if (measureFields.length > 0) {
    measureFields.slice(0, 2).forEach((mf, idx) => {
      const isRateOrAvg = /rate|ratio|pct|percent|score|age|temp|lat|cpu|率|比|分|度|龄|均/i.test(mf.name);
      const isCurrency = /额|利|成本|价|营收|收入|price|amount|revenue|cost|profit|salary/i.test(mf.name);
      values.push({
        id: `v_init_${idx + 1}`,
        field: mf.name,
        agg: isRateOrAvg ? 'avg' : 'sum',
        showAs: 'normal',
        format: {
          thousands: true,
          decimals: isRateOrAvg ? 1 : 0,
          currency: isCurrency ? '¥' : '',
          isPercent: /rate|ratio|pct|percent|率|比/i.test(mf.name),
        },
      });
    });
  } else {
    // 纯文本/问卷/分类数据集自适应降级：自动注入通用的记录频数度量
    values.push({
      id: 'v_init_count',
      field: '__COUNT__',
      agg: 'count',
      showAs: 'normal',
      format: {
        thousands: true,
        decimals: 0,
        currency: '',
        isPercent: false,
      },
    });
  }

  return {
    filters: [],
    rows,
    columns,
    values,
    valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: values[0]?.id || '', direction: 'none' },
    collapsedRowKeys: {},
    collapsedColKeys: {},
    showSubtotals: false,
  };
}

/**
 * 根据任意数据集动态生成 5 个自适应分析故事镜头
 * 将原本固定的零售字段重构为通用模式模板：
 * Shot 1: 全景主次分类对比 (Top Categories Overview)
 * Shot 2: 双维度交叉透视矩阵 (Cross-Tab Proportion Matrix)
 * Shot 3: 时序双轴共振 (Temporal Dual-Axis Trend)
 * Shot 4: 细分贡献瀑布流 (Incremental Contribution Waterfall)
 * Shot 5: 相关拟合与离群检测 (Correlation & Scatter Regression)
 */
export function generateDynamicKeynoteShots(dataset) {
  if (!dataset || !dataset.fields || dataset.fields.length === 0) {
    return KEYNOTE_STORYBOARD_SHOTS;
  }

  const dimensions = dataset.fields.filter((f) => f.role === 'dimension' || (!f.role && f.type !== 'number'));
  const measures = dataset.fields.filter((f) => f.role === 'measure' || (!f.role && f.type === 'number'));
  const dates = dimensions.filter((f) => f.type === 'date');
  const texts = dimensions.filter((f) => f.type !== 'date');

  const dim1 = texts[0]?.name || dimensions[0]?.name || '未指定维度';
  const dim2 = texts[1]?.name || texts[0]?.name || dimensions[1]?.name || dim1;
  const dateDim = dates[0]?.name || dim1;
  const num1 = measures[0]?.name || '__COUNT__';
  const num2 = measures[1]?.name || measures[0]?.name || num1;

  const makeVal = (field, id = 'v_1', agg = 'sum') => ({
    id,
    field,
    agg: field === '__COUNT__' ? 'count' : agg,
    showAs: 'normal',
    format: { thousands: true, decimals: 0, currency: '', isPercent: false },
  });

  return [
    {
      id: 'shot_1',
      number: '01',
      title: `全景「${dim1}」对比概览`,
      subtitle: `聚焦核心维度【${dim1}】在【${num1}】${num2 !== num1 ? `与【${num2}】` : ''}上的整体分布对比`,
      cameraNote: 'Wide Establishing Shot · Effortless Analytical Flow',
      viewMode: 'split',
      chartType: 'bar',
      pivotOverride: {
        rows: [{ id: 'r_k1', field: dim1, sort: 'desc', dateGranularity: 'raw', excludedValues: [] }],
        columns: [],
        values: [makeVal(num1, 'v_1'), ...(num2 !== num1 ? [makeVal(num2, 'v_2')] : [])],
      },
    },
    {
      id: 'shot_2',
      number: '02',
      title: `多维交叉透视矩阵`,
      subtitle: `【${dim1}】×【${dim2}】交叉透视，呈现百分比堆叠结构占比`,
      cameraNote: 'Matrix Cross-Tab Focus · Structural Proportion',
      viewMode: 'split',
      chartType: 'pct_stacked_bar',
      pivotOverride: {
        rows: [
          { id: 'r_k1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] },
          ...(dim2 !== dim1 ? [{ id: 'r_k2', field: dim2, sort: 'none', dateGranularity: 'raw', excludedValues: [] }] : []),
        ],
        columns: dates.length > 0 ? [{ id: 'c_k1', field: dateDim, sort: 'asc', dateGranularity: 'year', excludedValues: [] }] : [],
        values: [makeVal(num1, 'v_1')],
      },
    },
    {
      id: 'shot_3',
      number: '03',
      title: `时序趋势演变透镜`,
      subtitle: `追踪【${dateDim}】演进斜率与阶段性波动`,
      cameraNote: 'Temporal Tracking · Trendline & Acceleration',
      viewMode: 'split',
      chartType: measures.length > 1 ? 'combo' : 'line',
      pivotOverride: {
        rows: [{ id: 'r_k3', field: dateDim, sort: 'asc', dateGranularity: dates.length > 0 ? 'month' : 'raw', excludedValues: [] }],
        columns: [],
        values: [makeVal(num1, 'v_1'), ...(num2 !== num1 ? [makeVal(num2, 'v_2')] : [])],
      },
    },
    {
      id: 'shot_4',
      number: '04',
      title: `核心贡献增减瀑布流`,
      subtitle: `清晰拆解【${dim1}】各项目对【${num1}】累计总量的边际拉动`,
      cameraNote: 'Incremental Bridge Breakdown · Waterfall',
      viewMode: 'split',
      chartType: 'waterfall',
      pivotOverride: {
        rows: [{ id: 'r_k4', field: dim1, sort: 'desc', dateGranularity: 'raw', excludedValues: [] }],
        columns: [],
        values: [makeVal(num1, 'v_1')],
      },
    },
    {
      id: 'shot_5',
      number: '05',
      title: `相关性拟合与离群检测`,
      subtitle: measures.length > 1 ? `【${num1}】与【${num2}】的线性拟合趋势线与残差异常点自动识别` : `【${num1}】的频数直方分布`,
      cameraNote: 'Outlier Detection & Regression · Scatter / Histogram',
      viewMode: 'split',
      chartType: measures.length > 1 ? 'scatter' : 'histogram',
      pivotOverride: {
        rows: [{ id: 'r_k5', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
        columns: [],
        values: [makeVal(num1, 'v_1'), ...(num2 !== num1 ? [makeVal(num2, 'v_2')] : [])],
      },
    },
  ];
}
