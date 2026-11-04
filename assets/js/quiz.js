import { boot, $, html, link, empty, soundButton, wordDetails, filterWords, scopeOptions, categoryOptions, query, ipaLabel } from './shared.js?v=20261104.3';
import { flatten, createQuiz, weightedOrder } from './quiz-engine.js';
const ctx=await boot('quiz');
if(ctx) {
  $('#app').innerHTML=`<section class="page-heading"><h1>英文释义四选一</h1></section><form id="quiz-settings" class="setup-panel"><div class="filter-grid"><label class="field">范围<select name="scope">${scopeOptions(query.get('scope')??'all')}</select></label><label class="field">分类<select name="category">${categoryOptions(ctx)}</select></label><label class="field">难度<select name="difficulty" aria-label="难度"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><label class="field">题量<select name="count"><option value="10">10 题</option><option value="5">5 题</option><option value="20">20 题</option></select></label></div><div class="button-row"><label class="check-label"><input name="sound" type="checkbox" checked> 发音按钮</label><button class="button primary" type="submit">开始测验 →</button></div>${query.has('word')?'<p class="tiny">仅测验所选词条 <button type="button" id="quiz-all" class="text-button">取消限定</button></p>':''}</form><div id="quiz-content" aria-live="polite"></div>`;
  if(query.get('category')) $('#quiz-settings [name="category"]').value=query.get('category');
  let questions=[],index=0,results=[],locked=false,selectedWord=query.get('word'),sound=true,shortage='';
  if($('#quiz-all'))$('#quiz-all').onclick=()=>{selectedWord=null;$('#quiz-all').parentElement.remove();};
  const render=()=>{
    locked=false;const q=questions[index],w=q.target.word,s=q.target.sense;
    $('#quiz-content').innerHTML=`${shortage?`<p class="shortage" role="status">${html(shortage)}</p>`:''}<div class="study-progress"><span>${index+1} / ${questions.length}</span><progress value="${index+1}" max="${questions.length}" aria-label="测验进度"></progress></div><section class="quiz-question"><div class="word-title"><h2 class="english">${html(w.word)}</h2>${sound?soundButton(w):''}</div><span class="pos">${html(w.partOfSpeech)}${ipaLabel(w)}</span>${s.senseHintEn?`<p class="sense-hint">${html(s.senseHintEn)}</p>`:''}</section><div class="answer-options">${q.options.map((option,i)=>`<button class="answer-option" data-option="${i}"><span class="option-letter">${'ABCD'[i]}</span><span class="english">${html(option.sense.definitionEn)}</span><span class="option-status" aria-hidden="true"></span></button>`).join('')}</div><div id="feedback"></div><div class="button-row quiz-bottom"><button class="text-button" id="quit">结束本轮</button><button class="button primary" id="next-question" hidden>${index===questions.length-1?'查看结果':'下一题 →'}</button></div>`;
    document.querySelectorAll('[data-option]').forEach(button=>button.onclick=()=>{
      if(locked)return;locked=true;const chosen=q.options[Number(button.dataset.option)],correct=chosen.sense.senseId===s.senseId;
      ctx.store.answer(w,s,correct);results.push({word:w,sense:s,correct});
      document.querySelectorAll('[data-option]').forEach((b,i)=>{b.disabled=true;const isAnswer=q.options[i].sense.senseId===s.senseId;if(isAnswer){b.classList.add('correct');b.querySelector('.option-status').textContent='✓';}else if(b===button){b.classList.add('incorrect');b.querySelector('.option-status').textContent='✕';}});
      $('#feedback').innerHTML=`<section class="feedback ${correct?'correct':'incorrect'}"><h3>${correct?'✓ 回答正确':'✕ 回答错误'}</h3><p class="english">${html(s.definitionEn)}</p><p>${html(s.meaningZh)}</p>${s.nuanceZh?`<p class="nuance">${html(s.nuanceZh)}</p>`:''}<blockquote><p class="english">${html(s.examples[0].en)}</p><p class="muted">${html(s.examples[0].zh)}</p></blockquote><details><summary>完整词条</summary>${wordDetails(w,s)}</details></section>`;
      $('#next-question').hidden=false;$('#feedback').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
    });
    $('#next-question').onclick=()=>{if(index<questions.length-1){index++;render();$('#quiz-content').scrollIntoView({block:'start'});}else finish();};$('#quit').onclick=finish;
  };
  function finish(){const correct=results.filter(r=>r.correct).length,wrong=results.filter(r=>!r.correct);$('#quiz-settings').hidden=false;$('#quiz-content').innerHTML=`<section class="session-result"><span class="score">${results.length?Math.round(100*correct/results.length):0}<small>%</small></span><h2>${correct} / ${results.length} 答对</h2>${results.length<questions.length?`<p class="muted">已结束 · 还有 ${questions.length-results.length} 题未答</p>`:''}${wrong.length?`<div class="result-wrong">${wrong.map(r=>`<a href="${link('library.html',{word:r.word.id})}"><strong>${html(r.word.word)}</strong><span>${html(r.sense.meaningZh)}</span></a>`).join('')}</div><a class="button primary" href="${link('study.html',{scope:'wrong'})}">复习错题 →</a>`:'<a class="button" href="'+link('review.html')+'">查看复习</a>'}</section>`;}
  $('#quiz-settings').onsubmit=e=>{
    e.preventDefault();const values=Object.fromEntries(new FormData($('#quiz-settings')));sound=values.sound==='on';let words=filterWords(ctx,values);if(selectedWord)words=words.filter(w=>w.id===selectedWord);
    let targets=flatten(words);if(values.scope==='wrong')targets=targets.filter(x=>ctx.store.value.words[x.word.id]?.senses[x.sense.senseId]?.lastQuizCorrect===false);
    const isReview=['review','wrong'].includes(values.scope),ordered=isReview?weightedOrder(targets,ctx.store.value):targets;
    const built=createQuiz(ordered,flatten(ctx.words),values.difficulty,Number(values.count),Math.random,isReview);questions=built.questions;index=0;results=[];
    if(!questions.length){$('#quiz-content').innerHTML=empty(words.length?'此范围没有符合难度规则的题：无法找到三个互不冲突的干扰项。请改用 Easy 或扩大词库。':'当前范围没有可测验词条。',ctx);return;}
    shortage=questions.length<Number(values.count)?`本轮 ${questions.length} 题。${built.skipped.length?`${built.skipped.join('、')} 缺少合格干扰项。`:'所选范围可用义项不足。'}`:built.skipped.length?`跳过 ${built.skipped.join('、')}：缺少合格干扰项。`:'';
    $('#quiz-settings').hidden=true;render();
  };
}
