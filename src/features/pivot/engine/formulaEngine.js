import { computeAggregation } from './calculatePivot.js';

const AGG_FUNC_MAP = {
  SUM: 'sum',
  AVG: 'avg',
  MEAN: 'avg',
  COUNT: 'count',
  COUNTD: 'count_distinct',
  COUNT_DISTINCT: 'count_distinct',
  MIN: 'min',
  MAX: 'max',
  MEDIAN: 'median',
  STDDEV: 'stddev',
};

// A real column called 记录数 is distinct from the virtual COUNT() measure.
export function formatFormulaField(field) {
  return `[${String(field).replaceAll(']', ']]')}]`;
}

/**
 * Tokenize a metric formula expression.
 * Supports:
 * - Field references in brackets: [销售额], [Gross Margin (USD)], [__COUNT__], [记录数]
 * - Identifiers / functions: SUM, AVG, COUNT, COUNTD, MIN, MAX, MEDIAN, STDDEV, ABS, ROUND, IFNULL, IFZERO
 * - Numbers: 100, 1.13, .5
 * - Operators: +, -, *, /, ÷, ×, (, ), ,
 */
export function tokenizeFormula(formulaStr) {
  const src = String(formulaStr || '').trim();
  const tokens = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '[') {
      i++;
      let fieldName = '', closed = false;
      while (i < src.length) {
        if (src[i] === ']') {
          if (src[i + 1] === ']') { fieldName += ']'; i += 2; continue; }
          i++; closed = true; break;
        }
        fieldName += src[i++];
      }
      if (!closed) throw new Error('字段引用缺少右括号 "]"');
      fieldName = fieldName.trim();
      if (!fieldName) {
        throw new Error('字段引用 "[]" 不能为空');
      }
      tokens.push({ type: 'FIELD', value: fieldName });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let numStr = '';
      let dotCount = 0;
      while (i < src.length && (/[0-9]/.test(src[i]) || src[i] === '.')) {
        if (src[i] === '.') dotCount++;
        if (dotCount > 1) throw new Error(`无效数字格式: ${numStr}.`);
        numStr += src[i++];
      }
      const numVal = Number(numStr);
      if (!Number.isFinite(numVal)) throw new Error(`无效数字: ${numStr}`);
      tokens.push({ type: 'NUMBER', value: numVal });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) {
        ident += src[i++];
      }
      tokens.push({ type: 'IDENT', value: ident.toUpperCase() });
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }
    if (ch === '×') {
      tokens.push({ type: 'OP', value: '*' });
      i++;
      continue;
    }
    if (ch === '÷') {
      tokens.push({ type: 'OP', value: '/' });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA' });
      i++;
      continue;
    }
    throw new Error(`不支持的字符 "${ch}"`);
  }

  return tokens;
}

/**
 * Parse tokens into an AST.
 */
export function parseFormulaAST(formulaStr, datasetFields) {
  // Preserve legacy virtual aliases only when no real column has that name.
  const resolveField = field => field === '记录数' && Array.isArray(datasetFields) && !datasetFields.some(f => f.name === field) ? '__COUNT__' : field;
  const tokens = tokenizeFormula(formulaStr);
  if (tokens.length === 0) {
    throw new Error('公式不能为空');
  }

  let pos = 0;
  const peek = () => tokens[pos] || null;
  const consume = (expectedType) => {
    const tok = tokens[pos];
    if (!tok) throw new Error('公式意外结束，请检查运算项是否完整');
    if (expectedType && tok.type !== expectedType) {
      throw new Error(`语法错误：期望 ${expectedType}，实际为 ${tok.value || tok.type}`);
    }
    pos++;
    return tok;
  };

  function parseExpression() {
    let node = parseTerm();
    while (peek()?.type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = consume('OP').value;
      const right = parseTerm();
      node = { type: 'BinaryOp', op, left: node, right };
    }
    return node;
  }

  function parseTerm() {
    let node = parseUnary();
    while (peek()?.type === 'OP' && (peek().value === '*' || peek().value === '/')) {
      const op = consume('OP').value;
      const right = parseUnary();
      node = { type: 'BinaryOp', op, left: node, right };
    }
    return node;
  }

  function parseUnary() {
    if (peek()?.type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = consume('OP').value;
      const argument = parseUnary();
      return { type: 'UnaryOp', op, argument };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error('公式缺少运算项');

    if (tok.type === 'NUMBER') {
      consume('NUMBER');
      return { type: 'Literal', value: tok.value };
    }

    if (tok.type === 'FIELD') {
      consume('FIELD');
      const normalizedField = resolveField(tok.value);
      return {
        type: 'Aggregate',
        agg: normalizedField === '__COUNT__' ? 'count' : 'sum',
        field: normalizedField,
      };
    }

    if (tok.type === 'IDENT') {
      const funcName = consume('IDENT').value;
      if (peek()?.type !== 'LPAREN') {
        throw new Error(`函数 "${funcName}" 后缺少左括号 "("，字段请使用 [字段名] 包裹`);
      }
      consume('LPAREN');

      // Special case: COUNT() with 0 args
      if (funcName === 'COUNT' && peek()?.type === 'RPAREN') {
        consume('RPAREN');
        return { type: 'Aggregate', agg: 'count', field: '__COUNT__' };
      }

      // If it's an aggregation function and the first token is FIELD followed by RPAREN
      if (AGG_FUNC_MAP[funcName] && peek()?.type === 'FIELD' && tokens[pos + 1]?.type === 'RPAREN') {
        const fieldTok = consume('FIELD');
        consume('RPAREN');
        const normalizedField = resolveField(fieldTok.value);
        return {
          type: 'Aggregate',
          agg: normalizedField === '__COUNT__' ? 'count' : AGG_FUNC_MAP[funcName],
          field: normalizedField,
        };
      }

      // Otherwise parse general function arguments (e.g. ABS(x), ROUND(x, 2), MAX(a, b), MIN(a, b), IFNULL(a, 0))
      const args = [];
      if (peek()?.type !== 'RPAREN') {
        args.push(parseExpression());
        while (peek()?.type === 'COMMA') {
          consume('COMMA');
          args.push(parseExpression());
        }
      }
      if (peek()?.type !== 'RPAREN') {
        throw new Error(`函数 "${funcName}" 缺少右括号 ")"`);
      }
      consume('RPAREN');

      const allowedMathFuncs = new Set(['ABS', 'ROUND', 'MAX', 'MIN', 'IFNULL', 'IFZERO']);
      if (!allowedMathFuncs.has(funcName)) {
        if (AGG_FUNC_MAP[funcName]) {
          throw new Error(`聚合函数 ${funcName}([字段名]) 内必须直接引用单个字段，如 ${funcName}([销售额])`);
        }
        throw new Error(`不支持的函数 "${funcName}"`);
      }
      if (funcName === 'ABS' && args.length !== 1) throw new Error('ABS(x) 需要 1 个参数');
      if (funcName === 'ROUND' && (args.length < 1 || args.length > 2)) throw new Error('ROUND(x, n) 需要 1 或 2 个参数');
      if ((funcName === 'MAX' || funcName === 'MIN' || funcName === 'IFNULL' || funcName === 'IFZERO') && args.length !== 2) {
        throw new Error(`${funcName}(a, b) 需要 2 个参数`);
      }
      return { type: 'FuncCall', name: funcName, args };
    }

    if (tok.type === 'LPAREN') {
      consume('LPAREN');
      const expr = parseExpression();
      if (peek()?.type !== 'RPAREN') {
        throw new Error('括号不匹配，缺少右括号 ")"');
      }
      consume('RPAREN');
      return expr;
    }

    throw new Error(`无法解析的符号 "${tok.value || tok.type}"`);
  }

  const ast = parseExpression();
  if (pos < tokens.length) {
    throw new Error(`公式存在多余内容 "${tokens[pos].value || tokens[pos].type}"`);
  }
  return ast;
}

/**
 * Collect all field names referenced in an AST.
 */
export function collectFormulaFields(ast, out = new Set()) {
  if (!ast) return out;
  if (ast.type === 'Aggregate') {
    out.add(ast.field);
  } else if (ast.type === 'UnaryOp') {
    collectFormulaFields(ast.argument, out);
  } else if (ast.type === 'BinaryOp') {
    collectFormulaFields(ast.left, out);
    collectFormulaFields(ast.right, out);
  } else if (ast.type === 'FuncCall') {
    ast.args.forEach((arg) => collectFormulaFields(arg, out));
  }
  return out;
}

/**
 * Validate a formula expression against the available dataset fields.
 */
export function validateMetricFormula(formulaStr, datasetFields = []) {
  try {
    const ast = parseFormulaAST(formulaStr, datasetFields);
    const referenced = Array.from(collectFormulaFields(ast));
    const validNames = new Set((datasetFields || []).map((f) => f.name));
    validNames.add('__COUNT__');

    if (datasetFields && datasetFields.length > 0) {
      const missing = referenced.filter((f) => !validNames.has(f));
      if (missing.length > 0) {
        return {
          valid: false,
          error: `当前数据集中不存在字段：${missing.map((m) => `[${m}]`).join('、')}`,
          referencedFields: referenced,
        };
      }
    }
    return {
      valid: true,
      ast,
      referencedFields: referenced,
      error: null,
    };
  } catch (err) {
    return {
      valid: false,
      ast: null,
      referencedFields: [],
      error: err.message || '公式语法有误',
    };
  }
}

/**
 * Evaluate a parsed AST (or formula string) on a bucket of records.
 * Optional lookupAggregate(field, agg) can use precomputed matrix values when available.
 */
export function evaluateFormulaAST(ast, records = [], lookupAggregate = null) {
  if (!ast) return null;

  switch (ast.type) {
    case 'Literal':
      return Number.isFinite(ast.value) ? ast.value : null;

    case 'Aggregate': {
      const { field, agg } = ast;
      if (lookupAggregate) {
        const cached = lookupAggregate(field, agg);
        if (cached !== undefined) return cached;
      }
      if (field === '__COUNT__') {
        return (records || []).length;
      }
      return computeAggregation(records, field, agg);
    }

    case 'UnaryOp': {
      const val = evaluateFormulaAST(ast.argument, records, lookupAggregate);
      if (val === null || val === undefined || !Number.isFinite(val)) return null;
      return ast.op === '-' ? -val : val;
    }

    case 'BinaryOp': {
      const left = evaluateFormulaAST(ast.left, records, lookupAggregate);
      const right = evaluateFormulaAST(ast.right, records, lookupAggregate);
      if (left === null || left === undefined || right === null || right === undefined) return null;
      if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
      let res = null;
      if (ast.op === '+') res = left + right;
      else if (ast.op === '-') res = left - right;
      else if (ast.op === '*') res = left * right;
      else if (ast.op === '/') res = right !== 0 ? left / right : null;
      return Number.isFinite(res) ? res : null;
    }

    case 'FuncCall': {
      const name = ast.name;
      if (name === 'ABS') {
        const v = evaluateFormulaAST(ast.args[0], records, lookupAggregate);
        return v !== null && Number.isFinite(v) ? Math.abs(v) : null;
      }
      if (name === 'ROUND') {
        const v = evaluateFormulaAST(ast.args[0], records, lookupAggregate);
        const d = ast.args[1] ? evaluateFormulaAST(ast.args[1], records, lookupAggregate) : 0;
        if (v === null || !Number.isFinite(v)) return null;
        const dec = Math.max(0, Math.min(10, Math.round(d || 0)));
        return Number(v.toFixed(dec));
      }
      if (name === 'MAX') {
        const a = evaluateFormulaAST(ast.args[0], records, lookupAggregate);
        const b = evaluateFormulaAST(ast.args[1], records, lookupAggregate);
        return a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b) ? Math.max(a, b) : null;
      }
      if (name === 'MIN') {
        const a = evaluateFormulaAST(ast.args[0], records, lookupAggregate);
        const b = evaluateFormulaAST(ast.args[1], records, lookupAggregate);
        return a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b) ? Math.min(a, b) : null;
      }
      if (name === 'IFNULL') {
        const a = evaluateFormulaAST(ast.args[0], records, lookupAggregate);
        if (a !== null && a !== undefined && Number.isFinite(a)) return a;
        return evaluateFormulaAST(ast.args[1], records, lookupAggregate);
      }
      if (name === 'IFZERO') {
        const a = evaluateFormulaAST(ast.args[0], records, lookupAggregate);
        if (a !== null && a !== undefined && a !== 0 && Number.isFinite(a)) return a;
        return evaluateFormulaAST(ast.args[1], records, lookupAggregate);
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Build a standard formula string from visual builder options.
 */
export function buildFormulaFromVisualSpec({
  mode = 'binary', // 'binary' | 'margin' | 'constant'
  operandAField,
  operandAAgg = 'sum',
  op = '/',
  operandBField,
  operandBAgg = 'sum',
  constantValue = 100,
}) {
  const fmtTerm = (field, agg) => {
    if (!field || field === '__COUNT__') return 'COUNT()';
    const fn = String(agg || 'sum').toUpperCase();
    return `${fn === 'COUNT_DISTINCT' ? 'COUNTD' : fn}(${formatFormulaField(field)})`;
  };

  const termA = fmtTerm(operandAField, operandAAgg);
  if (mode === 'constant') {
    const num = Number.isFinite(Number(constantValue)) ? Number(constantValue) : 1;
    return `${termA} ${op} ${num}`;
  }
  const termB = fmtTerm(operandBField, operandBAgg);
  if (mode === 'margin') {
    return `(${termA} - ${termB}) / ${termA}`;
  }
  return `${termA} ${op} ${termB}`;
}
