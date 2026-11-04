import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchesCollection,selectedCollections,countHeadwords,collectionFields} from '../assets/js/collections.js';
import {validateManifest,validateCollectionLinks} from '../assets/js/schema.js';
const manifest=JSON.parse(await readFile(new URL('../data/manifest.json',import.meta.url),'utf8'));
const words=JSON.parse(await readFile(new URL('../data/toeic-bubei-bb1.json',import.meta.url),'utf8'));
test('exam, source and batch form a distinct hierarchy, independent of CEFR',()=>{
  assert.deepEqual(validateManifest(manifest),[]);
  assert.deepEqual(validateCollectionLinks(words,manifest),[]);
  assert.equal(manifest.collections[0].batch,'BB1');
  assert.equal(countHeadwords(words),79);
  assert.ok(words.every(w=>w.level!=='BB1'));
  assert.equal(selectedCollections(manifest,{exam:'托业',source:'不背单词',batch:'BB1'}).length,1);
  assert.equal(selectedCollections(manifest,{exam:'托业',source:'不背单词',batch:'BB2'}).length,0);
});
test('one shared word can belong to multiple batches without duplicating its entry',()=>{
  const other={id:'toeic-bubei-bb2',exam:'托业',source:'不背单词',batch:'BB2'};
  const m={...manifest,collections:[...manifest.collections,other]};
  const w={...words[0],collectionIds:['toeic-bubei-bb1','toeic-bubei-bb2']};
  assert.ok(matchesCollection(w,m,{batch:'BB1'}));assert.ok(matchesCollection(w,m,{batch:'BB2'}));
  assert.ok(!matchesCollection(w,m,{source:'其他来源'}));assert.ok(!matchesCollection(w,m,{collection:'missing'}));
  assert.match(collectionFields(m,{collection:other.id}),/BB2/);
});
test('unknown membership and ordering references are rejected',()=>{
  const broken=structuredClone(manifest);broken.collections[0].wordOrder.push('missing');
  assert.ok(validateCollectionLinks(words,broken).length);
  const duplicate=structuredClone(manifest);duplicate.collections.push(duplicate.collections[0]);assert.ok(validateManifest(duplicate).length);
});
test('every published BB1 learning item has bilingual definitions and examples',()=>{
  for(const w of words)for(const s of w.senses){assert.ok(s.definitionZh?.trim());assert.ok(s.examples.length);assert.ok(s.examples.every(e=>e.en&&e.zh));assert.ok((s.collocations??[]).every(c=>!c.exampleEn||c.exampleZh));}
  const removed=['rarely','seldom','retrieve','discard','accumulate','decompose','grant','awareness','appliance'];
  assert.ok(words.every(w=>!removed.includes(w.word)));
  assert.ok(words.some(w=>w.id==='barely-adv'));
});
