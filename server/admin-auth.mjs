import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { db, HttpError, hashToken, mailTransport } from './workflow.mjs';
const owner=()=>process.env.SMTP_USER?.toLowerCase();
const client=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const cookie=(token='',seconds=0)=>`logos_auth=${token}; Path=/api/workflow; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;
const legacy='logos_admin=; Path=/api/workflow; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
const cookies=data=>[cookie(data.access_token,Math.min(data.expires_in||3600,3600)),legacy];
const readToken=headers=>String(headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('logos_auth='))?.slice(11)||'';
async function request(path,token,body,method='POST') {
 const response=await fetch(`${process.env.SUPABASE_URL}/auth/v1/${path}`,{method,headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new HttpError(response.status===429?429:path.startsWith('factors/')?400:401,response.status===429?'Aguarde antes de tentar novamente.':'Não foi possível validar o acesso. Confira os dados e tente novamente.');
 return response.status===204?{}:response.json();
}
export async function adminSession(headers,{password=true,mfa=true}={}) {
 const token=readToken(headers);
 if(!token||token.length>8192)throw new HttpError(401,'Entre com sua senha e o código do autenticador.');
 // getUser verifies this exact JWT with Supabase Auth before any claim is trusted.
 const {data,error}=await client().auth.getUser(token);
 if(error||!data.user||data.user.email?.toLowerCase()!==owner()||!data.user.email_confirmed_at)throw new HttpError(401,'Acesso não autorizado. Entre novamente.');
 let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());}catch{throw new HttpError(401,'Sessão inválida.');}
 if(claims.sub!==data.user.id||claims.exp*1000<=Date.now())throw new HttpError(401,'Seu acesso expirou. Entre novamente.');
 if(password&&!claims.amr?.some(x=>x.method==='password'))throw new HttpError(401,'Entre usando sua senha antes de acessar o painel.');
 if(mfa&&(claims.aal!=='aal2'||!data.user.factors?.some(x=>x.status==='verified'&&x.factor_type==='totp')))throw new HttpError(403,'Confirme o código do autenticador para acessar os pedidos.');
 return {token,user:data.user,claims};
}
function state(session){return {authenticated:session.claims.aal==='aal2',factorId:session.user.factors?.find(x=>x.status==='verified'&&x.factor_type==='totp')?.id||null};}
export async function authAction(action,input,headers) {
 if(action==='admin-redeem')throw new HttpError(410,'Os links antigos foram desativados. Entre com senha e autenticador.');
 if(action==='admin-login') {
  if(String(input.email||'').toLowerCase()!==owner()||typeof input.password!=='string'||input.password.length>128)throw new HttpError(401,'E-mail ou senha inválidos.');
  const {data,error}=await client().auth.signInWithPassword({email:owner(),password:input.password});
  if(error||!data.session)throw new HttpError(401,'E-mail ou senha inválidos.');
  const result=await adminSession({cookie:`logos_auth=${data.session.access_token}`},{mfa:false});
  return {...state(result),__cookie:cookies(data.session)};
 }
 if(action==='admin-password-email') {
  if(!await db('rpc/logos_admin_token',{method:'POST',body:{p_hash:hashToken(randomBytes(32).toString('hex'))}}))throw new HttpError(429,'Aguarde alguns minutos antes de solicitar outro e-mail.');
  const auth=client();
  let result=await auth.auth.admin.generateLink({type:'invite',email:owner()});
  if(result.error)result=await auth.auth.admin.generateLink({type:'recovery',email:owner()});
  if(result.error||!result.data.properties?.hashed_token)throw new HttpError(502,'Não foi possível preparar o e-mail de configuração.');
  const properties=result.data.properties;
  const origin=new URL(process.env.SITE_ORIGIN||'https://www.logosdata.com.br').origin;
  const transport=await mailTransport();
  try{await transport.sendMail({from:`Logos Data <${owner()}>`,to:owner(),subject:'Configure sua senha do painel Logos Data',text:`Para definir ou recuperar sua senha exclusiva, abra:\n${origin}/painel/#configurar=${properties.hashed_token}&tipo=${properties.verification_type}\n\nEste link é pessoal e de uso único. Ele não libera o acesso aos pedidos: o código do autenticador também será exigido. Se não solicitou, ignore este e-mail. Não encaminhe o link.`});}finally{transport.close();}
  return {sent:true};
 }
 if(action==='admin-password-link') {
  if(!['invite','recovery'].includes(input.type)||! /^[a-zA-Z0-9_-]{32,128}$/.test(input.token||''))throw new HttpError(401,'Link inválido.');
  const {data,error}=await client().auth.verifyOtp({token_hash:input.token,type:input.type});
  if(error||!data.session||data.user?.email?.toLowerCase()!==owner())throw new HttpError(401,'Link inválido ou expirado. Solicite outro e-mail.');
  return {setup:true,factorId:data.user.factors?.find(x=>x.status==='verified'&&x.factor_type==='totp')?.id||null,__cookie:cookies(data.session)};
 }
 if(action==='admin-logout') {
  const token=readToken(headers);if(token)await request('logout?scope=local',token).catch(()=>{});
  return {ok:true,__cookie:[cookie(),legacy]};
 }
 if(action==='admin-password-save') {
  const session=await adminSession(headers,{password:false,mfa:false});
  if(!session.claims.amr?.some(x=>['recovery','otp','invite'].includes(x.method)))throw new HttpError(403,'Abra o link de configuração enviado por e-mail.');
  if(typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw new HttpError(400,'Use uma senha exclusiva de 12 a 128 caracteres.');
  await request('user',session.token,{password:input.password},'PUT');
  await request('logout?scope=local',session.token).catch(()=>{});
  return {saved:true,__cookie:[cookie(),legacy]};
 }
 if(!['admin-auth-state','admin-mfa-enroll','admin-mfa-verify'].includes(action))return null;
 const session=await adminSession(headers,{mfa:false,password:action!=='admin-mfa-verify'});
 if(action==='admin-auth-state')return state(session);
 if(action==='admin-mfa-enroll') {
  if(session.user.factors?.some(x=>x.status==='verified'))throw new HttpError(409,'O autenticador já está cadastrado. Digite o código para entrar.');
  for(const factor of session.user.factors||[])if(factor.status==='unverified')await request(`factors/${factor.id}`,session.token,null,'DELETE');
  const data=await request('factors',session.token,{factor_type:'totp',friendly_name:'Painel Logos Data',issuer:'Logos Data'});
  return {factorId:data.id,qr:data.totp.qr_code,secret:data.totp.secret};
 }
 if(!/^[0-9a-f-]{36}$/i.test(input.factorId||'')||!/^\d{6}$/.test(input.code||''))throw new HttpError(400,'Digite os seis números do autenticador.');
 if(!session.user.factors?.some(x=>x.id===input.factorId&&x.factor_type==='totp'))throw new HttpError(403,'Autenticador inválido.');
 const challenge=await request(`factors/${input.factorId}/challenge`,session.token,{});
 const data=await request(`factors/${input.factorId}/verify`,session.token,{challenge_id:challenge.id,code:input.code});
 await adminSession({cookie:`logos_auth=${data.access_token}`},{password:false});
 return {authenticated:true,__cookie:cookies(data)};
}
