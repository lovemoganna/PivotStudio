import { expect } from '@playwright/test';

/** Shared helpers for the decluttered HeaderBar menus. */

export async function openExportMenu(page) {
  const trigger = page.getByRole('button', { name: '导出', exact: true });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  await expect(page.getByRole('menu', { name: '导出格式', exact: true })).toBeVisible();
}

export async function clickExport(page, format) {
  await openExportMenu(page);
  await page.getByRole('menuitem', { name: format, exact: true }).click();
}

export async function openMoreMenu(page) {
  const trigger = page.getByRole('button', { name: '更多', exact: true });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  await expect(page.getByRole('menu', { name: '更多操作', exact: true })).toBeVisible();
}

export async function clickMoreItem(page, name) {
  await openMoreMenu(page);
  const item = typeof name === 'string'
    ? page.getByRole('menuitem', { name, exact: true })
    : page.getByRole('menuitem', { name });
  await item.click();
}
