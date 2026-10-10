import { adminSession, authAction } from './admin-auth.mjs';
import { db, HttpError, mailTransport, tokenForOrder, hashToken, sendBriefingEmail } from './workflow.mjs';
import { randomUUID } from 'node:crypto';
import { analysisReady, analysisFingerprint } from '../automation/workflow-rules.mjs';
import { normalizeAnswers, schemaVersion, sections } from '../public/assets/briefing-schema.mjs';
const origin = () => new URL(process.env.SITE_ORIGIN || 'https://www.logosdata.com.br').origin;
const owner = () => process.env.SMTP_USER;
const fields = new Set(sections.flatMap(s => s.fields.map(q => q.id)));
const validId = id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);
export async function notifyBriefing(order){
 const rows=await db('rpc/logos_claim_briefing_notice',{method:'POST',body:{p_id:order.id}});if(!rows?.length)return;
 const current=rows[0],transport=await mailTransport();
 try{await transport.sendMail({from:`Logos Data <${owner()}>`,to:owner(),subject:`Briefing recebido — ${String(current.briefing?.answers?.empresa||current.name).replace(/[\r\n]/g,' ').slice(0,100)}`,text:`O cliente enviou o formulário do projeto.\n\nAbra o painel para conferir as respostas:\n${origin()}/painel/#pedido=${current.id}\n\nA análise organizará as respostas e o prompt. A construção continuará bloqueada até você revisar e aprovar o escopo e o prompt no painel.`,messageId:`<briefing-${current.id}@${new URL(origin()).hostname}>`});await db(`logos_orders?id=eq.${current.id}`,{method:'PATCH',body:{briefing_notice_at:new Date().toISOString(),briefing_notice_claimed_at:null}});}
 catch{await db(`logos_orders?id=eq.${current.id}`,{method:'PATCH',body:{briefing_notice_claimed_at:null}}).catch(()=>{});}
 finally{transport.close();}
}
export async function notifyReview(order) {
  if (!['needs_review','completed'].includes(order.status) || order.review_email_sent_at) return;
  const claims = await db('rpc/logos_claim_review_email', {method:'POST',body:{p_id:order.id}});
  if (!claims?.length) return;
  const current=claims[0];
  try {
    const analysis=current.analysis || {};
    const company=current.briefing?.answers?.empresa || current.name;
    const transport=await mailTransport();
    try { await transport.sendMail({from:`Logos Data <${owner()}>`,to:owner(),
      subject:`${current.status==='completed'?'Primeira versão pronta para revisão':'Briefing e prompt aguardando revisão'} — ${String(company).replace(/[\r\n]/g,' ').slice(0,100)}`,
      messageId:`<review-${current.id}-${current.revision}-${current.status}@${new URL(origin()).hostname}>`,
      text:`${current.status==='completed'?'A primeira versão está pronta para sua revisão. Confira antes de apresentar ao cliente.':'O briefing foi analisado. Revise as respostas, o escopo e o prompt; a construção depende da sua aprovação.'}\n\nEmpresa: ${company}\nCliente: ${current.name}\nE-mail: ${current.email}\n\n${analysis.summary || 'Confira as respostas e as pendências no painel.'}\n\nPendências:\n${(analysis.missingInformation||[]).map(s=>'- '+s).join('\n')}\n\nEscopo a conferir:\n${(analysis.outOfScope||[]).map(s=>'- '+s).join('\n')}\n\nAbra o painel, entre com sua senha e o código do autenticador e revise o pedido:\n${origin()}/painel/#pedido=${current.id}\n\nVocê pode corrigir as respostas e reenviar para análise. A construção não será publicada automaticamente.`}); }
    finally {transport.close();}
    await db(`logos_orders?id=eq.${current.id}&revision=eq.${current.revision}`,{method:'PATCH',body:{review_email_sent_at:new Date().toISOString(),review_email_claimed_at:null}});
  } catch {await db(`logos_orders?id=eq.${current.id}&revision=eq.${current.revision}`,{method:'PATCH',body:{review_email_claimed_at:null}}).catch(()=>{});throw new HttpError(502,'Não foi possível enviar o aviso de revisão. Será tentado novamente.');}
}
const select='id,name,email,status,briefing,analysis,revision,result_note,created_at,submitted_at,started_at,finished_at,transaction_nsu,agreed_scope,agreed_deadline';
function clean(order){const {transaction_nsu,...data}=order;return {...data,test:transaction_nsu===`TESTE:${order.id}`};}
export async function adminWorkflow(action,input,headers) {
  const authentication=await authAction(action,input,headers);
  if(authentication)return authentication;
  await adminSession(headers);
  if(action==='admin-invite'){
    const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase(),scope=String(input.scope||'').trim(),deadline=String(input.deadline||'').trim();
    if(!name||name.length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160||scope.length<20||scope.length>8000||!deadline||deadline.length>1000||input.confirmed!==true)throw new HttpError(400,'Informe o cliente, e-mail, escopo, prazo e confirme a contratação combinada.');
    const id=randomUUID();
    const rows=await db('rpc/logos_create_manual_order',{method:'POST',body:{p_id:id,p_name:name,p_email:email,p_hash:hashToken(tokenForOrder(id)),p_scope:scope,p_deadline:deadline,p_actor:owner()}});
    if(!rows?.length)throw new HttpError(429,'Aguarde antes de criar outro projeto.');
    let emailSent=true;try{await sendBriefingEmail(rows[0]);}catch{emailSent=false;}return {created:true,id,emailSent};
  }
  if(action==='admin-list') {
    const cutoff=new Date(Date.now()-3*60*60*1000).toISOString();
    // Filter before limiting rows; a late payment still follows the normal flow.
    const visible=encodeURIComponent(`(status.neq.created,created_at.gte.${cutoff})`);
    const rows=await db(`logos_orders?select=id,name,email,status,revision,created_at,briefing,transaction_nsu&or=${visible}&order=created_at.desc&limit=100`);
    return {orders:rows.map(o=>({...clean(o),briefing:undefined,company:o.briefing?.answers?.empresa||o.name}))};
  }
  if(!validId(input.id))throw new HttpError(400,'Pedido inválido.');
  if(action==='admin-approve'){
    if(!Number.isInteger(input.revision)||input.confirmed!==true)throw new HttpError(400,'Confirme a aprovação do escopo e do prompt.');
    const rows=await db(`logos_orders?id=eq.${input.id}&revision=eq.${input.revision}&status=eq.needs_review&limit=1`);
    const order=rows?.[0];if(!order)throw new HttpError(409,'O pedido mudou. Atualize o painel.');
    if(!analysisReady(order.analysis))throw new HttpError(409,'Resolva as pendências e reanalise o briefing antes de aprovar.');
    const scope=String(input.scope||'').trim(),deadline=String(input.deadline||'').trim();
    if(scope.length<20||scope.length>8000||!deadline||deadline.length>1000)throw new HttpError(400,'Registre o escopo aprovado e o prazo combinado.');
    const approval={actor:owner(),at:new Date().toISOString(),revision:order.revision,fingerprint:analysisFingerprint(order.analysis),scope,deadline};
    const updated=await db('rpc/logos_approve_build',{method:'POST',body:{p_id:order.id,p_revision:order.revision,p_fingerprint:approval.fingerprint,p_analysis:order.analysis,p_approval:approval,p_actor:owner()}});
    if(!updated?.length)throw new HttpError(409,'O pedido mudou. Atualize e revise novamente.');
    return {approved:true,order:clean(updated[0])};
  }
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
