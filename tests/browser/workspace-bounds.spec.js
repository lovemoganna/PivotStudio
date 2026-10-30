import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ready = page => expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status', 'idle');
const handle = page => page.getByRole('separator', {name:'调节侧边栏宽度', exact:true});
async function start(page, width) {
  await page.setViewportSize({width, height:900});
  await page.goto('/?demo=retail');
  await ready(page);
}
async function usable(page) {
  const control = handle(page);
  const width = Number(await control.getAttribute('aria-valuenow'));
  const max = Number(await control.getAttribute('aria-valuemax'));
  expect(width).toBeLessThanOrEqual(max);
  expect(max).toBeLessThanOrEqual(680);
  // The existing sidebar width transition lasts 150ms; verify its settled geometry.
  await expect.poll(() => page.getByRole('main').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  return width;
}
test.beforeEach(async ({page}) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

for (const width of [768, 1024, 1280, 1440]) {
  test(`workspace: keyboard bounds keep analysis usable at ${width}`, async ({page}, info) => {
    await start(page, width);
    const totals = await page.locator('#pivot-main-html-table tfoot td').allTextContents();
    await handle(page).press('End');
    await expect(handle(page)).toBeFocused();
    await expect.poll(() => page.getByRole('main').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(320);
    const maximum = await usable(page);
    expect(maximum).toBe(Math.min(680, Math.floor(width * .55)));
    await handle(page).press('ArrowRight');
    expect(await usable(page)).toBe(maximum);
    await handle(page).press('ArrowLeft');
    await expect(handle(page)).toHaveAttribute('aria-valuenow', String(maximum - 16));
    await handle(page).press('Home');
    await handle(page).press('ArrowLeft');
    await expect(handle(page)).toHaveAttribute('aria-valuenow', '280');
    await handle(page).press('Enter');
    await expect(handle(page)).toHaveAttribute('aria-valuenow', String(Math.min(440, maximum)));
    await handle(page).press('End');
    await expect(page.locator('#pivot-main-html-table tfoot td')).toHaveText(totals);
    await page.screenshot({path:info.outputPath(`keyboard-${width}.png`), fullPage:true});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  });
}

test('workspace: saved desktop width adapts on reload and viewport changes without losing the preference', async ({page}, info) => {
  await start(page, 1440);
  await handle(page).press('End');
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '680');
  // Test reload persistence away from the exact desktop/mobile CSS breakpoint.
  // The 768px clamp and adjustment remain covered below and in the bounds cases.
  await page.setViewportSize({width:800, height:900});
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '440');
  await usable(page);
  await page.reload(); await ready(page);
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '440');
  await usable(page);
  await page.screenshot({path:info.outputPath('restored-tablet.png'), fullPage:true});
  await page.setViewportSize({width:360, height:900});
  await expect(handle(page)).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:info.outputPath('mobile.png'), fullPage:true});
  await page.setViewportSize({width:1440, height:900});
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '680');
  await usable(page);
  // A deliberate adjustment on the tablet replaces the desktop preference.
  await page.setViewportSize({width:768, height:900});
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '422');
  await handle(page).press('ArrowLeft');
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '406');
  await page.setViewportSize({width:1440, height:900});
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '406');
});

test('workspace: mouse and keyboard share bounds, reset and collapse preserve analysis', async ({page}) => {
  await start(page, 768);
  await handle(page).press('Home');
  const box = await handle(page).boundingBox();
  await page.mouse.move(box.x + box.width/2, box.y + 60);
  await page.mouse.down(); await page.mouse.move(760, box.y + 60); await page.mouse.up();
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '422');
  await usable(page);
  await handle(page).dblclick();
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '422');
  await page.getByRole('button', {name:'收起侧边栏',exact:true}).click();
  await expect(handle(page)).toHaveCount(0);
  await page.setViewportSize({width:1440, height:900});
  await page.getByRole('complementary').getByRole('button', {name:'展开侧边栏',exact:true}).click();
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '440');
  await usable(page);
});
