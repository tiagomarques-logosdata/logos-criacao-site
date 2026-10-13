import test from 'node:test';
import assert from 'node:assert/strict';
import {createLead,normalizeLead} from '../server/leads.mjs';
import {adminWorkflow} from '../server/review.mjs';
const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.BRIEFING_TOKEN_SECRET='test-rate-secret';process.env.SMTP_USER='owner@example.com';
const id='03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb';
const input={id,name:'  Tiago   Marques ',whatsapp:'+55 (11) 98319-5720',consent:true};
const headers={origin:'https://www.logosdata.com.br','x-vercel-forwarded-for':'192.0.2.1'};
test('contato exige consentimento, nome e celular brasileiro com DDD válido',()=>{
 assert.deepEqual(normalizeLead(input),{id,name:'Tiago Marques',whatsapp:'5511983195720'});
 for(const changes of [{consent:false},{whatsapp:'119831957'},{whatsapp:'20983195720'},{whatsapp:'11883195720'},{name:'<script>'},{name:'A'},{id:'invalid'}])assert.throws(()=>normalizeLead({...input,...changes}));
});
test('somente persistência confirmada retorna sucesso; falhas e rate limit não aceitam',async()=>{
 let captured;
 global.fetch=async(url,opts)=>{assert.match(url,/rpc\/logos_create_lead$/);captured=JSON.parse(opts.body);return Response.json([{id,created:true}]);};
 assert.deepEqual(await createLead(input,headers),{accepted:true,id});
 assert.equal(captured.p_whatsapp,'5511983195720');assert.match(captured.p_rate_hash,/^[a-f0-9]{64}$/);assert(!captured.p_rate_hash.includes('192.0.2.1'));
 global.fetch=async()=>Response.json([{id,created:false}]);assert.deepEqual(await createLead(input,headers),{accepted:true,id});
 global.fetch=async()=>Response.json([]);await assert.rejects(createLead(input,headers),e=>e.status===429);
 global.fetch=async()=>Response.json({error:'database unavailable'},{status:503});await assert.rejects(createLead(input,headers),e=>e.status===502);
});
test('origem externa, sem origem ou honeypot não chegam ao banco',async()=>{
 global.fetch=async()=>{throw Error('Unexpected database request');};
 for(const origin of [undefined,'https://evil.example'])await assert.rejects(createLead(input,{origin}),e=>e.status===403);
 await assert.rejects(createLead({...input,website:'spam'},headers),e=>e.status===400);
});
test('lista e alteração de contatos continuam exigindo senha e 2FA do proprietário',async()=>{
 const token=aal=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,aal,amr:[{method:'password'}]})).toString('base64url')+'.signature';
 let writes=0;
 global.fetch=async(url,opts)=>{
  if(new URL(url).pathname.endsWith('/auth/v1/user'))return Response.json({id,email:'owner@example.com',email_confirmed_at:new Date().toISOString(),factors:[{id,factor_type:'totp',status:'verified'}]});
  if(opts.method==='PATCH'){writes++;return Response.json([{id}]);}
  assert.match(new URL(url).searchParams.get('select'),/^id,name,whatsapp,created_at,contacted_at,source$/);return Response.json([{id,name:'Test',whatsapp:'5511983195720'}]);
 };
 for(const action of ['admin-leads','admin-lead-contacted']){
  await assert.rejects(adminWorkflow(action,{id,contacted:true},{}));
  await assert.rejects(adminWorkflow(action,{id,contacted:true},{cookie:'logos_auth='+token('aal1')}));
 }
 assert.equal(writes,0);
 const cookie={cookie:'logos_auth='+token('aal2')};assert.equal((await adminWorkflow('admin-leads',{},cookie)).leads.length,1);
 assert.deepEqual(await adminWorkflow('admin-lead-contacted',{id,contacted:true},cookie),{saved:true});assert.equal(writes,1);
});
test.after(()=>{global.fetch=originalFetch;});
