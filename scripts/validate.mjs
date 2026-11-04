import { readFile } from 'node:fs/promises';
import { validateManifest, validateCorpus, validateCollectionLinks } from '../assets/js/schema.js';
const root = new URL('../', import.meta.url);
try {
  const manifest = JSON.parse(await readFile(new URL('data/manifest.json', root), 'utf8'));
  const manifestErrors = validateManifest(manifest);
  if (manifestErrors.length) throw new Error(manifestErrors.join('\n'));
  const words = [];
  for (const file of manifest.files) { const batch = JSON.parse(await readFile(new URL(file, root), 'utf8')); if (!Array.isArray(batch)) throw new Error(`${file}: 必须为数组`); words.push(...batch); }
  const errors = [...validateCorpus(words, manifest.categories), ...validateCollectionLinks(words,manifest)];
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`✓ ${words.length} 个词条 / ${words.reduce((n,w) => n+w.senses.length,0)} 个义项，校验通过。`);
  const pending = words.filter(w => w.reviewStatus !== 'reviewed').length;
  if (pending) console.log(`提示：${pending} 个词条待人工核查，仅在 ?drafts=1 待核查内容模式加载。`);
} catch (e) { console.error(e.message); process.exitCode = 1; }
