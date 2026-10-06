import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
await import('./build.mjs');
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    let file = resolve(dist, `.${path}`);
    if (!file.startsWith(dist) && file !== dist.slice(0, -1)) { res.writeHead(403); res.end(); return; }
    try { if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html'); }
    catch { file = resolve(dist, '404.html'); res.statusCode = 404; }
    if (!file.startsWith(dist)) { res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    res.end(await readFile(file));
  } catch { res.writeHead(400); res.end('Requisição inválida'); }
}).listen(port, '127.0.0.1', () => console.log(`Logos Data: http://127.0.0.1:${port}`));
