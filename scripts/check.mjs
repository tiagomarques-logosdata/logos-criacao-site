import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(path) { const names = await readdir(path); return (await Promise.all(names.map(async name => { const file = join(path,name); return (await stat(file)).isDirectory() ? walk(file) : [file]; }))).flat(); }
for (const folder of ['src','scripts','public','server','api','automation']) {
  for (const file of await walk(join(root,folder))) {
    if (/\.(mjs|js)$/.test(file)) {
      const check = spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
      if (check.status !== 0) throw new Error(check.stderr);
    }
  }
}
await import('./build.mjs');
const dist = join(root, 'dist');
const files = await walk(dist);
const errors = [];
for (const file of files.filter(x=>x.endsWith('.html'))) {
  const html = await readFile(file,'utf8');
  if ((html.match(/<h1[ >]/g)||[]).length !== 1) errors.push(`${file}: deve ter um h1`);
  if (!html.includes('lang="pt-BR"') || !html.includes('rel="canonical"') || !html.includes('name="description"')) errors.push(`${file}: metadados incompletos`);
  for (const [,href] of html.matchAll(/(?:href|src)="([^" ]+)"/g)) {
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const [path, hash] = href.split('#');
    let target = path ? join(dist,path) : file;
    try {
      if ((await stat(target)).isDirectory()) target = join(target,'index.html');
      const text = await readFile(target,'utf8');
      if (hash && !text.includes(`id="${hash}"`)) errors.push(`${file}: âncora inexistente ${href}`);
    } catch { errors.push(`${file}: recurso inexistente ${href}`); }
  }
  for (const [,json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) JSON.parse(json);
}
if (errors.length) throw new Error(errors.join('\n'));
console.log('Lint concluído: sintaxe JavaScript, metadados, JSON-LD, h1, recursos e links internos verificados.');
