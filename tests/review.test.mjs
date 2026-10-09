import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {adminWorkflow,notifyReview} from '../server/review.mjs';
import {sections} from '../public/assets/briefing-schema.mjs';
process.env.SMTP_USER='owner@example.com';process.env.SMTP_APP_PASSWORD='test';process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const originalFetch=global.fetch,originalTransport=nodemailer.createTransport;
const id='03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb',cookie={cookie:'logos_admin='+'a'.repeat(64)};
test('painel exige sessão própria; não aceita segredo do executor ou cookie inválido',async()=>{
 await assert.rejects(adminWorkflow('admin-list',{},{}),/Entre/);
 await assert.rejects(adminWorkflow('admin-list',{}, {authorization:'Bearer worker-secret'}),/Entre/);
 global.fetch=async()=>Response.json([]);
 await assert.rejects(adminWorkflow('admin-list',{},cookie),/expirou/);
});
test('acesso de uso único retorna cookie protegido; nenhum segredo no resultado de pedidos',async()=>{
 let redeemed=false;
 global.fetch=async(input)=>{const url=new URL(input);if(url.pathname.endsWith('logos_admin_redeem')){if(redeemed)return Response.json(false);redeemed=true;return Response.json(true);}if(url.pathname.includes('logos_admin_sessions'))return Response.json([{token_hash:'private'}]);return Response.json([{id,name:'Test',email:'client@example.com',status:'needs_review',briefing:{answers:{empresa:'Empresa'}},transaction_nsu:'TESTE:'+id}]);};
 const result=await adminWorkflow('admin-redeem',{token:'b'.repeat(64)},{});
 assert.match(result.__cookie,/HttpOnly; Secure; SameSite=Strict/);
 await assert.rejects(adminWorkflow('admin-redeem',{token:'b'.repeat(64)},{}),/usado ou expirado/);
 const list=await adminWorkflow('admin-list',{},cookie);assert.equal(list.orders[0].test,true);assert.equal(list.orders[0].transaction_nsu,undefined);assert.equal(list.orders[0].briefing,undefined);
});
test('revisão manda versão, respostas normalizadas e observação; conflitos não sobrescrevem',async()=>{
 const answers=Object.fromEntries(sections.flatMap(s=>s.fields).filter(q=>q.required).map(q=>[q.id,q.type==='checkbox'?true:q.options?q.options[0]:'Teste']));let body,conflict=false;
 global.fetch=async(input,options)=>{if(new URL(input).pathname.includes('logos_admin_sessions'))return Response.json([{}]);body=JSON.parse(options.body);return Response.json(conflict?[]:[{id,status:'queued'}]);};
 await adminWorkflow('admin-save',{id,revision:3,answers,note:'Cliente confirmou conteúdo',requeue:true},cookie);
 assert.equal(body.p_revision,3);assert.equal(body.p_requeue,true);assert.equal(body.p_actor,'owner@example.com');assert.equal(body.p_briefing.answers.empresa,'Teste');
 conflict=true;await assert.rejects(adminWorkflow('admin-save',{id,revision:3,answers,note:'Correção',requeue:true},cookie),/pedido mudou/);
});
test('aviso de revisão vai ao responsável; claim evita repetir e falha libera nova tentativa',async()=>{
 let claimed=false,sent=[],patches=[];
 const order={id,status:'needs_review',revision:0,name:'Client',email:'client@example.com',briefing:{answers:{empresa:'Empresa'}},analysis:{missingInformation:['Confirmar logo'],outOfScope:[]}};
 global.fetch=async(input,options)=>{if(new URL(input).pathname.endsWith('logos_claim_review_email')){if(claimed)return Response.json([]);claimed=true;return Response.json([order]);}patches.push(JSON.parse(options.body));return new Response(null,{status:204});};
 nodemailer.createTransport=()=>({sendMail:async message=>{sent.push(message);},close(){}});
 await notifyReview(order);await notifyReview(order);
 assert.equal(sent.length,1);assert.equal(sent[0].to,'owner@example.com');assert.match(sent[0].text,/Confirmar logo/);assert.match(sent[0].text,/\/painel\/#pedido=/);assert(patches[0].review_email_sent_at);
 claimed=false;nodemailer.createTransport=()=>({sendMail:async()=>{throw Error('smtp');},close(){}});
 await assert.rejects(notifyReview(order),/tentado novamente/);assert.equal(patches.at(-1).review_email_claimed_at,null);
});
test('lista oculta criação sem pagamento após três horas e preserva pedidos pagos antigos',async()=>{
 const now=Date.now();let filter;
 const rows=[{id:'recent',status:'created',created_at:new Date(now-2*3600000).toISOString()},
 {id:'expired',status:'created',created_at:new Date(now-4*3600000).toISOString()},
 {id:'paid',status:'paid',created_at:new Date(now-48*3600000).toISOString()},
 {id:'review',status:'needs_review',created_at:new Date(now-48*3600000).toISOString()}];
 global.fetch=async input=>{
  const url=new URL(input);if(url.pathname.includes('logos_admin_sessions'))return Response.json([{}]);
  filter=url.searchParams.get('or');assert.match(filter,/^\(status\.neq\.created,created_at\.gte\./);
  const cutoff=Date.parse(filter.match(/created_at\.gte\.(.*)\)$/)[1]);assert(Math.abs(cutoff-(now-3*3600000))<1000);
  assert.equal(url.searchParams.get('limit'),'100');
  return Response.json(rows.filter(o=>o.status!=='created'||Date.parse(o.created_at)>=cutoff));
 };
 const result=await adminWorkflow('admin-list',{},cookie);
 assert.deepEqual(result.orders.map(o=>o.id),['recent','paid','review']);
});
test.after(()=>{global.fetch=originalFetch;nodemailer.createTransport=originalTransport;});
