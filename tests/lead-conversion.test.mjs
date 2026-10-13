import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/assets/site.js',import.meta.url),'utf8');
function page(response){
 const events=[],listeners={},button={disabled:false},status={textContent:''},success={hidden:true,focus(){this.focused=true;}};
 const form={hidden:false,reportValidity:()=>true,querySelector:()=>button,addEventListener:(name,fn)=>{listeners[name]=fn;},reset(){this.resetCalled=true;}};
 const elements={'meta[name="google-ads-conversion"]':{content:'AW-18430684930/NAVvCLL5xpsdEILet9RE'},'meta[name="google-ads-id"]':{content:'AW-18430684930'},'#quote-form':form,'#form-status':status,'#lead-success':success};
 const window={dataLayer:[],addEventListener(){}};
 const document={querySelector:key=>elements[key]||null,querySelectorAll:()=>[],addEventListener:(name,fn)=>events.push({name,fn}),getElementById:()=>null};
 const context={window,document,location:{hash:'',href:'https://www.logosdata.com.br/desenvolvimento-de-sites/'},URL,crypto:{randomUUID:()=> '03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb'},FormData:class{get(key){return {nome:'Test',whatsapp:'11983195720',consent:'on',website:''}[key];}},fetch:async()=>response};
 vm.runInNewContext(source,context);return {window,form,button,status,success,listeners,events};
}
test('front-end conta uma conversão somente após salvar e bloqueia clique duplo',async()=>{
 const ui=page({ok:true,json:async()=>({accepted:true,id:'03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb'})});
 await ui.listeners.submit({preventDefault(){}});await ui.listeners.submit({preventDefault(){}});
 const conversions=ui.window.dataLayer.filter(x=>x[0]==='event');assert.equal(conversions.length,1);assert.equal(conversions[0][2].transaction_id,'03eb93c1-c763-4b68-a0cb-01c4ec1e6cdb');assert.equal(conversions[0][2].name,undefined);assert.equal(conversions[0][2].whatsapp,undefined);
 assert.equal(ui.form.hidden,true);assert.equal(ui.success.hidden,false);assert.equal(ui.success.focused,true);
});
test('falha no banco deixa formulário disponível sem disparar conversão',async()=>{
 const ui=page({ok:false,json:async()=>({error:'Falha ao salvar'})});await ui.listeners.submit({preventDefault(){}});
 assert.equal(ui.window.dataLayer.filter(x=>x[0]==='event').length,0);assert.equal(ui.form.hidden,false);assert.equal(ui.success.hidden,true);assert.equal(ui.button.disabled,false);assert.equal(ui.status.textContent,'Falha ao salvar');
});
test('clique direto no WhatsApp não dispara evento de conversão',()=>{
 const ui=page(null);const anchor={href:'https://wa.me/5511983195720'};
 for(const event of ui.events.filter(x=>x.name==='click'))event.fn({target:{closest:selector=>selector==='a[href]'?anchor:null},anchor});
 assert.equal(ui.window.dataLayer.filter(x=>x[0]==='event').length,0);
});
