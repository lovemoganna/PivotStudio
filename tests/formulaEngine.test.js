import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFormulaAST,
  validateMetricFormula,
  evaluateFormulaAST,
  buildFormulaFromVisualSpec,
} from '../src/features/pivot/engine/formulaEngine.js';
import { calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';

const sampleRows = [
  { 地区: '华东', 销售额: 1000, 毛利额: 300, 订单号: 'A1' },
  { 地区: '华东', 销售额: 500, 毛利额: 200, 订单号: 'A1' },
  { 地区: '华南', 销售额: 800, 毛利额: 160, 订单号: 'B1' },
];

const sampleFields = [
  { name: '地区', type: 'text' },
  { name: '销售额', type: 'number' },
  { name: '毛利额', type: 'number' },
  { name: '订单号', type: 'text' },
];

test('validateMetricFormula validates syntax and referenced dataset fields', () => {
  const validRes = validateMetricFormula(
    '(SUM([销售额]) - SUM([毛利额])) / SUM([销售额])',
    sampleFields
  );
  assert.equal(validRes.valid, true);
  assert.deepEqual(validRes.referencedFields, ['销售额', '毛利额']);

  const unknownFieldRes = validateMetricFormula('SUM([不存在的字段]) / 100', sampleFields);
  assert.equal(unknownFieldRes.valid, false);
  assert.match(unknownFieldRes.error, /不存在字段/);

  const badSyntaxRes = validateMetricFormula('SUM([销售额]) / (100 + ', sampleFields);
  assert.equal(badSyntaxRes.valid, false);
});

test('evaluateFormulaAST computes compound expressions, COUNTD, and math functions accurately', () => {
  // Ratio formula
  const ast1 = parseFormulaAST('SUM([毛利额]) / SUM([销售额])');
  const val1 = evaluateFormulaAST(ast1, sampleRows);
  assert.ok(Math.abs(val1 - 660 / 2300) < 1e-9);

  // Compound margin formula with ROUND
  const ast2 = parseFormulaAST('ROUND((SUM([销售额]) - SUM([毛利额])) / SUM([销售额]), 4)');
  const val2 = evaluateFormulaAST(ast2, sampleRows);
  assert.equal(val2, Number(((2300 - 660) / 2300).toFixed(4)));

  // Distinct count average (A1, B1 => 2 distinct orders)
  const ast3 = parseFormulaAST('SUM([销售额]) / COUNTD([订单号])');
  const val3 = evaluateFormulaAST(ast3, sampleRows);
  assert.equal(val3, 1150);

  // Division by zero returns null safely
  const astZero = parseFormulaAST('SUM([销售额]) / 0');
  assert.equal(evaluateFormulaAST(astZero, sampleRows), null);
});

test('buildFormulaFromVisualSpec generates canonical formulas for all visual modes', () => {
  assert.equal(
    buildFormulaFromVisualSpec({
      mode: 'binary',
      operandAField: '毛利额',
      operandAAgg: 'sum',
      op: '/',
      operandBField: '销售额',
      operandBAgg: 'sum',
    }),
    'SUM([毛利额]) / SUM([销售额])'
  );

  assert.equal(
    buildFormulaFromVisualSpec({
      mode: 'margin',
      operandAField: '销售额',
      operandAAgg: 'sum',
      operandBField: '成本',
      operandBAgg: 'sum',
    }),
    '(SUM([销售额]) - SUM([成本])) / SUM([销售额])'
  );

  assert.equal(
    buildFormulaFromVisualSpec({
      mode: 'constant',
      operandAField: '销售额',
      operandAAgg: 'sum',
      op: '/',
      constantValue: 10000,
    }),
    'SUM([销售额]) / 10000'
  );
});

test('calculatePivot evaluates custom metrics with multi-field AST formulas across rows and grand totals', () => {
  const pivotResult = calculatePivot(
    {
      id: 'test',
      name: '测试集',
      fields: sampleFields,
      rows: sampleRows,
    },
    {
      rows: [{ field: '地区', sort: 'asc' }],
      columns: [],
      filters: [],
      values: [
        { id: 'v_sales', field: '销售额', agg: 'sum', showAs: 'normal' },
        {
          id: 'v_calc_margin',
          field: '毛利率',
          isCalculated: true,
          agg: 'calc',
          formula: 'SUM([毛利额]) / SUM([销售额])',
          showAs: 'normal',
        },
        {
          id: 'v_calc_cost_rate',
          field: '成本率',
          isCalculated: true,
          agg: 'calc',
          formula: '(SUM([销售额]) - SUM([毛利额])) / SUM([销售额])',
          showAs: 'normal',
        },
      ],
      showSubtotals: true,
    }
  );

  // Grand total check: 销售额=2300, 毛利额=660 => 毛利率=660/2300, 成本率=1640/2300
  const grandTotalMargin = pivotResult.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v_calc_margin'];
  const grandTotalCostRate = pivotResult.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v_calc_cost_rate'];
  assert.ok(Math.abs(grandTotalMargin - 660 / 2300) < 1e-9);
  assert.ok(Math.abs(grandTotalCostRate - 1640 / 2300) < 1e-9);

  // Row check: 华东 (销售额=1500, 毛利额=500 => 毛利率=1/3), 华南 (销售额=800, 毛利额=160 => 毛利率=0.2)
  const eastRow = pivotResult.tableRows.find((r) => r.label === '华东');
  const southRow = pivotResult.tableRows.find((r) => r.label === '华南');
  assert.ok(Math.abs(pivotResult.rawValueMatrix[`${eastRow.rowKey}@@__GRAND_TOTAL_COL__@@v_calc_margin`] - 500 / 1500) < 1e-9);
  assert.ok(Math.abs(pivotResult.rawValueMatrix[`${southRow.rowKey}@@__GRAND_TOTAL_COL__@@v_calc_margin`] - 160 / 800) < 1e-9);
});
