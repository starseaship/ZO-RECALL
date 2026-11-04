import { loadData } from './data.js';
import { createProgressStore, wordState, dayKey } from './progress.js';
export const $ = selector => document.querySelector(selector);
export const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const labels = {new:'未开始',learning:'学习中',review:'待复习',mastered:'已掌握'};
export const ipaLabel = w => w.pronunciation?.ipa ? ' <span class="ipa-inline" lang="en-US">/' + html(w.pronunciation.ipa.split('/').join('')) + '/</span>' : '';
export const posLabels = {verb:'v.',adverb:'adv.',noun:'n.',adjective:'adj.',preposition:'prep.'};
export const query = new URLSearchParams(location.search);
export function link(path, params = {}) { const u = new URL(path,location.href); if (query.get('drafts') === '1') u.searchParams.set('drafts','1'); for (const [k,v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k,v); return `${u.pathname.split('/').pop()}${u.search}`; }
export function notice(message) { const el = $('#toast'); el.textContent = message; el.hidden = false; clearTimeout(notice.timer); notice.timer = setTimeout(() => { el.hidden = true; },7000); }
export function speak(word,accent='en-US') {
  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) { notice('当前浏览器不支持语音，请使用系统支持的浏览器。'); return; }
  try { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word); utterance.lang=accent; utterance.rate=.85; const voice=speechSynthesis.getVoices().find(v => v.lang === accent); if (voice) utterance.voice=voice; utterance.onerror = e => { if (!['canceled','interrupted'].includes(e.error)) notice('语音暂时不可用；你可以继续学习。'); }; speechSynthesis.speak(utterance); } catch { notice('语音暂时不可用；你可以继续学习。'); }
}
export const soundButton = w => `<button class="icon-button" data-speak="${html(w.id)}" aria-label="朗读 ${html(w.word)}" title="朗读"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg></button>`;
export function getBilingual() { try { return localStorage.getItem('evl_language') === 'bilingual'; } catch { return false; } }
export function setBilingual(value) { document.body.classList.toggle('bilingual',value); try { localStorage.setItem('evl_language',value?'bilingual':'english'); } catch { notice('语言设置仅在当前页面生效。'); } }
export function filterWords(ctx, {scope='all',category='',search='',pos='',level='',state=''} = {}) {
  return ctx.words.filter(w => {
    const status = wordState(w,ctx.store.value), wp=ctx.store.value.words[w.id];
    if (scope === 'unmastered' && status === 'mastered') return false;
    if (scope === 'favorites' && !wp?.favorite) return false;
    if (scope === 'wrong' && !w.senses.some(s => wp?.senses[s.senseId]?.lastQuizCorrect === false)) return false;
    if (scope === 'review' && status !== 'review' && !wp?.favorite) return false;
    if (category && !w.categories.includes(category)) return false;
    if (pos && w.partOfSpeech !== pos || level && w.level !== level || state && status !== state) return false;
    return !search || JSON.stringify([w.word,...w.senses.map(s => [s.meaningZh,s.definitionEn,s.collocations])]).toLowerCase().includes(search.toLowerCase());
  });
}
export function wordDetails(w, activeSense) {
  const senses = w.senses.map(s => {
    const terms = [w.word, ...(s.collocations ?? []).map(c => c.phrase)];
    const uses = (s.collocations ?? []).map(c =>
      '<section class="notebook-usage"><h3 class="english" lang="en">' + html(c.phrase) + '</h3><p class="notebook-phrase-meaning">' + html(c.meaningZh) + '</p>' +
      (c.exampleEn ? '<figure><blockquote class="english" lang="en">' + highlight(c.exampleEn, terms) + '</blockquote>' + (c.exampleZh ? '<figcaption>' + html(c.exampleZh) + '</figcaption>' : '') + '</figure>' : '') + '</section>'
    ).join('');
    return '<article class="notebook-sense" id="' + html(s.senseId) + '"><header class="notebook-sense-header">' +
      (w.senses.length > 1 ? '<p class="notebook-sense-hint english">' + html(s.senseHintEn) + '</p>' : '') +
      '<p class="notebook-word-meaning">' + html(s.meaningZh) + '</p></header><div class="notebook-paper">' +
      '<section class="notebook-definition" aria-label="英文释义与翻译"><p class="english" lang="en">' + html(s.definitionEn) + '</p><p class="notebook-translation">' + html(s.definitionZh ?? s.meaningZh) + '</p></section>' +
      (s.nuanceZh ? '<p class="notebook-nuance">' + html(s.nuanceZh) + '</p>' : '') +
      uses +
      s.examples.map(e => '<figure class="notebook-example"><blockquote class="english" lang="en">' + highlight(e.en,terms) + '</blockquote><figcaption>' + html(e.zh) + '</figcaption></figure>').join('') +
      ((s.contexts ?? []).length ? '<div class="notebook-context">' + s.contexts.map(c => '<div><span>' + html(c.title) + '</span><p>' + html(c.noteZh) + '</p></div>').join('') + '</div>' : '') +
      (s.confusables?.length ? '<section class="notebook-contrast" aria-label="易混辨析">' + s.confusables.map(c => '<div><h3 class="english"><span lang="en">' + html(w.word) + '</span><span class="notebook-versus">vs.</span><span lang="en">' + html(c.word) + '</span></h3><p>' + html(c.noteZh) + '</p></div>').join('') + '</section>' : '') +
      '</div></article>';
  }).join('');
  const extras = (w.wordFormation?.length || w.memoryHintZh) ? '<div class="notebook-extras">' +
    (w.wordFormation?.length ? '<section><h3>词根词缀</h3>' + w.wordFormation.map(f => '<div class="notebook-formation"><strong class="english" lang="en">' + html(f.part) + '</strong><p>' + html(f.explanationZh) + '</p></div>').join('') + '</section>' : '') +
    (w.memoryHintZh ? '<section><h3>记忆提示</h3><p>' + html(w.memoryHintZh) + '</p></section>' : '') + '</div>' : '';
  return '<div class="word-notebook">' + senses + extras + '<p class="sr-only">' + html(w.sourceNote) + '</p></div>';
}
function highlight(text, terms) {
  const phrases = [...new Set((Array.isArray(terms) ? terms : [terms]).filter(Boolean))].sort((a,b) => b.length-a.length);
  if (!phrases.length) return html(text);
  const pattern = new RegExp('\\b(?:' + phrases.map(t => t.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'gi');
  let result = '', offset = 0;
  for (const match of text.matchAll(pattern)) {
    result += html(text.slice(offset, match.index)) + '<mark>' + html(match[0]) + '</mark>';
    offset = match.index + match[0].length;
  }
  return result + html(text.slice(offset));
}
export function wordRow(w,ctx,actions='') {
  const wp=ctx.store.value.words[w.id],status=wordState(w,ctx.store.value);
  return `<article class="word-row"><a class="word-main" href="${link('library.html',{word:w.id})}"><strong class="english">${html(w.word)}</strong><span class="pos">${html(posLabels[w.partOfSpeech]??w.partOfSpeech)}${ipaLabel(w)}</span><p>${html(w.senses[0].definitionEn)}</p><p class="zh muted">${html(w.senses[0].definitionZh ?? w.senses[0].meaningZh)}</p></a><div class="row-actions"><span class="status ${status}">${labels[status]}</span><button class="star ${wp?.favorite?'selected':''}" data-favorite="${html(w.id)}" aria-pressed="${!!wp?.favorite}" aria-label="${wp?.favorite?'取消收藏':'收藏'} ${html(w.word)}">${wp?.favorite?'★':'☆'}</button>${actions}</div></article>`;
}
export function empty(message='当前范围没有词条。',ctx) { return `<div class="empty"><span class="empty-symbol">↗</span><h2>暂无词条</h2><p>${html(message)}</p>${ctx?.pending&&!ctx.drafts?`<a class="button primary" href="${link('index.html',{drafts:1})}">体验 ${ctx.pending} 词测试版 →</a>`:`<a class="button" href="${link('library.html')}">浏览词库</a>`}</div>`; }
export async function boot(page) {
  $('#app').innerHTML='<div class="empty"><p>正在整理你的词库…</p></div>';
  $('#site-header').innerHTML=`<a class="brand" href="${link('index.html')}" aria-label="ZO-RECALL 首页"><span class="brand-mark">zo<span>·</span></span><span>ZO-RECALL</span></a><label class="language-toggle"><input type="checkbox" id="language"> EN / 中文辅助</label>`;
  const nav=[['index','总览'],['study','背单词'],['quiz','四选一'],['review','复习'],['library','词库']];
  $('#site-nav').innerHTML=nav.map(([key,label])=>`<a href="${link(`${key}.html`)}" ${page===key?'aria-current="page"':''}>${label}</a>`).join('');
  $('#language').checked=getBilingual(); setBilingual($('#language').checked); $('#language').onchange=e=>setBilingual(e.target.checked);
  try {
    const data=await loadData();
    const ctx={...data,store:createProgressStore(data.allWords,notice)};
    $('#mode-banner').hidden=!data.drafts;
    if (data.drafts) $('#mode-banner').innerHTML=`测试词库 · ${data.pending} 个词条待人工核查 <a href="${location.pathname.split('/').pop() || 'index.html'}">退出测试</a>`;
    if (data.warnings.length) notice(`${data.warnings.length} 项词库加载提示：${data.warnings.slice(0,2).join('；')}`);
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-speak]'); if (button) { const w=data.words.find(w=>w.id===button.dataset.speak); if(w) speak(w.word,w.pronunciation?.accent); }
      const star=event.target.closest('[data-favorite]'); if(star) { const w=data.words.find(w=>w.id===star.dataset.favorite); if(w) { const f=ctx.store.favorite(w); star.textContent=f?'★':'☆'; star.classList.toggle('selected',f); star.setAttribute('aria-pressed',String(f)); star.setAttribute('aria-label',`${f?'取消收藏':'收藏'} ${w.word}`); document.dispatchEvent(new Event('progresschange')); } }
    });
    $('#site-footer').innerHTML=`<span>ZO-RECALL</span><span>数据 ${html(data.manifest.dataVersion)} · 统计日期按日本时间</span>`;
    return ctx;
  } catch(e) { $('#app').innerHTML=`<div class="empty"><h1>词库暂时没有加载成功</h1><p>${html(e.message)}</p><p>本地预览请在项目目录运行 python3 -m http.server 8000。</p><button class="button" onclick="location.reload()">重新加载</button></div>`; return null; }
}
export function stats(ctx) {
  const values=ctx.words.flatMap(w=>Object.values(ctx.store.value.words[w.id]?.senses??{}));
  const correct=values.reduce((n,s)=>n+s.quizCorrect,0),wrong=values.reduce((n,s)=>n+s.quizWrong,0);
  return {today:ctx.words.filter(w=>{const wp=ctx.store.value.words[w.id];return w.senses.some(s=>{const time=wp?.senses[s.senseId]?.lastStudiedAt;return time&&dayKey(new Date(time))===dayKey();});}).length, mastered:ctx.words.filter(w=>wordState(w,ctx.store.value)==='mastered').length,review:ctx.words.filter(w=>wordState(w,ctx.store.value)==='review').length,accuracy:correct+wrong?`${Math.round(100*correct/(correct+wrong))}%`:'—',answers:correct+wrong};
}
export function scopeOptions(selected='all') { return [['all','全词库'],['unmastered','未掌握'],['favorites','收藏'],['wrong','错题'],['review','待复习与收藏']].map(([k,v])=>`<option value="${k}" ${k===selected?'selected':''}>${v}</option>`).join(''); }
export const categoryOptions = ctx => `<option value="">所有分类</option>${ctx.manifest.categories.map(c=>`<option>${html(c)}</option>`).join('')}`;
