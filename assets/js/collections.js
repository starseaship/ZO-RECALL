const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unique = values => [...new Set(values)];
export function selectedCollections(manifest,{collection='',exam='',source='',batch=''}={}) {
  return (manifest.collections ?? []).filter(c => (!collection || c.id===collection) && (!exam || c.exam===exam) && (!source || c.source===source) && (!batch || c.batch===batch));
}
export function matchesCollection(word,manifest,criteria={}) {
  if (!['collection','exam','source','batch'].some(k=>criteria[k])) return true;
  const ids = new Set(selectedCollections(manifest,criteria).map(c=>c.id));
  return (word.collectionIds ?? []).some(id=>ids.has(id));
}
export function collectionLabel(collection) { return [collection.exam,collection.source,collection.batch].join(' / '); }
export function countHeadwords(words) { return new Set(words.map(w=>w.word.toLowerCase())).size; }
export function collectionFields(manifest,criteria={}) {
  const collections=manifest.collections ?? [];
  if (!collections.length) return '';
  const named=collections.find(c=>c.id===criteria.collection);
  const initial=named ?? (collections.length===1 && !['exam','source','batch'].some(k=>criteria[k]) ? collections[0] : criteria);
  const option=(value,current)=>`<option value="${escape(value)}" ${value===current?'selected':''}>${escape(value)}</option>`;
  const exam=initial.exam??'',source=initial.source??'',batch=initial.batch??'';
  const sources=collections.filter(c=>!exam||c.exam===exam),batches=sources.filter(c=>!source||c.source===source);
  return `<div class="collection-fields" data-collection-fields><label class="field">词库<select name="exam"><option value="">全部词库</option>${unique(collections.map(c=>c.exam)).map(x=>option(x,exam)).join('')}</select></label><label class="field">来源<select name="source" ${exam?'':'disabled'}><option value="">全部来源</option>${unique(sources.map(c=>c.source)).map(x=>option(x,source)).join('')}</select></label><label class="field">分组<select name="batch" ${exam&&source?'':'disabled'}><option value="">全部分组</option>${unique(batches.map(c=>c.batch)).map(x=>option(x,batch)).join('')}</select></label></div>`;
}
export function bindCollectionFields(form,manifest,onSelection=()=>{}) {
  const root=form.querySelector('[data-collection-fields]'); if (!root) return;
  const exam=root.querySelector('[name="exam"]'),source=root.querySelector('[name="source"]'),batch=root.querySelector('[name="batch"]');
  const all=manifest.collections??[];
  function populate(select,values,placeholder,current,auto) {
    select.replaceChildren();
    select.add(new Option(placeholder,'')); for (const value of unique(values)) select.add(new Option(value,value));
    if (values.includes(current)) select.value=current;
    else select.value=auto&&unique(values).length===1?values[0]:'';
  }
  function update(changed='') {
    const sources=all.filter(c=>!exam.value||c.exam===exam.value);
    populate(source,sources.map(c=>c.source),'全部来源',changed==='exam'?'':source.value,!!exam.value);
    source.disabled=!exam.value;
    if(source.disabled)source.value='';
    const batches=sources.filter(c=>!source.value||c.source===source.value);
    populate(batch,batches.map(c=>c.batch),'全部分组',changed==='exam'||changed==='source'?'':batch.value,!!exam.value&&!!source.value);
    batch.disabled=!exam.value||!source.value;
    if(batch.disabled)batch.value='';
    const fields={exam:exam.value,source:source.value,batch:batch.value};
    const exact=all.find(c=>c.exam===fields.exam&&c.source===fields.source&&c.batch===fields.batch);
    onSelection({...fields,collection:exact?.id??''});
  }
  for(const field of [exam,source,batch])field.addEventListener('change',()=>{update(field.name);form.dispatchEvent(new Event('input',{bubbles:true}));});
  update();
}
