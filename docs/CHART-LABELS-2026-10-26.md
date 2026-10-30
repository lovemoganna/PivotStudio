# 图表数值标签 · 2026-10-26

分支：`codex/chart-label-controls-2026-10-26`。原有优化保留，未合并、未发布。

图表右上角「图表选项」增加明确的「显示数值标签」复选框与「标签位置」选择框，替换原来含义模糊的「标签」按钮。关闭标签时位置控件禁用，但保留选择；重新打开恢复位置。位置进入保存和分享配置，旧配置默认自动。

位置按图形适用范围提供：柱形与条形支持内部居中、内部顶部/底部、外部顶部/底部及左右位置；饼/圆环提供扇区内部和外部；热力图提供单元格内部位置；折线、面积和散点提供点的上下左右位置。切换图形时不适用的位置显示为自动，避免无效设置。

修复了饼图、热力图、漏斗图不遵循原标签开关、面积图没有接入标签的问题。多系列柱图不再因系列超过三个直接取消全部标签；各系列使用对应指标格式，百分比堆叠标签显示百分比。散点数值标签显示 Y 指标，分组名称仍保留在提示中。

实现与证据：

- `src/features/pivot/components/ChartStudio.jsx`：控件、各图形标签与设置绑定。
- `src/features/pivot/components/SmartChartLabels.jsx`：手动位置、负柱矩形边界、零值显示与饼图内部/外部。
- `src/utils/chartLabels.js`：适用位置及旧配置回退。
- `src/features/pivot/PivotWorkbench.jsx`、`src/utils/viewConfig.js`：默认值和配置持久化投影。
- `src/i18n.js`：新增控件与位置英文文案。
- `src/features/pivot/engine/buildChartSpec.js`：热力图保留完整叶子分组，修复多级行维度导致映射为空的问题。此问题在本轮实际浏览器检查中复现；柱图原有分组行为不变。
- `tests/chartLabels.test.js`、`tests/browser/chart-labels.spec.js`：保存分享、热力图叶子键、三种视口的实际位置、标签开关、各图形、负值零值和实际 SVG 下载检查。

验证记录在 `artifacts/chart-labels-2026-10-26/`。初轮 8 项失败中，6 项来自测试使用了 SVGRect 不支持的 toJSON，2 项揭示真实的多级热力图为空；保留 `browser-round1.json`。修复后 `browser-round2.json` 8/8 通过，未降低几何或显示断言。最终结果见同目录的浏览器报告和逻辑测试日志。

最终 `browser-final.json`：Chromium/WebKit 62/62 通过，0 跳过、0 flaky，覆盖本轮 10 项与顶栏、手动配置/筛选/撤销、quality、R6 导出回归。`unit.txt`：95/95 通过；`build.txt`：构建通过。实际 SVG 下载包含新位置标签，R6 检查 CSV/XLSX 内容及 PNG/SVG。另在 IAB 验证中英文控件；未将此轮选定回归表述为全项目浏览器测试。

真实界面：`controls-desktop.png`；360/768/1440 截图在浏览器结果目录。截图已重新打开核对。独立预览为 <http://127.0.0.1:5196/?demo=retail>，原 5194 页面中的用户导入数据未重载或替换。

限制：这是功能与界面验证，没有真实用户研究。自动位置仍使用已有避让策略；大量分组或很短柱形的手动内部标签可能重叠，可切换外部位置、自动位置或缩小分析范围。未新增全局碰撞排版算法。
