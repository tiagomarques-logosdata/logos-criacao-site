import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { normalizeAnswers, schemaVersion } from '../public/assets/briefing-schema.mjs';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const required = name => { const value = process.env[name]; if (!value) throw new HttpError(503, 'A integração ainda está em configuração.'); return value; };
const origin = () => new URL(process.env.SITE_ORIGIN || 'https://www.logosdata.com.br').origin;
const enabled = () => { if (process.env.WORKFLOW_ENABLED !== 'true') throw new HttpError(503, 'A contratação automática ainda está em configuração.'); };
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const tokenForOrder = id => {
  const secret = required('BRIEFING_TOKEN_SECRET');
  if (secret.length < 32) throw new HttpError(503, 'Configuração de acesso incompleta.');
  return createHmac('sha256', secret).update(`briefing-v1:${id}`).digest('base64url');
};
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const shortString = (value, max = 200) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\r\n]/.test(value);
export async function db(path, { method = 'GET', body, prefer } = {}) {
  const base = new URL(required('SUPABASE_URL'));
  if (base.protocol !== 'https:') throw new HttpError(503, 'Configuração de armazenamento inválida.');
  const key = required('SUPABASE_SECRET_KEY');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${base.origin}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new HttpError(502, 'Não foi possível acessar os dados do pedido.');
  const text = await response.text(); return text ? JSON.parse(text) : null;
}
async function infinite(path, payload) {
  const response = await fetch(`https://api.checkout.infinitepay.io/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new HttpError(502, 'Não foi possível consultar a InfinitePay.');
  return response.json();
}
async function orderById(id) {
  if (!uuid(id)) throw new HttpError(400, 'Pedido inválido.');
  const rows = await db(`logos_orders?id=eq.${id}&limit=1`);
  if (!rows?.length) throw new HttpError(404, 'Pedido não encontrado.');
  return rows[0];
}
export async function authenticatedOrder(headers) {
  const token = (headers.authorization || '').replace(/^Bearer /, '');
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(401, 'Use o link individual enviado por e-mail.');
  const rows = await db(`logos_orders?token_hash=eq.${hashToken(token)}&limit=1`);
  const order = rows?.[0];
  if (!order || !order.paid_at || !order.token_expires_at || Date.parse(order.token_expires_at) <= Date.now()) throw new HttpError(401, 'Seu link é inválido ou expirou. Fale com a Logos Data.');
  return order;
}
export function authenticateWorker(headers) {
  const incoming = (headers.authorization || '').replace(/^Bearer /, '');
  const expected = required('WORKFLOW_WORKER_SECRET');
  const a = Buffer.from(incoming), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Acesso não autorizado.');
}
async function mailTransport() {
  const { default: nodemailer } = await import('nodemailer');
  return nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: required('SMTP_USER'), pass: required('SMTP_APP_PASSWORD').replace(/\s+/g, '') },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
}
async function sendBriefingEmail(order) {
  if (order.email_sent_at) return;
  const claims = await db('rpc/logos_claim_email', { method: 'POST', body: { p_id: order.id } });
  if (!claims?.length) return;
  try {
    const user = required('SMTP_USER');
    const transport = await mailTransport();
    const link = `${origin()}/briefing/#token=${tokenForOrder(order.id)}`;
    await transport.sendMail({ from: `Logos Data <${user}>`, to: order.email,
      messageId: `<briefing-${order.id}@${new URL(origin()).hostname}>`,
      subject: 'Seu pagamento foi confirmado — vamos criar seu site',
      text: `Olá, ${order.name}!\n\nSeu pagamento foi confirmado. Agora queremos conhecer sua empresa e o site que você deseja.\n\nPreencha seu formulário individual:\n${link}\n\nSepare sua logo, textos, imagens e referências. Você pode salvar um rascunho no seu dispositivo. O link é válido por 30 dias e deve ser mantido privado.\n\nSuas respostas serão analisadas por IA para preparar o desenvolvimento do seu site. Não envie senhas ou dados de cartão.\n\nLogos Data\nWhatsApp: (11) 98319-5720` });
    await db(`logos_orders?id=eq.${order.id}`, { method: 'PATCH', body: { email_sent_at: new Date().toISOString(), email_claimed_at: null } });
  } catch (error) {
    await db(`logos_orders?id=eq.${order.id}`, { method: 'PATCH', body: { email_claimed_at: null } }).catch(() => {});
    throw new HttpError(502, 'Pagamento confirmado. O envio do formulário será tentado novamente.');
  }
}
export async function createCheckout(input) {
  enabled();
  required('SMTP_USER'); required('SMTP_APP_PASSWORD'); required('BRIEFING_TOKEN_SECRET');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!shortString(name, 120) || !shortString(email, 160) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Confira seu nome e e-mail.');
  const id = randomUUID();
  const created = await db('rpc/logos_create_order', { method: 'POST', body: { p_id: id, p_name: name, p_email: email, p_token_hash: hashToken(tokenForOrder(id)) } });
  if (!created?.length) throw new HttpError(429, 'Muitas tentativas de contratação. Aguarde ou fale com a Logos Data.');
  const result = await infinite('links', { handle: process.env.INFINITEPAY_HANDLE || 'engdados-me', order_nsu: id,
    redirect_url: `${origin()}/pagamento/`, webhook_url: `${origin()}/api/workflow?action=webhook`,
    items: [{ quantity: 1, price: 100000, description: 'Criação de site profissional — Logos Data · entrega em 14 dias' }], customer: { name, email } });
  const url = new URL(result.url);
  if (url.protocol !== 'https:' || !['checkout.infinitepay.com.br', 'checkout.infinitepay.io'].includes(url.hostname)) throw new HttpError(502, 'A InfinitePay retornou um destino inválido.');
  await db(`logos_orders?id=eq.${id}`, { method: 'PATCH', body: { checkout_url: url.href } });
  return { url: url.href };
}
export async function confirmPayment(input) {
  enabled();
  const order = await orderById(input.order_nsu);
  if (!order.paid_at) {
    const slug = input.slug || input.invoice_slug;
    if (!shortString(input.transaction_nsu) || !shortString(slug)) throw new HttpError(400, 'Dados de confirmação incompletos.');
    const verification = await infinite('payment_check', { handle: process.env.INFINITEPAY_HANDLE || 'engdados-me', order_nsu: order.id, transaction_nsu: input.transaction_nsu, slug });
    if (verification.success !== true || verification.paid !== true) return { paid: false };
    if (Number(verification.amount) !== order.amount || Number(verification.paid_amount) < order.amount) throw new HttpError(409, 'O valor confirmado não corresponde ao pedido.');
    const now = new Date().toISOString();
    await db(`logos_orders?id=eq.${order.id}&paid_at=is.null`, { method: 'PATCH', body: { paid_at: now, status: 'paid', transaction_nsu: input.transaction_nsu, invoice_slug: slug, token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() } });
  }
  await sendBriefingEmail(await orderById(order.id));
  return { paid: true };
}
export async function submitBriefing(input, headers) {
  const order = await authenticatedOrder(headers);
  if (order.briefing) return { accepted: true, alreadySubmitted: true };
  if (input.schemaVersion !== schemaVersion) throw new HttpError(400, 'Atualize a página do formulário antes de enviar.');
  let answers;
  try { answers = normalizeAnswers(input.answers); } catch (error) { throw new HttpError(400, error.message); }
  const rows = await db(`logos_orders?id=eq.${order.id}&briefing=is.null`, { method: 'PATCH', prefer: 'return=representation', body: { briefing: { schemaVersion, answers }, submitted_at: new Date().toISOString(), status: 'queued' } });
  return { accepted: true, alreadySubmitted: !rows?.length };
}
export async function workflow(action, input, headers = {}) {
  if (action === 'checkout') return createCheckout(input);
  if (action === 'confirm' || action === 'webhook') return confirmPayment(input);
  if (action === 'access') { const order = await authenticatedOrder(headers); return { submitted: !!order.briefing }; }
  if (action === 'briefing') return submitBriefing(input, headers);
  authenticateWorker(headers);
  if (action === 'health') {
    tokenForOrder('configuration-check');
    await db('logos_orders?select=id&limit=0');
    const transport = await mailTransport();
    try { await transport.verify(); }
    catch { throw new HttpError(502, 'O Google não confirmou a conexão SMTP. Confira a senha de app e as permissões da conta.'); }
    finally { transport.close(); }
    return { database: true, smtp: true, enabled: process.env.WORKFLOW_ENABLED === 'true' };
  }
  if (action === 'claim') {
    const rows = await db('rpc/logos_claim_job', { method: 'POST', body: { p_worker: 'codex-local' } });
    const job = rows?.[0];
    return { job: job ? { id: job.id, lease: job.lease, briefing: job.briefing, amount: job.amount } : null };
  }
  if (action === 'result') {
    if (!uuid(input.id) || !uuid(input.lease)) throw new HttpError(400, 'Identificador inválido.');
    const allowed = ['needs_review', 'completed', 'failed'];
    if (!allowed.includes(input.status)) throw new HttpError(400, 'Status inválido.');
    const analysis = input.analysis;
    if (analysis && (typeof analysis !== 'object' || JSON.stringify(analysis).length > 200000)) throw new HttpError(400, 'Análise inválida.');
    const rows = await db(`logos_orders?id=eq.${input.id}&lease=eq.${input.lease}&status=eq.processing`, { method: 'PATCH', prefer: 'return=representation', body: { status: input.status, analysis: analysis || null, result_note: String(input.note || '').slice(0, 2000), finished_at: new Date().toISOString() } });
    if (!rows?.length) throw new HttpError(409, 'Esse trabalho não pertence mais a esta execução.');
    return { accepted: true };
  }
  if (action === 'retry-emails') {
    const rows = await db('logos_orders?paid_at=not.is.null&email_sent_at=is.null&limit=10');
    for (const order of rows) await sendBriefingEmail(order);
    return { attempted: rows.length };
  }
  throw new HttpError(404, 'Operação não encontrada.');
}
