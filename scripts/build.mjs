import { mkdir, rm, cp } from 'node:fs/promises';
const root = new URL('../', import.meta.url), dist = new URL('dist/', root);
await rm(dist, {recursive:true,force:true}); await mkdir(dist,{recursive:true});
for (const path of ['index.html','study.html','quiz.html','review.html','library.html','assets','data','.nojekyll','manifest.webmanifest']) await cp(new URL(path,root),new URL(path,dist),{recursive:true});
console.log('✓ 静态网站已生成至 dist/');
