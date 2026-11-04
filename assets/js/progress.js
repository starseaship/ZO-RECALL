export const PROGRESS_KEY = 'evl_progress_v2';
export const emptyProgress = () => ({schemaVersion:2, words:{}});
export const dayKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tokyo', year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const timestamp = x => x === null || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(x) && Number.isFinite(Date.parse(x)));
const count = x => Number.isSafeInteger(x) && x >= 0;
const freshSense = () => ({seenCount:0, studyRatings:{unknown:0,unsure:0,known:0}, quizCorrect:0,quizWrong:0,quizStreak:0,streakDays:[],dueAt:null,lastStudiedAt:null,lastRating:null,lastRatingAt:null,lastQuizCorrect:null,lastQuizAt:null});
const freshWord = () => ({favorite:false,lastStudiedAt:null,senses:{}});
export function senseState(s) {
  if (!s) return 'new';
  if (s.quizStreak >= 3 && new Set(s.streakDays.slice(-3)).size >= 2) return 'mastered';
  if (s.lastQuizCorrect === false || ['unknown','unsure'].includes(s.lastRating)) return 'review';
  return s.seenCount || s.quizCorrect || s.quizWrong ? 'learning' : 'new';
}
export function wordState(w, progress) {
  const states = w.senses.map(s => senseState(progress.words[w.id]?.senses[s.senseId]));
  if (states.every(s => s === 'mastered')) return 'mastered';
  if (states.includes('review')) return 'review';
  return states.every(s => s === 'new') ? 'new' : 'learning';
}
export function parseProgress(input, words) {
  if (!record(input) || input.schemaVersion !== 2 || !record(input.words)) throw new Error('备份格式无效：需要 schemaVersion 2 和 words 对象。');
  const clean = emptyProgress(), ignored = [];
  const index = new Map(words.map(w => [w.id,w]));
  for (const [id,w] of Object.entries(input.words)) {
    const entry = index.get(id); if (!entry) { ignored.push(id); continue; }
    if (!record(w) || typeof w.favorite !== 'boolean' || !timestamp(w.lastStudiedAt) || !record(w.senses)) throw new Error(`${id} 的进度格式无效。`);
    const next = freshWord(); next.favorite = w.favorite; next.lastStudiedAt = w.lastStudiedAt;
    const senseIds = new Set(entry.senses.map(s => s.senseId));
    for (const [sid,s] of Object.entries(w.senses)) {
      if (!senseIds.has(sid)) { ignored.push(sid); continue; }
      if (!record(s)) throw new Error(`${sid} 的义项记录无效。`);
      for (const k of ['seenCount','quizCorrect','quizWrong','quizStreak']) if (!count(s[k])) throw new Error(`${sid}.${k} 需为非负整数。`);
      if (s.quizStreak > s.quizCorrect) throw new Error(`${sid} 连对次数超出正确次数。`);
      if (!record(s.studyRatings) || !['unknown','unsure','known'].every(k => count(s.studyRatings[k]))) throw new Error(`${sid} 自评次数无效。`);
      if (!Array.isArray(s.streakDays) || !s.streakDays.every(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0,10) === d)) throw new Error(`${sid} 连对日期无效。`);
      const n = freshSense();
      for (const k of ['lastStudiedAt','lastRatingAt','lastQuizAt','dueAt']) if (s[k] !== undefined && !timestamp(s[k])) throw new Error(`${sid}.${k} 日期无效。`);
      if (s.lastRating != null && !['unknown','unsure','known'].includes(s.lastRating)) throw new Error(`${sid} 自评无效。`);
      if (s.lastQuizCorrect != null && typeof s.lastQuizCorrect !== 'boolean') throw new Error(`${sid} 答题状态无效。`);
      for (const k of Object.keys(n)) if (s[k] !== undefined) n[k] = structuredClone(s[k]);
      n.streakDays = n.streakDays.slice(-3);
      // Older PRD-shaped backups lack last-result metadata; never infer mastery from incomplete evidence.
      n.streakDays = n.quizStreak ? n.streakDays.slice(-Math.min(n.quizStreak,3)) : [];
      if (n.lastQuizCorrect === false) { n.quizStreak = 0; n.streakDays = []; }
      next.senses[sid] = n;
    }
    clean.words[id] = next;
  }
  return {progress:clean,ignored};
}
const activity = s => Math.max(...['lastStudiedAt','lastRatingAt','lastQuizAt'].map(k => Date.parse(s?.[k] ?? '') || 0));
export function mergeProgress(a,b) {
  const result = structuredClone(a);
  for (const [id,incoming] of Object.entries(b.words)) {
    const existing = result.words[id]; if (!existing) { result.words[id] = structuredClone(incoming); continue; }
    const newer = (Date.parse(incoming.lastStudiedAt) || 0) >= (Date.parse(existing.lastStudiedAt) || 0);
    const combined = {...(newer ? incoming : existing),senses:{...existing.senses}};
    for (const [sid,s] of Object.entries(incoming.senses)) {
      const old = existing.senses[sid]; if (!old) { combined.senses[sid] = structuredClone(s); continue; }
      const n = structuredClone(activity(s) >= activity(old) ? s : old);
      for (const k of ['seenCount','quizCorrect','quizWrong']) n[k] = Math.max(old[k],s[k]);
      for (const k of ['unknown','unsure','known']) n.studyRatings[k] = Math.max(old.studyRatings[k],s.studyRatings[k]);
      // Streak is an ordered event state, not a cumulative counter: keep the newer result.
      combined.senses[sid] = n;
    }
    result.words[id] = combined;
  }
  return result;
}
export function createProgressStore(words, onWarning = () => {}, storage) {
  let progress = emptyProgress(), writable = true;
  try { storage ??= globalThis.localStorage; const raw = storage.getItem(PROGRESS_KEY); if (raw) progress = parseProgress(JSON.parse(raw),words).progress; }
  catch { writable = false; onWarning('已有进度无法读取。本次使用临时记录；请先导出备份，再检查浏览器存储。'); }
  const commit = () => { if (!writable) return; try { storage.setItem(PROGRESS_KEY,JSON.stringify(progress)); } catch { writable = false; onWarning('浏览器无法保存进度，本次记录仅在当前页面有效。请导出备份。'); } };
  const ensure = (w,s) => { const wp = progress.words[w.id] ??= freshWord(); const sp = wp.senses[s.senseId] ??= freshSense(); return [wp,sp]; };
  const now = () => new Date().toISOString();
  return {
    get value() { return progress; },
    seen(w,s) { const [wp,sp] = ensure(w,s); sp.seenCount++; wp.lastStudiedAt = sp.lastStudiedAt = now(); commit(); },
    rate(w,s,rating) { if (!['unknown','unsure','known'].includes(rating)) return; const [wp,sp] = ensure(w,s); sp.studyRatings[rating]++; sp.lastRating = rating; wp.lastStudiedAt = sp.lastStudiedAt = sp.lastRatingAt = now(); commit(); },
    answer(w,s,correct) { const [wp,sp] = ensure(w,s); const time = now(); sp[correct ? 'quizCorrect' : 'quizWrong']++; sp.quizStreak = correct ? sp.quizStreak+1 : 0; sp.streakDays = correct ? [...sp.streakDays,dayKey(new Date(time))].slice(-3) : []; sp.lastQuizCorrect = correct; wp.lastStudiedAt = sp.lastStudiedAt = sp.lastQuizAt = time; commit(); },
    favorite(w) { const wp = progress.words[w.id] ??= freshWord(); wp.favorite = !wp.favorite; wp.lastStudiedAt = now(); commit(); return wp.favorite; },
    relearn(w) { const wp = progress.words[w.id] ??= freshWord(); for (const s of w.senses) { const [,sp] = ensure(w,s); sp.quizStreak = 0; sp.streakDays = []; sp.lastRating = 'unknown'; sp.lastRatingAt = sp.lastStudiedAt = now(); } wp.lastStudiedAt = now(); commit(); },
    import(input,mode) { if (!['merge','replace'].includes(mode)) throw new Error('请选择合并或覆盖。'); const parsed = parseProgress(input,words); progress = mode === 'replace' ? parsed.progress : mergeProgress(progress,parsed.progress); writable = true; commit(); return parsed.ignored; },
    export() { return JSON.stringify(progress,null,2); }
  };
}
