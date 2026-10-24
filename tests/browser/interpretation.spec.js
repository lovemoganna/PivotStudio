import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const negativeGeometry=chart=>chart.evaluate(el=>{
 const bar=el.querySelectorAll('.recharts-bar-rectangle')[1].getBoundingClientRect();
 const label=[...el.querySelectorAll('.recharts-label-list text')].find(el=>el.textContent==='-40').getBoundingClientRect();
 return {bar:{x:bar.x,y:bar.y,width:bar.width,height:bar.height},label:{x:label.x,y:label.y,width:label.width,height:label.height}};
});
async function start(page,{csv,type='pie',csc={},date=false,agg='sum',filters=[]}){
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.emulateMedia({reducedMotion:'reduce'});
 const fullConfig={rows:[{id:'r',field:'Group',...(date?{dateGranularity:'minute'}:{})}],columns:[],values:[{id:'v',field:'Amount',agg}],filters};
 await page.goto('/#share_token='+encodeURIComponent(encodeView({fullConfig,ct:type,csc})));
 await page.locator('input[type=file]').first().setInputFiles({name:'explicit-synthetic-interpretation.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 const modal=page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});await expect(modal).toBeVisible();
 if(date)await modal.getByLabel('Group · 字段类型',{exact:true}).selectOption('date');
 await modal.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await expect(modal).toHaveCount(0);await ready(page);
}
for(const width of [360,768,1280,1440])test(`interpretation: signed composition explains and recovers at ${width}`,async({page},info)=>{
 if(width===1440)await page.addInitScript(()=>localStorage.setItem('pivotstudio_theme','dark'));
 await page.setViewportSize({width,height:1000});await start(page,{csv:'Group,Amount\nIncome,100\nRefund,-40'});
 const chart=page.locator('#pivot-chart-container');await chart.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 await expect(page.getByTestId('chart-issue')).toContainText('负数');
 await expect(chart.locator('.recharts-pie-sector')).toHaveCount(0);
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await chart.screenshot({path:info.outputPath(`negative-guidance-${width}.png`)});
 await page.getByRole('button',{name:'切换柱图查看数值',exact:true}).press('Enter');
 await expect(page.getByTestId('chart-issue')).toHaveCount(0);await expect(page.getByLabel('选择图表类型',{exact:true})).toHaveValue('bar');
 await expect(page.getByTestId('pivot-value-cell')).toHaveText(['100','-40']);
 await expect(chart.locator('.recharts-bar-rectangle')).toHaveCount(2);
 const {bar:negativeBar,label:negativeLabel}=await negativeGeometry(chart);
 expect(negativeLabel.y+negativeLabel.height/2).toBeGreaterThan(negativeBar.y);
 expect(negativeLabel.y+negativeLabel.height/2).toBeLessThan(negativeBar.y+negativeBar.height);
 await chart.screenshot({path:info.outputPath(`signed-bars-${width}.png`)});
 await page.getByLabel('选择图表类型',{exact:true}).selectOption('horizontal_bar');
 const {bar:horizontalBar,label:horizontalLabel}=await negativeGeometry(chart);
 expect(horizontalLabel.x+horizontalLabel.width/2).toBeGreaterThan(horizontalBar.x);
 expect(horizontalLabel.x+horizontalLabel.width/2).toBeLessThan(horizontalBar.x+horizontalBar.width);
});
test('interpretation: negative percentage, zero pie and average pie never show invented composition',async({page})=>{
 await start(page,{csv:'Group,Amount\nA,100\nB,-40',type:'pct_stacked_bar'});await expect(page.getByTestId('chart-issue')).toContainText('负数');
 await page.getByRole('button',{name:'切换柱图查看数值',exact:true}).click();
 await page.getByLabel('切换聚合口径',{exact:true}).selectOption('avg');await ready(page);
 await page.getByLabel('选择图表类型',{exact:true}).selectOption('pie');await expect(page.getByTestId('chart-issue')).toBeVisible();
 await page.getByRole('button',{name:'全部 (All)',exact:true}).click();
 const fresh=await page.context().newPage();await start(fresh,{csv:'Group,Amount\nA,0\nB,0'});await expect(fresh.getByTestId('chart-issue')).toContainText('合计为 0');await fresh.close();
});
test('interpretation: Top N names the visible denominator while overall table remains complete',async({page})=>{
 await start(page,{csv:'Group,Amount\nA,60\nB,30\nC,10',csc:{topN:2}});
 await expect(page.getByTestId('chart-scope')).toContainText('2/3');await expect(page.getByTestId('chart-scope')).toContainText('图中分组合计为分母');
 await expect(page.locator('#pivot-chart-container .recharts-pie-labels')).toContainText('66.7%');
 await expect(page.getByTestId('pivot-value-cell')).toHaveText(['60','30','10']);await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('100');
 await page.locator('#pivot-chart-container .recharts-pie-sector').first().hover();await expect(page.locator('.recharts-tooltip-wrapper')).toContainText('占图中分组合计');
});
test('interpretation: funnel order and relative comparison survive keyboard drilldown',async({page})=>{
 await start(page,{csv:'Group,Amount\nVisit,100\nPay,20\nRetry,50',type:'funnel'});
 const chart=page.locator('#pivot-chart-container');await expect(page.getByTestId('funnel-basis')).toContainText('不能据此判断用户转化率');
 const stages=chart.locator('svg[aria-label="漏斗图"] g[role=button]');await expect(stages).toHaveCount(3);
 await expect(stages.nth(1)).toHaveAttribute('aria-label','Pay: 20');await expect(stages.nth(2)).toContainText('相对上项 250.0%');
 await stages.nth(1).press('Enter');const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});await expect(drill).toContainText('Pay');await expect(drill).toContainText('1 条记录)');await page.keyboard.press('Escape');
 await expect(drill).toHaveCount(0);
});
test('interpretation: minute grouping retains dates in cells, filtering and original records',async({page})=>{
 await start(page,{csv:'Group,Amount\n2025-01-01T09:30:00,10\n2026-01-01T09:30:00,20',type:'bar',date:true});
 await expect(page.getByTestId('pivot-value-cell')).toHaveText(['10','20']);
 await expect(page.locator('#pivot-main-html-table')).toContainText('2025-01-01 09:30');await expect(page.locator('#pivot-main-html-table')).toContainText('2026-01-01 09:30');
 await page.getByTestId('pivot-value-cell').first().press('Enter');const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});await expect(drill).toContainText('2025-01-01T09:30:00');await expect(drill).not.toContainText('2026-01-01T09:30:00');
});
test('interpretation: single metric scatter explains missing second metric and offers recovery',async({page})=>{
 await start(page,{csv:'Group,Amount\nA,10\nB,20',type:'scatter'});await expect(page.getByTestId('chart-issue')).toContainText('两个不同的指标');
 await expect(page.locator('#pivot-chart-container .recharts-scatter-symbol')).toHaveCount(0);
 await page.getByRole('button',{name:'切换柱图查看数值',exact:true}).click();await expect(page.getByTestId('chart-issue')).toHaveCount(0);
});
test('interpretation: bar lengths preserve a two to one relationship with a zero baseline',async({page},info)=>{
 await start(page,{csv:'Group,Amount\nA,10\nB,20',type:'bar'});
 const chart=page.locator('#pivot-chart-container');
 await expect(chart.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').first()).toHaveText('0');
 const heights=await chart.locator('.recharts-bar-rectangle path').evaluateAll(paths=>paths.map(p=>p.getBBox().height));
 expect(heights).toHaveLength(2);expect(heights[0]/heights[1]).toBeCloseTo(.5,2);
 await chart.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await chart.screenshot({path:info.outputPath('bar-zero-baseline.png')});
 await page.getByLabel('选择图表类型',{exact:true}).selectOption('area');
 await expect(chart.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').first()).toHaveText('0');
});
test('interpretation: a slicer narrows a multiple selection instead of silently including excluded records',async({page})=>{
 await start(page,{csv:'Group,Amount\nA,10\nB,20\nC,30',type:'bar',filters:[{id:'f',field:'Group',selectedValues:['A','B']}]});
 await expect(page.getByTestId('pivot-value-cell')).toHaveText(['10','20']);
 await page.getByRole('button',{name:'A (1)',exact:true}).press('Enter');await ready(page);
 await expect(page.getByTestId('pivot-value-cell')).toHaveText(['10']);await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('10');
 await page.getByRole('button',{name:'A (1)',exact:true}).press('Enter');await ready(page);
 await expect(page.getByTestId('pivot-value-cell')).toHaveText(['10','20','30']);
});
test('interpretation: chart studio guide & notes, donut highlight value, and lens preset viewMode preservation',async({page})=>{
 await page.setViewportSize({width:1280,height:900});
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?demo=retail');await ready(page);
 await expect(page.getByRole('button',{name:'均分',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'紧凑',exact:true})).toHaveAttribute('aria-pressed','true');
 // Highlight first row in table, then switch to donut chart and verify center shows highlighted slice value rather than grand total
 await page.getByTestId('pivot-value-cell').first().click();
 await page.getByLabel('选择图表类型',{exact:true}).selectOption('donut');await ready(page);
 const chart=page.locator('#pivot-chart-container');
 await expect(chart).not.toContainText('TOTAL_SUM');
 await expect(chart).toContainText('153.8K');
 await expect(chart).toContainText('12.8%');
 // Switch to chart-only mode: guide & notes panel auto-opens
 await page.getByRole('button',{name:'仅图表',exact:true}).click();
 const guide=page.getByTestId('chart-guide-note');
 await expect(guide).toBeVisible();
 await expect(guide).toContainText('零基础读图与分析方法指南');
 await expect(guide).toContainText('首位领跑:');
 // Switching analysis lens preset in chart-only mode preserves chart-only mode
 await page.getByRole('button',{name:/分析视角/}).click();
 await page.locator('#pivot-lens-presets button').nth(2).click();await ready(page);
 await expect(page.getByRole('button',{name:'仅图表',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#pivot-main-html-table')).toHaveCount(0);
 // Edit note from chart studio guide panel
 await guide.getByRole('button',{name:'编辑笔记',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'编辑分镜内容',exact:true});
 await dialog.getByLabel('业务结论与讲解旁白:',{exact:true}).fill('零基础用户记录的季度增长结论');
 await dialog.getByRole('button',{name:'保存修改',exact:true}).click();await expect(dialog).toHaveCount(0);
 await expect(guide).toContainText('零基础用户记录的季度增长结论');
 // Clicking chart bar opens drill-down without leaking __GRAND_TOTAL_COL__
 await chart.locator('.recharts-bar-rectangle').first().click();
 const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
 await expect(drill).toBeVisible();
 await expect(drill).not.toContainText('__GRAND_TOTAL_COL__');
 await page.keyboard.press('Escape');
 // Chart direct sorting, TopN quick chips, and direct PNG export
 const sortBtn=chart.getByRole('button',{name:'图表排序',exact:true});
 await sortBtn.click();
 await expect(sortBtn).toContainText('降序');
 await sortBtn.click();
 await expect(sortBtn).toContainText('升序');
 await expect(chart.getByRole('button',{name:'PNG',exact:true})).toBeVisible();
 await expect(chart.getByRole('button',{name:'Top5',exact:true})).toBeVisible();
 await chart.getByRole('button',{name:'Top5',exact:true}).click();
 await expect(chart.locator('.recharts-bar-rectangle')).toHaveCount(5);
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(axe.violations).toEqual([]);
});
