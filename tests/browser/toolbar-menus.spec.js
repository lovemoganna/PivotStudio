import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import AxeBuilder from '@axe-core/playwright';

const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const receivesPointer=locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

for(const width of [360,768,1440]) test(`toolbar: export is visible and accepts a real pointer click at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await page.goto('/?demo=retail');await ready(page);
  await page.getByRole('button',{name:'导出',exact:true}).click();
  const menu=page.getByRole('menu',{name:'导出格式',exact:true});
  await expect(menu).toBeVisible();
  await page.screenshot({path:info.outputPath(`export-${width}.png`)});
  expect(await receivesPointer(menu.getByRole('menuitem',{name:'.XLSX',exact:true}))).toBe(true);
  const download=page.waitForEvent('download');
  // A DOM visibility assertion alone missed clipping by the scrollable toolbar.
  await menu.getByRole('menuitem',{name:'.XLSX',exact:true}).click({timeout:3000});
  const book=XLSX.read(await readFile(await(await download).path()));
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
  expect(rows.flat()).toContain(1623510);
  await expect(menu).toHaveCount(0);
  await page.getByRole('button',{name:'导出',exact:true}).click();
  const csvDownload=page.waitForEvent('download');await page.getByRole('menuitem',{name:'.CSV',exact:true}).click();
  expect(await readFile(await(await csvDownload).path(),'utf8')).toContain('"1,623,510"');
});

test('toolbar: keyboard navigation, outside dismissal and viewport changes',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/?demo=retail');await ready(page);
  const trigger=page.getByRole('button',{name:'导出',exact:true});
  await trigger.press('Enter');
  let menu=page.getByRole('menu',{name:'导出格式',exact:true});
  await expect(menu.getByRole('menuitem',{name:'.XLSX',exact:true})).toBeFocused();
  await page.keyboard.press('End');await expect(menu.getByRole('menuitem',{name:'.PDF',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect(menu.getByRole('menuitem',{name:'.XLSX',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.press('Enter');await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();await expect(menu).toHaveCount(0);
  await page.keyboard.press('Escape');
  await trigger.press('Enter');await page.getByRole('heading',{name:/PivotStudio/}).click();await expect(menu).toHaveCount(0);
  await trigger.press('Enter');await page.setViewportSize({width:360,height:700});
  const rect=await menu.boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(360);
  expect(await receivesPointer(menu.getByRole('menuitem',{name:'.XLSX',exact:true}))).toBe(true);
  await page.keyboard.press('Escape');
});

test('toolbar: controls and floating menus work in English and dark mode',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/?demo=retail');await ready(page);
  for(const name of ['快捷键指南','指令 ⌘K · 打开指令面板','格式与数值']) {
    await page.getByRole('button',{name,exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  }
  await page.getByLabel('主题模式',{exact:true}).selectOption('dark');
  await page.getByLabel('界面语言',{exact:true}).selectOption('en');
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const menu=page.getByRole('menu',{name:'Export formats',exact:true});
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem',{name:'.XLSX',exact:true})).toHaveCSS('color','rgb(248, 248, 242)');
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});

test('toolbar: More menu accepts a real pointer click',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/?demo=retail');await ready(page);
  await page.getByRole('button',{name:'更多',exact:true}).click();
  const menu=page.getByRole('menu',{name:'更多操作',exact:true});
  expect(await receivesPointer(menu.getByRole('menuitem',{name:/工作区/}))).toBe(true);
  await menu.getByRole('menuitem',{name:/工作区/}).click({timeout:3000});
  await expect(page.getByRole('dialog')).toBeVisible();
});
