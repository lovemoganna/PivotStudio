import { Type, Hash, Calendar, ToggleLeft } from 'lucide-react';
import { isIdentifierField, getMeasureDefaults, isMeasureField } from '../utils/fieldSemantics.js';

export const FIELD_TYPES = {
  text: {
    label: '文本',
    icon: Type,
    color: 'text-ink-yellow bg-[#E6DB74]/20 border-[#E6DB74]/45 dark:bg-[#E6DB74]/15 dark:border-[#E6DB74]/35',
  },
  number: {
    label: '数字',
    icon: Hash,
    color: 'text-ink-purple bg-[#AE81FF]/15 border-[#AE81FF]/40 dark:text-ink-purple dark:bg-[#AE81FF]/15 dark:border-[#AE81FF]/35',
  },
  date: {
    label: '日期',
    icon: Calendar,
    color: 'text-ink-cyan bg-[#66D9EF]/15 border-[#66D9EF]/40 dark:text-ink-cyan dark:bg-[#66D9EF]/15 dark:border-[#66D9EF]/35',
  },
  boolean: {
    label: '布尔值',
    icon: ToggleLeft,
    color: 'text-ink-orange bg-[#FD971F]/15 border-[#FD971F]/40 dark:text-ink-orange dark:bg-[#FD971F]/15 dark:border-[#FD971F]/35',
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

// Monokai categorical colors; readable text is handled separately from mark fills.
// Keep this order shared by marks, legends, KPI cards and exported SVGs.
export const CHART_COLORS = ['#F92672', '#A6E22E', '#66D9EF', '#FD971F', '#AE81FF', '#E6DB74', '#FF6188', '#78DCE8'];

export const VISUAL_CHART_TYPES = [
  { value: 'heatmap', label: '矩阵热力图', short: '热力图', category: 'heatmap', intent: 'compare' },
  { value: 'bar', label: '柱状图', short: '柱状', category: 'bar', intent: 'compare' },
  { value: 'horizontal_bar', label: '条形图', short: '条形', category: 'bar', intent: 'compare' },
  { value: 'stacked_bar', label: '堆叠柱状图', short: '堆叠柱', category: 'bar', intent: 'proportion' },
  { value: 'pct_stacked_bar', label: '百分比堆叠柱', short: '100%柱', category: 'bar', intent: 'proportion' },
  { value: 'line', label: '折线图', short: '折线', category: 'line', intent: 'trend' },
  { value: 'area', label: '面积图', short: '面积', category: 'area', intent: 'trend' },
  { value: 'stacked_area', label: '堆叠面积图', short: '堆叠面', category: 'area', intent: 'proportion' },
  { value: 'pct_area', label: '百分比面积图', short: '100%面', category: 'area', intent: 'proportion' },
  { value: 'combo', label: '双轴组合图', short: '双轴', category: 'combo', intent: 'trend' },
  { value: 'pie', label: '饼图', short: '饼图', category: 'pie', intent: 'proportion' },
  { value: 'donut', label: '圆环图', short: '圆环', category: 'pie', intent: 'proportion' },
  { value: 'waterfall', label: '瀑布图', short: '瀑布', category: 'waterfall', intent: 'bridge' },
  { value: 'funnel', label: '漏斗图', short: '漏斗', category: 'funnel', intent: 'bridge' },
  { value: 'scatter', label: '散点图', short: '散点', category: 'scatter', intent: 'distribution' },
  { value: 'histogram', label: '直方图', short: '直方', category: 'histogram', intent: 'distribution' },
];

export const CHART_INTENT_GROUPS = [
  { id: 'compare', label: '对比排行', desc: '比较各组高低与排名', types: ['bar', 'horizontal_bar', 'heatmap'] },
  { id: 'trend', label: '趋势演变', desc: '看指标随时间或顺序如何变化', types: ['line', 'area', 'combo'] },
  { id: 'proportion', label: '结构占比', desc: '看各部分占整体的份额', types: ['donut', 'pie', 'stacked_bar', 'pct_stacked_bar', 'stacked_area', 'pct_area'] },
  { id: 'bridge', label: '贡献拆解', desc: '拆解累计构成；漏斗仅表示相邻比值，不等于转化率', types: ['waterfall', 'funnel'] },
  { id: 'distribution', label: '分布与相关', desc: '看双指标相关或单指标区间分布', types: ['scatter', 'histogram'] },
];

export const CHART_METHOD_GUIDES = {
  bar: {
    intent: '对比排行',
    purpose: '比较各组高低，找出最高与最低。',
    howToRead: '横轴是分组，纵轴是当前指标的展示值。',
    actionTip: '点「排序」切到降序，或点某一柱查看明细。',
  },
  horizontal_bar: {
    intent: '对比排行',
    purpose: '名称较长或分组较多时，条形图更易扫读。',
    howToRead: '条越长，当前指标的展示值越大。',
    actionTip: '在「选项」里设 Top 5 / Top 10，先看头部。',
  },
  heatmap: {
    intent: '对比排行',
    purpose: '看行×列交叉里哪里热、哪里冷。',
    howToRead: '色越深绝对值越大；蓝青为正、粉红为负。点击格可下钻。',
    actionTip: '列上放时间或渠道，便于定位高值组合。',
  },
  line: {
    intent: '趋势演变',
    purpose: '看指标随时间或顺序如何升降。',
    howToRead: '沿横轴顺序观察指标的升降；只有时间轴才能解释为随时间变化。',
    actionTip: '在「选项 → 衍生线」可开移动平均或环比%。',
  },
  area: {
    intent: '趋势演变',
    purpose: '在趋势之外，用面积强调体量。',
    howToRead: '曲线高度是当期值，下方填充帮助感受规模。',
    actionTip: '多分组看合计时，可改用堆叠面积图。',
  },
  combo: {
    intent: '趋势演变',
    purpose: '同屏对比两个量级或单位不同的指标。',
    howToRead: '柱对应左轴主指标，线对应右轴次指标，看是否同向或背离。',
    actionTip: '在「选项」里指定右轴绑定的指标。',
  },
  donut: {
    intent: '结构占比',
    purpose: '看各部分占总体的份额。',
    howToRead: '弧长即占比；中心显示合计或当前高亮项。',
    actionTip: '分类超过 8 个时，改用条形图更清晰。',
  },
  pie: {
    intent: '结构占比',
    purpose: '看整体如何被切成几块。',
    howToRead: '扇区角度对应占比，标签给出名称与百分比。',
    actionTip: '关注前三大合计是否过半（集中度）。',
  },
  stacked_bar: {
    intent: '结构占比',
    purpose: '同时看总量与内部构成。',
    howToRead: '柱总高是合计，色块是各子项贡献。',
    actionTip: '只比内部比例时，改用百分比堆叠柱。',
  },
  pct_stacked_bar: {
    intent: '结构占比',
    purpose: '忽略总量差异，只比内部结构。',
    howToRead: '每柱总高为 100%，同一颜色的高低变化即结构迁移。',
    actionTip: '适合比不同大区/年份的品类或客群结构。',
  },
  stacked_area: {
    intent: '结构占比',
    purpose: '看总量随时间变化，同时看各子项叠加。',
    howToRead: '顶边是合计，色带厚度是子项当期体量。',
    actionTip: '适合多条业务线随时间的合计与构成。',
  },
  pct_area: {
    intent: '结构占比',
    purpose: '看各部分份额随时间此消彼长。',
    howToRead: '纵轴 0%–100%；色带变宽即份额扩大。',
    actionTip: '适合复盘渠道或品类份额变化。',
  },
  waterfall: {
    intent: '贡献拆解',
    purpose: '拆解各组如何一步累加（或扣减）到总计。',
    howToRead: '绿为正、粉为负，最右是总计。',
    actionTip: '点击分项柱可查看该组明细。',
  },
  funnel: {
    intent: '贡献拆解',
    purpose: '按顺序看各组梯队规模与相邻比值。',
    howToRead: '宽度表示数值；右侧百分比是相对上一项，不等于转化率。',
    actionTip: '点击梯队可下钻明细。',
  },
  scatter: {
    intent: '分布与相关',
    purpose: '看两个数值指标是否相关，并找异常点。',
    howToRead: '横轴 X、纵轴 Y；虚线为拟合趋势，偏离较大的点更醒目。',
    actionTip: '线上方偏高、线下方偏低，可对照业务解释。',
  },
  histogram: {
    intent: '分布与相关',
    purpose: '看数值落在哪些区间，是否偏斜或长尾。',
    howToRead: '横轴是区间，纵轴是落入该区间的行数；看主峰位置与左右是否对称。',
    actionTip: '均值被极值拉高时，直方图更能反映多数样本所在区间。',
  },
};

export const KEYNOTE_STORYBOARD_SHOTS = [
  {
    id: 'shot_1',
    number: '01',
    title: '按销售大区对比销售额与销量',
    shortLabel: '大区对比',
    subtitle: '比较五大销售大区的销售额与销量，找出高低差异。',
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
    title: '大区 × 品类按年结构占比',
    shortLabel: '大区×品类',
    subtitle: '行：销售大区与商品类别；列：订单年份；看各年内部品类结构占比。',
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
    title: '按季度看销售额与销量趋势',
    shortLabel: '季度趋势',
    subtitle: '左轴销售额、右轴销量，观察各季度是否同向变化。',
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
    title: '商品销售额累计贡献',
    shortLabel: '商品贡献',
    subtitle: '用瀑布图拆解各商品对销售额合计的增减贡献。',
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
    title: '城市销售额与毛利润相关',
    shortLabel: '城市相关',
    subtitle: '散点图看销售额与毛利润是否同向，并留意偏离趋势线的城市。',
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
    (f) => f.role === 'dimension' || (!f.role && (f.type !== 'number' || isIdentifierField(f.name)))
  );
  const measureFields = dataset.fields.filter(
    (f) => f.role === 'measure' || (!f.role && f.type === 'number' && !isIdentifierField(f.name))
  );

  const dateFields = dimensionFields.filter((f) => f.type === 'date');
  const textFields = dimensionFields.filter((f) => f.type !== 'date');

  // 2. 避免将纯 ID/唯一键作为默认首选行维度
  const isKeyName = isIdentifierField;
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
      values.push({
        id: `v_init_${idx + 1}`,
        field: mf.name,
        showAs: 'normal',
        ...getMeasureDefaults(mf),
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
 * 按当前数据集字段生成 5 个推荐分析视图（对比 → 结构 → 趋势 → 贡献 → 相关/分布）。
 */
export function generateDynamicKeynoteShots(dataset) {
  if (!dataset || !dataset.fields || dataset.fields.length === 0) {
    return KEYNOTE_STORYBOARD_SHOTS;
  }

  const isMeasure = (f) => isMeasureField(f);
  const measures = dataset.fields.filter(isMeasure);
  const dimensions = dataset.fields.filter((f) => !isMeasure(f));
  const dates = dimensions.filter((f) => f.type === 'date');
  const nonIdDimensions = dimensions.filter((f) => !isIdentifierField(f.name));
  const candidateDimensions = nonIdDimensions.length > 0 ? nonIdDimensions : dimensions;
  const nonDateDimensions = candidateDimensions.filter((f) => f.type !== 'date');

  const dim1 = nonDateDimensions[0]?.name || candidateDimensions[0]?.name || dimensions[0]?.name || '未指定维度';
  const dim2 = nonDateDimensions[1]?.name || candidateDimensions.find((f) => f.name !== dim1)?.name || dimensions.find((f) => f.name !== dim1)?.name || dim1;
  const dateDim = dates[0]?.name || dim1;
  const num1 = measures[0]?.name || '__COUNT__';
  const num2 = measures[1]?.name || measures[0]?.name || num1;

  const getFieldObj = (name) => (dataset.fields || []).find((f) => f.name === name);
  const makeVal = (field, id = 'v_1') => {
    if (field === '__COUNT__') {
      return {
        id,
        field: '__COUNT__',
        agg: 'count',
        showAs: 'normal',
        format: { thousands: true, decimals: 0, currency: '', isPercent: false },
      };
    }
    const fObj = getFieldObj(field);
    const defaults = fObj ? getMeasureDefaults(fObj) : { agg: 'sum', format: { thousands: true, decimals: 0, currency: '', isPercent: false } };
    return {
      id,
      field,
      agg: defaults.agg || 'sum',
      showAs: 'normal',
      format: defaults.format || { thousands: true, decimals: 0, currency: '', isPercent: false },
    };
  };

  const hasDateCol = dates.length > 0;
  const colDimName = hasDateCol ? dateDim : (dim2 !== dim1 ? dim2 : null);
  const colDimConfig = colDimName
    ? [{ id: 'c_k1', field: colDimName, sort: hasDateCol ? 'asc' : 'none', dateGranularity: hasDateCol ? 'year' : 'raw', excludedValues: [] }]
    : [];

  return [
    {
      id: 'shot_1',
      number: '01',
      title: `按「${dim1}」对比${num1}${num2 !== num1 ? `与${num2}` : ''}`,
      shortLabel: `${dim1}对比`,
      subtitle: `比较各「${dim1}」在「${num1}」${num2 !== num1 ? `与「${num2}」` : ''}上的高低。`,
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
      title: colDimName ? `「${dim1}」×「${colDimName}」结构占比` : `「${dim1}」结构占比`,
      shortLabel: colDimName ? `${dim1}×${colDimName}` : `${dim1}占比`,
      subtitle: colDimName
        ? `交叉看「${dim1}」与「${colDimName}」，用百分比堆叠比较内部结构。`
        : `看各「${dim1}」在「${num1}」中的份额。`,
      viewMode: 'split',
      chartType: colDimName ? 'pct_stacked_bar' : 'donut',
      pivotOverride: {
        rows: [
          { id: 'r_k1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] },
        ],
        columns: colDimConfig,
        values: [makeVal(num1, 'v_1')],
      },
    },
    {
      id: 'shot_3',
      number: '03',
      title: dates.length > 0 ? `「${dateDim}」趋势` : `「${dim1}」排序对比`,
      shortLabel: dates.length > 0 ? `${dateDim}趋势` : `${dim1}排序`,
      subtitle: dates.length > 0
        ? `按「${dateDim}」观察「${num1}」如何随时间变化。`
        : `按「${num1}」对「${dim1}」排序，便于扫读高低。`,
      viewMode: 'split',
      chartType: dates.length > 0 ? (measures.length > 1 ? 'combo' : 'line') : 'horizontal_bar',
      pivotOverride: {
        rows: [{ id: 'r_k3', field: dateDim, sort: dates.length > 0 ? 'asc' : 'desc', dateGranularity: dates.length > 0 ? 'month' : 'raw', excludedValues: [] }],
        columns: [],
        values: [makeVal(num1, 'v_1'), ...(num2 !== num1 ? [makeVal(num2, 'v_2')] : [])],
      },
    },
    {
      id: 'shot_4',
      number: '04',
      title: `「${dim1}」对「${num1}」的累计贡献`,
      shortLabel: `${dim1}贡献`,
      subtitle: `用瀑布图拆解各「${dim1}」如何累加到「${num1}」合计。`,
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
      title: measures.length > 1 ? `「${num1}」与「${num2}」相关` : `「${num1}」数值分布`,
      shortLabel: measures.length > 1 ? `双指标相关` : `${num1}分布`,
      subtitle: measures.length > 1
        ? `在「${dim1}」上观察「${num1}」与「${num2}」是否同向，并留意偏离趋势的点。`
        : `用直方图看「${num1}」落在哪些区间、是否偏斜。`,
      viewMode: 'split',
      chartType: measures.length > 1 ? 'scatter' : 'histogram',
      pivotOverride: {
        rows: [{ id: 'r_k5', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
        columns: [],
        values: measures.length > 1 ? [makeVal(num1, 'v_1'), makeVal(num2, 'v_2')] : [makeVal(num1, 'v_1')],
      },
    },
  ].map(shot => ({...shot,generated:true}));
}
