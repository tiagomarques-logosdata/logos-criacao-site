import { workflow, HttpError } from '../server/workflow.mjs';
export const config = { maxDuration: 60 };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const action = new URL(req.url, 'http://localhost').searchParams.get('action');
    if (req.method !== (action === 'access' ? 'GET' : 'POST')) throw new HttpError(405, 'Método não permitido.');
    const expectedOrigin = new URL(process.env.SITE_ORIGIN || 'https://www.logosdata.com.br').origin;
    if (req.headers.origin && req.headers.origin !== expectedOrigin) throw new HttpError(403, 'Origem não permitida.');
    if (req.method === 'POST' && !String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Envie JSON.');
    let body = req.body;
    if (!body && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 500000) throw new HttpError(413, 'Documento muito grande.'); }
      try { body = JSON.parse(raw || '{}'); } catch { throw new HttpError(400, 'JSON inválido.'); }
    }
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw new HttpError(400, 'JSON inválido.'); } }
    if (body && Buffer.byteLength(JSON.stringify(body)) > 500000) throw new HttpError(413, 'Documento muito grande.');
    const result = await workflow(action, body || {}, req.headers);
    res.statusCode = 200; res.end(JSON.stringify(result));
  } catch (error) {
    const action = new URL(req.url, 'http://localhost').searchParams.get('action');
    res.statusCode = action === 'webhook' && (error.status || 500) >= 500 ? 400 : error.status || 500;
    res.end(JSON.stringify({ error: error.status ? error.message : 'Não foi possível concluir agora. Tente novamente.' }));
  }
}
