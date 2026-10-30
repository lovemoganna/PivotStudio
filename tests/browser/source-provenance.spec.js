import {test,expect} from '@playwright/test';

test('source labels use dataset identity instead of words in an uploaded filename',async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles({name:'零售用户自己的文件.csv',mimeType:'text/csv',buffer:Buffer.from('Group,Reading\nA,10\nB,20')});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
  await expect(page.getByTestId('dataset-telemetry')).toContainText('本地导入文件');
  await expect(page.getByTestId('dataset-telemetry')).not.toContainText('内置演示数据');
  await page.getByRole('button',{name:'样例',exact:true}).click();
  await expect(page.getByTestId('dataset-telemetry')).toContainText('内置演示数据');
});
