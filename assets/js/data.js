import { validateManifest, validateWord } from './schema.js';
export async function loadData() {
  const warnings = [];
  const response = await fetch('data/manifest.json', {cache:'no-store'});
  if (!response.ok) throw new Error(`词库目录读取失败（${response.status}）。请通过 HTTP 服务打开网站。`);
  const manifest = await response.json(), errors = validateManifest(manifest);
  if (errors.length) throw new Error(errors.join('；'));
  const batches = await Promise.allSettled(manifest.files.map(async path => {
    const r = await fetch(`${path}?v=${encodeURIComponent(manifest.dataVersion)}`);
    if (!r.ok) throw new Error(`${path} 读取失败（${r.status}）`);
    const words = await r.json(); if (!Array.isArray(words)) throw new Error(`${path} 不是词条数组`); return words;
  }));
  if (batches.every(b => b.status === 'rejected')) throw new Error(batches.map(b => b.reason.message).join('；'));
  const all = [];
  for (const batch of batches) { if (batch.status === 'fulfilled') all.push(...batch.value); else warnings.push(batch.reason.message); }
  const valid = all.filter(w => { const e = validateWord(w, manifest.categories); if (e.length) { console.warn('跳过词条', w?.id, e); warnings.push(`跳过无效词条 ${w?.id ?? '?'}`); } return !e.length; });
  const ids = new Map(), senses = new Map();
  for (const w of valid) { ids.set(w.id, (ids.get(w.id) ?? 0) + 1); for (const s of w.senses) senses.set(s.senseId, (senses.get(s.senseId) ?? 0) + 1); }
  const unique = valid.filter(w => { const ok = ids.get(w.id) === 1 && w.senses.every(s => senses.get(s.senseId) === 1); if (!ok) warnings.push(`跳过重复标识的词条 ${w.id}`); return ok; });
  const availableIds = new Set(unique.flatMap(w => w.senses.map(s => s.senseId)));
  for (const w of unique) for (const s of w.senses) s.distractorSenseIds = (s.distractorSenseIds ?? []).filter(id => {
    const ok = availableIds.has(id) && !w.senses.some(own => own.senseId === id); if (!ok) warnings.push(`忽略无效干扰项 ${id}`); return ok;
  });
  const drafts = new URLSearchParams(location.search).get('drafts') === '1';
  const words = unique.filter(w => drafts || w.reviewStatus === 'reviewed');
  return {manifest, words, allWords:unique, drafts, warnings, pending:unique.filter(w => w.reviewStatus !== 'reviewed').length};
}
