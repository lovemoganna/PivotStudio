import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMetricPresets} from '../src/utils/metricPresets.js';
import {buildFormulaFromVisualSpec, validateMetricFormula, evaluateFormulaAST} from '../src/features/pivot/engine/formulaEngine.js';

const number = name => ({name,type:'number'});
const text = name => ({name,type:'text'});
const formula = preset => buildFormulaFromVisualSpec({mode:preset.mode,...preset.spec});

test('presets use unique numeric amounts rather than earlier sales categories, dates or numeric identifiers', () => {
  const fields = [text('销售大区'),text('客户类型'),{name:'订单日期',type:'date'},number('SalesID'),number('销售额'),number('成本'),number('销量')];
  const presets = buildMetricPresets(fields);
  const margin = presets.find(p => p.id === 'preset_gross_margin');
  assert.equal(margin.spec.operandAField,'销售额');
  assert.equal(margin.spec.operandBField,'成本');
  assert.equal(presets.filter(p => p.mode === 'margin').length,1);
  for (const p of presets) {
    assert.doesNotMatch(p.label + p.spec.name + p.spec.description,/毛利率|净利率|客单价|订单转化率|万元|真实复合/);
    const result = validateMetricFormula(formula(p), fields);
    assert.equal(result.valid,true,formula(p));
    assert.doesNotMatch(formula(p), /SUM\(\[(?:销售大区|客户类型|订单日期|SalesID)\]\)/);
    assert.notEqual(p.spec.formatPreset,'cny');
  }
  const parsed = validateMetricFormula(formula(margin), fields);
  assert.equal(evaluateFormulaAST(parsed.ast,[{销售额:100,成本:60},{销售额:200,成本:100},{销售额:100,成本:90}]),.375);
});

test('ambiguous measures and category-only datasets do not receive a guessed business pair', () => {
  for (const fields of [
    [number('销售额'),number('收入'),number('成本')],
    [text('销售区域'),text('客户类型'),text('订单日期')],
    [number('SalesID'),number('OrderID'),number('CustomerID')],
    [number('销售额'),number('费用')],
    [number('销售额'),number('成本率')],
  ]) assert.equal(buildMetricPresets(fields).some(p => p.id === 'preset_gross_margin'),false);
  assert.deepEqual(buildMetricPresets([text('Category')]),[]);
});

test('rate and average fields stay out of sum templates, including explicit role overrides', () => {
  const fields = [number('退款率'),number('Age'),{name:'SalesID',type:'number',role:'measure'},number('Quantity'),{name:'收入',type:'text',role:'measure'}];
  const presets = buildMetricPresets(fields);
  assert.ok(presets.length > 0);
  for (const p of presets) assert.equal(p.spec.operandAField,'Quantity');
  assert.deepEqual(buildMetricPresets([number('转化率'),number('Age')]),[]);
});

test('English monetary names and source units keep arithmetic meaning without assuming currency', () => {
  const fields = [number('Sales Region Code'),number('Revenue'),number('COGS')];
  const presets = buildMetricPresets(fields);
  const margin = presets.find(p => p.id === 'preset_gross_margin');
  assert.equal(margin.spec.operandAField,'Revenue');
  assert.equal(margin.spec.operandBField,'COGS');
  const scale = presets.find(p => p.id === 'preset_wan');
  assert.doesNotMatch(scale.label + scale.spec.name,/元|¥|\$/);
  assert.match(scale.spec.description,/原字段/);
});
