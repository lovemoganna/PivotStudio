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

export const CHART_COLORS = ['#F92672', '#A6E22E', '#66D9EF', '#FD971F', '#AE81FF', '#E6DB74', '#FF6188', '#78DCE8'];

export const VISUAL_CHART_TYPES = [
  { value: 'heatmap', label: '矩阵热力图 (Heatmap)', short: '热力图', category: 'heatmap', intent: 'compare' },
  { value: 'bar', label: '分组柱状图 (Bar)', short: '柱状', category: 'bar', intent: 'compare' },
  { value: 'horizontal_bar', label: '横向条形图 (Horizontal)', short: '条形', category: 'bar', intent: 'compare' },
  { value: 'stacked_bar', label: '堆叠柱状图 (Stacked)', short: '堆叠柱', category: 'bar', intent: 'proportion' },
  { value: 'pct_stacked_bar', label: '百分比堆叠柱 (100% Bar)', short: '100%柱', category: 'bar', intent: 'proportion' },
  { value: 'line', label: '趋势折线图 (Line)', short: '折线', category: 'line', intent: 'trend' },
  { value: 'area', label: '标准面积图 (Area)', short: '面积', category: 'area', intent: 'trend' },
  { value: 'stacked_area', label: '堆叠面积图 (Stacked Area)', short: '堆叠面', category: 'area', intent: 'proportion' },
  { value: 'pct_area', label: '百分比面积图 (100% Area)', short: '100%面', category: 'area', intent: 'proportion' },
  { value: 'combo', label: '双轴柱线组合图 (Dual-Axis)', short: '双轴', category: 'combo', intent: 'trend' },
  { value: 'pie', label: '经典饼图 (Pie)', short: '饼图', category: 'pie', intent: 'proportion' },
  { value: 'donut', label: '中心聚焦圆环图 (Donut)', short: '圆环', category: 'pie', intent: 'proportion' },
  { value: 'waterfall', label: '增减桥接瀑布图 (Waterfall)', short: '瀑布', category: 'waterfall', intent: 'bridge' },
  { value: 'funnel', label: '对称锥形漏斗图 (Funnel)', short: '漏斗', category: 'funnel', intent: 'bridge' },
  { value: 'scatter', label: 'OLS回归散点图 (Scatter)', short: '散点', category: 'scatter', intent: 'distribution' },
  { value: 'histogram', label: 'Sturges分布直方图 (Histogram)', short: '直方', category: 'histogram', intent: 'distribution' },
];

export const CHART_INTENT_GROUPS = [
  { id: 'compare', label: '对比排行', desc: '看谁高谁低、排名先后', types: ['bar', 'horizontal_bar', 'heatmap'] },
  { id: 'trend', label: '趋势演变', desc: '看随时间或序列的升降斜率', types: ['line', 'area', 'combo'] },
  { id: 'proportion', label: '结构占比', desc: '看各部分占整体的份额比重', types: ['donut', 'pie', 'stacked_bar', 'pct_stacked_bar', 'stacked_area', 'pct_area'] },
  { id: 'bridge', label: '贡献拆解', desc: '看增量拉动与层级转化', types: ['waterfall', 'funnel'] },
  { id: 'distribution', label: '分布与相关', desc: '看双指标相关性与样本分布', types: ['scatter', 'histogram'] },
];

export const CHART_METHOD_GUIDES = {
  bar: {
    intent: '对比排行',
    purpose: '对比不同分组的规模高低，快速找出领跑项与掉队项。',
    howToRead: '横轴为分组类别，纵轴为指标数值；黄色虚线代表图中均值，高于虚线即为均值之上表现。',
    actionTip: '可在「规格」中切换「按主指标降序」快速建立帕累托排名，或点击任一柱体下钻明细。',
  },
  horizontal_bar: {
    intent: '对比排行',
    purpose: '适合名称较长或分组较多的排行榜对比，从上到下阅读更符合视线习惯。',
    howToRead: '纵轴为分组名称，横轴长度代表数值大小；黄色纵向虚线标识图中均值基准。',
    actionTip: '搭配「规格 -> TopN 焦点截断」可聚焦头部 Top 5 / Top 10 核心项目。',
  },
  heatmap: {
    intent: '对比排行',
    purpose: '一眼看清「行维度 × 列分组」交叉矩阵中的高值热区与低谷冷区。',
    howToRead: '色块越深代表数值绝对规模越大（蓝青色代表正值，粉红色代表负值）；支持点击单元格下钻对应明细。',
    actionTip: '在列区域放入时间或类别维度，可快速定位哪一组合贡献了最高密集产出。',
  },
  line: {
    intent: '趋势演变',
    purpose: '追踪指标随时间或有序分类的升降趋势、拐点与波动幅度。',
    howToRead: '观察折线斜率判断增速快慢；橙色虚线标识全周期均值基准（AVG），可在「规格」中开启移动均线或环比增速辅助研判。',
    actionTip: '可在「规格 -> 衍生分析序列」开启「3期移动均线」平滑噪点，或开启「环比增长率%」观察增速拐点。',
  },
  area: {
    intent: '趋势演变',
    purpose: '在展示升降趋势的同时，通过填充面积强化整体体量感。',
    howToRead: '曲线高度反映当期数值，下方阴影面积反映累计规模感；黄色虚线为全周期均值基准。',
    actionTip: '适合单指标或少量分组的趋势展示；若分组较多且需看合计，可切换为「堆叠面积图」。',
  },
  combo: {
    intent: '趋势演变',
    purpose: '同屏对比两个量纲不同或量级悬殊的指标（如左轴看金额、右轴看件数/增长率）。',
    howToRead: '粉色柱体对应左纵轴（主指标），绿色折线对应右纵轴（次轴指标），观察两者是否同向共振或背离。',
    actionTip: '可在「规格 -> 次轴/Y轴指标」中自由指定右轴绑定的对比指标。',
  },
  donut: {
    intent: '结构占比',
    purpose: '聚焦各分组占整体总量的份额构成，中心区域直观汇总全局或当前高亮分组。',
    howToRead: '扇区弧长代表占比大小，中心数字显示当前图中合计（当点击表格高亮某行时，中心会自动聚焦该项金额与占比）。',
    actionTip: '适用于可加总的正数指标（如销售额、销量）；若分类超过 8 个，建议改用「横向条形图」。',
  },
  pie: {
    intent: '结构占比',
    purpose: '直观展示整体被切分为若干部分的比例关系（盘子结构分析）。',
    howToRead: '扇区面积与角度对应份额占比，引线标签直接标出各分组名称与百分比。',
    actionTip: '重点关注前三大扇区（CR3）是否超过 50%，判断业务集中度高低。',
  },
  stacked_bar: {
    intent: '结构占比',
    purpose: '同时看清每个分组的「总规模高低」以及内部的「子项构成」。',
    howToRead: '整根柱子的总高度代表该分组总额，柱内不同颜色色块代表各列分组的贡献体量。',
    actionTip: '若想忽略总量差异、单纯对比内部结构比例，可切换为「100% 堆叠柱」。',
  },
  pct_stacked_bar: {
    intent: '结构占比',
    purpose: '拉平各分组总量差异，纯粹对比不同分组内部的子结构占比变化（100% 归一化）。',
    howToRead: '每根柱子总高恒为 100%，观察同一颜色色块在不同柱子间的高度变化即可判断结构迁移。',
    actionTip: '常用于分析不同大区或不同年份的品类结构、客户等级结构占比差异。',
  },
  stacked_area: {
    intent: '结构占比',
    purpose: '展现整体总量随时间的扩张/收缩趋势，同时观察各子项对总量的叠加贡献。',
    howToRead: '最顶层边界线代表全部分组合计值，各色带厚度代表对应子项的当期体量。',
    actionTip: '适合观察多条业务线随时间的总量膨胀与主力构成变化。',
  },
  pct_area: {
    intent: '结构占比',
    purpose: '追踪各组成部分的市场份额（%）随时间推移的此消彼长。',
    howToRead: '纵轴固定为 0%~100%，色带变宽代表该项份额扩张，变窄代表份额萎缩。',
    actionTip: '非常适合复盘不同渠道或品类在多个周期内的份额渗透率演进。',
  },
  waterfall: {
    intent: '贡献拆解',
    purpose: '像搭桥一样拆解「每一个分组是如何一步步累加（或扣减）到最终总计」的。',
    howToRead: '绿色柱代表正向拉动，粉色柱代表负向拖累，最右侧紫色柱为汇总终点总计。',
    actionTip: '点击任意分项柱体可穿透查看该分组支撑的原始订单明细。',
  },
  funnel: {
    intent: '贡献拆解',
    purpose: '按当前图表顺序展示各分组的梯队规模与相邻项数值比值。',
    howToRead: '梯形宽度对应数值大小，右侧标注各分组数值与“相对上项”百分比（仅代表相邻数值之比，不直接等同于用户转化率）。',
    actionTip: '适合分析各分组梯队的数值规模衰减，可点击任意梯队下钻查看支撑该项的原始明细。',
  },
  scatter: {
    intent: '分布与相关',
    purpose: '检验两个数值指标之间是否存在线性相关（如高销售额是否带来高毛利），并识别异常偏离点。',
    howToRead: '横轴为主指标 X，纵轴为次指标 Y；绿色虚线为 OLS 线性回归拟合线，粉色空心大圈为偏离预期超过 1.6σ 的异常点。',
    actionTip: '高于拟合线的点代表「产出高于预期（高效率）」，低于拟合线的点代表「产出低于预期」。',
  },
  histogram: {
    intent: '分布与相关',
    purpose: '基于原始明细行自动分箱（Sturges 法则），检验数据集中在哪个数值区间、是否存在长尾偏态。',
    howToRead: '横轴为数值分箱区间，纵轴为落入该区间的样本笔数；观察最高峰位置与左右两侧是否对称。',
    actionTip: '当均值容易被极值拉高时，用直方图能看清绝大多数普通样本的真实集中水位。',
  },
};

export const KEYNOTE_STORYBOARD_SHOTS = [
  {
    id: 'shot_1',
    number: '01',
    title: '全景大区经营概览',
    shortLabel: '大区概览',
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
    shortLabel: '大区×品类',
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
    shortLabel: '时序双轴',
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
    shortLabel: '商品贡献',
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
    shortLabel: '城市回归',
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

  // Extract quick data highlight if dataset rows are available
  let dim1TopVal = null;
  if (dataset.rows && dataset.rows.length > 0 && dim1) {
    const counts = new Map();
    const limit = Math.min(dataset.rows.length, 1000);
    for (let i = 0; i < limit; i++) {
      const v = dataset.rows[i][dim1];
      if (v !== undefined && v !== null && v !== '') counts.set(v, (counts.get(v) || 0) + 1);
    }
    let maxC = 0;
    for (const [k, c] of counts.entries()) {
      if (c > maxC) { maxC = c; dim1TopVal = k; }
    }
  }
  const topValHighlight = dim1TopVal ? `（样本中「${dim1TopVal}」频数领先）` : '';

  return [
    {
      id: 'shot_1',
      number: '01',
      title: `全景「${dim1}」对比概览`,
      shortLabel: `${dim1}对比`,
      subtitle: `聚焦核心维度【${dim1}】在【${num1}】${num2 !== num1 ? `与【${num2}】` : ''}上的整体分布对比${topValHighlight}`,
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
      title: colDimName ? `「${dim1}」×「${colDimName}」交叉矩阵` : `「${dim1}」结构占比圆环`,
      shortLabel: colDimName ? `${dim1}×${colDimName}` : `${dim1}占比`,
      subtitle: colDimName ? `【${dim1}】×【${colDimName}】交叉透视，呈现百分比堆叠结构占比` : `【${dim1}】各项目在【${num1}】上的结构占比构成`,
      cameraNote: 'Matrix Cross-Tab Focus · Structural Proportion',
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
      title: dates.length > 0 ? `「${dateDim}」时序演进透镜` : `「${dim1}」分项排序透镜`,
      shortLabel: dates.length > 0 ? `${dateDim}趋势` : `${dim1}排序`,
      subtitle: dates.length > 0 ? `追踪【${dateDim}】演进斜率与阶段性波动` : `对比【${dim1}】在【${num1}】上的横向排序分布`,
      cameraNote: dates.length > 0 ? 'Temporal Tracking · Trendline & Acceleration' : 'Horizontal Pareto Ranking · Sorted Categories',
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
      title: `「${dim1}」核心贡献瀑布流`,
      shortLabel: `${dim1}瀑布`,
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
      title: measures.length > 1 ? `「${num1}」与「${num2}」相关性拟合` : `「${num1}」数值频数分布`,
      shortLabel: measures.length > 1 ? `双指标相关` : `${num1}分布`,
      subtitle: measures.length > 1
        ? `【${num1}】与【${num2}】在【${dim1}】维度的散点相关性与离群点识别`
        : `【${num1}】的样本频数直方分布与偏度区间`,
      cameraNote: 'Outlier Detection & Regression · Scatter / Histogram',
      viewMode: 'split',
      chartType: measures.length > 1 ? 'scatter' : 'histogram',
      pivotOverride: {
        rows: [{ id: 'r_k5', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
        columns: [],
        values: measures.length > 1 ? [makeVal(num1, 'v_1'), makeVal(num2, 'v_2')] : [makeVal(num1, 'v_1')],
      },
    },
  ];
}
