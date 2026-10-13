import { createHmac } from 'node:crypto';
import { db, HttpError } from './workflow.mjs';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const ddds = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
export function normalizeLead(input) {
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g,' ') : '';
  let phone = typeof input.whatsapp === 'string' ? input.whatsapp.replace(/[\s()+.-]/g,'') : '';
  if (phone.length === 13 && phone.startsWith('55')) phone=phone.slice(2);
  if (!uuid(input.id)) throw new HttpError(400,'Atualize a página antes de enviar.');
  if (name.length < 2 || name.length > 120 || /[<>\x00-\x1f]/.test(name)) throw new HttpError(400,'Informe seu nome (de 2 a 120 caracteres).');
  if (!/^[1-9]\d9\d{8}$/.test(phone) || !ddds.has(phone.slice(0,2))) throw new HttpError(400,'Informe um WhatsApp brasileiro válido com DDD e nove dígitos.');
  if (input.consent !== true) throw new HttpError(400,'Autorize o contato para continuar.');
  return {id:input.id,name,whatsapp:`55${phone}`};
}
export async function createLead(input,headers) {
  if (input.website) throw new HttpError(400,'Não foi possível enviar. Atualize a página.');
  const lead=normalizeLead(input);
  const expected = new URL(process.env.SITE_ORIGIN || 'https://www.logosdata.com.br').origin;
  if (headers.origin !== expected) throw new HttpError(403,'Envie o formulário pelo site da Logos Data.');
  const secret=process.env.BRIEFING_TOKEN_SECRET;
  if (!secret) throw new HttpError(503,'Contato indisponível agora. Use o botão do WhatsApp.');
  // Vercel supplies this trusted header; never use a client-provided forwarding header for the limit.
  const ip=String(headers['x-vercel-forwarded-for'] || 'unknown').split(',')[0].trim();
  const hash=createHmac('sha256',secret).update(`lead-rate-v1:${ip}`).digest('hex');
  const rows=await db('rpc/logos_create_lead',{method:'POST',body:{p_id:lead.id,p_name:lead.name,p_whatsapp:lead.whatsapp,p_rate_hash:hash}});
  if (!rows?.length) throw new HttpError(429,'Você já enviou seu contato recentemente. Aguarde ou fale pelo WhatsApp.');
  return {accepted:true,id:rows[0].id};
}
export async function adminLeads(action,input) {
  if (action==='admin-leads') return {leads:await db('logos_leads?select=id,name,whatsapp,created_at,contacted_at,source&order=created_at.desc&limit=200')};
  if (action==='admin-lead-contacted') {
    if (!uuid(input.id)) throw new HttpError(400,'Contato inválido.');
    const rows=await db(`logos_leads?id=eq.${input.id}`,{method:'PATCH',prefer:'return=representation',body:{contacted_at:input.contacted ? new Date().toISOString() : null}});
    if (!rows?.length) throw new HttpError(404,'Contato não encontrado.');
    return {saved:true};
  }
}
