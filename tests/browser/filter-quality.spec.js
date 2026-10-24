import { test, expect } from '@playwright/test';
import { encodeView, decodeView } from '../../src/utils/viewConfig.js';
import AxeBuilder from '@axe-core/playwright';

const ready = page => expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status', 'idle');
const field = 'RegionWithAnExtremelyLongBusinessFieldName';
const view = {fullConfig:{rows:[{id:'r',field}],columns:[],values:[{id:'v',field:'Value',agg:'sum'}],filters:[{id:'f',field}]}};
const filter = page => page.getByRole('dialog', {name:'字段筛选',exact:true});
async function start(page, width=1440, waitForValues=true) {
  await page.setViewportSize({width,height:900});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#share_token='+encodeURIComponent(encodeView(view)));
  await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-filter.csv',mimeType:'text/csv',buffer:Buffer.from(`${field},Value\nEast,12\nWest,25`)});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await ready(page);
  if(width<768) {
    await page.getByRole('button',{name:/分析配置/}).click();
  }
  // Use the keyboard path when asserting keyboard focus return; WebKit pointer
  // clicks intentionally do not focus buttons on all platforms.
  await page.getByTestId('zone-filters').getByRole('button',{name:'全部',exact:true}).press('Enter');
  if(waitForValues)await expect(filter(page).getByLabel('East',{exact:true})).toBeVisible();
}

test('filter: slow and failed profiles show feedback and recover on reopen',async({page})=>{
  await page.addInitScript(()=>{
    const NativeWorker=window.Worker;
    window.profileFault=true;
    window.Worker=class extends NativeWorker {
      postMessage(data,...args) {
        if(data?.kind!=='profile')return super.postMessage(data,...args);
        const fail=window.profileFault;
        setTimeout(()=>{
          if(fail)this.dispatchEvent(new MessageEvent('message',{data:{kind:'profile',profileId:data.profileId,error:'Injected profile failure'}}));
          else super.postMessage(data,...args);
        },800);
      }
    };
  });
  await start(page,360,false);
  await expect(filter(page).getByRole('status')).toContainText('正在读取筛选项');
  await expect(filter(page).getByRole('button',{name:'全选重置',exact:true})).toBeDisabled();
  await expect(filter(page).getByRole('alert')).toContainText('筛选值读取失败');
  await page.evaluate(()=>{window.profileFault=false;});
  await page.keyboard.press('Escape');
  await page.getByTestId('zone-filters').getByRole('button',{name:'全部',exact:true}).click();
  await expect(filter(page).getByLabel('East',{exact:true})).toBeVisible();
  await expect(filter(page).getByRole('alert')).toHaveCount(0);
});

test('filter: deselecting the last value yields zero rows and survives share restore',async({page},info)=>{
  await start(page);
  await filter(page).getByLabel('East',{exact:true}).uncheck();
  await expect(filter(page).getByLabel('East',{exact:true})).not.toBeChecked();
  await filter(page).getByLabel('West',{exact:true}).click();
  await page.screenshot({path:info.outputPath('filter-last-unchecked.png')});
  await expect(filter(page).getByLabel('West',{exact:true})).not.toBeChecked();
  await page.getByRole('button',{name:'关闭字段筛选',exact:true}).click(); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:/0 \/ 2 行/}).first()).toBeVisible();
  await expect(page.getByTestId('zone-filters').getByRole('button',{name:'0项',exact:true})).toBeVisible();
  await page.getByTestId('zone-filters').getByRole('button',{name:'0项',exact:true}).click();
  await filter(page).getByRole('button',{name:'全选重置',exact:true}).click();
  await expect(filter(page).getByLabel('East',{exact:true})).toBeChecked();
  await expect(filter(page).getByLabel('West',{exact:true})).toBeChecked();
  await page.getByRole('button',{name:'关闭字段筛选',exact:true}).click(); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:/2 \/ 2 行/}).first()).toBeVisible();
  const emptyView = {...view,fullConfig:{...view.fullConfig,filters:[{id:'f',field,excludeAll:true,selectedValues:[]}]}};
  expect(decodeView(encodeView(emptyView)).fullConfig.filters[0].excludeAll).toBe(true);
  await page.goto('/?restore=empty#share_token='+encodeURIComponent(encodeView(emptyView)));
  await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-filter.csv',mimeType:'text/csv',buffer:Buffer.from(`${field},Value\nEast,12\nWest,25`)});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click(); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:/0 \/ 2 行/}).first()).toBeVisible();
  // Recovery outside the modal must clear the same explicit empty state.
  await page.getByRole('button',{name:'重置全部筛选',exact:true}).click(); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:/2 \/ 2 行/}).first()).toBeVisible();
});

test('filter: slicer recovers an empty selection and dark English feedback is accessible',async({page})=>{
  await start(page);
  await filter(page).getByLabel('East',{exact:true}).uncheck();
  await filter(page).getByLabel('West',{exact:true}).uncheck();
  await page.keyboard.press('Escape'); await ready(page);
  const all=page.getByRole('button',{name:'全部 (All)',exact:true});
  await expect(all).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'East (1)',exact:true}).click(); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:/1 \/ 2 行/}).first()).toBeVisible();
  await all.click(); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:/2 \/ 2 行/}).first()).toBeVisible();
  await page.getByLabel('界面语言',{exact:true}).selectOption('en');
  await page.getByLabel('Theme mode',{exact:true}).selectOption('dark');
  await page.getByTestId('zone-rows').getByRole('button',{name:'Filter values',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('textbox',{name:'Search filter values',exact:true}).fill('no-match');
  await expect(dialog.getByRole('status')).toContainText('No matching filter values');
  // Axe samples over time; wait for asynchronous profile loading and disabled ink to settle.
  const reset=dialog.getByRole('button',{name:'Select all / Reset',exact:true});
  await expect(reset).toBeEnabled();
  await expect.poll(()=>reset.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  const axe=await new AxeBuilder({page}).include('[role=dialog]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(axe.violations).toEqual([]);
});

for(const width of [360,768,1280,1440])test(`filter: accessible search, long header, empty feedback and keyboard actions at ${width}`,async({page},info)=>{
  await start(page,width);
  await page.screenshot({path:info.outputPath(`filter-${width}.png`)});
  expect(await filter(page).evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  const axe=await new AxeBuilder({page}).include('[role=dialog]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  await info.attach('axe-filter',{body:JSON.stringify(axe.violations,null,2),contentType:'application/json'});
  expect(axe.violations).toEqual([]);
  await filter(page).getByRole('textbox',{name:'搜索筛选项',exact:true}).fill('no-match');
  await expect(filter(page).getByRole('status')).toContainText('没有匹配的筛选项');
  await filter(page).getByRole('textbox').fill('East');
  const only=filter(page).getByRole('button',{name:'仅此项',exact:true});
  await only.focus();
  expect(await only.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await only.press('Enter');
  await filter(page).getByRole('textbox').fill('');
  await expect(filter(page).getByLabel('West',{exact:true})).not.toBeChecked();
  await page.keyboard.press('Escape'); await ready(page);
  await expect(page.getByTestId('zone-filters').getByRole('button',{name:'1项',exact:true})).toBeFocused();
});
