import test from 'node:test';
import assert from 'node:assert/strict';
import {zeroAnchoredMinimum,zeroAnchoredMaximum,ZERO_ANCHORED_DOMAIN} from '../src/utils/axisDomain.js';
test('positive absolute bar metrics are plotted against a zero baseline',()=>{
  assert.equal(zeroAnchoredMinimum(874500000),0);
  assert.equal(zeroAnchoredMaximum(874700000),874700000);
});
test('mixed and negative series still include zero',()=>{
  assert.deepEqual([zeroAnchoredMinimum(-50),zeroAnchoredMaximum(100)],[-50,100]);
  assert.deepEqual([ZERO_ANCHORED_DOMAIN[0](-100),ZERO_ANCHORED_DOMAIN[1](-10)],[-100,0]);
});
