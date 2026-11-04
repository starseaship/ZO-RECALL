import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCorpus, validateWord } from '../assets/js/schema.js';
import { buildQuestion, createQuiz, flatten, similarDefinitions } from '../assets/js/quiz-engine.js';
import { createProgressStore, parseProgress, mergeProgress, senseState, dayKey } from '../assets/js/progress.js';
const words=JSON.parse(await readFile(new URL('../data/words-001.json',import.meta.url),'utf8'));
const pool=flatten(words);
const memory=()=>{let value=null;return{getItem:()=>value,setItem:(_k,v)=>{value=v;}};};
test('ten words, original definitions and globally unique sense IDs',()=>{
  assert.equal(words.length,10); assert.deepEqual(validateCorpus(words),[]);
  const duplicate=structuredClone(words); duplicate.push(duplicate[0]); assert.match(validateCorpus(duplicate).join(' '),/重复 id/);
  const broken=structuredClone(words); broken[0].senses[0].distractorSenseIds=['missing']; assert.match(validateCorpus(broken).join(' '),/不存在/);
});
test('invalid definitions, missing examples and unverified metadata fail validation',()=>{
  const w=structuredClone(words[0]); w.senses[0].definitionEn='In a rare way.';assert.match(validateWord(w).join(' '),/同源词/);
  w.senses[0].examples=[];w.reviewStatus='approved';const errors=validateWord(w).join(' ');assert.match(errors,/例句/);assert.match(errors,/reviewStatus/);
});
test('each Easy question has four distinct compatible senses across repeated random runs',()=>{
  for(let round=0;round<30;round++)for(const target of pool){const q=buildQuestion(target,pool,'easy');assert.ok(q,target.word.word);assert.equal(new Set(q.options.map(o=>o.sense.senseId)).size,4);assert.equal(q.options.filter(o=>o.sense.senseId===target.sense.senseId).length,1);for(const option of q.options)if(option!==target)assert.notEqual(option.word.id,target.word.id);}
});
test('blacklist is bidirectional, applies between options, and shortage is explicit',()=>{
  const rarely=pool.find(x=>x.word.word==='rarely');const seldom=structuredClone(pool.find(x=>x.word.word==='seldom'));seldom.sense.confusables=[];
  for(let i=0;i<20;i++){const q=buildQuestion(seldom,[rarely,...pool.filter(x=>!['rarely','seldom','barely'].includes(x.word.word))],'easy');assert.ok(q);assert.ok(q.options.every(o=>o.word.word!=='rarely'));}
  assert.equal(buildQuestion(rarely,pool,'normal'),null);
  const session=createQuiz(pool,pool,'normal');assert.ok(session.skipped.includes('rarely'));assert.ok(session.questions.length>0);assert.ok(session.questions.length<10);
  assert.ok(similarDefinitions('To get back stored data.','To get back stored data!'));
});
test('study ratings never produce mastery, three quiz answers require two dates',()=>{
  const store=createProgressStore(words,()=>{},memory()),w=words[0],s=w.senses[0];for(let i=0;i<3;i++)store.rate(w,s,'known');assert.notEqual(senseState(store.value.words[w.id].senses[s.senseId]),'mastered');
  for(let i=0;i<3;i++)store.answer(w,s,true);const state=store.value.words[w.id].senses[s.senseId];assert.notEqual(senseState(state),'mastered');state.streakDays=['2026-11-03','2026-11-04','2026-11-04'];assert.equal(senseState(state),'mastered');
  store.answer(w,s,false);assert.equal(senseState(state),'review');assert.equal(state.quizStreak,0);assert.deepEqual(state.streakDays,[]);
});
test('export/import round trip and ignoring deleted entries',()=>{
  const store=createProgressStore(words,()=>{},memory()),w=words[0],s=w.senses[0];store.seen(w,s);store.rate(w,s,'unsure');store.favorite(w);store.answer(w,s,false);const data=JSON.parse(store.export());assert.deepEqual(parseProgress(data,words).progress,store.value);
  data.words.deleted={};const parsed=parseProgress(data,words);assert.deepEqual(parsed.ignored,['deleted']);assert.ok(!parsed.progress.words.deleted);
  const invalid=structuredClone(data);invalid.words[w.id].senses[s.senseId].quizCorrect=-1;assert.throws(()=>parseProgress(invalid,words),/非负整数/);
});
test('merging newer wrong results revokes old streak instead of restoring mastery',()=>{
  const store=createProgressStore(words,()=>{},memory()),w=words[0],s=w.senses[0];for(let i=0;i<3;i++)store.answer(w,s,true);const old=structuredClone(store.value);const prior=old.words[w.id].senses[s.senseId];prior.lastStudiedAt=prior.lastQuizAt='2026-11-03T00:00:00Z';prior.streakDays=['2026-11-02','2026-11-03','2026-11-03'];
  store.answer(w,s,false);const merged=mergeProgress(old,store.value).words[w.id].senses[s.senseId];assert.equal(merged.quizStreak,0);assert.equal(senseState(merged),'review');assert.equal(merged.quizCorrect,3);
});
test('storage failures allow temporary learning and export; invalid import does not mutate',()=>{
  const warnings=[],store=createProgressStore(words,x=>warnings.push(x),{getItem:()=>null,setItem:()=>{throw new Error('quota');}});store.answer(words[0],words[0].senses[0],true);assert.equal(warnings.length,1);assert.ok(JSON.parse(store.export()).words[words[0].id]);const before=store.export();assert.throws(()=>store.import({schemaVersion:1},'replace'));assert.equal(store.export(),before);
});
test('date keys use Japan time across UTC midnight',()=>{assert.equal(dayKey(new Date('2026-11-03T16:00:00Z')),'2026-11-04');});
