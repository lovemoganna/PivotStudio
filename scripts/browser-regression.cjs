// Real Chromium regression: responsive layout, interaction and console errors.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const URL = 'http://127.0.0.1:4178/';
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4178', '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: process.env
});
let serverOutput = '';
server.stdout.on('data', b => { serverOutput += String(b); });
server.stderr.on('data', b => { serverOutput += String(b); });

async function waitForServer() {
  for (let attempt=0; attempt<50; attempt++) {
    if (server.exitCode !== null) throw new Error('Vite exited: ' + serverOutput);
    try { if ((await fetch(URL)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error('Vite did not start: ' + serverOutput);
}

async function run() {
  await waitForServer();
  await fs.mkdir('test-artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [name,width,height] of [['desktop',1440,900],['tablet',820,900],['mobile',390,844]]) {
      const page = await browser.newPage({ viewport: {width,height},deviceScaleFactor:1 });
      const exceptions = [];
      page.on('pageerror', error => exceptions.push(error.message));
      page.on('console', msg => { if (msg.type()==='error') exceptions.push('console: '+msg.text()); });
      await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.getByTestId('open-workspaces').waitFor({timeout:12000});
      await page.getByRole('button', {name:'仅图表'}).click();
      const chartTab = page.getByRole('button', {name:'仅图表'});
      assert.equal(await chartTab.getAttribute('aria-pressed'),'true','view control feedback');
      await page.getByRole('button', {name:'表图并列'}).click();
      const overflow = await page.evaluate(() => ({
        doc:document.documentElement.scrollWidth,
        viewport:window.innerWidth,
        body:document.body.scrollWidth,
        main:!!document.querySelector('main'),
        header:!!document.querySelector('[data-testid="workbench-header"]')
      }));
      console.log('viewport inspection',name,JSON.stringify(overflow),JSON.stringify(exceptions));
      await page.screenshot({path:'test-artifacts/'+name+'.png',fullPage:true});
      assert.ok(overflow.main && overflow.header, name+': missing main/header');
      console.log(name,JSON.stringify({horizontalOverflow:overflow.doc-overflow.viewport,bodyOverflow:overflow.body-overflow.viewport,exceptions}));
      assert.ok(overflow.doc<=overflow.viewport+2,name+': document overflow '+JSON.stringify(overflow));
      if(name==='desktop') {
        const separator = page.getByRole('separator',{name:'调整表图宽度'});
        await separator.focus();
        const before=Number(await separator.getAttribute('aria-valuenow'));
        await page.keyboard.press('ArrowRight');
        const after=Number(await separator.getAttribute('aria-valuenow'));
        assert.equal(after,before+5,'Keyboard split resizing');
        await page.getByTestId('open-workspaces').click();
        assert.ok(await page.getByText('保存或切换本机工作区快照',{exact:false}).isVisible(),'workspace modal opens');
      }
      assert.equal(exceptions.length,0,name+': uncaught frontend errors: '+exceptions.join('; '));
      await page.close();
    }
  } finally {await browser.close();}
}

run().then(()=>{console.log('Browser UI regression: PASS');server.kill();process.exit(0);}).catch(error=>{console.error('Browser UI regression: FAIL',error);server.kill();process.exit(1);});
