import { adminSession, authAction } from './admin-auth.mjs';
import { db, HttpError, mailTransport } from './workflow.mjs';
import { normalizeAnswers, schemaVersion, sections } from '../public/assets/briefing-schema.mjs';
const origin = () => new URL(process.env.SITE_ORIGIN || 'https://www.logosdata.com.br').origin;
const owner = () => process.env.SMTP_USER;
const fields = new Set(sections.flatMap(s => s.fields.map(q => q.id)));
const validId = id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);
export async function notifyReview(order) {
  if (order.status !== 'needs_review' || order.review_email_sent_at) return;
  const claims = await db('rpc/logos_claim_review_email', {method:'POST',body:{p_id:order.id}});
  if (!claims?.length) return;
  const current=claims[0];
  try {
    const analysis=current.analysis || {};
    const company=current.briefing?.answers?.empresa || current.name;
    const transport=await mailTransport();
    try { await transport.sendMail({from:`Logos Data <${owner()}>`,to:owner(),
      subject:`Revisão necessária — ${String(company).replace(/[\r\n]/g,' ').slice(0,100)}`,
      messageId:`<review-${current.id}-${current.revision}@${new URL(origin()).hostname}>`,
      text:`Um pedido precisa da sua revisão.\n\nEmpresa: ${company}\nCliente: ${current.name}\nE-mail: ${current.email}\n\n${analysis.summary || 'Confira as respostas e as pendências no painel.'}\n\nPendências:\n${(analysis.missingInformation||[]).map(s=>'- '+s).join('\n')}\n\nEscopo a conferir:\n${(analysis.outOfScope||[]).map(s=>'- '+s).join('\n')}\n\nAbra o painel, entre com sua senha e o código do autenticador e revise o pedido:\n${origin()}/painel/#pedido=${current.id}\n\nVocê pode corrigir as respostas e reenviar para análise. A construção não será publicada automaticamente.`}); }
    finally {transport.close();}
    await db(`logos_orders?id=eq.${current.id}&revision=eq.${current.revision}`,{method:'PATCH',body:{review_email_sent_at:new Date().toISOString(),review_email_claimed_at:null}});
  } catch {await db(`logos_orders?id=eq.${current.id}&revision=eq.${current.revision}`,{method:'PATCH',body:{review_email_claimed_at:null}}).catch(()=>{});throw new HttpError(502,'Não foi possível enviar o aviso de revisão. Será tentado novamente.');}
}
const select='id,name,email,status,briefing,analysis,revision,result_note,created_at,submitted_at,started_at,finished_at,transaction_nsu';
function clean(order){const {transaction_nsu,...data}=order;return {...data,test:transaction_nsu===`TESTE:${order.id}`};}
export async function adminWorkflow(action,input,headers) {
  const authentication=await authAction(action,input,headers);
  if(authentication)return authentication;
  await adminSession(headers);
  if(action==='admin-list') {
    const cutoff=new Date(Date.now()-3*60*60*1000).toISOString();
    // Filter before limiting rows; a late payment still follows the normal flow.
    const visible=encodeURIComponent(`(status.neq.created,created_at.gte.${cutoff})`);
    const rows=await db(`logos_orders?select=id,name,email,status,revision,created_at,briefing,transaction_nsu&or=${visible}&order=created_at.desc&limit=100`);
    return {orders:rows.map(o=>({...clean(o),briefing:undefined,company:o.briefing?.answers?.empresa||o.name}))};
  }
  if(!validId(input.id))throw new HttpError(400,'Pedido inválido.');
  if(action==='admin-detail') {
    const rows=await db(`logos_orders?id=eq.${input.id}&select=${select}&limit=1`);
    if(!rows?.length)throw new HttpError(404,'Pedido não encontrado.');
    const history=await db(`logos_review_history?order_id=eq.${input.id}&select=id,created_at,actor,note,requeued&order=created_at.desc&limit=20`);
    return {order:clean(rows[0]),history};
  }
  if(action==='admin-save') {
    if(!Number.isInteger(input.revision)||input.revision<0||typeof input.requeue!=='boolean')throw new HttpError(400,'Revisão inválida.');
    let answers;try{answers=normalizeAnswers(input.answers);}catch(e){throw new HttpError(400,e.message);}
    const note=String(input.note||'').trim();if(!note||note.length>4000)throw new HttpError(400,'Informe o que foi corrigido (até 4.000 caracteres).');
    const rows=await db('rpc/logos_review_save',{method:'POST',body:{p_id:input.id,p_revision:input.revision,p_briefing:{schemaVersion,answers},p_note:note,p_actor:owner(),p_requeue:input.requeue}});
    if(!rows?.length)throw new HttpError(409,'O pedido mudou ou está em execução. Atualize o painel antes de editar.');
    return {saved:true,order:clean(rows[0])};
  }
  throw new HttpError(404,'Operação não encontrada.');
}
export function fieldIssues(analysis) {
  return (analysis?.reviewFields||[]).filter(x=>fields.has(x.fieldId)&&typeof x.reason==='string');
}
