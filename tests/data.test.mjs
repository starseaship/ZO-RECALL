import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadData} from '../assets/js/data.js';
const original=JSON.parse(await readFile(new URL('../data/toeic-bubei-bb1.json',import.meta.url),'utf8'));
test('runtime skips invalid records and filters drafts without failing the whole collection',async()=>{
  const priorFetch=globalThis.fetch, priorLocation=globalThis.location, priorWarn=console.warn;
  try {
    console.warn=()=>{};
    const good=structuredClone(original[0]);good.reviewStatus='reviewed';
    const broken=structuredClone(original[1]);broken.senses[0].definitionEn='';
    globalThis.fetch=async path=>({ok:true,json:async()=>path==='data/manifest.json'?{schemaVersion:2,dataVersion:'test',categories:['托业'],files:['data/toeic-bubei-bb1.json']}:[good,broken,original[2]]});
    globalThis.location={search:''};const regular=await loadData();assert.equal(regular.words.length,1);assert.ok(regular.warnings.some(w=>w.includes('跳过无效词条')));
    globalThis.location={search:'?drafts=1'};assert.equal((await loadData()).words.length,2);
    globalThis.fetch=async path=>path==='data/manifest.json'?{ok:true,json:async()=>({schemaVersion:2,dataVersion:'test',categories:['托业'],files:['data/toeic-bubei-bb1.json']})}:{ok:false,status:500};
    await assert.rejects(()=>loadData(),/读取失败/);
  } finally {globalThis.fetch=priorFetch;globalThis.location=priorLocation;console.warn=priorWarn;}
});
