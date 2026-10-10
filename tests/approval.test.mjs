import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedBuildJob,analysisFingerprint,analysisReady} from '../automation/workflow-rules.mjs';
import {adminWorkflow} from '../server/review.mjs';
import {workflow} from '../server/workflow.mjs';
const analysis={needsReview:false,missingInformation:[],outOfScope:[],codexPrompt:'Prompt aprovado para um site institucional. '.repeat(10)};
const id='03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb';
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,aal:'aal2',amr:[{method:'password'}]})).toString('base64url')+'.signature';
const headers={cookie:'logos_auth='+jwt};
process.env.SMTP_USER='owner@example.com';process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.WORKFLOW_WORKER_SECRET='w'.repeat(40);
const originalFetch=global.fetch;
test('análise pronta não libera construção; aprovação exige conteúdo e revisão exatos',()=>{
 assert.equal(analysisReady(analysis),true);assert.equal(approvedBuildJob({revision:2,analysis}),false);
 const approved={...analysis,approval:{actor:'owner@example.com',revision:2,fingerprint:analysisFingerprint(analysis),scope:'Site institucional acordado',deadline:'Prazo combinado com o cliente'}};
 assert.equal(approvedBuildJob({revision:2,analysis:approved}),true);
 assert.equal(approvedBuildJob({revision:3,analysis:approved}),false);
 assert.equal(approvedBuildJob({revision:2,analysis:{...approved,codexPrompt:approved.codexPrompt+' modificado'}}),false);
 assert.equal(approvedBuildJob({revision:2,analysis:{...approved,missingInformation:['Falta escopo']}}),false);
 const reordered=Object.fromEntries(Object.entries(analysis).reverse());assert.equal(analysisFingerprint(reordered),analysisFingerprint(analysis));
});
test('aprovação passa pela autenticação, não aceita pendências e registra escopo e prompt atomicamente',async()=>{
 let pending=false,approvalBody;
 global.fetch=async(input,options)=>{const url=new URL(input);if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id,email:'owner@example.com',email_confirmed_at:new Date().toISOString(),factors:[{factor_type:'totp',status:'verified'}]});if(url.pathname.endsWith('/logos_approve_build')){approvalBody=JSON.parse(options.body);return Response.json([{id,status:'queued'}]);}return Response.json([{id,revision:2,status:'needs_review',analysis:pending?{...analysis,missingInformation:['Logo']}:analysis}]);};
 const body={id,revision:2,scope:'Página institucional com cinco seções e WhatsApp',deadline:'Prazo combinado após aprovação dos materiais',confirmed:true};
 await assert.rejects(adminWorkflow('admin-approve',body,{}),/Entre/);
 pending=true;await assert.rejects(adminWorkflow('admin-approve',body,headers),/pendências/);
 pending=false;assert.equal((await adminWorkflow('admin-approve',body,headers)).approved,true);
 assert.equal(approvalBody.p_approval.actor,'owner@example.com');assert.equal(approvalBody.p_approval.revision,2);assert.equal(approvalBody.p_approval.fingerprint,analysisFingerprint(analysis));
});
test('API do executor não aceita primeira versão concluída sem aprovação persistida',async()=>{
 global.fetch=async()=>Response.json([{id,revision:2,status:'processing',analysis}]);
 await assert.rejects(workflow('result',{id,lease:id,status:'completed',analysis:{...analysis,approval:{actor:'forged'}}},{authorization:'Bearer '+process.env.WORKFLOW_WORKER_SECRET}),/aprovação humana/);
});
test.after(()=>{global.fetch=originalFetch;});
