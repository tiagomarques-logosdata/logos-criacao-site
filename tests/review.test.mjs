import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {adminWorkflow,notifyReview} from '../server/review.mjs';
import {sections} from '../public/assets/briefing-schema.mjs';
process.env.SMTP_USER='owner@example.com';process.env.SMTP_APP_PASSWORD='test';process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const originalFetch=global.fetch,originalTransport=nodemailer.createTransport;
const id='03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb';
const jwt=(aal='aal2',amr=[{method:'password'}])=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,aal,amr})).toString('base64url')+'.signature';
const cookie={cookie:'logos_auth='+jwt()};
const authUser=(input,email='owner@example.com')=>new URL(input).pathname.endsWith('/auth/v1/user')?Response.json({id,email,email_confirmed_at:new Date().toISOString(),factors:[{id,factor_type:'totp',status:'verified'}]}):null;
test('painel rejeita cookie antigo, segredo do executor, AAL1, outro usuário e JWT forjado',async()=>{
 await assert.rejects(adminWorkflow('admin-list',{},{}),/Entre/);
 await assert.rejects(adminWorkflow('admin-list',{}, {authorization:'Bearer worker-secret'}),/Entre/);
 await assert.rejects(adminWorkflow('admin-list',{}, {cookie:'logos_admin='+'a'.repeat(64)}),/Entre/);
 await assert.rejects(adminWorkflow('admin-redeem',{token:'a'.repeat(64)},{}),/desativados/);
 global.fetch=async input=>authUser(input)||Response.json([]);
 await assert.rejects(adminWorkflow('admin-list',{}, {cookie:'logos_auth='+jwt('aal1')}),/autenticador/);
 await assert.rejects(adminWorkflow('admin-list',{}, {cookie:'logos_auth='+jwt('aal2',[{method:'otp'}])}),/senha/);
 global.fetch=async input=>authUser(input,'intruder@example.com')||Response.json([]);
 await assert.rejects(adminWorkflow('admin-list',{},cookie),/não autorizado/);
 global.fetch=async()=>Response.json({msg:'invalid JWT'},{status:401});
 await assert.rejects(adminWorkflow('admin-list',{},cookie),/não autorizado/);
});
test('AAL2 validado por Supabase libera pedidos sem expor segredos',async()=>{
 global.fetch=async input=>authUser(input)||Response.json([{id,name:'Test',email:'client@example.com',status:'needs_review',briefing:{answers:{empresa:'Empresa'}},transaction_nsu:'TESTE:'+id}]);
 const list=await adminWorkflow('admin-list',{},cookie);assert.equal(list.orders[0].test,true);assert.equal(list.orders[0].transaction_nsu,undefined);assert.equal(list.orders[0].briefing,undefined);
});
test('senha e TOTP usam Supabase; sessão fica HttpOnly e código errado não libera acesso',async()=>{
 const aal1=jwt('aal1');let verified=false;
 global.fetch=async(input,options)=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/token'))return Response.json({access_token:aal1,refresh_token:'refresh-private',expires_in:3600,token_type:'bearer',user:{id,email:'owner@example.com'}});
  if(authUser(input))return authUser(input);
  if(url.pathname.endsWith('/challenge'))return Response.json({id:'challenge',type:'totp'});
  if(url.pathname.endsWith('/verify')){const body=JSON.parse(options.body);assert.equal(body.challenge_id,'challenge');if(body.code!=='123456')return Response.json({msg:'incorrect code'},{status:422});verified=true;return Response.json({access_token:jwt(),expires_in:3600});}
  throw Error(url.pathname);
 };
 const result=await adminWorkflow('admin-login',{email:'owner@example.com',password:'exclusive-password'},{});
 assert.equal(result.authenticated,false);assert.equal(result.factorId,id);assert.match(result.__cookie[0],/HttpOnly; Secure; SameSite=Strict/);assert.equal(result.access_token,undefined);assert.equal(result.refresh_token,undefined);
 const headers={cookie:'logos_auth='+aal1};
 await assert.rejects(adminWorkflow('admin-mfa-verify',{factorId:id,code:'000000'},headers),/validar/);assert.equal(verified,false);
 const mfa=await adminWorkflow('admin-mfa-verify',{factorId:id,code:'123456'},headers);assert.equal(mfa.authenticated,true);assert.equal(verified,true);
 await assert.rejects(adminWorkflow('admin-mfa-enroll',{},headers),/já está cadastrado/);
});
test('revisão manda versão, respostas normalizadas e observação; conflitos não sobrescrevem',async()=>{
 const answers=Object.fromEntries(sections.flatMap(s=>s.fields).filter(q=>q.required).map(q=>[q.id,q.type==='checkbox'?true:q.options?q.options[0]:'Teste']));let body,conflict=false;
 global.fetch=async(input,options)=>{if(authUser(input))return authUser(input);body=JSON.parse(options.body);return Response.json(conflict?[]:[{id,status:'queued'}]);};
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
  const url=new URL(input);if(authUser(input))return authUser(input);
  filter=url.searchParams.get('or');assert.match(filter,/^\(status\.neq\.created,created_at\.gte\./);
  const cutoff=Date.parse(filter.match(/created_at\.gte\.(.*)\)$/)[1]);assert(Math.abs(cutoff-(now-3*3600000))<1000);
  assert.equal(url.searchParams.get('limit'),'100');
  return Response.json(rows.filter(o=>o.status!=='created'||Date.parse(o.created_at)>=cutoff));
 };
 const result=await adminWorkflow('admin-list',{},cookie);
 assert.deepEqual(result.orders.map(o=>o.id),['recent','paid','review']);
});
test.after(()=>{global.fetch=originalFetch;nodemailer.createTransport=originalTransport;});
