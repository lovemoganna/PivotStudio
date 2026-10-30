import test from 'node:test';
import assert from 'node:assert/strict';
import {getLabelPositions, resolveLabelPosition} from '../src/utils/chartLabels.js';
import {encodeView, decodeView} from '../src/utils/viewConfig.js';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';

test('saved and shared label preferences survive projection without dataset rows', () => {
  const restored = decodeView(encodeView({fullConfig:{},csc:{showDataLabels:false,dataLabelPosition:'insideBottom'},rows:[{secret:1}]}));
  assert.equal(restored.csc.dataLabelPosition,'insideBottom');
  assert.equal(restored.csc.showDataLabels,false);
  assert.equal('rows' in restored,false);
});

test('incompatible and legacy positions safely fall back when changing chart types', () => {
  assert.equal(resolveLabelPosition('pie','insideBottom'),'auto');
  assert.equal(resolveLabelPosition('bar',undefined),'auto');
  assert.equal(resolveLabelPosition('bar','insideBottom'),'insideBottom');
  assert.deepEqual(getLabelPositions('donut').map(([value])=>value),['auto','inside','outside']);
});

test('nested heatmap keeps leaf keys so matrix values and labels can be rendered', () => {
  const data={fields:[{name:'Region',type:'text'},{name:'Store',type:'text'},{name:'Amount',type:'number'}],rows:[{Region:'East',Store:'A',Amount:100},{Region:'East',Store:'B',Amount:-20}]};
  const pivot=calculatePivot(data,{rows:[{field:'Region'},{field:'Store'}],columns:[],filters:[],values:[{id:'v',field:'Amount',agg:'sum'}]});
  const heat=buildUnifiedChartSpec(data,pivot,'heatmap',{});
  const leafKeys=pivot.tableRows.filter(row=>!row.isTotal&&!row.isSubtotal).map(row=>row.rowKey);
  assert.deepEqual(heat.items.map(item=>item.rowKey),leafKeys);
  assert.equal(heat.items.length,2);
  assert.equal(buildUnifiedChartSpec(data,pivot,'bar',{}).items.length,1);
});
