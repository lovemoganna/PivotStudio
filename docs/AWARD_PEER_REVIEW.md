# PivotStudio：同类数据产品与设计奖项质量对照

审查日期：2026-10-20。审查对象：`lovemoganna/PivotStudio`。本文件是可复核的内部质量差距清单，不是获奖证明、设计认证或真实用户研究。

## 对照来源与边界

直接功能参照：

1. Metabase 官方 Drill-through：https://www.metabase.com/features/drill-through 。该产品明确提供点击图表、筛选、查看原始记录和按维度拆分等操作。与 PivotStudio 的表图联动及明细下钻高度可比。
2. Observable Framework：https://observablehq.github.io/framework/ 。公开介绍响应式仪表盘、布局、交互与数据应用开发。与 PivotStudio 的响应式可视化完成度可比，但不等于免代码透视界面的一对一功能对标。

高水平设计参照：

3. 2026 Webby Best Data Visualization：https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-data-visualization 。WWF - Blue Corridors 获 Webby Winner；Searching for Birds 获 People's Voice Winner。以复杂数据的清晰表达、视觉编排和交互反馈为参照，不移植叙事型网站的滚动动画。
4. 2026 Webby Best Visual Design - Function：https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-function 。该奖项强调视觉设计如何直接提高功能体验，而非装饰。
5. Awwwards：https://www.awwwards.com/ ；FWA：https://thefwa.com/ 。作为行业视觉与互动品质参照。未取得具有可复核截图的同类自助透视工作台获奖作品，故**不能声称完成与这两个奖项同类获奖作品逐屏评分**。

## 全局十项品质差距

| 范围 | 当前真实证据 | 结论 | 下一项验收 |
| --- | --- | --- | --- |
| 视觉完成度 | 已去除重复图表操作条与点阵噪声；KPI 数量自适应网格 | 局部改善，整体对标待验证 | 6 屏宽实际截图，无异常空白、裁剪及错位 |
| 信息层级 | 数据集、维度、指标、透视结果和图表均可见 | 仍有密集工具栏及配置复杂度 | 真实任务中，用户能够直接找到导入、筛选、下钻、导出 |
| 排版与间距 | 已统一 CSS，表格字号和字段操作目标改进 | 部分信息字号偏小 | 独立检测文字/对比度和 200% 缩放 |
| 动效与交互 | 支持减少动画；Worker 分离计算并提示进度 | 需验证输入响应，不能用演示动效替代 | 100K 长任务、耗时、配置切换三项重复测量 |
| 响应式 | Chromium 自动测试 320、390、768、1024、1440、1920px | 自动测试通过；物理设备未测 | 每次修改都重新跑六屏宽与表图场景 |
| 一致性 | 字段、工具栏、主题及弹窗状态已统一 | 复杂状态组合仍有风险 | 切换数据集/图种/主题后内容及指标口径不漂移 |
| 可用性 | 已实现 CSV 真导入、XLSX/CSV 真下载与键盘操作 | 下钻入口发现性仍弱于 Metabase 的菜单式交互 | 首次使用者能够理解“查看原始记录”的操作方式 |
| 细节精度 | 导出行数对齐、空值与 0 区分、CSV 公式防护 | Excel 复杂多 Sheet 与 100K 导出待检 | 原始数据与结果可双向复核，无静默丢失 |
| 品牌感与独特性 | Monokai 风格稳定、数据工作台定位清晰 | 仍借助通用 IDE 表现手法，独特价值需强化 | 品牌表达服务“可信、清晰的分析”，不用获奖暗示 |
| 整体完成度 | 主要交互及构建通过 CI，文档列出未实现边界 | **未满足获奖级停止条件** | 完整业务任务、稳定性能、无障碍与同类作品并排评审均有证据 |

## 当前明确不应该做的事

不添加 WebGL、3D、粒子、全屏过场或大量渐变来模仿叙事网站。不能为降低性能数字而去掉真实数据、筛选或下钻能力。不能以通过测试、使用获奖风格或获得高评分的设计参照来宣称 PivotStudio 实际获奖。

## 回归闭环与退出条件

保留 `main` 可运行版本。每轮先记录可重复的症状，再最小改动，实测六屏宽、文件闭环、图种切换、复杂聚合和大数据性能。截图需覆盖真实状态而非 Mock。重要问题没有证据不得标记“已修复”。

仅当可用性、准确性、对照作品审查、性能、无障碍、不同尺寸界面均无可确认明显短板时，才能将“可参与高水平设计奖项竞争”作为**内部审查结论**，不能当作奖项认定。
