export const REVIEW_STATES = ['draft', 'needs-check', 'reviewed'];
export const POS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'determiner', 'interjection'];
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export const normalize = value => String(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function validateManifest(m) {
  const errors = [];
  if (m?.schemaVersion !== 2) errors.push('manifest.schemaVersion 必须为 2');
  if (!nonempty(m?.dataVersion)) errors.push('manifest.dataVersion 不能为空');
  if (!Array.isArray(m?.categories) || !m.categories.every(nonempty) || new Set(m.categories).size !== m.categories.length) errors.push('manifest.categories 必须为不重复的字符串数组');
  if (!Array.isArray(m?.files) || !m.files.length || !m.files.every(f => /^data\/[a-zA-Z0-9_/-]+\.json$/.test(f) && !f.includes('..')) || new Set(m.files).size !== m.files.length) errors.push('manifest.files 路径无效或重复');
  return errors;
}
export function validateWord(w, categories) {
  const errors = [];
  if (!w || typeof w !== 'object') return ['词条必须为对象'];
  for (const key of ['id', 'word', 'partOfSpeech']) if (!nonempty(w[key])) errors.push(`${key} 不能为空`);
  if (!POS.includes(w.partOfSpeech)) errors.push('partOfSpeech 不合法');
  if (w.level && !LEVELS.includes(w.level)) errors.push('level 不合法');
  if (!REVIEW_STATES.includes(w.reviewStatus)) errors.push('reviewStatus 不合法');
  if (!Array.isArray(w.categories) || !w.categories.length || !w.categories.every(c => nonempty(c) && (!categories || categories.includes(c)))) errors.push('categories 不合法');
  if (w.pronunciation && (typeof w.pronunciation !== 'object' || (w.pronunciation.ipa != null && typeof w.pronunciation.ipa !== 'string'))) errors.push('pronunciation 不合法');
  if (w.wordFormation && (!Array.isArray(w.wordFormation) || !w.wordFormation.every(x => nonempty(x?.part) && nonempty(x?.explanationZh)))) errors.push('wordFormation 不合法');
  if (!Array.isArray(w.senses) || !w.senses.length) return [...errors, 'senses 不能为空'];
  const forbidden = [w.word, ...(Array.isArray(w.definitionForbidden) ? w.definitionForbidden : [])].filter(nonempty);
  for (const s of w.senses) {
    if (!s || typeof s !== 'object') { errors.push('义项必须为对象'); continue; }
    for (const key of ['senseId', 'definitionEn', 'meaningZh']) if (!nonempty(s[key])) errors.push(`${key} 不能为空`);
    if (w.senses.length > 1 && !nonempty(s.senseHintEn)) errors.push(`${s.senseId}: 多义词需 senseHintEn`);
    if (nonempty(s.definitionEn) && forbidden.some(f => new RegExp(`\\b${escapeRegExp(f)}\\b`, 'i').test(s.definitionEn))) errors.push(`${s.senseId}: 释义包含词头或已登记同源词`);
    if (!Array.isArray(s.examples) || !s.examples.length || !s.examples.every(e => nonempty(e?.en) && nonempty(e?.zh) && nonempty(w.word) && new RegExp(`\\b${escapeRegExp(w.word)}\\b`, 'i').test(e.en))) errors.push(`${s.senseId}: 例句需双语且包含目标词原形`);
    for (const [key, fields] of Object.entries({collocations:['phrase','meaningZh'],contexts:['title','noteZh'],confusables:['word','noteZh']})) {
      if (s[key] && (!Array.isArray(s[key]) || !s[key].every(x => fields.every(f => nonempty(x?.[f]))))) errors.push(`${s.senseId}: ${key} 不合法`);
    }
    if (s.distractorSenseIds && (!Array.isArray(s.distractorSenseIds) || !s.distractorSenseIds.every(nonempty))) errors.push(`${s.senseId}: 干扰项引用不合法`);
  }
  return errors;
}
export function validateCorpus(words, categories) {
  const errors = [], ids = new Set(), senseIds = new Set();
  for (const w of words) {
    errors.push(...validateWord(w, categories).map(e => `${w?.id ?? '?'}: ${e}`));
    if (ids.has(w?.id)) errors.push(`重复 id: ${w.id}`); ids.add(w?.id);
    for (const s of w?.senses ?? []) { if (senseIds.has(s.senseId)) errors.push(`重复 senseId: ${s.senseId}`); senseIds.add(s.senseId); }
  }
  for (const w of words) for (const s of w.senses ?? []) for (const id of s.distractorSenseIds ?? []) {
    if (!senseIds.has(id)) errors.push(`${s.senseId}: 干扰项不存在 ${id}`);
    if (w.senses.some(own => own.senseId === id)) errors.push(`${s.senseId}: 干扰项不能引用本词`);
  }
  return errors;
}
