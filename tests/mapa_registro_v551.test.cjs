const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
function entorno(opts={}){
 const nodes=new Map(),listeners=new Map(),calls=[];
 function node(id=''){
 const n={id,style:{},disabled:false,className:'',parentElement:null,observers:[],children:[],appendChild(el){this.children.push(el);if(el.id)nodes.set(el.id,el);},insertBefore(el){this.appendChild(el);},querySelector(){return null;},addEventListener(){}};
 n.classList={contains(c){return n.className.split(' ').includes(c);},add(...cs){n.className=[...new Set([...n.className.split(' '),...cs])].join(' ');},remove(...cs){n.className=n.className.split(' ').filter(c=>!cs.includes(c)).join(' ');}};
 Object.defineProperty(n,'textContent',{get(){return this.text||'';},set(v){this.text=v;this.observers.forEach(o=>queueMicrotask(()=>{if(o.active)o.fn();}));}});
 Object.defineProperty(n,'innerHTML',{set(v){this.html=v;for(const m of v.matchAll(/id="([^"]+)"/g))node(m[1]);},get(){return this.html||'';}});
 if(id)nodes.set(id,n);return n;
 }
 const head=node(),body=node();for(const id of ['moArchivo','moBtnLeer','moBtnImportar','moImportMsg']){const n=node(id);n.parentElement=body;}
 nodes.get('moImportMsg').className='mo-msg mo-ok';nodes.get('moImportMsg').textContent='Archivo leído';nodes.get('moBtnImportar').textContent='Registrar información';
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
 const ctx=vm.createContext({console:{log(){},warn(){}},URL,Intl,Date,Promise,Map,Set,AbortController,
 setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,2)),clearTimeout,setInterval:()=>1,clearInterval(){},requestAnimationFrame:fn=>setTimeout(fn,0),
 localStorage:storage(),sessionStorage:storage(),CustomEvent:class{constructor(type,init){this.type=type;Object.assign(this,init);}},
 MutationObserver:class{constructor(fn){this.fn=fn;this.active=true;}observe(n){n.observers.push(this);}disconnect(){this.active=false;}},
 document:{head,body,documentElement:body,scripts:[],createElement:()=>node(),getElementById:id=>nodes.get(id)||null,querySelector:()=>null,querySelectorAll:()=>['moBtnImportar','moBtnLeer','moArchivo'].map(id=>nodes.get(id)),addEventListener(){}},
 addEventListener:(name,fn)=>listeners.set(name,fn),dispatchEvent:e=>listeners.get(e.type)?.(e),
 fetch:async(url,o)=>{calls.push('SYNC:'+o.method);return {ok:true,text:async()=>JSON.stringify({ok:true,periodo:'2026-09'})};},MI_VISUAL_API_URL:'https://example.invalid/api'});
 ctx.window=ctx;ctx.localStorage.setItem('usuario','TEST');ctx.localStorage.setItem('perfil','JEFATURA');
 const load=f=>vm.runInContext(fs.readFileSync('js/'+f,'utf8'),ctx);
 load('mapa_operativo.js');load('win_estado_historico_v4877.js');
 vm.runInContext(`moImportacion=[{ordenId:'A',cuadrilla:'P1 VISUAL SGI TEST',fechaSolicitud:'16/09/2026',fechaUltimoEstado:'16/09/2026 08:00'}];`,ctx);
 ctx.moPintarUltimaActualizacion=()=>{};ctx.moCargarCatalogos=async()=>{};
 ctx.moApiLectura=async p=>{calls.push(p.accion);await new Promise(r=>setTimeout(r,5));return {ok:true,ordenes:opts.old?[{ordenId:'A',fechaUltimoEstado:'16/09/2026 09:00'}]:[]};};
 ctx.moApi=async p=>{calls.push(p.accion);await new Promise(r=>setTimeout(r,5));if(opts.fail)throw new Error(opts.fail);return {ok:true,nuevos:1,actualizados:0,sincronizacionIndicadores:opts.legacy?undefined:{programada:true,estado:'PENDIENTE'}};};
 for(const f of ['mapa_partner_visual_v386.js','mapa_progreso_v393.js','mapa_rapido_v395.js','indicadores_win_sync_v4879.js'])load(f);
 ctx.mv505InstalarHookWin();return {ctx,nodes,calls};
}
test('barra inmediata; doble clic produce un POST; cola no publica otra vez',async()=>{
 const {ctx,nodes,calls}=entorno();const task=ctx.moRegistrarImportacion();ctx.moRegistrarImportacion();
 assert(nodes.get('mv393MapaProgreso').classList.contains('is-visible'));assert(nodes.get('moBtnImportar').disabled);assert.equal(nodes.get('moBtnImportar').textContent,'Cargando…');assert.equal(calls.length,0);
 await task;assert.equal(calls.filter(x=>x==='importarMapaOperativo').length,1);assert(!calls.some(x=>x.startsWith('SYNC:')));assert.match(nodes.get('moImportMsg').textContent,/pendientes de actualización automática/);assert.match(nodes.get('mv393MapaEtapa').textContent,/completado/);
});
test('fallo conserva archivo y permite reintento sin publicar',async()=>{
 const {ctx,nodes,calls}=entorno({fail:'Fallo de prueba'});await ctx.moRegistrarImportacion();assert(!nodes.get('moBtnImportar').disabled);assert.equal(vm.runInContext('moImportacion.length',ctx),1);assert(!calls.some(x=>x.startsWith('SYNC:')));assert.match(nodes.get('mv393MapaEtapa').textContent,/no completado/);
});
test('archivo antiguo no escribe ni muestra falso error',async()=>{
 const {ctx,nodes,calls}=entorno({old:true});await ctx.moRegistrarImportacion();assert(!calls.includes('importarMapaOperativo'));assert(!calls.some(x=>x.startsWith('SYNC:')));assert.equal(nodes.get('mv393MapaEtapa').textContent,'Revisión completada');
});
test('partner ajeno sigue bloqueado',async()=>{
 const {ctx,calls}=entorno();vm.runInContext("moImportacion[0].cuadrilla='OTRO PARTNER'",ctx);await ctx.moRegistrarImportacion();assert.equal(calls.length,0);
});
test('backend anterior sin cola publica exactamente una vez',async()=>{
 const {ctx,calls}=entorno({legacy:true});await ctx.moRegistrarImportacion();assert.equal(calls.filter(x=>x==='importarMapaOperativo').length,1);assert.equal(calls.filter(x=>x==='SYNC:POST').length,1);
});
test('respuesta incierta nunca repite POST ni publica indicadores',async()=>{
 const {ctx,calls,nodes}=entorno({fail:'Failed to fetch'});await ctx.moRegistrarImportacion();assert.equal(calls.filter(x=>x==='importarMapaOperativo').length,1);assert(!calls.some(x=>x.startsWith('SYNC:')));assert.match(nodes.get('mv393MapaEtapa').textContent,/pendiente de confirmación/);
});
