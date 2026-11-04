import { normalize, LEVELS } from './schema.js';
export function shuffle(items, random = Math.random) { const a = [...items]; for (let i=a.length-1;i>0;i--) { const j = Math.floor(random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
const stop = new Set(['a','an','the','to','of','or','and','in','on','for','with','that','is','be','it','by','as','something','someone']);
const tokens = text => new Set(normalize(text).split(' ').filter(t => !stop.has(t) && t.length > 2));
export function similarDefinitions(a,b) {
  if (normalize(a) === normalize(b)) return true;
  const x = tokens(a), y = tokens(b), common = [...x].filter(t => y.has(t)).length;
  return common > 0 && common/Math.min(x.size || 1,y.size || 1) >= .7;
}
export const flatten = words => words.flatMap(word => word.senses.map(sense => ({word,sense})));
function conflicts(a,b) {
  if (a.word.id === b.word.id) return true;
  const names = x => new Set(x.word.senses.flatMap(s => s.confusables ?? []).map(c => normalize(c.word)));
  if (names(a).has(normalize(b.word.word)) || names(b).has(normalize(a.word.word))) return true;
  if (a.sense.equivalenceGroup && a.sense.equivalenceGroup === b.sense.equivalenceGroup) return true;
  return similarDefinitions(a.sense.definitionEn,b.sense.definitionEn);
}
function eligible(a,b,difficulty) {
  if (conflicts(a,b)) return false;
  if (difficulty === 'easy') return a.word.partOfSpeech !== b.word.partOfSpeech || Math.abs(LEVELS.indexOf(a.word.level)-LEVELS.indexOf(b.word.level)) >= 2;
  if (a.word.partOfSpeech !== b.word.partOfSpeech) return false;
  if (difficulty === 'hard') return a.word.level && b.word.level && Math.abs(LEVELS.indexOf(a.word.level)-LEVELS.indexOf(b.word.level)) <= 1;
  return true;
}
export function buildQuestion(target,pool,difficulty='easy',random=Math.random) {
  const curated = new Set(target.sense.distractorSenseIds ?? []);
  const candidates = shuffle(pool.filter(c => eligible(target,c,difficulty)),random).sort((a,b) => Number(curated.has(b.sense.senseId))-Number(curated.has(a.sense.senseId)));
  // Find a mutually compatible triple; a greedy pick can miss an existing valid combination.
  for (let i=0;i<candidates.length;i++) for (let j=i+1;j<candidates.length;j++) {
    if (conflicts(candidates[i],candidates[j])) continue;
    for (let k=j+1;k<candidates.length;k++) if (!conflicts(candidates[i],candidates[k]) && !conflicts(candidates[j],candidates[k])) return {target,options:shuffle([target,candidates[i],candidates[j],candidates[k]],random)};
  }
  return null;
}
export function createQuiz(targets,pool,difficulty,limit=10,random=Math.random,preserveOrder=false) {
  const skipped = [], questions = [];
  for (const target of (preserveOrder?targets:shuffle(targets,random))) { const q = buildQuestion(target,pool,difficulty,random); if (q) questions.push(q); else skipped.push(target.word.word); }
  return {questions:questions.slice(0,limit),skipped:[...new Set(skipped)]};
}
export function weightedOrder(items,progress,random=Math.random) {
  const weight = x => { const s=progress.words[x.word.id]?.senses[x.sense.senseId]; return 1 + (s?.lastQuizCorrect === false ? 3:0) + (s?.lastRating === 'unknown' ? 3:s?.lastRating === 'unsure' ? 1:0); };
  // Weighted sampling without replacement puts unfamiliar senses earlier without repeating a session score.
  return items.map(item => ({item,rank:-Math.log(Math.max(random(),Number.EPSILON))/weight(item)})).sort((a,b) => a.rank-b.rank).map(x => x.item);
}
