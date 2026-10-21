// Reproducible UI evidence using the labelled built-in demo, never customer data.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
const phase = process.env.AUDIT_PHASE || 'before';
const folder = join(process.cwd(), `artifacts/quality/${phase}`);
// Tailwind resolves content globs from cwd; isolate the baseline's styles as well as its source.
if (process.env.AUDIT_ROOT) process.chdir(process.env.AUDIT_ROOT);
await mkdir(folder, { recursive: true });
const server = await createServer({ root: process.env.AUDIT_ROOT || process.cwd(), server: { host: '127.0.0.1', port: 5191, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const evidence = [];
try {
  for (const width of [360, 768, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page=await context.newPage();
    if (process.env.AUDIT_FONT_DIR) {
      const fontFolder=process.env.AUDIT_FONT_DIR;
      const css=(await Promise.all([400,500,600,700].map(weight=>readFile(join(fontFolder,`${weight}.css`),'utf8')))).join('\n').replaceAll('./files/','http://audit-font/files/');
      await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:css}));
      await page.route('http://audit-font/files/**',async route=>route.fulfill({contentType:'font/woff2',headers:{'access-control-allow-origin':'*'},body:await readFile(join(fontFolder,'files',basename(new URL(route.request().url()).pathname)))}));
    } else await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    page.setDefaultTimeout(15000); console.log('capture',width); const errors=[]; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5191/');
    await page.locator('h1').filter({hasText:'PivotStudio'}).first().waitFor();
    await page.getByLabel('界面语言',{exact:true}).selectOption('en');
    await page.getByLabel('Theme mode',{exact:true}).selectOption('light');
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:`${folder}/intro-${width}.png`,fullPage:true});
    const introAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await writeFile(`${folder}/axe-intro-${width}.json`,JSON.stringify(introAxe.violations,null,2));
    evidence.push({width,state:'intro',axe:introAxe.violations.map(({id,nodes})=>({id,count:nodes.length}))});
    await page.goto('http://127.0.0.1:5191/?demo=retail');
    await page.getByTestId('pivot-workbench').waitFor();
    await page.waitForFunction(()=>document.querySelector('[data-testid=pivot-workbench]')?.dataset.calculationStatus==='idle',null,{timeout:30000}); console.log('ready',width);
    // Use the real locale. Optional local fonts make before/after captures reproducible.
    await page.getByLabel('Interface language',{exact:true}).selectOption('en');
    for (const theme of ['light','dark']) {
      await page.getByLabel('Theme mode',{exact:true}).selectOption(theme);
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForTimeout(250);
      await page.locator('#split-resizer').evaluate(el=>{el.parentElement.scrollTop=0;});
      await page.screenshot({ path: `${folder}/workbench-${width}-${theme}.png`, fullPage: true });
      const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      await writeFile(`${folder}/axe-${width}-${theme}.json`,JSON.stringify(axe.violations,null,2));
      evidence.push({width,theme,axe:axe.violations.map(({id,impact,nodes})=>({id,impact,count:nodes.length,targets:nodes.slice(0,3).map(n=>n.target)}))});
      evidence.push(await page.evaluate(({width,theme,errors})=>{
        const visible=el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden';
        const controls=[...document.querySelectorAll('button,select,input,[role=button]')].filter(el=>visible(el)&&!el.disabled);
        const unnamed=controls.filter(el=>!(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||el.labels?.[0]?.textContent||'').trim()).map(el=>el.outerHTML.slice(0,240));
        const chart=document.querySelector('#pivot-chart-container .recharts-wrapper'); const table=document.querySelector('#pivot-main-html-table'); const body=table?.querySelector('tbody'); const scroller=table?.parentElement; const displayControls=document.querySelector('#pivot-table-display-settings') || [...document.querySelectorAll('div')].find(el=>el.textContent.includes('Auto-fit')&&el.textContent.includes('Alignment')&&el.className?.includes('select-none'));
        const geometry={displayControlsHeight:displayControls?.getBoundingClientRect().height,displayToggleHeight:document.querySelector('[aria-controls="pivot-table-display-settings"]')?.getBoundingClientRect().height,chartHeight:chart?.getBoundingClientRect().height, tableViewport:scroller?.clientHeight, bodyHeight:body?.getBoundingClientRect().height};
        const tiny=controls.filter(el=>{const r=el.getBoundingClientRect();return r.width<24||r.height<24}).length;
        return {width,theme,errors,overflow:document.documentElement.scrollWidth-innerWidth,unnamed,tiny,geometry,controls:controls.length};
      },{width,theme,errors}));
    }
    await page.locator('#pivot-chart-container').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${folder}/chart-${width}.png`});
    await page.locator('input[type=file]').first().setInputFiles({name:'audit.csv',mimeType:'text/csv',buffer:Buffer.from('Region,Value\nEast,12\nWest,25')});
    await page.getByRole('dialog').waitFor();
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await writeFile(`${folder}/axe-import-${width}.json`,JSON.stringify(axe.violations,null,2));
    await page.screenshot({path:`${folder}/import-${width}.png`,fullPage:true});
    evidence.push({width,state:'import',axe:axe.violations.map(({id,nodes})=>({id,count:nodes.length})),unnamed:await page.locator('[role=dialog] select').evaluateAll(nodes=>nodes.filter(el=>!el.getAttribute('aria-label')&&!el.labels?.length).map(el=>el.outerHTML.slice(0,150)))});
    await context.close();
  }
  await writeFile(`${folder}/metrics.json`,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence.map(({width,theme,state,geometry,axe,errors,overflow})=>({width,theme,state,geometry,axe,errors,overflow})),null,2));
  if(process.env.AUDIT_ENFORCE === '1' && evidence.some(entry=>entry.axe?.length || entry.errors?.length || entry.overflow>1)) throw new Error('UI quality checks failed; inspect the saved evidence.');
} finally { await browser.close(); await server.close(); }
