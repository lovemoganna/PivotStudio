import test from 'node:test';
import assert from 'node:assert/strict';
import {createShareLink,decodeView} from '../src/utils/viewConfig.js';
test('share projects only configuration and preserves Unicode round trip',()=>{
  const source={rows:[{secret:'raw dataset'}],fullConfig:{rows:[{field:'区域',id:'r',rawRecords:['secret']}],columns:[],filters:[],values:[{field:'金额',id:'v',agg:'avg'}],dataset:{rows:['secret']}}};
  const link=createShareLink(source,{origin:'https://example.com',pathname:'/app/'});
  assert.ok(link.includes('#share_token='));
  const restored=decodeView(link);
  assert.equal(restored.fullConfig.rows[0].field,'区域');
  assert.equal(JSON.stringify(restored).includes('secret'),false);
  assert.throws(()=>decodeView('bad token'));
});
