import test from 'node:test';
import assert from 'node:assert/strict';
import {readTextBlob} from '../src/utils/readTextBlob.js';

test('CSV reading keeps Chinese characters crossing byte boundaries',async()=>{
  const csv='地区,金额\n华东,100\n华南,200\n';
  const progress=[];
  const actual=await readTextBlob(new Blob([csv]),1,step=>progress.push(step));
  assert.equal(actual,csv);
  assert.equal(progress.at(-1).pct,100);
});
test('invalid UTF-8 fails clearly instead of silently corrupting field labels',async()=>{
  await assert.rejects(readTextBlob(new Blob([Uint8Array.from([0xff,0xfe])]),1),TypeError);
});
