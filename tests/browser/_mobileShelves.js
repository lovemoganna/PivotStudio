/** Expand mobile field/config accordions only when collapsed (idempotent). */
export async function ensureMobileShelves(page, width = 0) {
  if (width >= 768) return;
  for (const name of [/字段列表/, /分析配置/]) {
    const btn = page.getByRole('button', { name });
    if ((await btn.count()) === 0) continue;
    if ((await btn.getAttribute('aria-expanded')) === 'false') {
      await btn.click();
    }
  }
}
