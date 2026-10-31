import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {encodeView} from '../../src/utils/viewConfig.js';
import {CHART_COLORS} from '../../src/constants/pivotConstants.js';
import {chartLabelInk} from '../../src/constants/chartVisual.js';
import {clickExport} from './_toolbar.js';
import {parseCSVRecords} from '../../src/utils/csvParser.js';

// Arbitrary schema: eight column series, two groups, no bundled business assumptions.
for (const width of [360,768,1440]) for (const theme of ['浅色','深色']) {
  test(`chart color: imported series, contrast and SVG at ${width} ${theme}`,async({page},info)=>{
    await page.setViewportSize({width,height:1000});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());
    await page.route('https://fonts.gstatic.com/**',r=>r.abort());
    const cfg={fullConfig:{rows:[{id:'r',field:'Group'}],columns:[{id:'c',field:'Series'}],filters:[],values:[{id:'v',field:'Reading',agg:'sum',format:{decimals:0,thousands:true}}]},ct:'bar',csc:{showDataLabels:true,dataLabelPosition:'inside'}};
    await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
    await page.locator('input[type=file]').first().setInputFiles({name:'observations.csv',mimeType:'text/csv',buffer:Buffer.from('Group,Series,Reading\n'+['Alpha','Beta'].flatMap((group,g)=>Array.from({length:8},(_,i)=>`${group},S${i+1},${100+i*10+g*20}`)).join('\n'))});
    await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
    await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
    await expect(page.locator('footer')).toContainText('2,320');
    await page.getByRole('combobox',{name:'主题模式',exact:true}).selectOption({label:theme});
    await page.getByRole('button',{name:'仅图表',exact:true}).click();
    await page.getByRole('button',{name:'图表选项',exact:true}).click();
    await page.getByRole('checkbox',{name:'显示数值标签',exact:true}).check();
    await page.getByRole('combobox',{name:'标签位置',exact:true}).selectOption('inside');
    await page.getByRole('button',{name:'关闭图表选项',exact:true}).click();
    const chart=page.locator('#pivot-chart-container');
    await expect(chart.locator('.recharts-bar')).toHaveCount(8);
    for(let i=0;i<8;i++) {
      const bar=chart.locator('.recharts-bar').nth(i);
      await expect(bar.locator('[data-value-label]').first()).toHaveAttribute('fill',chartLabelInk(CHART_COLORS[i]));
      // The gradient has identical opaque stops, matching the legend swatch.
      await expect(chart.locator(`#appleGrad_${i} stop`).first()).toHaveAttribute('stop-color',CHART_COLORS[i]);
      await expect(chart.locator(`#appleGrad_${i} stop`).last()).toHaveAttribute('stop-opacity','1');
    }
    const legendColors=await chart.locator('.recharts-legend-item-text span').evaluateAll(els=>els.map(el=>getComputedStyle(el).color));
    expect(new Set(legendColors).size).toBe(1);
    expect(legendColors.length).toBe(8);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:info.outputPath(`series-${width}-${theme}.png`)});
    const pending=page.waitForEvent('download'); await clickExport(page,'.SVG');
    const svg=await readFile(await(await pending).path(),'utf8');
    for(const color of CHART_COLORS) expect(svg).toContain(color);
    expect(svg).toContain('data-value-label');
    if(width===1440) {
      const csvPending=page.waitForEvent('download'); await clickExport(page,'.CSV');
      const records=parseCSVRecords(await readFile(await(await csvPending).path(),'utf8'));
      expect(records.at(-1).at(-1)).toBe('2,320');
    }
  });
}
