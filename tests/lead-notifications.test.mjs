import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {notifyLead,retryLeadNotifications} from '../server/leads.mjs';
const originalFetch=global.fetch,originalTransport=nodemailer.createTransport;
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.SMTP_USER='owner@example.com';process.env.SMTP_APP_PASSWORD='test';
const id='03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb';
const lead={id,name:'Contato de teste',whatsapp:'5511983195720',created_at:'2026-10-13T14:00:00Z'};
test('aviso vai somente ao proprietário; claim evita repetição e marca envio',async()=>{
 let claimed=false,sent=[],patches=[],closed=0;
 global.fetch=async(url,options)=>{
  if(url.endsWith('/rpc/logos_claim_lead_email')){if(claimed)return Response.json([]);claimed=true;return Response.json([lead]);}
  patches.push(JSON.parse(options.body));return new Response(null,{status:204});
 };
 nodemailer.createTransport=()=>({sendMail:async mail=>{sent.push(mail);},close(){closed++;}});
 assert.deepEqual(await notifyLead(id),{sent:true});assert.deepEqual(await notifyLead(id),{sent:false});
 assert.equal(sent.length,1);assert.equal(sent[0].to,'owner@example.com');assert.match(sent[0].subject,/Novo contato pelo site/);assert.match(sent[0].text,/Contato de teste/);assert.match(sent[0].text,/\(11\) 98319-5720/);assert.match(sent[0].text,/\/painel\//);assert.match(sent[0].text,/13\/10\/2026, 11:00:00/);assert(!/token=|IA|Codex/.test(sent[0].text));assert.equal(closed,1);assert.equal(patches[0].email_notice_pending,false);assert(patches[0].email_notice_sent_at);
});
test('falha de SMTP mantém aviso pendente e libera nova tentativa',async()=>{
 let patches=[],closed=false;
 global.fetch=async(url,options)=>url.endsWith('/rpc/logos_claim_lead_email')?Response.json([lead]):(patches.push(JSON.parse(options.body)),new Response(null,{status:204}));
 nodemailer.createTransport=()=>({sendMail:async()=>{throw Error('SMTP unavailable');},close(){closed=true;}});
 await assert.rejects(notifyLead(id),e=>e.status===502);assert.deepEqual(patches,[{email_notice_claimed_at:null}]);assert.equal(closed,true);
});
test('executor tenta novamente avisos pendentes sem enviar ao cliente',async()=>{
 let sent=0;
 global.fetch=async(url)=>url.includes('logos_leads?')?Response.json([{id}]):url.endsWith('/rpc/logos_claim_lead_email')?Response.json([lead]):new Response(null,{status:204});
 nodemailer.createTransport=()=>({sendMail:async mail=>{assert.equal(mail.to,'owner@example.com');sent++;},close(){}});
 assert.equal(await retryLeadNotifications(),1);assert.equal(sent,1);
});
test.after(()=>{global.fetch=originalFetch;nodemailer.createTransport=originalTransport;});
